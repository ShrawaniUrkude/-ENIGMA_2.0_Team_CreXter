/**
 * Toast.jsx — Notification toast system
 */
import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info'),
        warning: (msg) => addToast(msg, 'warning'),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} />
        </ToastContext.Provider>
    );
};

const ToastContainer = ({ toasts }) => (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
        {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} />
        ))}
    </div>
);

const ToastItem = ({ toast }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setShow(true));
    }, []);

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️',
    };

    const borders = {
        success: 'border-green-500/30',
        error: 'border-red-500/30',
        info: 'border-blue-500/30',
        warning: 'border-amber-500/30',
    };

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${borders[toast.type]}
        backdrop-blur-md bg-space-900/90 shadow-lg transition-all duration-300
        ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
        >
            <span className="text-lg">{icons[toast.type]}</span>
            <p className="text-sm text-white">{toast.message}</p>
        </div>
    );
};

export default ToastProvider;
