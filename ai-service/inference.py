"""
inference.py — Stress Classification & Heatmap Generation
==========================================================
Loads the trained RandomForest model, predicts per-pixel stress
probability, and produces the Stress-Vision heatmap overlay.
"""

import os
import cv2
import numpy as np
import joblib

# ── Model path ──────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.joblib")

_model = None


def _load_model():
    """Lazy-load the trained model from disk."""
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Trained model not found at {MODEL_PATH}. "
                "Run `python train_model.py` first."
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def predict_stress(features: np.ndarray, shape: tuple) -> np.ndarray:
    """
    Predict per-pixel stress probability.

    Parameters
    ----------
    features : (N, n_features) array from spectral.build_feature_stack
    shape    : (H, W) of the original image

    Returns
    -------
    stress_map : (H, W) float32 array with values in [0, 1]
                 0 = healthy, 1 = fully stressed
    """
    model = _load_model()

    # Replace any NaN/Inf with 0 before prediction
    features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)

    # predict_proba returns [[p_healthy, p_stressed], ...]
    probabilities = model.predict_proba(features)[:, 1]
    stress_map = probabilities.reshape(shape).astype(np.float32)
    return stress_map


def generate_heatmap(stress_map: np.ndarray) -> np.ndarray:
    """
    Convert a [0,1] stress probability map into a BGR heatmap.

    Color mapping:
        Blue  (0.0) → Healthy
        Yellow(0.5) → Moderate stress
        Red   (1.0) → Critical stress
    """
    # Scale to 0-255 uint8
    stress_uint8 = (np.clip(stress_map, 0, 1) * 255).astype(np.uint8)

    # COLORMAP_JET: Blue → Cyan → Green → Yellow → Red
    heatmap = cv2.applyColorMap(stress_uint8, cv2.COLORMAP_JET)
    return heatmap


def create_overlay(rgb_image: np.ndarray, heatmap: np.ndarray,
                   alpha: float = 0.55) -> np.ndarray:
    """
    Blend the Stress-Vision heatmap over the RGB image.
    Uses cv2.addWeighted for a semi-transparent overlay.
    """
    # Ensure both images are the same size
    if rgb_image.shape[:2] != heatmap.shape[:2]:
        heatmap = cv2.resize(heatmap, (rgb_image.shape[1], rgb_image.shape[0]))

    overlay = cv2.addWeighted(rgb_image, 1 - alpha, heatmap, alpha, 0)
    return overlay


def compute_alert_level(stress_percentage: float) -> str:
    """
    Classify overall field stress into an alert tier.

    SAFE      : 0–30%  stressed pixels
    MONITOR   : 30–60% stressed pixels
    CRITICAL  : 60%+   stressed pixels
    """
    if stress_percentage < 30:
        return "SAFE"
    elif stress_percentage < 60:
        return "MONITOR"
    else:
        return "CRITICAL"


def compute_distribution(stress_map: np.ndarray) -> dict:
    """
    Compute the percentage breakdown of healthy / moderate / critical
    pixels from the stress probability map.
    """
    total = stress_map.size
    healthy = float(np.sum(stress_map < 0.3) / total * 100)
    moderate = float(np.sum((stress_map >= 0.3) & (stress_map < 0.6)) / total * 100)
    critical = float(np.sum(stress_map >= 0.6) / total * 100)
    return {
        "healthy": round(healthy, 1),
        "moderate": round(moderate, 1),
        "critical": round(critical, 1),
    }


def generate_forecast(stress_percentage: float) -> list:
    """
    Simulate a 7-day stress forecast based on current stress level.
    Uses a simple random walk with upward drift if stress is already high.
    """
    np.random.seed(42)
    forecast = [round(stress_percentage, 1)]
    for _ in range(6):
        drift = 1.5 if stress_percentage > 40 else -0.5
        delta = np.random.normal(drift, 3.0)
        next_val = max(0, min(100, forecast[-1] + delta))
        forecast.append(round(next_val, 1))
    return forecast
