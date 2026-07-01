import { useState } from 'react';
import { useColors, useStyles, STATUS_LABEL, STATUS_COLOR, Dot, Toast } from './ui';
import { useJobs } from '../hooks/useJobs';
import { useStock } from '../hooks/useStock';
import { useShoppingList } from '../hooks/useShoppingList';
import { usePushNotifications } from '../hooks/usePushNotifications';
import JobSheet from './JobSheet';
import ShoppingListSheet from './ShoppingListSheet';
import ThemeToggle from './ThemeToggle';
import OfflineIndicator from './OfflineIndicator';

export default function Mechanic({ userId, onLogout }) {
  const C = useColors();
  const s = useStyles();
  const { jobs, loading, completeJob, updateStatus, refetch } = useJobs(userId);
  const { stock, adjustQty, addItem } = useStock(userId);
  const { sendList } = useShoppingList(userId);
  const { permission, requestPermission } = usePushNotifications();

  const [tab, setTab] = useState('jobs');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const lowStock = stock.filter(i => i.qty <= i.min_qty);

  const suggestedItems = stock.filter(i => i.qty <= i.min_qty)
    .map(i => ({ name: i.name, qty: Math.max(1, i.min_qty - i.qty + 2), done: false }));

  const handleComplete = async ({ notes, usedParts, kmTravel, laborHours, complexity, signatureData }) => {
    await completeJob(selected.id, { notes, usedParts, laborHours: laborHours || 0, kmTravel: kmTravel || 0, mechanicId: userId, complexity, signatureData });
    setToast('Zakázka dokončena, sklad odečten');
    setSelected(null);
    refetch();
  };

  const handleStatusChange = async (jobId, status) => {
    await updateStatus(jobId, status);
    refetch();
    if (selected?.id === jobId) setSelected(prev => ({ ...prev, status }));
  };

  const handleSendShoppingList = async (items) => {
    await sendList(items);
    setToast('Nákupní seznam odeslán dispečerovi ✓');
  };

  return (
    <div style={s.page}>
      <OfflineIndicator />
      <div style={s.header}>
        <div style={{ fontWeight: 700 }}>SkootrServis <span style={{ color: C.sub, fontWeight: 400, fontSize: 12 }}>/ Mechanik</span></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {permission !== 'granted' && (
            <button onClick={requestPermission} title="Povolit notifikace"
              style={{ ...s.btnSecondary, fontSize: 12, padding: '6px 8px' }}>🔔</button>
          )}
          <ThemeToggle />
          <button onClick={() => setShoppingOpen(true)} style={{ ...s.btnSecondary, fontSize: 12, padding: '6px 10px', position: 'relative' }}>
            🛒
            {suggestedItems.length > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, background: C.amber, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {suggestedItems.length}
              </span>
            )}
          </button>
          <button onClick={onLogout} style={s.btnLink}>Odhlásit</button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '10px 16px', fontSize: 13, color: C.amber }}>
          Nízký sklad: {lowStock.map(i => i.name).join(', ')}
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {[['jobs', 'Zakázky'], ['stock', 'Sklad'], ['stats', 'Statistiky']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '11px', background: C.bg, border: 'none', borderBottom: tab === k ? `2px solid ${C.text}` : '2px solid transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === k ? 600 : 400, color: tab === k ? C.text : C.sub, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {tab === 'jobs' && (
        <>
          {loading && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Načítání...</div>}
          {jobs.map(job => (
            <div key={job.id} onClick={() => setSelected(job)} style={s.row}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: C.sub, fontFamily: 'monospace' }}>ZAK-{String(job.id).slice(-4).padStart(4, '0')}</span>
                  <span style={{ fontWeight: 600 }}>{job.client}</span>
                  <span style={{ fontSize: 12, color: STATUS_COLOR[job.status] }}><Dot color={STATUS_COLOR[job.status]} />{STATUS_LABEL[job.status] || job.status}</span>
                </div>
                <div style={{ color: C.sub, fontSize: 13 }}>{job.address}</div>
                {job.time_window && <div style={{ color: C.blue, fontSize: 12, marginTop: 2 }}>⏱ {job.time_window}</div>}
              </div>
              <div style={{ color: C.sub, fontSize: 20 }}>›</div>
            </div>
          ))}
          {!loading && jobs.length === 0 && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Žádné zakázky.</div>}
        </>
      )}

      {tab === 'stock' && (
        <div>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase' }}>Skladové zásoby</span>
            <button onClick={() => { const name = prompt('Název dílu:'); if (name) addItem(name); }} style={s.btnLink}>+ Přidat díl</button>
          </div>
          {stock.map(item => {
            const low = item.qty <= item.min_qty;
            const out = item.qty === 0;
            return (
              <div key={item.id} style={{ ...s.section, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: out ? 700 : 400, color: out ? C.red : C.text }}>{item.name}</div>
                  {low && <div style={{ fontSize: 12, color: out ? C.red : C.amber, marginTop: 2 }}>{out ? 'Vyprodáno' : 'Nízký stav'}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: out ? C.red : low ? C.amber : C.text, minWidth: 28, textAlign: 'right' }}>{item.qty}</span>
                  <button onClick={() => adjustQty(item.id, -1)} style={{ ...s.btnSecondary, padding: '4px 10px', fontSize: 16 }}>−</button>
                  <button onClick={() => adjustQty(item.id, +1)} style={{ ...s.btnSecondary, padding: '4px 10px', fontSize: 16 }}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'stats' && (
        <div>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase' }}>Tento měsíc</div>
          </div>
          {(() => {
            const completed = jobs.filter(j => j.status === 'completed');
            const totalKm = completed.reduce((a, j) => a + (j.km_travel ?? 0), 0);
            const totalH = completed.reduce((a, j) => a + (j.labor_hours ?? 0), 0);
            const callout = completed.length * 40;
            const labor = totalH * 40;
            const km = Math.round(totalKm * 1.2 * 100) / 100;
            const total = callout + labor + km;
            return [['Zakázky', `${completed.length}`], ['Kilometry', `${totalKm.toFixed(1)} km`], ['Hodiny práce', `${totalH} h`], ['Výjezdné', `${callout} €`], ['Práce', `${labor} €`], ['Km náhrada', `${km} €`], ['Celkem', `${total.toFixed(2)} €`]].map(([l, v]) => (
              <div key={l} style={{ ...s.section, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: l === 'Celkem' ? C.surface : C.bg }}>
                <span style={{ color: l === 'Celkem' ? C.text : C.sub, fontWeight: l === 'Celkem' ? 600 : 400 }}>{l}</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{v}</span>
              </div>
            ));
          })()}
        </div>
      )}

      {selected && (
        <JobSheet
          job={selected}
          role="mechanic"
          stock={stock}
          onClose={() => setSelected(null)}
          onToast={setToast}
          onComplete={handleComplete}
          onStatusChange={handleStatusChange}
        />
      )}

      {shoppingOpen && (
        <ShoppingListSheet initialItems={suggestedItems} onClose={() => setShoppingOpen(false)} onSend={handleSendShoppingList} />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
