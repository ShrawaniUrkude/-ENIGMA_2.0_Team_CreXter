/**
 * server.js — Express Application Entry Point
 * ==============================================
 * Orbital Agronomy Backend Server
 *
 * Responsibilities:
 *   - Connect to MongoDB
 *   - Serve REST API for the frontend
 *   - Proxy file uploads to the Python AI microservice
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const analysisRoutes = require('./routes/analysis');

// ── Configuration ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/orbital-agronomy';

// ── Express App Setup ──────────────────────────────────────────────
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api', analysisRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'orbital-agronomy-backend',
        timestamp: new Date().toISOString(),
    });
});

// ── MongoDB Connection & Server Start ──────────────────────────────
mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log('✅  Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀  Orbital Agronomy Backend running on port ${PORT}`);
            console.log(`📡  API: http://localhost:${PORT}/api`);
        });
    })
    .catch((err) => {
        console.error('❌  MongoDB connection error:', err.message);
        process.exit(1);
    });

module.exports = app;
