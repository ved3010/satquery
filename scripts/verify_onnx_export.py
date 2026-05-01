"""
Verify that an ONNX export of the M1 image tower is numerically faithful.

A silently-broken export is the worst failure mode in this project: the model
still loads, still returns a correctly-shaped unit-norm vector, and is complete
nonsense. The only real test is comparing ONNX output against PyTorch output on
the same input.

Also reports every file the exporter produced -- torch's dynamo exporter can
write weights to a sidecar .data file, so a small .onnx is not by itself
evidence of a broken export.

    python scripts/verify_onnx_export.py
"""
from __future__ import annotations

import glob
import os
import shutil
import sys
import tempfile

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

IN_CH = 14


class ImageTower(nn.Module):
    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, x):
        return F.normalize(self.m.encode_image(x), dim=-1)


def main() -> int:
    import open_clip

    model, _, _ = open_clip.create_model_and_transforms("ViT-B-32", pretrained=None)
    old = model.visual.conv1
    new = nn.Conv2d(IN_CH, old.out_channels, old.kernel_size, old.stride, bias=False)
    with torch.no_grad():
        w = old.weight.data
        new.weight.copy_(w.repeat(1, (IN_CH + 2) // 3, 1, 1)[:, :IN_CH] * (3.0 / IN_CH))
    model.visual.conv1 = new
    model.eval()

    tower = ImageTower(model).eval()
    n_params = sum(p.numel() for p in tower.parameters())

    tmp = tempfile.mkdtemp(prefix="onnxchk_")
    path = os.path.join(tmp, "m1.onnx")
    try:
        torch.onnx.export(
            tower, torch.randn(1, IN_CH, 224, 224), path,
            input_names=["image"], output_names=["embedding"],
            dynamic_axes={"image": {0: "batch"}, "embedding": {0: "batch"}},
            opset_version=17, dynamo=False)

        produced = sorted(glob.glob(os.path.join(tmp, "*")))
        total = sum(os.path.getsize(f) for f in produced)
        print(f"model: {n_params/1e6:.1f}M params "
              f"(~{n_params*4/1e6:.0f} MB as fp32)\n")
        print("files produced by the exporter:")
        for f in produced:
            print(f"  {os.path.basename(f):<34} {os.path.getsize(f)/1e6:9.1f} MB")
        print(f"  {'TOTAL':<34} {total/1e6:9.1f} MB")

        x = np.random.randn(2, IN_CH, 224, 224).astype(np.float32)
        import onnxruntime as ort
        sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        onnx_out = sess.run(None, {"image": x})[0]
        with torch.no_grad():
            torch_out = tower(torch.from_numpy(x)).numpy()

        diff = float(np.abs(torch_out - onnx_out).max())
        cos = float((torch_out * onnx_out).sum(1).mean())
        norms = np.linalg.norm(onnx_out, axis=1)

        print(f"\ntorch {torch_out.shape}  onnx {onnx_out.shape}")
        print(f"max abs diff : {diff:.3e}")
        print(f"cosine sim   : {cos:.6f}   (1.0 = identical)")
        print(f"output norms : {np.round(norms, 4)}   (expect 1.0)")

        # A random-weight tower would still give unit norms and the right shape,
        # so norms alone prove nothing. Agreement with PyTorch is the real test.
        ok = diff < 1e-3 and cos > 0.999
        weights_present = total > n_params * 2       # >2 bytes/param = real weights
        print(f"\nweights embedded : {'yes' if weights_present else 'NO — '
                                     'only a graph was written'}")
        print(f"VERDICT: {'EXPORT OK' if ok and weights_present else 'EXPORT BROKEN'}")
        return 0 if (ok and weights_present) else 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
