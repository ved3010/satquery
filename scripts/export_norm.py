"""Export IndiaSat per-sensor normalisation stats next to the weights.

The trained models were fitted on inputs normalised by statistics computed from
the TRAIN split. Inference must reuse exactly those numbers -- recomputing them
from whatever image a user happens to upload would silently shift the input
distribution and quietly degrade every prediction.
"""
