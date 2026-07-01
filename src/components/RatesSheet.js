import { useState } from 'react';
import { C, s } from './ui';
import { useRates } from '../hooks/useRates';

export default function RatesSheet({ onClose, onToast }) {
  const { rates, updateRates } = useRates();
  const [callout, setCallout] = useState(String(rates.callout));
  const [kmRate, setKmRate] = useState(String(rates.km_rate));
  const [hourly, setHourly] = useState(String(rates.hourly_rate));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRates({
        callout: parseFloat(callout) || 40,
        km_rate: parseFloat(kmRate) || 1.2,
        hourly_rate: parseFloat(hourly) || 40,
      });
      onToast('Sazby uloženy ✓');
      onClose();
    } catch (e) {
      onToast('Chyba při ukládání: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value, onChange, unit }) => (
    <div style={s.section}>
      <div style={{ ...s.label, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="number" min="0" step="0.1"
          value={value} onChange={e => onChange(e.target.value)}
          style={{ ...s.input, maxWidth: 120 }}
        />
        <span style={{ color: C.sub, fontSize: 14 }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2 }} />
        </div>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Nastavení sazeb</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.sub, cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        <Field label="Výjezdné" value={callout} onChange={setCallout} unit="€ / výjezd" />
        <Field label="Sazba za km" value={kmRate} onChange={setKmRate} unit="€ / km" />
        <Field label="Hodinová sazba" value={hourly} onChange={setHourly} unit="€ / hodina" />

        <div style={{ ...s.section, background: '#F0F9FF', fontSize: 13, color: '#0369A1' }}>
          Nové sazby se použijí pro všechny zakázky dokončené od teď. Starší zakázky zůstávají beze změny.
        </div>

        <div style={{ padding: 16 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ ...s.btnPrimary, width: '100%', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Ukládám...' : 'Uložit sazby'}
          </button>
        </div>
      </div>
    </div>
  );
}
