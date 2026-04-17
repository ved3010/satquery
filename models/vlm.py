"""
M7 — a small vision-language model for remote sensing, trainable on CPU.

WHY THIS SHAPE. The registry's original M7 is Qwen3.5-2B-VL + QLoRA, which
needs a CUDA GPU (`bitsandbytes` is CUDA-only) and is not trainable on this
laptop. Rather than ship a stub, this is the same architecture idea at a size
that actually fits: a frozen remote-sensing vision tower, a learned projector
that turns an image into prefix tokens, and a small causal transformer decoder
that follows an instruction about that image.

    image 14x120x120 --[frozen M1 encoder]--> 256-d pooled + 256x8x8 grid
                     --[projector]---------->  1 + 16 visual tokens
    [visual tokens][<bos>] instruction [<sep>] answer [<eos>]
                     --[4-layer causal decoder]--> next-token logits

Loss is computed on the answer span only, so the model learns to *answer*
rather than to reconstruct the question.

The vision tower is frozen and its features are cached once, which is why this
trains in minutes on four cores instead of hours: it is stage-1 LLaVA-style
projector training, not full fine-tuning. Swapping the frozen tower for the
Kaggle ViT-B/32 is a constructor change, not a redesign — exactly the property
