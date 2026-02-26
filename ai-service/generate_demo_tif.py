"""
generate_demo_tif.py — Standalone Demo Image Generator
=======================================================
Creates a synthetic 6-band multispectral GeoTIFF for quick testing
without needing real satellite data.

Usage:
    python generate_demo_tif.py
"""

import os
import sys

# Add parent dir so we can import from the package
sys.path.insert(0, os.path.dirname(__file__))

from train_model import generate_synthetic_bands, save_demo_tif

OUTPUT = os.path.join(os.path.dirname(__file__), "demo_field.tif")


def main():
    print("🛰  Generating demo multispectral field image ...")
    bands = generate_synthetic_bands(256, 256, stress_ratio=0.35, seed=99)
    save_demo_tif(bands, OUTPUT)
    print("Done! Upload this file through the web interface to test.")


if __name__ == "__main__":
    main()
