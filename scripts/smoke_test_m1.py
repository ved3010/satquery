"""
CPU smoke test for the M1 training loop.

Purpose: catch shape, dtype and API errors in the *exact* code path the Kaggle
notebook runs, before spending GPU-hours on it. Finding a broken tensor shape at
hour three of a P100 session costs a tenth of the weekly quota; finding it here
costs 30 seconds.

This does NOT train a useful model -- it runs a handful of steps on whatever
IndiaSat patches exist locally, with randomly-initialised weights (no 600 MB
pretrained download). It asserts the loop runs and the loss is finite.

    python scripts/smoke_test_m1.py
"""
from __future__ import annotations

import glob
import os
import sys

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

# torch.onnx's progress output contains emoji. The default Windows console
# codepage is cp1252, which cannot encode them, and the UnicodeEncodeError
# aborts an otherwise successful export. Harmless everywhere else.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "indiasat")
S2_N, S1_N = 12, 2
IN_CH = S2_N + S1_N
PATCH_PX = 120


def main() -> int:
    import pyarrow.parquet as pq

    pfile = os.path.join(OUT, "IndiaSat.txt.parquet")
    if not os.path.exists(pfile):
        print("no IndiaSat parquet - run scripts/build_india_dataset.py first")
        return 1

    rows = pq.read_table(pfile).to_pylist()
    caps = {r["patch_id"]: r for r in rows if r["type"] == "captioning"}
    files = [f for f in sorted(glob.glob(os.path.join(OUT, "patches", "*.npz")))
             if os.path.basename(f)[:-4] in caps]
    print(f"{len(files)} captioned patches")
    if len(files) < 4:
        print("need at least 4 patches for a contrastive batch")
        return 1

    # --- the 14-channel surgery, exactly as the notebook does it ----------- #
    import open_clip
    model, _, _ = open_clip.create_model_and_transforms("ViT-B-32", pretrained=None)
    tokenizer = open_clip.get_tokenizer("ViT-B-32")

    old = model.visual.conv1
    assert old.in_channels == 3, f"expected a 3-channel patch-embed, got {old.in_channels}"
    new = nn.Conv2d(IN_CH, old.out_channels, old.kernel_size, old.stride, bias=False)
    with torch.no_grad():
        w = old.weight.data
        rep = w.repeat(1, (IN_CH + 2) // 3, 1, 1)[:, :IN_CH]
        new.weight.copy_(rep * (3.0 / IN_CH))
    model.visual.conv1 = new
    print(f"patch-embed 3 -> {model.visual.conv1.in_channels} channels  "
          f"({sum(p.numel() for p in model.parameters())/1e6:.1f}M params)")

    # magnitude preservation is the whole point of the rescale -- verify it
    x3 = torch.randn(2, 3, 224, 224)
    x14 = x3.repeat(1, (IN_CH + 2) // 3, 1, 1)[:, :IN_CH]
    with torch.no_grad():
        a = F.conv2d(x3, w, stride=old.stride).std().item()
        b = F.conv2d(x14, new.weight, stride=old.stride).std().item()
    print(f"activation std  3ch {a:.4f}  ->  14ch {b:.4f}  (ratio {b/a:.2f})")

    # --- normalisation from the train split only --------------------------- #
    tr = [f for f in files if caps[os.path.basename(f)[:-4]]["split"] == "train"] or files
    samp = [np.load(f) for f in tr[:64]]
    s2s = np.stack([s["s2"] for s in samp]).astype(np.float32)
    m2, sd2 = s2s.mean((0, 2, 3)), s2s.std((0, 2, 3)) + 1e-6
    has_s1 = "s1" in samp[0]
    if has_s1:
        s1s = np.stack([s["s1"] for s in samp]).astype(np.float32)
        m1_, sd1 = s1s.mean((0, 2, 3)), s1s.std((0, 2, 3)) + 1e-6
    else:
        m1_, sd1 = np.zeros(S1_N, np.float32), np.ones(S1_N, np.float32)
    print(f"S1 present: {has_s1}")

    def load(f):
        pid = os.path.basename(f)[:-4]
        d = np.load(f)
        s2 = (d["s2"].astype(np.float32) - m2[:, None, None]) / sd2[:, None, None]
        s1 = ((d["s1"].astype(np.float32) - m1_[:, None, None]) / sd1[:, None, None]
              if "s1" in d else np.zeros((S1_N, PATCH_PX, PATCH_PX), np.float32))
        x = torch.from_numpy(np.concatenate([s2, s1], 0))
        x = F.interpolate(x[None], size=224, mode="bilinear", align_corners=False)[0]
        return x, caps[pid]["output"]

    # --- a few real training steps ----------------------------------------- #
    opt = torch.optim.AdamW(model.parameters(), lr=1e-5)
    bs = min(4, len(files))
    model.train()
    losses = []
    for step in range(3):
        batch = files[step * bs:(step + 1) * bs] or files[:bs]
        xs, ts = zip(*[load(f) for f in batch])
        x = torch.stack(xs)
        t = tokenizer(list(ts))
        assert x.shape == (len(batch), IN_CH, 224, 224), f"bad image shape {x.shape}"

        im = F.normalize(model.encode_image(x), dim=-1)
        tx = F.normalize(model.encode_text(t), dim=-1)
        logits = model.logit_scale.exp().clamp(max=100) * im @ tx.t()
        lbl = torch.arange(len(batch))
        loss = (F.cross_entropy(logits, lbl) + F.cross_entropy(logits.t(), lbl)) / 2

        opt.zero_grad(set_to_none=True)
        loss.backward()
        opt.step()
        losses.append(loss.item())
        print(f"  step {step}  loss {loss.item():.4f}  "
              f"img_emb {tuple(im.shape)}  txt_emb {tuple(tx.shape)}")
        assert np.isfinite(loss.item()), "loss went non-finite"

    # --- ONNX export path (the bit that breaks silently at the end) -------- #
    class ImageTower(nn.Module):
        def __init__(self, m):
            super().__init__()
            self.m = m

        def forward(self, z):
            return F.normalize(self.m.encode_image(z), dim=-1)

    dest = os.path.join(ROOT, "models", "weights", "_smoke_m1.onnx")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    torch.onnx.export(ImageTower(model).eval(), torch.randn(1, IN_CH, 224, 224), dest,
                      input_names=["image"], output_names=["embedding"],
                      dynamic_axes={"image": {0: "batch"}, "embedding": {0: "batch"}},
                      opset_version=17, dynamo=False)
    size = os.path.getsize(dest) / 1e6

    import onnxruntime as ort
    sess = ort.InferenceSession(dest, providers=["CPUExecutionProvider"])

    # Test batch=2, NOT just batch=1. An earlier version of this test checked
    # only batch=1 and passed, while the exported graph actually failed at
    # batch=2 with
    #   Reshape: input {50,2,2304}, requested {50,1,3,768}
    # because the dynamo exporter silently ignores `dynamic_axes` (it wants
    # `dynamic_shapes`). A batch-1-only check cannot see that class of bug.
    x = np.random.randn(2, IN_CH, 224, 224).astype(np.float32)
    emb = sess.run(None, {"image": x})[0]
    with torch.no_grad():
        ref = F.normalize(model.eval().encode_image(torch.from_numpy(x)), dim=-1).numpy()
    diff = float(np.abs(ref - emb).max())
    os.remove(dest)

    print(f"\nONNX export {size:.0f} MB (single file, weights embedded)")
    print(f"  batch-2 output {emb.shape}  norms {np.round(np.linalg.norm(emb,axis=1),3)}")
    print(f"  max abs diff vs torch: {diff:.3e}")
    assert emb.shape == (2, 512), f"batch-2 export broken: got {emb.shape}"
    assert diff < 1e-3, f"ONNX disagrees with PyTorch by {diff:.3e}"

    print("\nSMOKE TEST PASSED - the notebook's training path is sound.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
