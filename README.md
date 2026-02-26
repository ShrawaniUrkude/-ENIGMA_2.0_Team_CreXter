# 🛰 Orbital Agronomy — Stress-Vision

**Pre-Visual Crop Stress Detection Using Multispectral Satellite AI**

> Detect crop stress *before* it becomes visible in RGB imagery using multispectral satellite data and machine learning.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│    │  Upload   │ │  Image   │ │  Stress  │ │    Charts &      │ │
│    │  Panel    │ │  Viewer  │ │  Gauge   │ │    Forecast      │ │
│    └────┬─────┘ └──────────┘ └──────────┘ └──────────────────┘ │
│         │        Layer Toggle: RGB | NDVI | Stress-Vision       │
└─────────┼───────────────────────────────────────────────────────┘
          │ POST /api/analyze-field
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js / Express)                   │
│    ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│    │  Multer   │  │   Mongoose   │  │   Axios → Python AI   │   │
│    │ (upload)  │  │  (MongoDB)   │  │    Service Proxy      │   │
│    └──────────┘  └──────────────┘  └───────────┬───────────┘   │
└────────────────────────────────────────────────┼────────────────┘
                                                 │ POST /analyze
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI MICROSERVICE (FastAPI)                      │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │
│    │ Rasterio │  │ Spectral │  │  Random   │  │ Stress-    │   │
│    │ (read    │→ │ Indices  │→ │  Forest   │→ │ Vision     │   │
│    │  bands)  │  │ NDVI,MSI │  │  Model    │  │ Heatmap    │   │
│    └──────────┘  └──────────┘  └──────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
orbital-agronomy/
├── frontend/                    # React + Tailwind CSS + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   │   ├── UploadPanel.jsx      # Drag & drop TIF upload
│   │   │   ├── ImageViewer.jsx      # RGB/NDVI/Stress layer viewer
│   │   │   ├── LayerToggle.jsx      # Layer switch buttons
│   │   │   ├── StressGauge.jsx      # SVG arc gauge
│   │   │   ├── StressChart.jsx      # Bar chart (distribution)
│   │   │   ├── HistoryTimeline.jsx  # Historical stress line chart
│   │   │   ├── ForecastPanel.jsx    # 7-day forecast chart
│   │   │   ├── AdvisoryPanel.jsx    # Farmer advisory & SMS
│   │   │   ├── AlertBadge.jsx       # Status badge
│   │   │   └── MapView.jsx          # Leaflet map
│   │   ├── App.jsx                  # Main app with tab routing
│   │   ├── api.js                   # Axios API wrapper
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Tailwind + glassmorphism
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── backend/                     # Node.js + Express + MongoDB
│   ├── models/
│   │   └── Analysis.js              # Mongoose schema
│   ├── routes/
│   │   └── analysis.js              # REST API routes
│   ├── server.js                    # Express entry point
│   ├── .env
│   ├── .env.example
│   └── package.json
├── ai-service/                  # Python FastAPI + ML
│   ├── main.py                      # FastAPI app
│   ├── spectral.py                  # Vegetation index computation
│   ├── inference.py                 # Model loading + heatmap gen
│   ├── train_model.py               # ML training pipeline
│   ├── generate_demo_tif.py         # Demo image generator
│   ├── model.joblib                 # Trained model (generated)
│   ├── demo_field.tif               # Demo image (generated)
│   └── requirements.txt
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.9
- **MongoDB** running locally (or Atlas URI)

### 1. AI Microservice

```bash
cd ai-service
pip install -r requirements.txt

# Train the model (generates model.joblib + demo_field.tif)
python train_model.py

# Start the AI service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Backend

```bash
cd backend
npm install

# Configure .env (defaults work for local dev)
# Start the server
npm start
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and upload `ai-service/demo_field.tif` to test.

---

## 📡 API Documentation

### `POST /api/analyze-field`

Upload a multispectral GeoTIFF for stress analysis.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (.tif) | ✅ | 6-band multispectral GeoTIFF |
| `lat` | Number | ❌ | Latitude of field center |
| `lng` | Number | ❌ | Longitude of field center |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a...",
    "fileName": "field_scan.tif",
    "rgbImage": "base64...",
    "ndviImage": "base64...",
    "overlayImage": "base64...",
    "stressPercentage": 42.3,
    "alertLevel": "MONITOR",
    "distribution": { "healthy": 57.7, "moderate": 28.1, "critical": 14.2 },
    "forecast": [42.3, 43.8, 45.1, 46.5, 47.2, 48.0, 49.3],
    "advisoryMessage": "⚠️ Moderate stress detected...",
    "createdAt": "2024-01-15T..."
  }
}
```

### `GET /api/results`
Returns all historical results (without base64 images).

### `GET /api/results/:id`
Returns a single result with full images.

---

## 🧠 Spectral Science

### Vegetation Indices Computed

| Index | Formula | Purpose |
|-------|---------|---------|
| **NDVI** | (NIR − Red) / (NIR + Red) | Overall vegetation health |
| **NDRE** | (NIR − RedEdge) / (NIR + RedEdge) | Early chlorophyll stress (more sensitive than NDVI) |
| **MSI** | SWIR / NIR | Moisture/water stress detection |
| **CWSI** | Normalized thermal | Canopy water stress (if thermal available) |
| **Z-Score** | \|x − μ\| / σ | Spectral anomaly detection |

### ML Model
- **Algorithm:** RandomForestClassifier (100 trees, max_depth=12)
- **Features:** NDVI, NDRE, MSI, NDVI z-score, raw NIR, raw SWIR
- **Training:** Synthetic multispectral data with realistic spectral signatures

---

## 🎤 Hackathon Pitch Script

> **"What if we could see crop disease before it's visible to the human eye?"**
>
> Orbital Agronomy uses satellite multispectral imaging — the same bands used
> by space agencies — combined with a trained Random Forest model to detect
> vegetation stress at the pixel level.
>
> **The Problem:** Farmers today rely on visual inspection. By the time stress
> is visible in RGB, 30% of yield may already be lost.
>
> **Our Solution:** We compute 5 spectral indices — including NDRE, which
> detects chlorophyll degradation before NDVI drops — and feed them into an ML
> classifier trained on multispectral signatures.
>
> **The Result:** A "Stress-Vision" heatmap that shows exactly where stress is
> forming, with a percentage breakdown and 7-day forecast.
>
> **Impact:** Early detection means early intervention. We can reduce crop
> losses by up to 40% through precision agriculture alerts.
>
> **Tech Stack:** React + Node.js + FastAPI + RandomForest + Rasterio
>
> **Demo:** Upload a satellite scan → see instant RGB vs. NDVI vs.
> Stress-Vision comparison → get actionable advisory messages.

---

## 🌐 Deployment Guide

### Backend → Render

1. Create a **Web Service** on [render.com](https://render.com)
2. Root directory: `backend/`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Environment variables:
   - `MONGODB_URI` = your MongoDB Atlas URI
   - `AI_SERVICE_URL` = your deployed AI service URL
   - `PORT` = 5000

### AI Service → Render

1. Create a **Web Service** on Render
2. Root directory: `ai-service/`
3. Build command: `pip install -r requirements.txt && python train_model.py`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend → Vercel

1. Connect GitHub repo on [vercel.com](https://vercel.com)
2. Root directory: `frontend/`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variable:
   - `VITE_API_URL` = your deployed backend URL

---

## 📜 License

MIT — Built for hackathon demonstration purposes.
