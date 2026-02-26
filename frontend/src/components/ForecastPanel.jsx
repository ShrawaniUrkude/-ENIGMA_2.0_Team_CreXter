/**
 * ForecastPanel.jsx — Simulated 7-day stress forecast line chart
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

const ForecastPanel = ({ forecast = [], currentStress = 0 }) => {
    if (!forecast || forecast.length === 0) {
        return (
            <div className="glass-card animate-slide-up">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orbital-400" />
                    7-Day Stress Forecast
                </h3>
                <div className="h-40 flex items-center justify-center">
                    <p className="text-xs text-slate-500">Run an analysis to see forecast</p>
                </div>
            </div>
        );
    }

    const labels = ['Today', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

    const data = {
        labels: labels.slice(0, forecast.length),
        datasets: [
            {
                label: 'Predicted Stress %',
                data: forecast,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                borderWidth: 2,
                pointBackgroundColor: forecast.map((v) =>
                    v < 30 ? '#22c55e' : v < 60 ? '#f59e0b' : '#ef4444'
                ),
                pointBorderColor: 'transparent',
                pointRadius: 5,
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Warning Threshold',
                data: Array(forecast.length).fill(60),
                borderColor: 'rgba(239, 68, 68, 0.3)',
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
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
                cornerRadius: 8,
                padding: 12,
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
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
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    7-Day Stress Forecast
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">SIMULATED</span>
            </div>
            <div className="h-48">
                <Line data={data} options={options} />
            </div>
            <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="w-6 h-0.5 bg-amber-500 inline-block" /> Forecast
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-6 h-0.5 bg-red-500/30 inline-block border-dashed" /> Critical Threshold
                </span>
            </div>
        </div>
    );
};

export default ForecastPanel;
