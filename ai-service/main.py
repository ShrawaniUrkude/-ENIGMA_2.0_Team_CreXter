"""
main.py — FastAPI Microservice for Crop Stress Analysis
========================================================
Accepts a multispectral GeoTIFF upload, computes vegetation indices,
runs the trained ML model, and returns the Stress-Vision overlay
along with analytics data.

Endpoints:
    POST /analyze   — Full stress analysis pipeline
    GET  /health    — Health check
"""

import io
import os
import base64
import tempfile

import cv2
import numpy as np
import rasterio
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from spectral import build_feature_stack, compute_ndvi
from inference import (
    predict_stress,
    generate_heatmap,
    create_overlay,
    compute_alert_level,
    compute_distribution,
    generate_forecast,
)

# ── App setup ───────────────────────────────────────────────────────
app = FastAPI(
    title="Orbital Agronomy AI Service",
    description="Pre-visual crop stress detection from multispectral imagery",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _encode_image_base64(image_bgr: np.ndarray) -> str:
    """Encode a BGR numpy image to a base64 PNG string."""
    _, buffer = cv2.imencode(".png", image_bgr)
    return base64.b64encode(buffer).decode("utf-8")


def _ndvi_to_colormap(ndvi: np.ndarray) -> np.ndarray:
    """Convert NDVI [-1,1] to a green-scaled visualization."""
    # Normalize to 0-255
    ndvi_norm = ((np.clip(ndvi, -1, 1) + 1) / 2 * 255).astype(np.uint8)
    colored = cv2.applyColorMap(ndvi_norm, cv2.COLORMAP_SUMMER)
    return colored


def _extract_rgb(bands: dict, h: int, w: int) -> np.ndarray:
    """Create a pseudo-RGB image from the Red, Green, Blue bands."""
    r = np.clip(bands["red"] * 4, 0, 1)     # Boost for visibility
    g = np.clip(bands["green"] * 4, 0, 1)
    b = np.clip(bands["blue"] * 4, 0, 1)

    rgb = np.stack([b, g, r], axis=-1)  # OpenCV uses BGR
    rgb = (rgb * 255).astype(np.uint8)
    return rgb


# ── Health Check ────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "orbital-agronomy-ai"}


# ── Main Analysis Endpoint ─────────────────────────────────────────
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    Full analysis pipeline:
    1. Read multispectral GeoTIFF (6 bands)
    2. Compute spectral indices (NDVI, NDRE, MSI, z-score)
    3. Run RandomForest stress prediction
    4. Generate Stress-Vision heatmap overlay
    5. Return base64 images + analytics
    """
    # ── Validate file type ─────────────────────────────────────────
    if not file.filename.lower().endswith((".tif", ".tiff")):
        raise HTTPException(
            status_code=400,
            detail="Only GeoTIFF (.tif / .tiff) files are accepted."
        )

    # ── Save upload to temporary file ──────────────────────────────
    try:
        contents = await file.read()
        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File read error: {e}")

    try:
        # ── Read bands with rasterio ───────────────────────────────
        with rasterio.open(tmp_path) as src:
            if src.count < 6:
                raise HTTPException(
                    status_code=400,
                    detail=f"Expected 6 bands, got {src.count}. "
                           "Band order: Blue, Green, Red, RedEdge, NIR, SWIR"
                )

            bands = {
                "blue":     src.read(1).astype(np.float32),
                "green":    src.read(2).astype(np.float32),
                "red":      src.read(3).astype(np.float32),
                "red_edge": src.read(4).astype(np.float32),
                "nir":      src.read(5).astype(np.float32),
                "swir":     src.read(6).astype(np.float32),
            }

        # ── Build feature stack ────────────────────────────────────
        features, (h, w), index_maps = build_feature_stack(bands)

        # ── Predict stress ─────────────────────────────────────────
        stress_map = predict_stress(features, (h, w))

        # ── Generate visualizations ────────────────────────────────
        rgb_image = _extract_rgb(bands, h, w)
        heatmap = generate_heatmap(stress_map)
        overlay = create_overlay(rgb_image, heatmap, alpha=0.55)
        ndvi_colored = _ndvi_to_colormap(index_maps["ndvi"])

        # ── Compute analytics ──────────────────────────────────────
        # Stress percentage = % of pixels with stress_prob > 0.5
        stress_pct = float(np.mean(stress_map > 0.5) * 100)
        stress_pct = round(stress_pct, 1)

        alert_level = compute_alert_level(stress_pct)
        distribution = compute_distribution(stress_map)
        forecast = generate_forecast(stress_pct)

        # ── Advisory message for farmers ───────────────────────────
        advisory = _generate_advisory(alert_level, stress_pct)

        # ── Encode images to base64 ────────────────────────────────
        response = {
            "rgb_image": _encode_image_base64(rgb_image),
            "ndvi_image": _encode_image_base64(ndvi_colored),
            "overlay_image": _encode_image_base64(overlay),
            "stress_percentage": stress_pct,
            "alert_level": alert_level,
            "distribution": distribution,
            "forecast": forecast,
            "advisory_message": advisory,
        }

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _generate_advisory(alert_level: str, stress_pct: float) -> str:
    """Generate a farmer-friendly advisory message."""
    if alert_level == "SAFE":
        return (
            f"✅ Your field is in good health ({stress_pct}% stress detected). "
            "Continue current irrigation and nutrient management practices. "
            "Next recommended scan: 7 days."
        )
    elif alert_level == "MONITOR":
        return (
            f"⚠️ Moderate stress detected ({stress_pct}%). "
            "Recommended actions: (1) Check soil moisture levels, "
            "(2) Inspect affected zones for pest/disease signs, "
            "(3) Consider supplemental irrigation. "
            "Next recommended scan: 3 days."
        )
    else:
        return (
            f"🚨 CRITICAL stress detected ({stress_pct}%). "
            "Immediate action required: (1) Emergency irrigation for water-stressed zones, "
            "(2) Soil nutrient testing, (3) On-ground inspection within 24 hours, "
            "(4) Consult agronomist for treatment plan. "
            "Next recommended scan: Daily monitoring."
        )
