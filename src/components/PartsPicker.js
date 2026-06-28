import { C, s } from './ui';

export default function PartsPicker({ stock, selected, onChange }) {
  const toggle = (item) => {
    if (selected[item.id]) {
      const next = { ...selected };
      delete next[item.id];
      onChange(next);
    } else {
      onChange({ ...selected, [item.id]: 1 });
    }
  };

  const setQty = (item, val) => {
    const n = Math.max(1, Math.min(item.qty, Number(val) || 1));
    onChange({ ...selected, [item.id]: n });
  };

  return (
    <div>
      {stock.map(item => {
        const checked = !!selected[item.id];
        const out = item.qty === 0;
        return (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: `1px solid ${C.border}`, opacity: out ? 0.4 : 1 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: out ? 'default' : 'pointer' }}
              onClick={() => !out && toggle(item)}
            >
              {/* Checkbox */}
              <div style={{ width: 18, height: 18, border: `2px solid ${checked ? C.blue : C.border}`, borderRadius: 3, background: checked ? C.blue : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 14, color: out ? C.sub : C.text }}>{item.name}</div>
                <div style={{ fontSize: 12, color: item.qty <= item.min_qty ? C.amber : C.sub, marginTop: 1 }}>
                  {out ? 'Vyprodáno' : `Skladem: ${item.qty} ks`}
                </div>
              </div>
            </div>

            {checked && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
                {item.multi ? (
                  <>
                    <button onClick={() => setQty(item, selected[item.id] - 1)} style={{ ...s.btnSecondary, padding: '3px 9px', fontSize: 15 }}>−</button>
                    <input
                      type="number" min={1} max={item.qty}
                      value={selected[item.id]}
                      onChange={e => setQty(item, e.target.value)}
                      style={{ ...s.input, width: 48, textAlign: 'center', padding: '4px 6px' }}
                    />
                    <button onClick={() => setQty(item, selected[item.id] + 1)} style={{ ...s.btnSecondary, padding: '3px 9px', fontSize: 15 }}>+</button>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: C.sub, fontFamily: 'monospace' }}>1 ks</span>
                )}
              </div>
            )}
          </div>
        );
      })}
      {stock.length === 0 && (
        <div style={{ color: C.sub, fontSize: 13, padding: '12px 0' }}>Sklad je prázdný.</div>
      )}
    </div>
  );
}
