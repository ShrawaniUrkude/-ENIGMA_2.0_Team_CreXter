"""
spectral.py — Spectral Vegetation Index Computation Module
===========================================================
Computes remote-sensing indices from multispectral satellite imagery
(Sentinel-2 / Landsat band order assumed):
  Band 1: Blue   Band 2: Green   Band 3: Red
  Band 4: Red Edge   Band 5: NIR   Band 6: SWIR

Each function operates on numpy arrays and returns a float32 index image.
"""

import numpy as np


def _safe_divide(numerator: np.ndarray, denominator: np.ndarray) -> np.ndarray:
    """Element-wise division that replaces divide-by-zero with 0."""
    with np.errstate(divide="ignore", invalid="ignore"):
        result = np.where(denominator != 0, numerator / denominator, 0.0)
    return result.astype(np.float32)


def compute_ndvi(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    """
    Normalized Difference Vegetation Index
    NDVI = (NIR - Red) / (NIR + Red)
    Range: [-1, 1]  |  Healthy vegetation → high positive values
    """
    return _safe_divide(nir.astype(np.float32) - red.astype(np.float32),
                        nir.astype(np.float32) + red.astype(np.float32))


def compute_ndre(nir: np.ndarray, red_edge: np.ndarray) -> np.ndarray:
    """
    Normalized Difference Red Edge Index
    NDRE = (NIR - RedEdge) / (NIR + RedEdge)
    More sensitive to chlorophyll content than NDVI;
    detects early stress before NDVI drops.
    """
    return _safe_divide(nir.astype(np.float32) - red_edge.astype(np.float32),
                        nir.astype(np.float32) + red_edge.astype(np.float32))


def compute_msi(swir: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """
    Moisture Stress Index
    MSI = SWIR / NIR
    Higher values indicate water stress (leaf dehydration).
    """
    return _safe_divide(swir.astype(np.float32), nir.astype(np.float32))


def compute_cwsi(thermal: np.ndarray) -> np.ndarray:
    """
    Crop Water Stress Index (simplified proxy)
    When a thermal band is available, CWSI is derived by normalizing
    canopy temperature between well-watered (Tmin) and fully-stressed
    (Tmax) baselines.  Here we use a min-max normalization as a proxy.
    Range: [0, 1]  |  0 = no stress, 1 = fully stressed
    """
    t = thermal.astype(np.float32)
    t_min, t_max = np.nanmin(t), np.nanmax(t)
    if t_max - t_min == 0:
        return np.zeros_like(t, dtype=np.float32)
    return ((t - t_min) / (t_max - t_min)).astype(np.float32)


def compute_zscore_anomaly(index_map: np.ndarray) -> np.ndarray:
    """
    Spectral Anomaly Detection via Z-Score Normalization
    Flags pixels whose index value deviates significantly from the
    field-level mean. |z| > 2 is considered anomalous.
    Returns the absolute z-score map (float32).
    """
    mean = np.nanmean(index_map)
    std = np.nanstd(index_map)
    if std == 0:
        return np.zeros_like(index_map, dtype=np.float32)
    z = np.abs((index_map - mean) / std).astype(np.float32)
    return z


def build_feature_stack(bands: dict) -> np.ndarray:
    """
    Construct a per-pixel feature matrix from raw bands.

    Parameters
    ----------
    bands : dict with keys 'blue','green','red','red_edge','nir','swir'
            each value is a 2-D numpy array (H×W).

    Returns
    -------
    features : np.ndarray of shape (H*W, n_features)
    """
    nir = bands["nir"]
    red = bands["red"]
    red_edge = bands["red_edge"]
    swir = bands["swir"]

    ndvi = compute_ndvi(nir, red)
    ndre = compute_ndre(nir, red_edge)
    msi = compute_msi(swir, nir)
    zscore_ndvi = compute_zscore_anomaly(ndvi)

    h, w = nir.shape
    # Stack features: NDVI, NDRE, MSI, NDVI-zscore, raw NIR, raw SWIR
    features = np.stack([
        ndvi.ravel(),
        ndre.ravel(),
        msi.ravel(),
        zscore_ndvi.ravel(),
        nir.ravel().astype(np.float32),
        swir.ravel().astype(np.float32),
    ], axis=1)

    return features, (h, w), {"ndvi": ndvi, "ndre": ndre, "msi": msi}
