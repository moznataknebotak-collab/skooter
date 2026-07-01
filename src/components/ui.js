import { useEffect, useState, createContext, useContext } from 'react';

// ── Theme context ──────────────────────────────────────────────────────────────
const ThemeContext = createContext({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage?.getItem?.('skootr-theme') === 'dark');
  const toggle = () => setDark(d => {
    const next = !d;
    try { localStorage.setItem('skootr-theme', next ? 'dark' : 'light'); } catch {}
    return next;
  });
  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}

// ── Tokens (light) ────────────────────────────────────────────────────────────
const LIGHT = {
  bg: '#ffffff', surface: '#f8f8f8', border: '#e5e5e5',
  text: '#111111', sub: '#666666',
  blue: '#2563EB', red: '#DC2626', green: '#16A34A', amber: '#D97706',
};
const DARK = {
  bg: '#0f1115', surface: '#181b21', border: '#2a2e37',
  text: '#f0f0f0', sub: '#9aa0ad',
  blue: '#3B82F6', red: '#F87171', green: '#4ADE80', amber: '#FBBF24',
};

// Static export for non-component use (kept light by default; components should use useColors())
export const C = LIGHT;

export function useColors() {
  const { dark } = useTheme();
  return dark ? DARK : LIGHT;
}

export function useStyles() {
  const c = useColors();
  return {
    page: { minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14 },
    header: { borderBottom: `1px solid ${c.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: c.bg, position: 'sticky', top: 0, zIndex: 50 },
    row: { borderBottom: `1px solid ${c.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: c.bg },
    label: { fontSize: 11, color: c.sub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' },
    section: { borderBottom: `1px solid ${c.border}`, padding: '14px 16px' },
    input: { width: '100%', border: `1px solid ${c.border}`, borderRadius: 4, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: c.bg, boxSizing: 'border-box', color: c.text },
    btnPrimary: { background: c.blue, color: '#fff', border: 'none', borderRadius: 4, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
    btnSecondary: { background: 'none', color: c.text, border: `1px solid ${c.border}`, borderRadius: 4, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
    btnLink: { background: 'none', color: c.blue, border: 'none', padding: 0, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
    sheet: { background: c.bg, borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 600, maxHeight: '92vh', overflow: 'auto' },
  };
}

// Static fallback (legacy components not yet migrated to useStyles)
export const s = {
  page: { minHeight: '100vh', background: LIGHT.bg, color: LIGHT.text, fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14 },
  header: { borderBottom: `1px solid ${LIGHT.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: LIGHT.bg, position: 'sticky', top: 0, zIndex: 50 },
  row: { borderBottom: `1px solid ${LIGHT.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: LIGHT.bg },
  label: { fontSize: 11, color: LIGHT.sub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' },
  section: { borderBottom: `1px solid ${LIGHT.border}`, padding: '14px 16px' },
  input: { width: '100%', border: `1px solid ${LIGHT.border}`, borderRadius: 4, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: LIGHT.bg, boxSizing: 'border-box', color: LIGHT.text },
  btnPrimary: { background: LIGHT.blue, color: '#fff', border: 'none', borderRadius: 4, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnSecondary: { background: 'none', color: LIGHT.text, border: `1px solid ${LIGHT.border}`, borderRadius: 4, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
  btnLink: { background: 'none', color: LIGHT.blue, border: 'none', padding: 0, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { background: LIGHT.bg, borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 600, maxHeight: '92vh', overflow: 'auto' },
};

export const STATUS_LABEL = { pending: 'Čeká', on_the_way: 'Na cestě', at_customer: 'U zákazníka', in_progress: 'Probíhá', completed: 'Dokončeno' };
export const STATUS_COLOR = { pending: LIGHT.amber, on_the_way: '#8B5CF6', at_customer: '#0EA5E9', in_progress: LIGHT.blue, completed: LIGHT.green };
export const PRIORITY_LABEL = { high: 'Vysoká', medium: 'Střední', low: 'Nízká' };

export const Dot = ({ color }) => (
  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, marginRight: 5 }} />
);

export const Toast = ({ msg, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 18px', borderRadius: 6, fontSize: 14, zIndex: 999, whiteSpace: 'nowrap' }}>
      {msg}
    </div>
  );
};
