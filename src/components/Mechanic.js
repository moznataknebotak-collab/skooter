import { useState, useEffect, useRef } from 'react';
import { C, s, STATUS_LABEL, STATUS_COLOR, Dot, Toast } from './ui';
import { useJobs } from '../hooks/useJobs';
import { useStock } from '../hooks/useStock';
import { useShoppingList } from '../hooks/useShoppingList';
import JobSheet from './JobSheet';
import ShoppingListSheet from './ShoppingListSheet';

export default function Mechanic({ userId, onLogout }) {
  const { jobs, loading, completeJob, refetch } = useJobs(userId);
  const { stock, adjustQty, addItem } = useStock(userId);
  const { sendList } = useShoppingList(userId);

  const [tab, setTab] = useState('jobs');
  const [selected, setSelected] = useState(null);
  const [timerJob, setTimerJob] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerJob) { timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [timerJob]);

  const fmt = sec => `${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  const lowStock = stock.filter(i => i.qty <= i.min_qty);

  // Auto-suggest low stock items for shopping list
  const suggestedItems = stock
    .filter(i => i.qty <= i.min_qty)
    .map(i => ({ name: i.name, qty: Math.max(1, i.min_qty - i.qty + 2), done: false }));

  const handleComplete = async ({ notes, usedParts }) => {
    const laborHours = elapsed > 0 ? Math.round((elapsed / 3600) * 10) / 10 : 0;
    const kmTravel = 0; // In production: read from GPS tracking
    await completeJob(selected.id, { notes, usedParts, laborHours, kmTravel, mechanicId: userId });
    setTimerJob(null);
    setElapsed(0);
    setToast('Zakázka dokončena, sklad odečten');
    setSelected(null);
    refetch();
  };

  const handleSendShoppingList = async (items) => {
    await sendList(items);
    setToast('Nákupní seznam odeslán dispečerovi ✓');
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ fontWeight: 700 }}>SkootrServis <span style={{ color: C.sub, fontWeight: 400, fontSize: 12 }}>/ Mechanik</span></div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => setShoppingOpen(true)} style={{ ...s.btnSecondary, fontSize: 12, padding: '6px 10px', position: 'relative' }}>
            🛒 Nákupní seznam
            {suggestedItems.length > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, background: C.amber, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {suggestedItems.length}
              </span>
            )}
          </button>
          <button onClick={onLogout} style={s.btnLink}>Odhlásit</button>
        </div>
      </div>

      {timerJob && (
        <div style={{ background: C.blue, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>Probíhá {timerJob}</span>
          <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700, fontSize: 18 }}>{fmt(elapsed)}</span>
          <button onClick={() => { setTimerJob(null); setElapsed(0); setToast('Čas zastaven'); }} style={{ ...s.btnSecondary, color: '#fff', borderColor: 'rgba(255,255,255,0.4)', fontSize: 12, padding: '5px 10px' }}>Stop</button>
        </div>
      )}

      {lowStock.length > 0 && (
        <div style={{ background: '#FFFBEB', borderBottom: `1px solid #FDE68A`, padding: '10px 16px', fontSize: 13, color: C.amber }}>
          Nízký sklad: {lowStock.map(i => i.name).join(', ')}
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {[['jobs', 'Zakázky'], ['stock', 'Sklad'], ['stats', 'Statistiky']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '11px', background: C.bg, border: 'none', borderBottom: tab === k ? `2px solid ${C.text}` : '2px solid transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === k ? 600 : 400, color: tab === k ? C.text : C.sub, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {/* JOBS */}
      {tab === 'jobs' && (
        <>
          {loading && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Načítání...</div>}
          {jobs.map(job => (
            <div key={job.id} onClick={() => setSelected(job)} style={s.row}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: C.sub, fontFamily: 'monospace' }}>ZAK-{String(job.id).slice(-4).padStart(4, '0')}</span>
                  <span style={{ fontWeight: 600 }}>{job.client}</span>
                  <span style={{ fontSize: 12, color: STATUS_COLOR[job.status] }}><Dot color={STATUS_COLOR[job.status]} />{STATUS_LABEL[job.status]}</span>
                </div>
                <div style={{ color: C.sub, fontSize: 13 }}>{job.address}</div>
              </div>
              <div style={{ color: C.sub, fontSize: 20 }}>›</div>
            </div>
          ))}
        </>
      )}

      {/* STOCK */}
      {tab === 'stock' && (
        <div>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
            <span style={s.label}>Skladové zásoby</span>
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

      {/* STATS */}
      {tab === 'stats' && (
        <div>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
            <div style={s.label}>Tento měsíc</div>
          </div>
          {(() => {
            const completed = jobs.filter(j => j.status === 'completed');
            const totalKm = completed.reduce((a, j) => a + (j.km_travel ?? 0), 0);
            const totalH = completed.reduce((a, j) => a + (j.labor_hours ?? 0), 0);
            const callout = completed.length * 40;
            const labor = totalH * 40;
            const km = Math.round(totalKm * 1.2 * 100) / 100;
            const total = callout + labor + km;
            return [['Zakázky', `${completed.length}`], ['Kilometry', `${totalKm} km`], ['Hodiny práce', `${totalH} h`], ['Výjezdné', `${callout} €`], ['Práce', `${labor} €`], ['Km náhrada', `${km} €`], ['Celkem', `${total} €`]].map(([l, v]) => (
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
          timerJob={timerJob}
          elapsed={elapsed}
          onStart={() => setTimerJob(`ZAK-${String(selected.id).slice(-4).padStart(4, '0')}`)}
          onComplete={handleComplete}
        />
      )}

      {shoppingOpen && (
        <ShoppingListSheet
          initialItems={suggestedItems}
          onClose={() => setShoppingOpen(false)}
          onSend={handleSendShoppingList}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
