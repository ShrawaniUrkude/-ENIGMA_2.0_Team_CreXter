/**
 * StressChart.jsx — Bar chart showing stress distribution (healthy / moderate / critical)
 */
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StressChart = ({ distribution }) => {
    if (!distribution) return null;

    const data = {
        labels: ['Healthy', 'Moderate', 'Critical'],
        datasets: [
            {
                label: 'Coverage %',
                data: [distribution.healthy, distribution.moderate, distribution.critical],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(239, 68, 68, 0.7)',
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)',
                ],
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false,
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
                    label: (ctx) => `${ctx.parsed.y.toFixed(1)}% of field`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 11, family: 'Inter' } },
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.03)' },
                ticks: {
                    color: '#64748b',
                    font: { size: 11 },
                    callback: (v) => `${v}%`,
                },
                max: 100,
            },
        },
    };

    return (
        <div className="glass-card animate-slide-up">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orbital-400" />
                Stress Distribution
            </h3>
            <div className="h-48">
                <Bar data={data} options={options} />
            </div>
        </div>
    );
};

export default StressChart;
