import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
const TOAST_COLORS = {
  success: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#10b981' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#3b82f6' },
};

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter;
    setToasts(prev => {
      const next = [...prev, { id, message, type, exiting: false, createdAt: Date.now() }];
      return next.slice(-5); // Max 5 toasts
    });
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);


  // Workaround: make toast callable methods
  const toastApi = Object.assign((msg, type, dur) => addToast(msg, type, dur), {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur || 6000),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  });

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '420px',
        width: '100%',
        pointerEvents: 'none',
      }}>
        <style>{`
          @keyframes toastSlideIn {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes toastSlideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(120%); opacity: 0; }
          }
          @keyframes toastProgress {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
        {toasts.map(t => {
          const colors = TOAST_COLORS[t.type] || TOAST_COLORS.info;
          return (
            <div
              key={t.id}
              style={{
                background: colors.bg,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                animation: t.exiting ? 'toastSlideOut 0.3s ease forwards' : 'toastSlideIn 0.35s ease',
                pointerEvents: 'auto',
                boxShadow: `0 8px 32px ${colors.bg}`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>
                {TOAST_ICONS[t.type]}
              </span>
              <span style={{
                flex: 1,
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                fontWeight: 500,
              }}>
                {t.message}
              </span>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '0',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '3px',
                background: colors.border,
                borderRadius: '0 0 12px 12px',
                animation: `toastProgress ${t.type === 'error' ? '6s' : '4s'} linear forwards`,
                opacity: 0.6,
              }} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
