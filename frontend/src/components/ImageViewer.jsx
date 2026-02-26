/**
 * ImageViewer.jsx — Display satellite imagery with layer toggle
 * Shows RGB, NDVI, or Stress-Vision overlay with smooth transitions
 */
import React, { useState } from 'react';
import LayerToggle from './LayerToggle';

const ImageViewer = ({ result }) => {
    const [activeLayer, setActiveLayer] = useState('stress');

    if (!result) {
        return (
            <div className="glass-card h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-5xl mb-4 opacity-30">🛰</div>
                    <p className="text-slate-500 text-sm">Upload a multispectral image to begin analysis</p>
                    <p className="text-slate-600 text-xs mt-1">Supports Sentinel-2 and Landsat GeoTIFF</p>
                </div>
            </div>
        );
    }

    const images = {
        rgb: result.rgbImage,
        ndvi: result.ndviImage,
        stress: result.overlayImage,
    };

    return (
        <div className="glass-card animate-fade-in">
            {/* Header with layer toggle */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orbital-400" />
                    Field Imagery
                </h2>
                <LayerToggle activeLayer={activeLayer} setActiveLayer={setActiveLayer} />
            </div>

            {/* Image display */}
            <div className="relative rounded-xl overflow-hidden bg-space-900 border border-white/5">
                {Object.entries(images).map(([key, src]) => (
                    <img
                        key={key}
                        src={`data:image/png;base64,${src}`}
                        alt={`${key.toUpperCase()} view`}
                        className={`w-full object-contain transition-opacity duration-500 ${activeLayer === key ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'
                            }`}
                        style={{ maxHeight: '450px' }}
                    />
                ))}

                {/* Layer indicator badge */}
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
                    <span className="text-xs font-mono text-orbital-300 uppercase">
                        {activeLayer === 'stress' ? '🔥 Stress-Vision' : activeLayer === 'ndvi' ? '🌿 NDVI' : '🌍 RGB'}
                    </span>
                </div>
            </div>

            {/* Legend per layer */}
            <div className="mt-3 flex items-center justify-center gap-6 text-xs text-slate-400">
                {activeLayer === 'stress' && (
                    <>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-blue-500" /> Healthy
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-yellow-500" /> Moderate
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-red-500" /> Critical
                        </span>
                    </>
                )}
                {activeLayer === 'ndvi' && (
                    <>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded" style={{ background: '#543005' }} /> Low NDVI (bare soil)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded" style={{ background: '#a8d08d' }} /> Moderate
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded" style={{ background: '#1a6e1a' }} /> High NDVI (dense vegetation)
                        </span>
                        <span className="text-[10px] text-slate-600 ml-2 font-mono">Formula: (NIR − Red) / (NIR + Red)</span>
                    </>
                )}
                {activeLayer === 'rgb' && (
                    <>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-red-500" /> Red band
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-green-500" /> Green band
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-blue-500" /> Blue band
                        </span>
                        <span className="text-[10px] text-slate-600 ml-2 font-mono">True-color composite</span>
                    </>
                )}
            </div>
        </div>
    );
};

export default ImageViewer;
