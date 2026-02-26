/**
 * LoadingOverlay.jsx — Satellite scanning animation during analysis
 */
import React from 'react';

const LoadingOverlay = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-space-950/80 backdrop-blur-md animate-fade-in">
            <div className="text-center">
                {/* Scanning animation */}
                <div className="relative w-40 h-40 mx-auto mb-8">
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-orbital-700/30" />
                    {/* Spinning ring */}
                    <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-orbital-400 animate-spin" style={{ animationDuration: '1.5s' }} />
                    {/* Middle ring */}
                    <div className="absolute inset-6 rounded-full border border-orbital-600/20" />
                    {/* Reverse spinning ring */}
                    <div className="absolute inset-8 rounded-full border-2 border-transparent border-b-emerald-400 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                    {/* Center satellite */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl animate-pulse-slow">🛰</span>
                    </div>
                    {/* Scan lines */}
                    <div className="absolute inset-0 overflow-hidden rounded-full">
                        <div className="scan-line" />
                    </div>
                </div>

                {/* Status text */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Analyzing Field</h3>
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                        <LoadingDot delay="0s" />
                        <LoadingDot delay="0.2s" />
                        <LoadingDot delay="0.4s" />
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-500 font-mono">
                        <AnimatedStep text="Reading multispectral bands..." delay={0} />
                        <AnimatedStep text="Computing NDVI, NDRE, MSI indices..." delay={800} />
                        <AnimatedStep text="Running RandomForest inference..." delay={1600} />
                        <AnimatedStep text="Generating Stress-Vision heatmap..." delay={2400} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const LoadingDot = ({ delay }) => (
    <span
        className="w-1.5 h-1.5 rounded-full bg-orbital-400"
        style={{ animation: `pulse 1.2s ease-in-out infinite`, animationDelay: delay }}
    />
);

const AnimatedStep = ({ text, delay }) => {
    const [visible, setVisible] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <p className={`transition-all duration-500 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            {visible ? '✅' : '⏳'} {text}
        </p>
    );
};

export default LoadingOverlay;
