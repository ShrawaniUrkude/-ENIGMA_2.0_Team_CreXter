/**
 * api.js — Axios wrapper for backend API calls
 */
import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 120000, // 2 minutes for large file analysis
});

/**
 * Upload a .tif file for stress analysis
 * @param {File} file - The TIF file to analyze
 * @param {object} coords - Optional { lat, lng }
 * @returns {Promise<object>} Analysis result
 */
export const analyzeField = async (file, coords = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (coords.lat) formData.append('lat', coords.lat);
    if (coords.lng) formData.append('lng', coords.lng);

    const response = await api.post('/analyze-field', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

/**
 * Fetch all historical results (without images for performance)
 */
export const getResults = async () => {
    const response = await api.get('/results');
    return response.data;
};

/**
 * Fetch a single analysis result with full images
 */
export const getResultById = async (id) => {
    const response = await api.get(`/results/${id}`);
    return response.data;
};

export default api;
