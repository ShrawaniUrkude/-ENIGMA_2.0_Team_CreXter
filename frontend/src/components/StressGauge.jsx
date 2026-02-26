/**
 * StressGauge.jsx — Arc gauge showing stress percentage with color-coded alert level
 */
import React from 'react';

const StressGauge = ({ percentage = 0, alertLevel = 'SAFE' }) => {
    const radius = 70;
    const circumference = Math.PI * radius; // Half circle
    const offset = circumference - (percentage / 100) * circumference;

    const colors = {
        SAFE: { stroke: '#22c55e', glow: 'rgba(34, 197, 94, 0.3)', bg: 'bg-green-500/10' },
        MONITOR: { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)', bg: 'bg-amber-500/10' },
        CRITICAL: { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)', bg: 'bg-red-500/10' },
    };

    const color = colors[alertLevel] || colors.SAFE;

    return (
        <div className="glass-card animate-slide-up">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.stroke }} />
                Stress Level
            </h3>

            <div className="flex flex-col items-center">
                <svg width="180" height="100" viewBox="0 0 180 100" className="overflow-visible">
                    {/* Background arc */}
                    <path
                        d="M 10 90 A 70 70 0 0 1 170 90"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    {/* Stress arc */}
                    <path
                        d="M 10 90 A 70 70 0 0 1 170 90"
                        fill="none"
                        stroke={color.stroke}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="gauge-arc"
                        style={{ filter: `drop-shadow(0 0 8px ${color.glow})` }}
                    />
                </svg>

                {/* Percentage display */}
                <div className="-mt-14 text-center">
                    <span className="text-3xl font-bold text-white">{percentage.toFixed(1)}</span>
                    <span className="text-lg text-slate-400">%</span>
                </div>

                {/* Alert badge */}
                <div className={`mt-3 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider ${alertLevel === 'SAFE' ? 'badge-safe' :
                        alertLevel === 'MONITOR' ? 'badge-monitor' : 'badge-critical'
                    }`}>
                    {alertLevel === 'SAFE' ? '✅' : alertLevel === 'MONITOR' ? '⚠️' : '🚨'} {alertLevel}
                </div>
            </div>
        </div>
    );
};

export default StressGauge;
