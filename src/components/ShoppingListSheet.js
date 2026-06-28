import { useState } from 'react';
import { C, s } from './ui';

export default function ShoppingListSheet({ initialItems = [], onClose, onSend }) {
  const [newItem, setNewItem] = useState('');
  const [items, setItems] = useState(initialItems);

  const add = () => {
    if (!newItem.trim()) return;
    setItems(prev => [...prev, { name: newItem.trim(), qty: 1, done: false }]);
    setNewItem('');
  };

  const toggle = i => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, done: !it.done } : it));
  const remove = i => setItems(prev => prev.filter((_, idx) => idx !== i));
  const changeQty = (i, v) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, qty: Math.max(1, Number(v) || 1) } : it));

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2 }} />
        </div>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Nákupní seznam</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.sub, cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Přidat položku..."
            style={{ ...s.input, flex: 1 }}
          />
          <button onClick={add} style={s.btnPrimary}>Přidat</button>
        </div>

        <div>
          {items.length === 0 && (
            <div style={{ padding: '24px 16px', color: C.sub, fontSize: 13 }}>Žádné položky. Přidejte díly které je potřeba dokoupit.</div>
          )}
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
              <div onClick={() => toggle(i)} style={{ width: 18, height: 18, border: `2px solid ${it.done ? C.green : C.border}`, borderRadius: 3, background: it.done ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                {it.done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ flex: 1, textDecoration: it.done ? 'line-through' : 'none', color: it.done ? C.sub : C.text }}>{it.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => changeQty(i, it.qty - 1)} style={{ ...s.btnSecondary, padding: '2px 8px', fontSize: 14 }}>−</button>
                <span style={{ fontFamily: 'monospace', minWidth: 24, textAlign: 'center' }}>{it.qty}</span>
                <button onClick={() => changeQty(i, it.qty + 1)} style={{ ...s.btnSecondary, padding: '2px 8px', fontSize: 14 }}>+</button>
              </div>
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', fontSize: 16, padding: '0 2px' }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ ...s.btnSecondary, flex: 1 }}>Zavřít</button>
          <button
            onClick={() => { onSend(items); onClose(); }}
            style={{ ...s.btnPrimary, flex: 2, opacity: items.length === 0 ? 0.4 : 1 }}
            disabled={items.length === 0}
          >
            Odeslat dispečerovi →
          </button>
        </div>
      </div>
    </div>
  );
}
