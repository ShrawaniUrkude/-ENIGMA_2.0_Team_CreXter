"""
train_model.py — ML Training Script for Crop Stress Detection
==============================================================
Generates a synthetic multispectral dataset simulating Sentinel-2
imagery, trains a RandomForestClassifier to distinguish healthy
vs. stressed vegetation, and saves the model as `model.joblib`.

Also produces a demo `.tif` file (`demo_field.tif`) for testing.

Usage:
    python train_model.py
"""

import os
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

from spectral import compute_ndvi, compute_ndre, compute_msi, compute_zscore_anomaly

# ── Configuration ───────────────────────────────────────────────────
IMG_HEIGHT = 256
IMG_WIDTH = 256
NUM_SAMPLES = 5          # Number of synthetic scenes to train on
MODEL_OUTPUT = os.path.join(os.path.dirname(__file__), "model.joblib")
DEMO_TIF_OUTPUT = os.path.join(os.path.dirname(__file__), "demo_field.tif")


def generate_synthetic_bands(h: int, w: int, stress_ratio: float = 0.35,
                              seed: int = None) -> dict:
    """
    Simulate a 6-band multispectral image.

    Healthy vegetation:
        - High NIR reflectance (0.35–0.55)
        - Low Red reflectance (0.03–0.08)
        - Moderate SWIR (0.10–0.20)

    Stressed vegetation:
        - Lower NIR (0.15–0.30)
        - Higher Red (0.10–0.20)
        - Higher SWIR (0.25–0.45) — water stress
    """
    if seed is not None:
        np.random.seed(seed)

    # Create a stress mask — circular / blob patterns for realism
    y, x = np.mgrid[0:h, 0:w]
    n_blobs = np.random.randint(2, 6)
    stress_mask = np.zeros((h, w), dtype=bool)

    for _ in range(n_blobs):
        cx, cy = np.random.randint(0, w), np.random.randint(0, h)
        radius = np.random.randint(20, 60)
        blob = ((x - cx) ** 2 + (y - cy) ** 2) < radius ** 2
        stress_mask |= blob

    # Adjust mask to approximate desired stress ratio
    current_ratio = stress_mask.sum() / stress_mask.size
    if current_ratio < stress_ratio * 0.5:
        extra = np.random.random((h, w)) < (stress_ratio - current_ratio)
        stress_mask |= extra

    # ── Healthy pixel generation ───────────────────────────────────
    blue   = np.random.uniform(0.02, 0.06, (h, w)).astype(np.float32)
    green  = np.random.uniform(0.05, 0.10, (h, w)).astype(np.float32)
    red    = np.random.uniform(0.03, 0.08, (h, w)).astype(np.float32)
    rededge = np.random.uniform(0.15, 0.30, (h, w)).astype(np.float32)
    nir    = np.random.uniform(0.35, 0.55, (h, w)).astype(np.float32)
    swir   = np.random.uniform(0.10, 0.20, (h, w)).astype(np.float32)

    # ── Overwrite stressed pixels ──────────────────────────────────
    blue[stress_mask]    = np.random.uniform(0.04, 0.10, stress_mask.sum()).astype(np.float32)
    green[stress_mask]   = np.random.uniform(0.06, 0.12, stress_mask.sum()).astype(np.float32)
    red[stress_mask]     = np.random.uniform(0.10, 0.20, stress_mask.sum()).astype(np.float32)
    rededge[stress_mask] = np.random.uniform(0.10, 0.20, stress_mask.sum()).astype(np.float32)
    nir[stress_mask]     = np.random.uniform(0.15, 0.30, stress_mask.sum()).astype(np.float32)
    swir[stress_mask]    = np.random.uniform(0.25, 0.45, stress_mask.sum()).astype(np.float32)

    # Add Gaussian noise for realism
    for band in [blue, green, red, rededge, nir, swir]:
        band += np.random.normal(0, 0.005, (h, w)).astype(np.float32)
        np.clip(band, 0, 1, out=band)

    return {
        "blue": blue, "green": green, "red": red,
        "red_edge": rededge, "nir": nir, "swir": swir,
        "labels": stress_mask.astype(np.int32),
    }


def bands_to_features(bands: dict) -> np.ndarray:
    """Compute spectral features from raw bands."""
    ndvi = compute_ndvi(bands["nir"], bands["red"])
    ndre = compute_ndre(bands["nir"], bands["red_edge"])
    msi  = compute_msi(bands["swir"], bands["nir"])
    zscore = compute_zscore_anomaly(ndvi)

    features = np.stack([
        ndvi.ravel(),
        ndre.ravel(),
        msi.ravel(),
        zscore.ravel(),
        bands["nir"].ravel(),
        bands["swir"].ravel(),
    ], axis=1)
    return features


def save_demo_tif(bands: dict, path: str):
    """
    Save a 6-band GeoTIFF for demo/testing purposes.
    Bands: Blue, Green, Red, RedEdge, NIR, SWIR
    """
    h, w = bands["nir"].shape
    transform = from_bounds(77.0, 18.0, 77.1, 18.1, w, h)

    with rasterio.open(
        path, "w",
        driver="GTiff",
        height=h, width=w,
        count=6,
        dtype="float32",
        crs="EPSG:4326",
        transform=transform,
    ) as dst:
        dst.write(bands["blue"], 1)
        dst.write(bands["green"], 2)
        dst.write(bands["red"], 3)
        dst.write(bands["red_edge"], 4)
        dst.write(bands["nir"], 5)
        dst.write(bands["swir"], 6)

    print(f"✅  Demo TIF saved → {path}")


def main():
    print("=" * 60)
    print("  Orbital Agronomy — Model Training Pipeline")
    print("=" * 60)

    all_features = []
    all_labels = []

    for i in range(NUM_SAMPLES):
        print(f"\n🛰  Generating synthetic scene {i + 1}/{NUM_SAMPLES} ...")
        stress_ratio = np.random.uniform(0.2, 0.5)
        bands = generate_synthetic_bands(IMG_HEIGHT, IMG_WIDTH,
                                          stress_ratio=stress_ratio, seed=i)
        features = bands_to_features(bands)
        labels = bands["labels"].ravel()

        all_features.append(features)
        all_labels.append(labels)

        # Save the first scene as demo TIF
        if i == 0:
            save_demo_tif(bands, DEMO_TIF_OUTPUT)

    X = np.vstack(all_features)
    y = np.concatenate(all_labels)

    # Replace NaN / Inf
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    print(f"\n📊  Dataset: {X.shape[0]:,} pixels  |  "
          f"Healthy: {(y == 0).sum():,}  |  Stressed: {(y == 1).sum():,}")

    # ── Train / test split ─────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── Train RandomForestClassifier ───────────────────────────────
    print("\n🌲  Training RandomForestClassifier ...")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=10,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    # ── Evaluate ───────────────────────────────────────────────────
    y_pred = clf.predict(X_test)
    print("\n📋  Classification Report:")
    print(classification_report(y_test, y_pred,
                                 target_names=["Healthy", "Stressed"]))

    # ── Save model ─────────────────────────────────────────────────
    joblib.dump(clf, MODEL_OUTPUT)
    print(f"💾  Model saved → {MODEL_OUTPUT}")
    print("\n✅  Training complete. You can now start the API server.")


if __name__ == "__main__":
    main()
