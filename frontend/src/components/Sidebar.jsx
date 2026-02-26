/**
 * Sidebar.jsx — Navigation sidebar with branding and links
 */
import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'history', label: 'History', icon: '📁' },
        { id: 'forecast', label: 'Forecast', icon: '📈' },
        { id: 'advisory', label: 'Advisory', icon: '🌾' },
    ];

    return (
        <aside className="w-64 min-h-screen glass-card-static rounded-none border-r border-white/5 flex flex-col">
            {/* Branding */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orbital-500 to-orbital-700 flex items-center justify-center text-xl shadow-glow-green">
                        🛰
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Orbital</h1>
                        <p className="text-xs text-orbital-400 font-medium -mt-0.5">AGRONOMY</p>
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">STRESS-VISION v1.0</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === item.id
                                ? 'bg-orbital-600/20 text-orbital-300 border border-orbital-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <span className="text-lg">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/5">
                <div className="glass-card p-3 text-center">
                    <p className="text-[10px] text-slate-500 font-mono">POWERED BY</p>
                    <p className="text-xs text-orbital-400 font-semibold">RandomForest AI</p>
                    <p className="text-[10px] text-slate-600 mt-1">Multispectral Analysis</p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
