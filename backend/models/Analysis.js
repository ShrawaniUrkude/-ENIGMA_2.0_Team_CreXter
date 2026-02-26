/**
 * Analysis.js — Mongoose Schema for Crop Stress Analysis Results
 * ================================================================
 * Stores each analysis run including imagery (base64), stress metrics,
 * distribution breakdown, forecast data, and advisory messages.
 */

const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    // Original file name uploaded by user
    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    // GPS coordinates of the analyzed field (optional)
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    // Base64-encoded images returned from AI service
    rgbImage: {
      type: String,
      required: true,
    },
    ndviImage: {
      type: String,
      required: true,
    },
    overlayImage: {
      type: String,
      required: true,
    },

    // Stress analytics
    stressPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    alertLevel: {
      type: String,
      enum: ['SAFE', 'MONITOR', 'CRITICAL'],
      required: true,
    },

    // Distribution breakdown
    distribution: {
      healthy: { type: Number, default: 0 },
      moderate: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
    },

    // 7-day simulated stress forecast
    forecast: {
      type: [Number],
      default: [],
    },

    // Farmer advisory text
    advisoryMessage: {
      type: String,
      default: '',
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,
  }
);

// Index for efficient time-series queries
analysisSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);
