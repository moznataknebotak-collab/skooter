import { useState } from 'react';
import { C, s, STATUS_LABEL, STATUS_COLOR, Dot, Toast } from './ui';
import { useJobs } from '../hooks/useJobs';
import { useMechanics } from '../hooks/useMechanics';
import { useShoppingList } from '../hooks/useShoppingList';
import JobSheet from './JobSheet';
import NewJobSheet from './NewJobSheet';

export default function Dispatcher({ profile, onLogout }) {
  const { jobs, loading, createJob, refetch } = useJobs();
  const { mechanics } = useMechanics();
  const { lists, resolveList } = useShoppingList(null); // dispatcher sees all
  const [selected, setSelected] = useState(null);
  const [newJob, setNewJob] = useState(false);
  const [toast, setToast] = useState(null);

  const pendingLists = lists.filter(l => !l.resolved);

  const handleCreate = async (formData) => {
    await createJob(formData);
    setNewJob(false);
    setToast('Zakázka vytvořena');
    refetch();
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ fontWeight: 700 }}>SkootrServis <span style={{ color: C.sub, fontWeight: 400, fontSize: 12 }}>/ Dispečer</span></div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => setNewJob(true)} style={s.btnPrimary}>+ Zakázka</button>
          <button onClick={onLogout} style={s.btnLink}>Odhlásit</button>
        </div>
      </div>

      {/* Incoming shopping lists */}
      {pendingLists.map(list => (
        <div key={list.id} style={{ background: '#FFFBEB', borderBottom: `1px solid #FDE68A`, padding: '12px 16px' }}>
          <div style={{ ...s.label, color: C.amber, marginBottom: 8 }}>
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

      {/* Stats */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {[['Celkem', jobs.length], ['Čeká', jobs.filter(j => j.status === 'pending').length], ['Probíhá', jobs.filter(j => j.status === 'in_progress').length], ['Hotovo', jobs.filter(j => j.status === 'completed').length]].map(([l, v]) => (
          <div key={l} style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${C.border}` }}>
            <div style={s.label}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Mechanics */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ ...s.label, marginBottom: 10 }}>Mechanici</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {mechanics.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...s.label, padding: '12px 16px 8px' }}>Zakázky</div>

      {loading && <div style={{ padding: 20, color: C.sub, fontSize: 13 }}>Načítání...</div>}

      {jobs.map(job => (
        <div key={job.id} onClick={() => setSelected(job)} style={s.row}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: C.sub, fontFamily: 'monospace' }}>ZAK-{String(job.id).slice(-4).padStart(4, '0')}</span>
              <span style={{ fontWeight: 600 }}>{job.client}</span>
              <span style={{ fontSize: 12, color: STATUS_COLOR[job.status] }}><Dot color={STATUS_COLOR[job.status]} />{STATUS_LABEL[job.status]}</span>
            </div>
            <div style={{ color: C.sub, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.scooter_type} · {job.mechanic?.name}</div>
          </div>
          <div style={{ textAlign: 'right', marginLeft: 12 }}>
            {job.status === 'completed' && <div style={{ fontWeight: 700 }}>{job.earnings?.total} €</div>}
            <div style={{ color: C.sub, fontSize: 12 }}>{new Date(job.created_at).toLocaleDateString('cs')}</div>
          </div>
        </div>
      ))}

      {selected && (
        <JobSheet
          job={selected}
          role="dispatcher"
          stock={[]}
          onClose={() => setSelected(null)}
          onToast={setToast}
        />
      )}

      {newJob && (
        <NewJobSheet
          mechanics={mechanics}
          onClose={() => setNewJob(false)}
          onCreate={handleCreate}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
