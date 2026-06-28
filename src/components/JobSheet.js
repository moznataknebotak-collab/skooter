import { useState, useRef } from 'react';
import { C, s, STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL, Dot } from './ui';
import PartsPicker from './PartsPicker';
import { useChat } from '../hooks/useChat';

export default function JobSheet({ job, role, stock, onClose, onToast, timerJob, elapsed, onStart, onComplete }) {
  const [view, setView] = useState('detail');
  const [notes, setNotes] = useState('');
  const [selectedParts, setSelectedParts] = useState({});
  const [signed, setSigned] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { messages, sendMessage } = useChat(job?.id);

  const canvasRef = useRef(null);
  const drawing = useRef(false);

  const fmt = sec => `${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  const startDraw = e => {
    drawing.current = true;
    const c = canvasRef.current; const r = c.getBoundingClientRect(); const ctx = c.getContext('2d');
    ctx.beginPath();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - r.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - r.top;
    ctx.moveTo(x, y);
  };
  const draw = e => {
    if (!drawing.current) return; e.preventDefault();
    const c = canvasRef.current; const r = c.getBoundingClientRect(); const ctx = c.getContext('2d');
    ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.lineTo((e.touches?.[0]?.clientX ?? e.clientX) - r.left, (e.touches?.[0]?.clientY ?? e.clientY) - r.top);
    ctx.stroke();
  };
  const endDraw = () => { drawing.current = false; };

  const handleSendChat = async () => {
    if (!chatMsg.trim()) return;
    const text = chatMsg.trim();
    setChatMsg('');
    await sendMessage(text, role);
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await onComplete({ notes, usedParts: selectedParts });
    } catch {
      onToast('Chyba při ukládání');
    } finally {
      setSubmitting(false);
    }
  };

  const usedCount = Object.keys(selectedParts).length;

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: C.sub }}>{job.id}</div>
            <div style={{ fontWeight: 700, fontSize: 17, marginTop: 2 }}>{job.client}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 13, color: STATUS_COLOR[job.status] }}>
              <Dot color={STATUS_COLOR[job.status]} />{STATUS_LABEL[job.status]}
              <span style={{ color: C.sub }}>· {PRIORITY_LABEL[job.priority]}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.sub, cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          {[['detail', 'Detail'], ['chat', `Chat${messages.length > 0 ? ` (${messages.length})` : ''}`], ['sign', 'Podpis']].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{ flex: 1, padding: '9px', background: C.bg, border: 'none', borderBottom: view === k ? `2px solid ${C.text}` : '2px solid transparent', fontFamily: 'inherit', fontSize: 12, fontWeight: view === k ? 600 : 400, color: view === k ? C.text : C.sub, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>

        {/* ── DETAIL ── */}
        {view === 'detail' && (
          <div>
            <div style={s.section}>
              <div style={s.label}>Adresa</div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{job.address}</span>
                <button onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`, '_blank')} style={s.btnLink}>Otevřít mapy</button>
              </div>
            </div>
            <div style={s.section}>
              <div style={s.label}>Skútr</div>
              <div style={{ marginTop: 4 }}>{job.scooter_type}</div>
            </div>
            <div style={s.section}>
              <div style={s.label}>Popis závady</div>
              <div style={{ marginTop: 4, color: C.sub, lineHeight: 1.6 }}>{job.description}</div>
            </div>

            {/* Timer */}
            {role === 'mechanic' && job.status !== 'completed' && (
              <div style={s.section}>
                <div style={s.label}>Čas u zákazníka</div>
                {timerJob === job.id
                  ? <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: C.blue }}>{fmt(elapsed)}</div>
                  : <button onClick={onStart} style={{ ...s.btnPrimary, marginTop: 8 }}>Spustit stopky</button>
                }
              </div>
            )}

            {/* Photos */}
            {role === 'mechanic' && (
              <div style={s.section}>
                <div style={{ ...s.label, marginBottom: 10 }}>Fotodokumentace</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['Před opravou', 'Po opravě'].map(l => (
                    <label key={l} style={{ flex: 1, border: `1px dashed ${C.border}`, borderRadius: 4, padding: '18px 10px', textAlign: 'center', cursor: 'pointer', color: C.sub, fontSize: 13 }}>
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => {
                        // In production: upload to Supabase Storage
                        if (e.target.files[0]) alert(`Foto "${l}" vybráno: ${e.target.files[0].name}`);
                      }} />
                      <div style={{ fontSize: 20, marginBottom: 4 }}>+</div>{l}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Mechanic repair form */}
            {role === 'mechanic' && job.status !== 'completed' && (
              <>
                <div style={s.section}>
                  <div style={{ ...s.label, marginBottom: 6 }}>Provedené opravy</div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Co jste opravili..." style={{ ...s.input, minHeight: 72, resize: 'vertical' }} />
                </div>
                <div style={s.section}>
                  <div style={{ ...s.label, marginBottom: 2 }}>Použité díly ze skladu</div>
                  {usedCount > 0 && (
                    <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>
                      {usedCount} {usedCount === 1 ? 'díl vybrán' : 'díly vybrány'} · celkem {Object.values(selectedParts).reduce((a, b) => a + b, 0)} ks
                    </div>
                  )}
                  <PartsPicker stock={stock} selected={selectedParts} onChange={setSelectedParts} />
                </div>
                <div style={{ padding: 16 }}>
                  <button onClick={handleComplete} disabled={submitting} style={{ ...s.btnPrimary, width: '100%', opacity: submitting ? 0.6 : 1 }}>
                    {submitting ? 'Ukládání...' : 'Dokončit zakázku'}
                  </button>
                </div>
              </>
            )}

            {/* Dispatcher: parts used + billing */}
            {role === 'dispatcher' && job.status === 'completed' && (
              <>
                {job.parts?.length > 0 && (
                  <>
                    <div style={{ ...s.label, padding: '12px 16px 8px' }}>Použité díly</div>
                    {job.parts.map((p, i) => (
                      <div key={i} style={{ ...s.section, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.sub }}>{p.stock_items?.name}</span>
                        <span style={{ fontFamily: 'monospace' }}>{p.qty} ks</span>
                      </div>
                    ))}
                  </>
                )}
                <div style={{ ...s.label, padding: '12px 16px 8px' }}>Vyúčtování</div>
                {[
                  ['Výjezdné', `${job.earnings?.callout ?? 40} €`],
                  [`Kilometry (${job.km_travel ?? 0} km × 1,20 €)`, `${job.earnings?.travel ?? 0} €`],
                  [`Práce (${job.labor_hours ?? 0} h × 40 €)`, `${job.earnings?.labor ?? 0} €`],
                  ['Celkem', `${job.earnings?.total ?? 0} €`],
                ].map(([l, v]) => (
                  <div key={l} style={{ ...s.section, display: 'flex', justifyContent: 'space-between', fontWeight: l === 'Celkem' ? 700 : 400, background: l === 'Celkem' ? C.surface : C.bg }}>
                    <span style={{ color: l === 'Celkem' ? C.text : C.sub }}>{l}</span>
                    <span style={{ fontFamily: 'monospace' }}>{v}</span>
                  </div>
                ))}
                <div style={{ padding: 16 }}>
                  <button onClick={() => onToast('PDF se stahuje...')} style={{ ...s.btnSecondary, width: '100%' }}>Stáhnout PDF report</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CHAT ── */}
        {view === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 400 }}>
            <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.length === 0 && (
                <div style={{ color: C.sub, fontSize: 13 }}>Žádné zprávy. Napište první.</div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from_role === role ? 'flex-end' : 'flex-start' }}>
                  <div style={{ background: m.from_role === role ? C.blue : C.surface, color: m.from_role === role ? '#fff' : C.text, padding: '8px 12px', borderRadius: 8, maxWidth: '80%', fontSize: 13, lineHeight: 1.5 }}>{m.text}</div>
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>
                    {m.from_role === 'dispatcher' ? 'Dispečer' : 'Mechanik'} · {new Date(m.created_at).toLocaleTimeString('cs', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, padding: 12, display: 'flex', gap: 8 }}>
              <input
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Napište zprávu..."
                style={{ ...s.input, flex: 1 }}
              />
              <button onClick={handleSendChat} style={s.btnPrimary}>Odeslat</button>
            </div>
          </div>
        )}

        {/* ── SIGNATURE ── */}
        {view === 'sign' && (
          <div style={{ padding: 16 }}>
            <div style={{ ...s.label, marginBottom: 12 }}>Podpis zákazníka</div>
            {signed
              ? <div style={{ padding: 24, textAlign: 'center', border: `1px solid ${C.green}`, borderRadius: 4, color: C.green, fontWeight: 600 }}>✓ Podpis uložen</div>
              : <>
                  <canvas ref={canvasRef} width={500} height={160}
                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, width: '100%', touchAction: 'none', display: 'block', cursor: 'crosshair' }}
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                  />
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>Zákazník podepisuje prstem nebo myší</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => { const c = canvasRef.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); }} style={{ ...s.btnSecondary, flex: 1 }}>Smazat</button>
                    <button onClick={() => { setSigned(true); onToast('Podpis uložen'); }} style={{ ...s.btnPrimary, flex: 1 }}>Uložit podpis</button>
                  </div>
                </>
            }
          </div>
        )}
      </div>
    </div>
  );
}
