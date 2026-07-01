import { useState, useEffect, useCallback } from 'react';
import { C, s, Toast } from './ui';
import { supabase } from '../supabase';
import RatesSheet from './RatesSheet';

const ROLE_LABEL = { admin: 'Admin', dispatcher: 'Dispečer', mechanic: 'Mechanik' };
const ROLE_COLOR = { admin: C.red, dispatcher: C.blue, mechanic: C.green };

function usernameToEmail(username) {
  return `${username.toLowerCase().trim()}@skootr.internal`;
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...s.label, marginBottom: 5 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={s.input} autoComplete="off" autoCapitalize="none" />
    </div>
  );
}

function Confirm({ msg, onYes, onNo }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, maxWidth: 320, width: '100%' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Potvrdit akci</div>
        <div style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>{msg}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onNo} style={{ ...s.btnSecondary, flex: 1 }}>Zrušit</button>
          <button onClick={onYes} style={{ ...s.btnPrimary, flex: 1, background: C.red }}>Smazat</button>
        </div>
      </div>
    </div>
  );
}

// ── Add User — přihlášení přes username ───────────────────────────────────────
function AddUserSheet({ onClose, onDone }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('mechanic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!name || !username || !password) { setError('Vyplňte všechna pole.'); return; }
    if (password.length < 6) { setError('Heslo musí mít alespoň 6 znaků.'); return; }
    if (!/^[a-z0-9._-]+$/.test(username.toLowerCase())) {
      setError('Uživatelské jméno smí obsahovat jen písmena, číslice, tečku, pomlčku a podtržítko.');
      return;
    }
    setLoading(true); setError('');

    const email = usernameToEmail(username);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, username, role } },
      });

      if (signUpError) throw signUpError;
      if (!data?.user) throw new Error('Uživatel nebyl vytvořen.');

      await supabase.from('users').upsert({ id: data.user.id, name, username, role });

      onDone(`Uživatel ${name} (${username}) byl přidán.`);
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
          <Field label="Uživatelské jméno (pro přihlášení)" value={username} onChange={v => setUsername(v.toLowerCase())} placeholder="pavel.novak" />
          <Field label="Heslo" value={password} onChange={setPassword} placeholder="min. 6 znaků" type="password" />
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
          {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12, padding: '8px 10px', background: '#FEF2F2', borderRadius: 4 }}>{error}</div>}
          <button onClick={handleAdd} disabled={loading}
            style={{ ...s.btnPrimary, width: '100%', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Vytváření...' : 'Přidat uživatele'}
          </button>
          <div style={{ marginTop: 10, fontSize: 12, color: C.sub }}>
            Uživatel se přihlásí uživatelským jménem "{username || 'jmeno'}" a heslem.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Change Password ────────────────────────────────────────────────────────────
function ChangePasswordSheet({ user, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async () => {
    if (password.length < 6) { setError('Heslo musí mít alespoň 6 znaků.'); return; }
    setLoading(true); setError('');
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_user_password', {
        p_user_id: user.id,
        p_password: password,
      });
      if (rpcError) throw rpcError;
      onDone(`Heslo uživatele ${user.name} bylo změněno.`);
      onClose();
    } catch (e) {
      setError(e.message || 'Chyba při změně hesla.');
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
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Změna hesla</div>
            <div style={{ fontSize: 13, color: C.sub }}>{user.name} · @{user.username}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.sub, cursor: 'pointer', padding: 0 }}>×</button>
        </div>
        <div style={{ padding: 16 }}>
          <Field label="Nové heslo" value={password} onChange={setPassword} placeholder="min. 6 znaků" type="password" />
          {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12, padding: '8px 10px', background: '#FEF2F2', borderRadius: 4 }}>{error}</div>}
          <button onClick={handleChange} disabled={loading}
            style={{ ...s.btnPrimary, width: '100%', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Ukládání...' : 'Uložit heslo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sazby per mechanik ────────────────────────────────────────────────────────
function MechanicRatesSheet({ mechanic, onClose, onDone }) {
  const [callout, setCallout] = useState(String(mechanic.rate_callout ?? 40));
  const [kmRate, setKmRate] = useState(String(mechanic.rate_km ?? 1.2));
  const [hourly, setHourly] = useState(String(mechanic.rate_hourly ?? 40));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('users').update({
        rate_callout: parseFloat(callout) || 40,
        rate_km: parseFloat(kmRate) || 1.2,
        rate_hourly: parseFloat(hourly) || 40,
      }).eq('id', mechanic.id);
      if (error) throw error;
      onDone(`Sazby pro ${mechanic.name} uloženy.`);
      onClose();
    } catch (e) {
      onDone('Chyba: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const RateField = ({ label, value, onChange, unit }) => (
    <div style={s.section}>
      <div style={{ ...s.label, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="number" min="0" step="0.1" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...s.input, maxWidth: 120 }} />
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
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Sazby mechanika</div>
            <div style={{ fontSize: 13, color: C.sub }}>{mechanic.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.sub, cursor: 'pointer', padding: 0 }}>×</button>
        </div>
        <RateField label="Výjezdné" value={callout} onChange={setCallout} unit="€ / výjezd" />
        <RateField label="Sazba za km" value={kmRate} onChange={setKmRate} unit="€ / km" />
        <RateField label="Hodinová sazba" value={hourly} onChange={setHourly} unit="€ / hodina" />
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

// ── Stock Sheet ────────────────────────────────────────────────────────────────
function StockSheet({ mechanic, onClose }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('0');
  const [newMin, setNewMin] = useState('1');
  const [newMulti, setNewMulti] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchStock = useCallback(async () => {
    const { data } = await supabase.from('stock_items').select('*')
      .eq('mechanic_id', mechanic.id).order('name');
    setStock(data ?? []);
    setLoading(false);
  }, [mechanic.id]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const adjustQty = async (item, delta) => {
    const next = Math.max(0, item.qty + delta);
    await supabase.from('stock_items').update({ qty: next }).eq('id', item.id);
    setStock(prev => prev.map(i => i.id === item.id ? { ...i, qty: next } : i));
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
    if (data) setStock(prev => [...prev, data]);
    setNewName(''); setNewQty('0'); setNewMin('1'); setNewMulti(false);
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
            <div style={{ fontWeight: 700, fontSize: 17 }}>Sklad — {mechanic.name}</div>
            <div style={{ fontSize: 13, color: C.sub }}>Mechanik</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.sub, cursor: 'pointer', padding: 0 }}>×</button>
        </div>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          <div style={{ ...s.label, marginBottom: 10 }}>Přidat díl</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Název dílu" style={{ ...s.input, flex: 2, minWidth: 140 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: C.sub }}>Qty</span>
              <input value={newQty} onChange={e => setNewQty(e.target.value)} type="number" min="0" style={{ ...s.input, width: 58 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: C.sub }}>Min</span>
              <input value={newMin} onChange={e => setNewMin(e.target.value)} type="number" min="1" style={{ ...s.input, width: 58 }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={newMulti} onChange={e => setNewMulti(e.target.checked)} />
              Vícekusový (šroubky apod.)
            </label>
            <button onClick={addItem} disabled={saving || !newName.trim()}
              style={{ ...s.btnPrimary, fontSize: 13, padding: '7px 14px', opacity: !newName.trim() ? 0.4 : 1 }}>
              {saving ? '...' : '+ Přidat'}
            </button>
          </div>
        </div>
        {loading && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Načítání...</div>}
        {!loading && stock.length === 0 && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Sklad je prázdný.</div>}
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
                  style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Admin ─────────────────────────────────────────────────────────────────
export default function Admin({ onLogout }) {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addUser, setAddUser] = useState(false);
  const [stockFor, setStockFor] = useState(null);
  const [ratesFor, setRatesFor] = useState(null);
  const [globalRatesOpen, setGlobalRatesOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [editRoleFor, setEditRoleFor] = useState(null);
  const [changePwFor, setChangePwFor] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('role').order('name');
    if (!error) setUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = (user) => {
    setConfirm({
      msg: `Opravdu odebrat uživatele ${user.name}? Přijde o přístup do aplikace.`,
      onYes: async () => {
        setConfirm(null);
        await supabase.from('users').delete().eq('id', user.id);
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setToast(`${user.name} byl odebrán.`);
      },
    });
  };

  const handleChangeRole = async (user, newRole) => {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', user.id);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      setToast(`Role ${user.name} změněna na ${ROLE_LABEL[newRole]}.`);
    }
    setEditRoleFor(null);
  };

  const mechanics = users.filter(u => u.role === 'mechanic');

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ fontWeight: 700 }}>
          SkootrServis <span style={{ color: C.sub, fontWeight: 400, fontSize: 12 }}>/ Admin</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setGlobalRatesOpen(true)} style={{ ...s.btnSecondary, fontSize: 12, padding: '6px 10px' }}>Sazby (výchozí)</button>
          <button onClick={() => setAddUser(true)} style={s.btnPrimary}>+ Uživatel</button>
          <button onClick={onLogout} style={s.btnLink}>Odhlásit</button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {[['users', 'Uživatelé'], ['stock', 'Sklady mechaniků']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '11px', background: C.bg, border: 'none', borderBottom: tab === k ? `2px solid ${C.text}` : '2px solid transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === k ? 600 : 400, color: tab === k ? C.text : C.sub, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {tab === 'users' && (
        <div>
          <div style={{ ...s.label, padding: '12px 16px 8px' }}>Všichni uživatelé ({users.length})</div>
          {loading && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Načítání...</div>}
          {users.map(user => (
            <div key={user.id} style={s.section}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                    <span style={{ color: ROLE_COLOR[user.role], fontWeight: 500 }}>{ROLE_LABEL[user.role]}</span>
                    {user.username && <span style={{ marginLeft: 8 }}>@{user.username}</span>}
                    <span style={{ marginLeft: 8 }}>{new Date(user.created_at).toLocaleDateString('cs')}</span>
                  </div>
                  {user.role === 'mechanic' && (
                    <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>
                      Výjezd: {user.rate_callout ?? 40} € · Km: {user.rate_km ?? 1.2} € · Hod: {user.rate_hourly ?? 40} €
                    </div>
                  )}
                </div>

                {user.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditRoleFor(editRoleFor === user.id ? null : user.id)}
                      style={{ ...s.btnSecondary, fontSize: 12, padding: '5px 10px' }}>
                      {editRoleFor === user.id ? 'Zrušit' : 'Role'}
                    </button>
                    <button onClick={() => setChangePwFor(user)}
                      style={{ ...s.btnSecondary, fontSize: 12, padding: '5px 10px' }}>
                      Heslo
                    </button>
                    {user.role === 'mechanic' && (
                      <button onClick={() => setRatesFor(user)}
                        style={{ ...s.btnSecondary, fontSize: 12, padding: '5px 10px' }}>
                        Sazby
                      </button>
                    )}
                    <button onClick={() => handleDelete(user)}
                      style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: '5px 0' }}>
                      Odebrat
                    </button>
                  </div>
                )}
              </div>

              {editRoleFor === user.id && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  {[['mechanic', 'Mechanik'], ['dispatcher', 'Dispečer']].map(([r, l]) => (
                    <button key={r} onClick={() => handleChangeRole(user, r)}
                      style={{ ...s.btnSecondary, fontSize: 12, padding: '6px 12px', fontWeight: user.role === r ? 700 : 400, borderColor: user.role === r ? C.text : C.border }}>
                      {user.role === r ? `✓ ${l}` : l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'stock' && (
        <div>
          <div style={{ ...s.label, padding: '12px 16px 8px' }}>Sklady mechaniků</div>
          {mechanics.length === 0 && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Žádní mechanici v systému.</div>}
          {mechanics.map(m => (
            <div key={m.id} onClick={() => setStockFor(m)} style={s.row}>
              <div>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>@{m.username} · Mechanik</div>
              </div>
              <div style={{ color: C.sub, fontSize: 13 }}>Správa skladu ›</div>
            </div>
          ))}
        </div>
      )}

      {addUser && <AddUserSheet onClose={() => setAddUser(false)} onDone={msg => { setToast(msg); fetchUsers(); }} />}
      {stockFor && <StockSheet mechanic={stockFor} onClose={() => setStockFor(null)} />}
      {ratesFor && <MechanicRatesSheet mechanic={ratesFor} onClose={() => setRatesFor(null)} onDone={msg => { setToast(msg); fetchUsers(); }} />}
      {globalRatesOpen && <RatesSheet onClose={() => setGlobalRatesOpen(false)} onToast={setToast} />}
      {changePwFor && <ChangePasswordSheet user={changePwFor} onClose={() => setChangePwFor(null)} onDone={msg => setToast(msg)} />}
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
