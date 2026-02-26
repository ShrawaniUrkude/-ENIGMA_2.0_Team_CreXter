"""
generate_samples.py — Generate Multiple Demo TIF Files
=======================================================
Creates diverse multispectral test images with varying stress patterns:

1. healthy_field.tif     — Mostly healthy (< 15% stress)
2. moderate_stress.tif   — Patchy moderate stress (~40%)
3. severe_drought.tif    — Heavy water stress (~70%)
4. pest_outbreak.tif     — Localized pest damage clusters
5. mixed_field.tif       — Gradient from healthy to stressed

Usage:
    py generate_samples.py
"""

import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from train_model import generate_synthetic_bands, save_demo_tif

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "samples")


def make_healthy_field(h=256, w=256):
    """Almost entirely healthy vegetation — low stress baseline."""
    np.random.seed(10)
    bands = generate_synthetic_bands(h, w, stress_ratio=0.08, seed=10)
    # Override: make everything very healthy
    bands["nir"][:] = np.random.uniform(0.40, 0.55, (h, w)).astype(np.float32)
    bands["red"][:] = np.random.uniform(0.02, 0.06, (h, w)).astype(np.float32)
    bands["swir"][:] = np.random.uniform(0.08, 0.15, (h, w)).astype(np.float32)
    return bands


def make_moderate_stress(h=256, w=256):
    """Patchy moderate stress — irregular shapes scattered across field."""
    np.random.seed(20)
    bands = generate_synthetic_bands(h, w, stress_ratio=0.40, seed=20)
    return bands


def make_severe_drought(h=256, w=256):
    """Heavy water stress covering most of the field."""
    np.random.seed(30)
    bands = generate_synthetic_bands(h, w, stress_ratio=0.70, seed=30)
    # Amplify drought signatures: high SWIR, low NIR
    mask = np.random.random((h, w)) < 0.65
    bands["swir"][mask] = np.random.uniform(0.35, 0.55, mask.sum()).astype(np.float32)
    bands["nir"][mask] = np.random.uniform(0.12, 0.25, mask.sum()).astype(np.float32)
    bands["red"][mask] = np.random.uniform(0.12, 0.22, mask.sum()).astype(np.float32)
    return bands


def make_pest_outbreak(h=256, w=256):
    """Localized pest damage — tight circular hotspots."""
    np.random.seed(40)
    blue = np.random.uniform(0.02, 0.06, (h, w)).astype(np.float32)
    green = np.random.uniform(0.05, 0.10, (h, w)).astype(np.float32)
    red = np.random.uniform(0.03, 0.07, (h, w)).astype(np.float32)
    rededge = np.random.uniform(0.18, 0.30, (h, w)).astype(np.float32)
    nir = np.random.uniform(0.38, 0.55, (h, w)).astype(np.float32)
    swir = np.random.uniform(0.10, 0.18, (h, w)).astype(np.float32)

    # Create 8-12 tight pest clusters
    y, x = np.mgrid[0:h, 0:w]
    n_clusters = np.random.randint(8, 13)
    for _ in range(n_clusters):
        cx, cy = np.random.randint(20, w - 20), np.random.randint(20, h - 20)
        radius = np.random.randint(8, 25)
        mask = ((x - cx) ** 2 + (y - cy) ** 2) < radius ** 2
        red[mask] = np.random.uniform(0.15, 0.25, mask.sum()).astype(np.float32)
        rededge[mask] = np.random.uniform(0.08, 0.15, mask.sum()).astype(np.float32)
        nir[mask] = np.random.uniform(0.12, 0.22, mask.sum()).astype(np.float32)
        swir[mask] = np.random.uniform(0.30, 0.50, mask.sum()).astype(np.float32)

    return {
        "blue": blue, "green": green, "red": red,
        "red_edge": rededge, "nir": nir, "swir": swir,
        "labels": np.zeros((h, w), dtype=np.int32),
    }


def make_mixed_gradient(h=256, w=256):
    """Gradient: healthy on left, stressed on right — great for demos."""
    np.random.seed(50)
    gradient = np.linspace(0, 1, w).reshape(1, w).repeat(h, axis=0).astype(np.float32)
    noise = np.random.normal(0, 0.05, (h, w)).astype(np.float32)
    gradient = np.clip(gradient + noise, 0, 1)

    # Blend between healthy and stressed spectral signatures
    blue = (0.03 + 0.05 * gradient + np.random.normal(0, 0.005, (h, w))).astype(np.float32)
    green = (0.07 + 0.04 * gradient + np.random.normal(0, 0.005, (h, w))).astype(np.float32)
    red = (0.04 + 0.14 * gradient + np.random.normal(0, 0.005, (h, w))).astype(np.float32)
    rededge = (0.25 - 0.12 * gradient + np.random.normal(0, 0.005, (h, w))).astype(np.float32)
    nir = (0.50 - 0.28 * gradient + np.random.normal(0, 0.01, (h, w))).astype(np.float32)
    swir = (0.12 + 0.30 * gradient + np.random.normal(0, 0.005, (h, w))).astype(np.float32)

    for b in [blue, green, red, rededge, nir, swir]:
        np.clip(b, 0.01, 0.99, out=b)

    return {
        "blue": blue, "green": green, "red": red,
        "red_edge": rededge, "nir": nir, "swir": swir,
        "labels": (gradient > 0.5).astype(np.int32),
    }


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    samples = [
        ("healthy_field.tif", make_healthy_field, "🌿 Healthy baseline (~10% stress)"),
        ("moderate_stress.tif", make_moderate_stress, "⚠️  Patchy moderate stress (~40%)"),
        ("severe_drought.tif", make_severe_drought, "🚨 Heavy drought stress (~70%)"),
        ("pest_outbreak.tif", make_pest_outbreak, "🐛 Localized pest damage clusters"),
        ("mixed_field.tif", make_mixed_gradient, "📊 Left-to-right stress gradient"),
    ]

    print("=" * 55)
    print("  Generating Sample Multispectral TIF Files")
    print("=" * 55)

    for filename, generator, description in samples:
        path = os.path.join(OUTPUT_DIR, filename)
        print(f"\n{description}")
        bands = generator()
        save_demo_tif(bands, path)

    print(f"\n🎉  All 5 samples generated in: {OUTPUT_DIR}")
    print("Upload any of these through the web interface to test!")


if __name__ == "__main__":
    main()
