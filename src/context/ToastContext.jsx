import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

// Ref para que el `toast` standalone (import { toast }) llegue al provider
let _addToast = null;

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }].slice(-3));
    timers.current[id] = setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  // Compat con la API anterior: toast({ title, description, variant }) -> addToast(message, type)
  const toast = useCallback((props = {}) => {
    const message = props.description || props.title || '';
    const type = props.variant === 'destructive' ? 'error' : 'success';
    return addToast(message, type);
  }, [addToast]);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '350px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '12px 20px', borderRadius: '8px', color: 'white', fontWeight: '500',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            minWidth: '250px',
            background: t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#16a34a' : t.type === 'warning' ? '#d97706' : '#2563eb',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <span>{t.message}</span>
            <button onClick={() => removeToast(t.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '12px', fontSize: '18px', lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Standalone toast (compat): toast({ title, description, variant })
export function toast(props = {}) {
  if (_addToast) {
    const message = props.description || props.title || '';
    const type = props.variant === 'destructive' ? 'error' : 'success';
    return _addToast(message, type);
  }
}