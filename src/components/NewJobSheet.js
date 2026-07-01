import { useState } from 'react';
import { useColors, useStyles } from './ui';
import { useCustomers } from '../hooks/useCustomers';

export default function NewJobSheet({ mechanics, onClose, onCreate }) {
  const C = useColors();
  const s = useStyles();
  const { search } = useCustomers();
  const [f, setF] = useState({ client: '', address: '', scooterType: '', description: '', mechanicId: null, priority: 'medium', timeWindow: '' });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const set = k => v => setF(p => ({ ...p, [k]: v }));
  const valid = f.client && f.address && f.mechanicId;

  const handleClientChange = (v) => {
    set('client')(v);
    setSuggestions(search(v));
  };

  const pickSuggestion = (c) => {
    setF(p => ({ ...p, client: c.client, address: c.address, scooterType: c.scooterType || p.scooterType }));
    setSuggestions([]);
  };

  const handleCreate = async () => {
    setLoading(true);
    try { await onCreate(f); } finally { setLoading(false); }
  };

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2 }} />
        </div>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Nová zakázka</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.sub, cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        {/* Client with autocomplete */}
        <div style={{ ...s.section, position: 'relative' }}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', marginBottom: 6 }}>Jméno a příjmení</div>
          <input value={f.client} onChange={e => handleClientChange(e.target.value)} placeholder="Jana Nováková" style={s.input} />
          {suggestions.length > 0 && (
            <div style={{ position: 'absolute', left: 16, right: 16, top: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {suggestions.map((sg, i) => (
                <div key={i} onClick={() => pickSuggestion(sg)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < suggestions.length-1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{sg.client}</div>
                  <div style={{ fontSize: 11, color: C.sub }}>{sg.address}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={s.section}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', marginBottom: 6 }}>Adresa</div>
          <input value={f.address} onChange={e => set('address')(e.target.value)} placeholder="Vinohradská 32, Praha 2" style={s.input} />
        </div>

        <div style={s.section}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', marginBottom: 6 }}>Typ skútru</div>
          <input value={f.scooterType} onChange={e => set('scooterType')(e.target.value)} placeholder="Xiaomi Mi Pro 2" style={s.input} />
        </div>

        <div style={s.section}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', marginBottom: 6 }}>Popis závady</div>
          <textarea value={f.description} onChange={e => set('description')(e.target.value)} placeholder="Co se strojem je..." style={{ ...s.input, minHeight: 72, resize: 'vertical' }} />
        </div>

        <div style={s.section}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', marginBottom: 6 }}>Časové okno (volitelné)</div>
          <input value={f.timeWindow} onChange={e => set('timeWindow')(e.target.value)} placeholder="14:00 – 16:00" style={s.input} />
        </div>

        <div style={s.section}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', marginBottom: 10 }}>Přiřadit mechanika</div>
          {mechanics.map(m => (
            <div key={m.id} onClick={() => set('mechanicId')(m.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
              <span>{m.name}</span>
              {f.mechanicId === m.id && <span style={{ color: C.blue, fontWeight: 700 }}>✓</span>}
            </div>
          ))}
        </div>

        <div style={s.section}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', marginBottom: 10 }}>Priorita</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['low', 'Nízká'], ['medium', 'Střední'], ['high', 'Vysoká']].map(([k, l]) => (
              <button key={k} onClick={() => set('priority')(k)} style={{ ...s.btnSecondary, fontWeight: f.priority === k ? 700 : 400, borderColor: f.priority === k ? C.text : C.border }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <button disabled={!valid || loading} onClick={handleCreate} style={{ ...s.btnPrimary, width: '100%', opacity: valid && !loading ? 1 : 0.4 }}>
            {loading ? 'Vytváření...' : 'Vytvořit zakázku'}
          </button>
        </div>
      </div>
    </div>
  );
}
