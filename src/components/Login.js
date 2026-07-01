import { useState } from 'react';
import { useColors, useStyles } from './ui';
import ThemeToggle from './ThemeToggle';

export default function Login({ onLogin }) {
  const C = useColors();
  const s = useStyles();
  const [username, setUsername] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !pw) return;
    setLoading(true); setError('');
    try { await onLogin(username, pw); }
    catch { setError('Nesprávné uživatelské jméno nebo heslo.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}><ThemeToggle /></div>
      <div style={{ width: '100%', maxWidth: 340, padding: 24 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>SkootrServis</div>
          <div style={{ color: C.sub, fontSize: 14 }}>Správa servisních zakázek</div>
        </div>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', marginBottom: 5 }}>Uživatelské jméno</div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="pavel.novak"
                style={s.input}
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', marginBottom: 5 }}>Heslo</div>
              <input
                type="password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                style={s.input}
                autoComplete="current-password"
              />
            </div>
            {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={handleSubmit} disabled={loading} style={{ ...s.btnPrimary, width: '100%', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Přihlašování...' : 'Přihlásit se'}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16, color: C.sub, fontSize: 12 }}>Přihlašovací údaje spravuje administrátor.</div>
      </div>
    </div>
  );
}
