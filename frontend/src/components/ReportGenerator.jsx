/**
 * ReportGenerator.jsx — PDF report download button
 * Generates a comprehensive analysis report as downloadable content
 */
import React, { useState } from 'react';

const ReportGenerator = ({ result }) => {
    const [generating, setGenerating] = useState(false);

    if (!result) return null;

    const generateReport = () => {
        setGenerating(true);

        // Build HTML report content
        const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Orbital Agronomy - Field Analysis Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 3px solid #2d9e47; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; color: #0f172a; }
    .header p { color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 14px; letter-spacing: 1px; margin: 10px 0; }
    .badge-safe { background: #dcfce7; color: #166534; }
    .badge-monitor { background: #fef3c7; color: #92400e; }
    .badge-critical { background: #fecaca; color: #991b1b; }
    .section { margin-bottom: 25px; }
    .section h2 { font-size: 18px; color: #0f172a; border-left: 4px solid #2d9e47; padding-left: 12px; margin-bottom: 12px; }
    .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .metric .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
    .metric .value { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    .stress-bar { height: 20px; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin: 8px 0; }
    .stress-fill { height: 100%; border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
    .advisory { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 15px 0; line-height: 1.6; }
    .footer { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .forecast-table td { font-weight: 600; }
    .img-container { text-align: center; margin: 15px 0; }
    .img-container img { max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛰 Orbital Agronomy</h1>
    <p>Field Stress Analysis Report</p>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
      Generated: ${new Date().toLocaleString()} | File: ${result.fileName}
    </p>
  </div>

  <div class="section">
    <h2>Analysis Summary</h2>
    <div class="metric-grid">
      <div class="metric">
        <div class="label">Stress Level</div>
        <div class="value">${result.stressPercentage.toFixed(1)}%</div>
        <div class="stress-bar">
          <div class="stress-fill" style="width: ${result.stressPercentage}%; background: ${result.alertLevel === 'SAFE' ? '#22c55e' :
                result.alertLevel === 'MONITOR' ? '#f59e0b' : '#ef4444'
            };"></div>
        </div>
      </div>
      <div class="metric">
        <div class="label">Alert Level</div>
        <div class="value">
          <span class="badge ${result.alertLevel === 'SAFE' ? 'badge-safe' :
                result.alertLevel === 'MONITOR' ? 'badge-monitor' : 'badge-critical'
            }">${result.alertLevel}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Stress Distribution</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Coverage</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr><td>🟢 Healthy</td><td>${result.distribution?.healthy?.toFixed(1)}%</td><td>No action needed</td></tr>
        <tr><td>🟡 Moderate</td><td>${result.distribution?.moderate?.toFixed(1)}%</td><td>Monitor closely</td></tr>
        <tr><td>🔴 Critical</td><td>${result.distribution?.critical?.toFixed(1)}%</td><td>Immediate action required</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Stress-Vision Overlay</h2>
    <div class="img-container">
      <img src="data:image/png;base64,${result.overlayImage}" alt="Stress-Vision Heatmap" />
    </div>
    <p style="text-align: center; font-size: 12px; color: #64748b; margin-top: 8px;">
      Blue = Healthy | Yellow = Moderate | Red = Critical
    </p>
  </div>

  <div class="section">
    <h2>7-Day Stress Forecast</h2>
    <table class="forecast-table">
      <thead>
        <tr>${result.forecast?.map((_, i) => `<th>Day ${i + 1}</th>`).join('')}</tr>
      </thead>
      <tbody>
        <tr>${result.forecast?.map((v) => `<td>${v.toFixed(1)}%</td>`).join('')}</tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Farmer Advisory</h2>
    <div class="advisory">
      ${result.advisoryMessage}
    </div>
  </div>

  <div class="section">
    <h2>Spectral Indices Used</h2>
    <table>
      <thead><tr><th>Index</th><th>Formula</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>NDVI</td><td>(NIR − Red) / (NIR + Red)</td><td>Overall vegetation health</td></tr>
        <tr><td>NDRE</td><td>(NIR − RedEdge) / (NIR + RedEdge)</td><td>Early chlorophyll stress</td></tr>
        <tr><td>MSI</td><td>SWIR / NIR</td><td>Moisture stress detection</td></tr>
        <tr><td>Z-Score</td><td>|x − μ| / σ</td><td>Spectral anomaly detection</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Orbital Agronomy — Stress-Vision v1.0 | AI-powered pre-visual crop stress detection</p>
    <p>This report was automatically generated. For detailed analysis, consult your agronomist.</p>
  </div>
</body>
</html>`;

        // Create blob and download
        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orbital-agronomy-report-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setTimeout(() => setGenerating(false), 1000);
    };

    return (
        <button
            onClick={generateReport}
            disabled={generating}
            className="glass-card flex items-center gap-3 w-full hover:border-orbital-500/30 transition-all group cursor-pointer animate-slide-up"
        >
            <div className="w-10 h-10 rounded-xl bg-orbital-600/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                📄
            </div>
            <div className="text-left">
                <p className="text-sm font-semibold text-white">
                    {generating ? 'Generating...' : 'Download Report'}
                </p>
                <p className="text-[10px] text-slate-500">Full analysis as printable HTML report</p>
            </div>
            <div className="ml-auto text-slate-600 group-hover:text-orbital-400 transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3V13M10 13L6 9M10 13L14 9M3 17H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </button>
    );
};

export default ReportGenerator;
