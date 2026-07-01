import { useState, useMemo } from 'react';
import { useColors, useStyles, STATUS_LABEL, STATUS_COLOR, Dot, Toast } from './ui';
import { useJobs } from '../hooks/useJobs';
import { useMechanics } from '../hooks/useMechanics';
import { useShoppingList } from '../hooks/useShoppingList';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { exportJobsToCSV } from '../hooks/useExportCSV';
import JobSheet from './JobSheet';
import NewJobSheet from './NewJobSheet';
import Dashboard from './Dashboard';
import RatesSheet from './RatesSheet';
import ThemeToggle from './ThemeToggle';
import OfflineIndicator from './OfflineIndicator';

export default function Dispatcher({ onLogout }) {
  const C = useColors();
  const s = useStyles();
  const { jobs, loading, createJob, updateStatus, refetch } = useJobs();
  const { mechanics } = useMechanics();
  const { lists, resolveList } = useShoppingList(null);
  const { permission, requestPermission } = usePushNotifications();

  const [tab, setTab] = useState('jobs');
  const [selected, setSelected] = useState(null);
  const [newJob, setNewJob] = useState(false);
  const [toast, setToast] = useState(null);
  const [ratesOpen, setRatesOpen] = useState(false);

  // Filters
  const [filterMechanic, setFilterMechanic] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const pendingLists = lists.filter(l => !l.resolved);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (filterMechanic && j.mechanic_id !== filterMechanic) return false;
      if (filterStatus && j.status !== filterStatus) return false;
      if (searchQuery && !j.client.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [jobs, filterMechanic, filterStatus, searchQuery]);

  const handleCreate = async (formData) => {
    await createJob(formData);
    setNewJob(false);
    setToast('Zakázka vytvořena');
    refetch();
  };

  const handleStatusChange = async (jobId, status) => {
    await updateStatus(jobId, status);
    refetch();
  };

  return (
    <div style={s.page}>
      <OfflineIndicator />
      <div style={s.header}>
        <div style={{ fontWeight: 700 }}>SkootrServis <span style={{ color: C.sub, fontWeight: 400, fontSize: 12 }}>/ Dispečer</span></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {permission !== 'granted' && (
            <button onClick={requestPermission} title="Povolit notifikace"
              style={{ ...s.btnSecondary, fontSize: 12, padding: '6px 8px' }}>🔔</button>
          )}
          <ThemeToggle />
          <button onClick={() => setRatesOpen(true)} style={{ ...s.btnSecondary, fontSize: 12, padding: '6px 10px' }}>Sazby</button>
          <button onClick={() => setNewJob(true)} style={s.btnPrimary}>+ Zakázka</button>
          <button onClick={onLogout} style={s.btnLink}>Odhlásit</button>
        </div>
      </div>

      {/* Incoming shopping lists */}
      {pendingLists.map(list => (
        <div key={list.id} style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: C.amber, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
            Nákupní seznam — {new Date(list.sent_at).toLocaleDateString('cs')}
          </div>
          {list.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, fontSize: 13 }}>
              <span style={{ fontFamily: 'monospace', color: C.sub, minWidth: 24, textAlign: 'right' }}>{it.qty}×</span>
              <span style={{ textDecoration: it.done ? 'line-through' : 'none', color: it.done ? C.sub : C.text }}>{it.name}</span>
            </div>
          ))}
          <button onClick={() => resolveList(list.id)} style={{ ...s.btnLink, marginTop: 8, fontSize: 12 }}>Označit jako vyřízeno</button>
        </div>
      ))}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {[['jobs', 'Zakázky'], ['dashboard', 'Přehled']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '11px', background: C.bg, border: 'none', borderBottom: tab === k ? `2px solid ${C.text}` : '2px solid transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === k ? 600 : 400, color: tab === k ? C.text : C.sub, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard jobs={jobs} mechanics={mechanics} />}

      {tab === 'jobs' && (
        <>
          {/* Filters */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Hledat zákazníka..."
              style={{ ...s.input, flex: '1 1 140px', minWidth: 120 }}
            />
            <select value={filterMechanic} onChange={e => setFilterMechanic(e.target.value)}
              style={{ ...s.input, width: 'auto', flex: '0 0 auto' }}>
              <option value="">Všichni mechanici</option>
              {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ ...s.input, width: 'auto', flex: '0 0 auto' }}>
              <option value="">Všechny stavy</option>
              {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button onClick={() => exportJobsToCSV(filteredJobs)} style={{ ...s.btnSecondary, fontSize: 12, padding: '6px 10px' }}>
              ⬇ CSV
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
            {[['Celkem', jobs.length], ['Čeká', jobs.filter(j => j.status === 'pending').length], ['Probíhá', jobs.filter(j => ['on_the_way','at_customer','in_progress'].includes(j.status)).length], ['Hotovo', jobs.filter(j => j.status === 'completed').length]].map(([l, v]) => (
              <div key={l} style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', padding: '12px 16px 8px' }}>
            Zakázky ({filteredJobs.length})
          </div>

          {loading && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Načítání...</div>}
          {!loading && filteredJobs.length === 0 && (
            <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Žádné zakázky neodpovídají filtru.</div>
          )}

          {filteredJobs.map(job => (
            <div key={job.id} onClick={() => setSelected(job)} style={s.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: C.sub, fontFamily: 'monospace' }}>ZAK-{String(job.id).slice(-4).padStart(4, '0')}</span>
                  <span style={{ fontWeight: 600 }}>{job.client}</span>
                  <span style={{ fontSize: 12, color: STATUS_COLOR[job.status] }}><Dot color={STATUS_COLOR[job.status]} />{STATUS_LABEL[job.status] || job.status}</span>
                </div>
                <div style={{ color: C.sub, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.scooter_type} · {job.mechanic?.name}</div>
              </div>
              <div style={{ textAlign: 'right', marginLeft: 12 }}>
                {job.status === 'completed' && <div style={{ fontWeight: 700 }}>{job.earnings?.total} €</div>}
                <div style={{ color: C.sub, fontSize: 12 }}>{new Date(job.created_at).toLocaleDateString('cs')}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {selected && (
        <JobSheet
          job={selected}
          role="dispatcher"
          stock={[]}
          onClose={() => setSelected(null)}
          onToast={setToast}
          onStatusChange={handleStatusChange}
        />
      )}

      {newJob && (
        <NewJobSheet mechanics={mechanics} onClose={() => setNewJob(false)} onCreate={handleCreate} />
      )}

      {ratesOpen && <RatesSheet onClose={() => setRatesOpen(false)} onToast={setToast} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
