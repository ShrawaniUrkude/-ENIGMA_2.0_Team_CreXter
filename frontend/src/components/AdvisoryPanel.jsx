/**
 * AdvisoryPanel.jsx — Farmer advisory message + SMS alert template
 */
import React, { useState } from 'react';

const AdvisoryPanel = ({ advisory = '', alertLevel = 'SAFE', stressPercentage = 0 }) => {
    const [copied, setCopied] = useState(false);

    if (!advisory) {
        return (
            <div className="glass-card animate-slide-up">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orbital-400" />
                    Farmer Advisory
                </h3>
                <div className="h-20 flex items-center justify-center">
                    <p className="text-xs text-slate-500">Run an analysis to get advisory</p>
                </div>
            </div>
        );
    }

    const smsTemplate = `[ORBITAL AGRONOMY ALERT]\nField Status: ${alertLevel}\nStress Level: ${stressPercentage.toFixed(1)}%\n${alertLevel === 'CRITICAL'
            ? 'URGENT: Immediate inspection required. Contact your agronomist.'
            : alertLevel === 'MONITOR'
                ? 'Advisory: Check soil moisture and inspect affected zones within 48hrs.'
                : 'All clear. Next scan recommended in 7 days.'
        }`;

    const handleCopy = () => {
        navigator.clipboard.writeText(smsTemplate);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const borderColor =
        alertLevel === 'CRITICAL' ? 'border-red-500/30' :
            alertLevel === 'MONITOR' ? 'border-amber-500/30' : 'border-green-500/30';

    return (
        <div className="glass-card animate-slide-up">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orbital-400" />
                Farmer Advisory
            </h3>

            {/* Advisory Message */}
            <div className={`p-4 rounded-xl bg-white/5 border ${borderColor} text-sm text-slate-300 leading-relaxed`}>
                {advisory}
            </div>

            {/* SMS Template */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 font-mono">SMS ALERT TEMPLATE</span>
                    <button
                        onClick={handleCopy}
                        className="text-xs text-orbital-400 hover:text-orbital-300 transition-colors"
                    >
                        {copied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                </div>
                <pre className="p-3 rounded-lg bg-black/30 border border-white/5 text-xs text-slate-400 font-mono whitespace-pre-wrap">
                    {smsTemplate}
                </pre>
            </div>
        </div>
    );
};

export default AdvisoryPanel;
