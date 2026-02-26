/**
 * AlertBadge.jsx — Color-coded alert level indicator
 */
import React from 'react';

const AlertBadge = ({ level = 'SAFE', size = 'md' }) => {
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-3 py-1 text-xs',
        lg: 'px-4 py-1.5 text-sm',
    };

    const baseClass = `inline-flex items-center gap-1.5 rounded-full font-bold tracking-wider ${sizeClasses[size]}`;

    if (level === 'SAFE') {
        return <span className={`${baseClass} badge-safe`}>✅ SAFE</span>;
    }
    if (level === 'MONITOR') {
        return <span className={`${baseClass} badge-monitor`}>⚠️ MONITOR</span>;
    }
    return <span className={`${baseClass} badge-critical`}>🚨 CRITICAL</span>;
};

export default AlertBadge;
