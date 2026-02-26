/**
 * MapView.jsx — Leaflet map with coordinate marker
 */
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const MapView = ({ coordinates }) => {
    const defaultCenter = [20.5937, 78.9629]; // India center
    const center = coordinates?.lat && coordinates?.lng
        ? [coordinates.lat, coordinates.lng]
        : defaultCenter;
    const zoom = coordinates?.lat ? 12 : 4;

    return (
        <div className="glass-card animate-fade-in">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orbital-400" />
                Field Location
            </h3>
            <div className="rounded-xl overflow-hidden border border-white/5" style={{ height: '250px' }}>
                <MapContainer
                    center={center}
                    zoom={zoom}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    {coordinates?.lat && coordinates?.lng && (
                        <Marker position={[coordinates.lat, coordinates.lng]}>
                            <Popup>
                                <div className="text-xs">
                                    <strong>Analysis Location</strong><br />
                                    {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default MapView;
