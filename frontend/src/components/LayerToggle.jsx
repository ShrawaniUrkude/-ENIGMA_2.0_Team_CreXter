/**
 * LayerToggle.jsx — Toggle between RGB / NDVI / Stress-Vision layers
 */
import React from 'react';

const layers = [
    { id: 'rgb', label: 'RGB', icon: '🌍', description: 'True color composite' },
    { id: 'ndvi', label: 'NDVI', icon: '🌿', description: 'Vegetation index' },
    { id: 'stress', label: 'Stress-Vision', icon: '🔥', description: 'AI stress overlay' },
];

const LayerToggle = ({ activeLayer, setActiveLayer }) => {
    return (
        <div className="flex gap-2">
            {layers.map((layer) => (
                <button
                    key={layer.id}
                    onClick={() => setActiveLayer(layer.id)}
                    className={`layer-btn flex items-center gap-2 ${activeLayer === layer.id ? 'active' : ''
                        }`}
                    title={layer.description}
                >
                    <span>{layer.icon}</span>
                    <span>{layer.label}</span>
                </button>
            ))}
        </div>
    );
};

export default LayerToggle;
