import { useState } from 'react';
import { C, s, Dot } from './ui';

export default function NewJobSheet({ mechanics, onClose, onCreate }) {
  const [f, setF] = useState({ client: '', address: '', scooterType: '', description: '', mechanicId: null, priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const set = k => v => setF(p => ({ ...p, [k]: v }));
  const valid = f.client && f.address && f.mechanicId;

  const handleCreate = async () => {
    setLoading(true);
    try {
      await onCreate(f);
    } finally {
      setLoading(false);
    }
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

        {[['client', 'Jméno a příjmení', 'Jana Nováková', false], ['address', 'Adresa', 'Vinohradská 32, Praha 2', false], ['scooterType', 'Typ skútru', 'Xiaomi Mi Pro 2', false], ['description', 'Popis závady', 'Co se strojem je...', true]].map(([k, l, p, multi]) => (
          <div key={k} style={s.section}>
            <div style={{ ...s.label, marginBottom: 6 }}>{l}</div>
            {multi
              ? <textarea value={f[k]} onChange={e => set(k)(e.target.value)} placeholder={p} style={{ ...s.input, minHeight: 72, resize: 'vertical' }} />
              : <input value={f[k]} onChange={e => set(k)(e.target.value)} placeholder={p} style={s.input} />
            }
          </div>
        ))}

        <div style={s.section}>
          <div style={{ ...s.label, marginBottom: 10 }}>Přiřadit mechanika</div>
          {mechanics.map(m => (
            <div key={m.id} onClick={() => set('mechanicId')(m.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{m.name}</span>
              </div>
              {f.mechanicId === m.id && <span style={{ color: C.blue, fontWeight: 700 }}>✓</span>}
            </div>
          ))}
        </div>

        <div style={s.section}>
          <div style={{ ...s.label, marginBottom: 10 }}>Priorita</div>
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
