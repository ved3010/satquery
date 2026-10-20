"""Export IndiaSat per-sensor normalisation stats next to the weights.

The trained models were fitted on inputs normalised by statistics computed from
the TRAIN split. Inference must reuse exactly those numbers -- recomputing them
from whatever image a user happens to upload would silently shift the input
distribution and quietly degrade every prediction.
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.train_all import Corpus, WEIGHTS

C = Corpus()
os.makedirs(WEIGHTS, exist_ok=True)
dest = os.path.join(WEIGHTS, "indiasat_norm.npz")
np.savez(dest, mean_s2=C.m2, std_s2=C.s2s, mean_s1=C.m1, std_s1=C.s1s,
         vocab=np.array(C.vocab, dtype=object))
print("wrote", dest)
print("  S2 mean", np.round(C.m2, 1))
print("  S1 mean", np.round(C.m1, 3))
print("  vocab", len(C.vocab))
