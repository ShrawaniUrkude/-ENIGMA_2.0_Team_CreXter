/**
 * HistoryTimeline.jsx — Line chart of stress percentage over time from historical results
 */
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const HistoryTimeline = ({ history = [] }) => {
    if (!history || history.length === 0) {
        return (
            <div className="glass-card animate-slide-up">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orbital-400" />
                    Historical Stress Timeline
                </h3>
                <div className="h-40 flex items-center justify-center">
                    <p className="text-xs text-slate-500">No historical data yet. Run multiple analyses to see trends.</p>
                </div>
            </div>
        );
    }

    const labels = history.map((item) => {
        const d = new Date(item.createdAt);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const stressData = history.map((item) => item.stressPercentage);

    const data = {
        labels,
        datasets: [
            {
                label: 'Stress %',
                data: stressData,
                borderColor: '#2d9e47',
                backgroundColor: 'rgba(45, 158, 71, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: stressData.map((v) =>
                    v < 30 ? '#22c55e' : v < 60 ? '#f59e0b' : '#ef4444'
                ),
                pointBorderColor: 'transparent',
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: true,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    label: (ctx) => `Stress: ${ctx.parsed.y.toFixed(1)}%`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10 } },
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.03)' },
                ticks: {
                    color: '#64748b',
                    font: { size: 10 },
                    callback: (v) => `${v}%`,
                },
                min: 0,
                max: 100,
            },
        },
    };

    return (
        <div className="glass-card animate-slide-up">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orbital-400" />
                Historical Stress Timeline
            </h3>
            <div className="h-48">
                <Line data={data} options={options} />
            </div>
        </div>
    );
};

export default HistoryTimeline;
