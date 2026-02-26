/**
 * UploadPanel.jsx — File upload with drag-and-drop + coordinate input
 */
import React, { useState, useRef } from 'react';

const UploadPanel = ({ onAnalyze, isLoading }) => {
    const [file, setFile] = useState(null);
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.tif') || droppedFile.name.endsWith('.tiff'))) {
            setFile(droppedFile);
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) setFile(selectedFile);
    };

    const handleSubmit = () => {
        if (!file) return;
        onAnalyze(file, { lat: lat || null, lng: lng || null });
    };

    return (
        <div className="glass-card animate-fade-in">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orbital-400 animate-pulse-slow" />
                Upload Satellite Imagery
            </h2>

            {/* Dropzone */}
            <div
                className={`dropzone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".tif,.tiff"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                {file ? (
                    <>
                        <div className="w-12 h-12 rounded-xl bg-orbital-600/30 flex items-center justify-center text-2xl">
                            ✅
                        </div>
                        <p className="text-sm text-orbital-300 font-medium">{file.name}</p>
                        <p className="text-xs text-slate-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                            🛰
                        </div>
                        <p className="text-sm text-slate-300">
                            Drop <span className="text-orbital-400 font-semibold">.tif</span> file here
                        </p>
                        <p className="text-xs text-slate-500">or click to browse</p>
                    </>
                )}
            </div>

            {/* Coordinate Input */}
            <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Latitude</label>
                    <input
                        type="number"
                        step="any"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        placeholder="18.5204"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orbital-500 transition-colors"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Longitude</label>
                    <input
                        type="number"
                        step="any"
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                        placeholder="73.8567"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orbital-500 transition-colors"
                    />
                </div>
            </div>

            {/* Analyze Button */}
            <button
                onClick={handleSubmit}
                disabled={!file || isLoading}
                className={`mt-4 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${file && !isLoading
                        ? 'bg-gradient-to-r from-orbital-600 to-orbital-500 text-white hover:shadow-glow-green hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-white/5 text-slate-600 cursor-not-allowed'
                    }`}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="spinner !w-4 !h-4 !border-2" />
                        Analyzing...
                    </span>
                ) : (
                    '🔬 Analyze Field'
                )}
            </button>
        </div>
    );
};

export default UploadPanel;
