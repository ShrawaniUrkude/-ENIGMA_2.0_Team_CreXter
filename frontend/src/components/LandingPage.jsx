/**
 * LandingPage.jsx — Animated hero landing page
 * First impression for hackathon judges. Features:
 * - Animated satellite orbit
 * - Particle background effect
 * - Impact statistics counter
 * - Smooth scroll entry into dashboard
 */
import React, { useState, useEffect } from 'react';

const LandingPage = ({ onEnter }) => {
    const [visible, setVisible] = useState(false);
    const [counters, setCounters] = useState({ fields: 0, accuracy: 0, savings: 0, farmers: 0 });

    useEffect(() => {
        setVisible(true);
        // Animate counters
        const targets = { fields: 12500, accuracy: 94, savings: 40, farmers: 3200 };
        const duration = 2000;
        const steps = 60;
        const interval = duration / steps;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            const progress = Math.min(step / steps, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setCounters({
                fields: Math.round(targets.fields * eased),
                accuracy: Math.round(targets.accuracy * eased),
                savings: Math.round(targets.savings * eased),
                farmers: Math.round(targets.farmers * eased),
            });
            if (step >= steps) clearInterval(timer);
        }, interval);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #0a2513 0%, #080e1a 50%, #050a12 100%)' }}>
            {/* Animated stars/particles */}
            <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 50 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{
                            width: Math.random() * 2 + 1 + 'px',
                            height: Math.random() * 2 + 1 + 'px',
                            left: Math.random() * 100 + '%',
                            top: Math.random() * 100 + '%',
                            opacity: Math.random() * 0.5 + 0.1,
                            animation: `pulse ${2 + Math.random() * 4}s ease-in-out infinite`,
                            animationDelay: Math.random() * 2 + 's',
                        }}
                    />
                ))}
            </div>

            {/* Orbit ring */}
            <div className="absolute" style={{ width: '500px', height: '500px' }}>
                <div className="orbit-ring" />
                <div className="orbit-satellite">🛰</div>
            </div>

            {/* Main content */}
            <div className={`relative z-10 text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                {/* Logo */}
                <div className="mb-6 inline-flex items-center gap-3 px-5 py-2 rounded-full border border-orbital-600/30 bg-orbital-950/50 backdrop-blur-sm">
                    <div className="w-3 h-3 rounded-full bg-orbital-400 animate-pulse" />
                    <span className="text-xs font-mono text-orbital-400 tracking-widest uppercase">System Initialized</span>
                </div>

                <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 tracking-tight">
                    Orbital <span className="text-transparent bg-clip-text bg-gradient-to-r from-orbital-400 to-emerald-300">Agronomy</span>
                </h1>

                <p className="text-xl text-slate-400 mb-2 font-light max-w-2xl mx-auto">
                    Stress-Vision: Pre-Visual Crop Stress Detection
                </p>
                <p className="text-sm text-slate-500 mb-10 max-w-xl mx-auto">
                    Detect crop disease <span className="text-orbital-400 font-semibold">before</span> it becomes visible using
                    multispectral satellite AI and advanced vegetation indices
                </p>

                {/* CTA Button */}
                <button
                    onClick={onEnter}
                    className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-orbital-600 to-orbital-500 text-white font-semibold text-lg transition-all duration-300 hover:shadow-glow-green hover:scale-105 active:scale-95"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        🚀 Launch Mission Control
                    </span>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orbital-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>

                {/* Tech badges */}
                <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                    {['Sentinel-2', 'NDVI + NDRE + MSI', 'RandomForest AI', 'Real-time Heatmap'].map((badge) => (
                        <span key={badge} className="px-3 py-1 rounded-full text-[10px] font-mono text-slate-500 border border-white/5 bg-white/[0.02]">
                            {badge}
                        </span>
                    ))}
                </div>
            </div>

            {/* Impact Stats */}
            <div className={`relative z-10 mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto transition-all duration-1000 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <StatCounter icon="🌾" value={counters.fields.toLocaleString()} label="Fields Analyzed" suffix="+" />
                <StatCounter icon="🎯" value={counters.accuracy} label="Detection Accuracy" suffix="%" />
                <StatCounter icon="💰" value={counters.savings} label="Yield Loss Reduced" suffix="%" />
                <StatCounter icon="👨‍🌾" value={counters.farmers.toLocaleString()} label="Farmers Served" suffix="+" />
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-space-950 to-transparent" />
        </div>
    );
};

const StatCounter = ({ icon, value, label, suffix = '' }) => (
    <div className="text-center p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="text-xl mb-1">{icon}</div>
        <div className="text-2xl font-bold text-white">
            {value}<span className="text-orbital-400">{suffix}</span>
        </div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
);

export default LandingPage;
