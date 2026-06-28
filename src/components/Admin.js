import { useState, useEffect, useCallback } from 'react';
import { C, s, Toast } from './ui';
import { supabase } from '../supabase';

// ── Helpers ────────────────────────────────────────────────────────────────────
const ROLE_LABEL = { admin: 'Admin', dispatcher: 'Dispečer', mechanic: 'Mechanik' };
const ROLE_COLOR = { admin: C.red, dispatcher: C.blue, mechanic: C.green };

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...s.label, marginBottom: 5 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={s.input} />
    </div>
  );
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────
function Confirm({ msg, onYes, onNo }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, maxWidth: 320, width: '100%' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Potvrdit akci</div>
        <div style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>{msg}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onNo} style={{ ...s.btnSecondary, flex: 1 }}>Zrušit</button>
          <button onClick={onYes} style={{ ...s.btnPrimary, flex: 1, background: C.red }}>Potvrdit</button>
        </div>
      </div>
    </div>
  );
}

// ── Add User Sheet ─────────────────────────────────────────────────────────────
function AddUserSheet({ onClose, onDone }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('mechanic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!name || !email || !password) { setError('Vyplňte všechna pole.'); return; }
    setLoading(true); setError('');
    try {
      // Create auth user via Supabase Admin API (needs service role — done via edge function)
      const { data, error: fnErr } = await supabase.functions.invoke('admin-create-user', {
        body: { name, email, password, role },
      });
      if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error);
      onDone(`Uživatel ${name} byl přidán.`);
      onClose();
    } catch (e) {
      setError(e.message || 'Chyba při vytváření uživatele.');
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
          <div style={{ fontWeight: 700, fontSize: 17 }}>Přidat uživatele</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.sub, cursor: 'pointer', padding: 0 }}>×</button>
        </div>
        <div style={{ padding: 16 }}>
          <Field label="Jméno a příjmení" value={name} onChange={setName} placeholder="Pavel Novák" />
          <Field label="E-mail" value={email} onChange={setEmail} placeholder="pavel@skootr.cz" type="email" />
          <Field label="Heslo" value={password} onChange={setPassword} placeholder="min. 8 znaků" type="password" />
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...s.label, marginBottom: 8 }}>Role</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['mechanic', 'Mechanik'], ['dispatcher', 'Dispečer']].map(([r, l]) => (
                <button key={r} onClick={() => setRole(r)}
                  style={{ ...s.btnSecondary, fontWeight: role === r ? 700 : 400, borderColor: role === r ? C.text : C.border }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button onClick={handleAdd} disabled={loading}
            style={{ ...s.btnPrimary, width: '100%', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Přidávání...' : 'Přidat uživatele'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stock Sheet (per mechanic) ─────────────────────────────────────────────────
function StockSheet({ mechanic, onClose }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newMin, setNewMin] = useState('1');
  const [newMulti, setNewMulti] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchStock = useCallback(async () => {
    const { data } = await supabase
      .from('stock_items')
      .select('*')
      .eq('mechanic_id', mechanic.id)
      .order('name');
    setStock(data ?? []);
    setLoading(false);
  }, [mechanic.id]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const adjustQty = async (item, delta) => {
    const newQty = Math.max(0, item.qty + delta);
    await supabase.from('stock_items').update({ qty: newQty }).eq('id', item.id);
    setStock(prev => prev.map(i => i.id === item.id ? { ...i, qty: newQty } : i));
  };

  const removeItem = async (id) => {
    await supabase.from('stock_items').delete().eq('id', id);
    setStock(prev => prev.filter(i => i.id !== id));
  };

  const addItem = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('stock_items')
      .insert([{ mechanic_id: mechanic.id, name: newName.trim(), qty: Number(newQty) || 0, min_qty: Number(newMin) || 1, multi: newMulti }])
      .select().single();
    setStock(prev => [...prev, data]);
    setNewName(''); setNewQty('1'); setNewMin('1'); setNewMulti(false);
    setSaving(false);
  };

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={{ ...s.sheet, maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2 }} />
        </div>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Sklad</div>
            <div style={{ fontSize: 13, color: C.sub }}>{mechanic.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.sub, cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        {/* Add item form */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          <div style={{ ...s.label, marginBottom: 10 }}>Přidat díl</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Název dílu" style={{ ...s.input, flex: 2, minWidth: 140 }} />
            <input value={newQty} onChange={e => setNewQty(e.target.value)}
              type="number" min="0" placeholder="Qty" style={{ ...s.input, width: 60 }} />
            <input value={newMin} onChange={e => setNewMin(e.target.value)}
              type="number" min="1" placeholder="Min" style={{ ...s.input, width: 60 }} />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={newMulti} onChange={e => setNewMulti(e.target.checked)} />
              Vícekusový (šroubky, atd.)
            </label>
          </div>
          <button onClick={addItem} disabled={saving || !newName.trim()}
            style={{ ...s.btnPrimary, fontSize: 13, padding: '7px 14px', opacity: !newName.trim() ? 0.4 : 1 }}>
            {saving ? 'Přidávám...' : '+ Přidat'}
          </button>
        </div>

        {/* Stock list */}
        {loading && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Načítání...</div>}
        {stock.map(item => {
          const low = item.qty <= item.min_qty;
          const out = item.qty === 0;
          return (
            <div key={item.id} style={{ ...s.section, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: out ? C.red : C.text }}>{item.name}</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                  Min: {item.min_qty} · {item.multi ? 'Vícekusový' : 'Jednokusový'}
                  {low && <span style={{ color: out ? C.red : C.amber, marginLeft: 6 }}>{out ? '· Vyprodáno' : '· Nízký stav'}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => adjustQty(item, -1)} style={{ ...s.btnSecondary, padding: '3px 9px', fontSize: 15 }}>−</button>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, minWidth: 28, textAlign: 'center', color: out ? C.red : low ? C.amber : C.text }}>{item.qty}</span>
                <button onClick={() => adjustQty(item, +1)} style={{ ...s.btnSecondary, padding: '3px 9px', fontSize: 15 }}>+</button>
                <button onClick={() => removeItem(item.id)}
                  style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
              </div>
            </div>
          );
        })}
        {!loading && stock.length === 0 && (
          <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Sklad je prázdný. Přidejte první díl výše.</div>
        )}
      </div>
    </div>
  );
}

// ── Main Admin component ───────────────────────────────────────────────────────
export default function Admin({ onLogout }) {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addUser, setAddUser] = useState(false);
  const [stockFor, setStockFor] = useState(null); // mechanic object
  const [confirm, setConfirm] = useState(null);   // { msg, onYes }
  const [editRole, setEditRole] = useState(null);  // { user, role }
  const [toast, setToast] = useState(null);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('users').select('*').order('role').order('name');
    setUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDeleteUser = (user) => {
    setConfirm({
      msg: `Opravdu smazat uživatele ${user.name}? Tato akce je nevratná.`,
      onYes: async () => {
        setConfirm(null);
        await supabase.functions.invoke('admin-delete-user', { body: { userId: user.id } });
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setToast(`${user.name} byl smazán.`);
      },
    });
  };

  const handleChangeRole = async (user, newRole) => {
    await supabase.from('users').update({ role: newRole }).eq('id', user.id);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    setEditRole(null);
    setToast(`Role ${user.name} změněna na ${ROLE_LABEL[newRole]}.`);
  };

  const mechanics = users.filter(u => u.role === 'mechanic');

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ fontWeight: 700 }}>
          SkootrServis <span style={{ color: C.sub, fontWeight: 400, fontSize: 12 }}>/ Admin</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => setAddUser(true)} style={s.btnPrimary}>+ Uživatel</button>
          <button onClick={onLogout} style={s.btnLink}>Odhlásit</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {[['users', 'Uživatelé'], ['stock', 'Sklady mechaniků']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '11px', background: C.bg, border: 'none', borderBottom: tab === k ? `2px solid ${C.text}` : '2px solid transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === k ? 600 : 400, color: tab === k ? C.text : C.sub, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div>
          <div style={{ ...s.label, padding: '12px 16px 8px' }}>
            Všichni uživatelé ({users.length})
          </div>
          {loading && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Načítání...</div>}
          {users.map(user => (
            <div key={user.id} style={{ ...s.section, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                  {/* Role badge */}
                  <span style={{ color: ROLE_COLOR[user.role], fontWeight: 500 }}>{ROLE_LABEL[user.role]}</span>
                  <span style={{ marginLeft: 8 }}>{new Date(user.created_at).toLocaleDateString('cs')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Change role */}
                {editRole?.user.id === user.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['mechanic', 'Mechanik'], ['dispatcher', 'Dispečer']].map(([r, l]) => (
                      <button key={r} onClick={() => handleChangeRole(user, r)}
                        style={{ ...s.btnSecondary, fontSize: 12, padding: '5px 10px', fontWeight: editRole.user.role === r ? 700 : 400 }}>
                        {l}
                      </button>
                    ))}
                    <button onClick={() => setEditRole(null)} style={{ ...s.btnLink, fontSize: 12 }}>Zrušit</button>
                  </div>
                ) : (
                  <>
                    {user.role !== 'admin' && (
                      <button onClick={() => setEditRole({ user })}
                        style={{ ...s.btnSecondary, fontSize: 12, padding: '5px 10px' }}>
                        Změnit roli
                      </button>
                    )}
                    {user.role !== 'admin' && (
                      <button onClick={() => handleDeleteUser(user)}
                        style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                        Smazat
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── STOCK TAB ── */}
      {tab === 'stock' && (
        <div>
          <div style={{ ...s.label, padding: '12px 16px 8px' }}>
            Sklady mechaniků
          </div>
          {mechanics.length === 0 && (
            <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Žádní mechanici.</div>
          )}
          {mechanics.map(m => (
            <div key={m.id} onClick={() => setStockFor(m)} style={s.row}>
              <div>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Mechanik</div>
              </div>
              <div style={{ color: C.sub, fontSize: 13 }}>Správa skladu ›</div>
            </div>
          ))}
        </div>
      )}

      {addUser && (
        <AddUserSheet
          onClose={() => setAddUser(false)}
          onDone={msg => { setToast(msg); fetchUsers(); }}
        />
      )}

      {stockFor && (
        <StockSheet
          mechanic={stockFor}
          onClose={() => setStockFor(null)}
        />
      )}

      {confirm && (
        <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
