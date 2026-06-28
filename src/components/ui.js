import { useEffect } from 'react';

// ── Design tokens ──────────────────────────────────────────────────────────────
export const C = {
  bg: '#ffffff',
  surface: '#f8f8f8',
  border: '#e5e5e5',
  text: '#111111',
  sub: '#666666',
  blue: '#2563EB',
  red: '#DC2626',
  green: '#16A34A',
  amber: '#D97706',
};

export const s = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14 },
  header: { borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bg, position: 'sticky', top: 0, zIndex: 50 },
  row: { borderBottom: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: C.bg },
  label: { fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' },
  section: { borderBottom: `1px solid ${C.border}`, padding: '14px 16px' },
  input: { width: '100%', border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: C.bg, boxSizing: 'border-box', color: C.text },
  btnPrimary: { background: C.blue, color: '#fff', border: 'none', borderRadius: 4, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnSecondary: { background: 'none', color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
  btnLink: { background: 'none', color: C.blue, border: 'none', padding: 0, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { background: C.bg, borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 600, maxHeight: '92vh', overflow: 'auto' },
};

export const STATUS_LABEL = { pending: 'Čeká', in_progress: 'Probíhá', completed: 'Dokončeno' };
export const STATUS_COLOR = { pending: C.amber, in_progress: C.blue, completed: C.green };
export const PRIORITY_LABEL = { high: 'Vysoká', medium: 'Střední', low: 'Nízká' };

export const Dot = ({ color }) => (
  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, marginRight: 5 }} />
);

export const Toast = ({ msg, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.text, color: C.bg, padding: '10px 18px', borderRadius: 6, fontSize: 14, zIndex: 999, whiteSpace: 'nowrap' }}>
      {msg}
    </div>
  );
};
