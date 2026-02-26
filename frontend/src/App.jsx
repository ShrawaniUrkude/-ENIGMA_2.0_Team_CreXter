/**
 * App.jsx — Main Application Component
 * ========================================
 * Orbital Agronomy Dashboard
 *
 * Orchestrates the full UI: landing page, sidebar navigation, file upload,
 * image viewer with layer toggles, stress gauge, charts, forecast,
 * advisory panels, comparison slider, report generator, and toast notifications.
 */
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';
import UploadPanel from './components/UploadPanel';
import ImageViewer from './components/ImageViewer';
import StressGauge from './components/StressGauge';
import StressChart from './components/StressChart';
import HistoryTimeline from './components/HistoryTimeline';
import ForecastPanel from './components/ForecastPanel';
import AdvisoryPanel from './components/AdvisoryPanel';
import AlertBadge from './components/AlertBadge';
import MapView from './components/MapView';
import ComparisonSlider from './components/ComparisonSlider';
import ReportGenerator from './components/ReportGenerator';
import LoadingOverlay from './components/LoadingOverlay';
import { ToastProvider, useToast } from './components/Toast';
import { analyzeField, getResults } from './api';

const AppContent = () => {
    const [showLanding, setShowLanding] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const toast = useToast();

    // Fetch historical results on mount
    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await getResults();
            if (res.success) {
                setHistory(res.data);
            }
        } catch (err) {
            // Silent fail for history fetch
        }
    };

    const handleAnalyze = async (file, coords) => {
        setIsLoading(true);
        setError(null);
        toast.info(`Analyzing ${file.name}...`);

        try {
            const res = await analyzeField(file, coords);
            if (res.success) {
                setResult(res.data);
                fetchHistory();
                const level = res.data.alertLevel;
                if (level === 'SAFE') toast.success(`Analysis complete — Field is healthy (${res.data.stressPercentage.toFixed(1)}% stress)`);
                else if (level === 'MONITOR') toast.warning(`Moderate stress detected: ${res.data.stressPercentage.toFixed(1)}%`);
                else toast.error(`CRITICAL stress: ${res.data.stressPercentage.toFixed(1)}% — Immediate action required!`);
            } else {
                setError(res.error || 'Analysis failed');
                toast.error('Analysis failed');
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Analysis failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    // Show landing page
    if (showLanding) {
        return <LandingPage onEnter={() => setShowLanding(false)} />;
    }

    // ── Render Tab Content ────────────────────────────────────────
    const renderDashboard = () => (
        <div className="space-y-6 animate-fade-in">
            {/* Top Section: Upload + Image Viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <UploadPanel onAnalyze={handleAnalyze} isLoading={isLoading} />

                    {/* Error display */}
                    {error && (
                        <div className="glass-card border-red-500/30 animate-slide-up">
                            <p className="text-sm text-red-400">❌ {error}</p>
                        </div>
                    )}

                    {result && (
                        <StressGauge
                            percentage={result.stressPercentage}
                            alertLevel={result.alertLevel}
                        />
                    )}

                    {/* Report Download */}
                    <ReportGenerator result={result} />
                </div>
                <div className="lg:col-span-2">
                    <ImageViewer result={result} />
                </div>
            </div>

            {/* Stats Row */}
            {result && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-slide-up">
                    <StatCard icon="🎯" label="Stress Level" value={`${result.stressPercentage.toFixed(1)}%`} />
                    <StatCard icon="🏷" label="Alert Status" value={<AlertBadge level={result.alertLevel} size="sm" />} />
                    <StatCard icon="🌱" label="Healthy Area" value={`${result.distribution?.healthy?.toFixed(1)}%`} />
                    <StatCard icon="📊" label="File" value={result.fileName} />
                </div>
            )}

            {/* Comparison Slider */}
            {result && (
                <ComparisonSlider
                    leftImage={result.rgbImage}
                    rightImage={result.overlayImage}
                    leftLabel="RGB Original"
                    rightLabel="Stress-Vision AI"
                />
            )}

            {/* Charts Row */}
            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <StressChart distribution={result.distribution} />
                    <ForecastPanel forecast={result.forecast} currentStress={result.stressPercentage} />
                </div>
            )}

            {/* History */}
            <HistoryTimeline history={history} />

            {/* Map */}
            {result?.coordinates?.lat && (
                <MapView coordinates={result.coordinates} />
            )}
        </div>
    );

    const renderHistory = () => (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white">Analysis History</h2>
            <HistoryTimeline history={history} />

            {history.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {history.map((item) => (
                        <div key={item._id} className="glass-card hover:border-orbital-500/30 cursor-pointer transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-white truncate max-w-[60%]">{item.fileName}</span>
                                <AlertBadge level={item.alertLevel} size="sm" />
                            </div>
                            <p className="text-xs text-slate-500">
                                {new Date(item.createdAt).toLocaleString()}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${item.stressPercentage}%`,
                                            backgroundColor:
                                                item.stressPercentage < 30 ? '#22c55e' :
                                                    item.stressPercentage < 60 ? '#f59e0b' : '#ef4444',
                                        }}
                                    />
                                </div>
                                <span className="text-xs text-slate-400">{item.stressPercentage?.toFixed(1)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card text-center py-12">
                    <p className="text-slate-500 text-sm">No analysis history yet</p>
                </div>
            )}
        </div>
    );

    const renderForecast = () => (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white">Stress Forecast</h2>
            <ForecastPanel
                forecast={result?.forecast || []}
                currentStress={result?.stressPercentage || 0}
            />
            {result && (
                <div className="glass-card">
                    <h3 className="text-sm font-semibold text-white mb-3">Forecast Summary</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                        Based on current stress level of <strong>{result.stressPercentage.toFixed(1)}%</strong>,
                        the model projects {result.forecast[6] > result.stressPercentage ? 'an increase' : 'a decrease'} in
                        stress over the next 7 days. {result.forecast[6] > 60
                            ? 'Critical levels may be reached — immediate intervention recommended.'
                            : 'Levels are expected to remain manageable with standard practices.'}
                    </p>
                </div>
            )}
        </div>
    );

    const renderAdvisory = () => (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white">Farmer Advisory</h2>
            <AdvisoryPanel
                advisory={result?.advisoryMessage || ''}
                alertLevel={result?.alertLevel || 'SAFE'}
                stressPercentage={result?.stressPercentage || 0}
            />
        </div>
    );

    const tabContent = {
        dashboard: renderDashboard,
        history: renderHistory,
        forecast: renderForecast,
        advisory: renderAdvisory,
    };

    return (
        <>
            <LoadingOverlay isVisible={isLoading} />
            <div className="flex min-h-screen">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <main className="flex-1 px-6 py-6 overflow-y-auto">
                    {/* Header */}
                    <header className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">
                                {activeTab === 'dashboard' ? 'Mission Control' :
                                    activeTab === 'history' ? 'Analysis History' :
                                        activeTab === 'forecast' ? 'Stress Forecast' : 'Farmer Advisory'}
                            </h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Pre-visual crop stress detection powered by multispectral AI
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-orbital-400 animate-pulse" />
                            <span className="text-xs text-slate-500 font-mono">SYSTEM ONLINE</span>
                        </div>
                    </header>

                    {/* Tab Content */}
                    {tabContent[activeTab]?.()}
                </main>
            </div>
        </>
    );
};

// ── Stat Card sub-component ──────────────────────────────────────
const StatCard = ({ icon, label, value }) => (
    <div className="glass-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">
            {icon}
        </div>
        <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
            <div className="text-sm font-semibold text-white mt-0.5 truncate max-w-[150px]">{value}</div>
        </div>
    </div>
);

// ── Root App with Toast Provider ─────────────────────────────────
const App = () => (
    <ToastProvider>
        <AppContent />
    </ToastProvider>
);

export default App;
