/**
 * ComparisonSlider.jsx — Side-by-side image comparison slider
 * Drag the handle to compare RGB vs Stress-Vision overlay
 */
import React, { useState, useRef, useCallback } from 'react';

const ComparisonSlider = ({ leftImage, rightImage, leftLabel = 'RGB', rightLabel = 'Stress-Vision' }) => {
    const [position, setPosition] = useState(50);
    const containerRef = useRef(null);
    const isDragging = useRef(false);

    const handleMove = useCallback((clientX) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
        setPosition(pct);
    }, []);

    const handleMouseDown = (e) => {
        isDragging.current = true;
        handleMove(e.clientX);
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        handleMove(e.clientX);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleTouchMove = (e) => {
        handleMove(e.touches[0].clientX);
    };

    if (!leftImage || !rightImage) return null;

    return (
        <div className="glass-card animate-fade-in">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orbital-400" />
                Comparison Slider
                <span className="text-[10px] text-slate-500 font-mono ml-auto">DRAG TO COMPARE</span>
            </h3>

            <div
                ref={containerRef}
                className="relative rounded-xl overflow-hidden cursor-col-resize select-none border border-white/5"
                style={{ height: '350px' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchMove={handleTouchMove}
            >
                {/* Right image (full width, behind) */}
                <img
                    src={`data:image/png;base64,${rightImage}`}
                    alt={rightLabel}
                    className="absolute inset-0 w-full h-full object-contain"
                />

                {/* Left image (clipped) */}
                <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${position}%` }}
                >
                    <img
                        src={`data:image/png;base64,${leftImage}`}
                        alt={leftLabel}
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ width: `${100 / (position / 100)}%`, maxWidth: 'none' }}
                    />
                </div>

                {/* Divider line */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
                    style={{ left: `${position}%` }}
                >
                    {/* Handle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M7 4L3 10L7 16" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M13 4L17 10L13 16" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                {/* Labels */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white z-20">
                    🌍 {leftLabel}
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white z-20">
                    🔥 {rightLabel}
                </div>
            </div>
        </div>
    );
};

export default ComparisonSlider;
