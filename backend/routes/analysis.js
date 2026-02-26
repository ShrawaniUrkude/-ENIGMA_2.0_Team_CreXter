/**
 * routes/analysis.js — API Routes for Field Stress Analysis
 * ============================================================
 *
 * POST /api/analyze-field   Upload a .tif file → forward to Python AI
 *                           service → save results → return JSON
 * GET  /api/results         Fetch all historical analysis results
 * GET  /api/results/:id     Fetch a single analysis by ID
 */

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const Analysis = require('../models/Analysis');

const router = express.Router();

// ── Multer setup — store uploads in /tmp/uploads ───────────────────
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.tif' || ext === '.tiff') {
            cb(null, true);
        } else {
            cb(new Error('Only .tif/.tiff files are accepted'), false);
        }
    },
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
});

// ── AI Service base URL from environment ───────────────────────────
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ────────────────────────────────────────────────────────────────────
// POST /api/analyze-field
// ────────────────────────────────────────────────────────────────────
router.post('/analyze-field', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Please upload a .tif file.' });
    }

    const filePath = req.file.path;

    try {
        // ── Forward the file to the Python AI microservice ─────────────
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), {
            filename: req.file.originalname,
            contentType: 'image/tiff',
        });

        const aiResponse = await axios.post(`${AI_SERVICE_URL}/analyze`, form, {
            headers: {
                ...form.getHeaders(),
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000, // 2 minute timeout for large images
        });

        const result = aiResponse.data;

        // ── Parse optional coordinates from request body ───────────────
        const lat = req.body.lat ? parseFloat(req.body.lat) : null;
        const lng = req.body.lng ? parseFloat(req.body.lng) : null;

        // ── Save to MongoDB ────────────────────────────────────────────
        const analysis = new Analysis({
            fileName: req.file.originalname,
            coordinates: { lat, lng },
            rgbImage: result.rgb_image,
            ndviImage: result.ndvi_image,
            overlayImage: result.overlay_image,
            stressPercentage: result.stress_percentage,
            alertLevel: result.alert_level,
            distribution: result.distribution,
            forecast: result.forecast,
            advisoryMessage: result.advisory_message,
        });

        await analysis.save();

        // ── Return response to frontend ────────────────────────────────
        res.status(200).json({
            success: true,
            data: {
                _id: analysis._id,
                fileName: analysis.fileName,
                coordinates: analysis.coordinates,
                rgbImage: analysis.rgbImage,
                ndviImage: analysis.ndviImage,
                overlayImage: analysis.overlayImage,
                stressPercentage: analysis.stressPercentage,
                alertLevel: analysis.alertLevel,
                distribution: analysis.distribution,
                forecast: analysis.forecast,
                advisoryMessage: analysis.advisoryMessage,
                createdAt: analysis.createdAt,
            },
        });
    } catch (err) {
        console.error('❌ Analysis error:', err.message);

        if (err.response) {
            // AI service returned an error
            return res.status(err.response.status).json({
                error: `AI Service Error: ${err.response.data?.detail || err.message}`,
            });
        }

        res.status(500).json({
            error: `Analysis failed: ${err.message}`,
        });
    } finally {
        // Clean up uploaded file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/results — Fetch all historical results (most recent first)
// ────────────────────────────────────────────────────────────────────
router.get('/results', async (req, res) => {
    try {
        const results = await Analysis.find()
            .sort({ createdAt: -1 })
            .select('-rgbImage -ndviImage -overlayImage') // Exclude large base64 fields for list view
            .limit(50);

        res.status(200).json({ success: true, data: results });
    } catch (err) {
        console.error('❌ Fetch results error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/results/:id — Fetch a single result with full images
// ────────────────────────────────────────────────────────────────────
router.get('/results/:id', async (req, res) => {
    try {
        const result = await Analysis.findById(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Analysis result not found' });
        }
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.error('❌ Fetch result error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
