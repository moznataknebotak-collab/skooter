import { useState, useRef, useEffect } from 'react';
import { C, s, STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL, Dot } from './ui';
import PartsPicker from './PartsPicker';
import { useChat } from '../hooks/useChat';
import { useGPS } from '../hooks/useGPS';
import { uploadPhoto, getJobPhotos } from '../hooks/useStorage';
import { generatePDF } from '../hooks/usePDF';

const STATUS_FLOW = {
  pending:     { next: 'on_the_way',  label: 'Zahájit cestu' },
  on_the_way:  { next: 'at_customer', label: 'Jsem u zákazníka' },
  at_customer: { next: 'in_progress', label: 'Zahájit opravu' },
  in_progress: null,
};

export default function JobSheet({ job, role, stock, onClose, onToast, onComplete, onStatusChange, onSaveSignature }) {
  const [view, setView] = useState('detail');
  const [notes, setNotes] = useState(job.repair_notes || '');
  const [selectedParts, setSelectedParts] = useState({});
  const [complexity, setComplexity] = useState(job.complexity || '');
  const [manualHours, setManualHours] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadingLabel, setUploadingLabel] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [savedKm, setSavedKm] = useState(job.km_travel || 0);  // uložíme km ihned po recordEnd
  const [savedSignature, setSavedSignature] = useState(job.signature_data || null);
  const [savingSignature, setSavingSignature] = useState(false);
  const hasSignature = !!savedSignature;

  const { messages, sendMessage } = useChat(job?.id);

  // GPS — start/end based (funguje i při přepnutí do Google Maps)
  const handleArrival = (finalKm) => {
    onToast && onToast(`Dorazil jsi k zákazníkovi — ${finalKm} km`);
    if (onStatusChange) onStatusChange(job.id, 'at_customer');
  };
  const { status: gpsStatus, error: gpsError, recordStart, recordEnd } = useGPS(handleArrival);

  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasDrawnSomething = useRef(false);

  useEffect(() => {
    if (job?.id) getJobPhotos(job.id).then(setPhotos).catch(() => {});
  }, [job?.id]);

  useEffect(() => {
    if (view === 'sign' && savedSignature && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      const img = new Image();
      img.onload = () => { ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); ctx.drawImage(img, 0, 0); };
      img.src = savedSignature;
    }
  }, [view, savedSignature]);

  const startDraw = e => {
    drawing.current = true; hasDrawnSomething.current = true;
    const c = canvasRef.current; const r = c.getBoundingClientRect(); const ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.moveTo((e.touches?.[0]?.clientX ?? e.clientX)-r.left, (e.touches?.[0]?.clientY ?? e.clientY)-r.top);
  };
  const draw = e => {
    if (!drawing.current) return; e.preventDefault();
    const c = canvasRef.current; const r = c.getBoundingClientRect(); const ctx = c.getContext('2d');
    ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.lineTo((e.touches?.[0]?.clientX ?? e.clientX)-r.left, (e.touches?.[0]?.clientY ?? e.clientY)-r.top);
    ctx.stroke();
  };
  const endDraw = () => { drawing.current = false; };
  const clearCanvas = () => { canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); hasDrawnSomething.current = false; };

  const handleSendChat = async () => {
    if (!chatMsg.trim()) return;
    const text = chatMsg.trim(); setChatMsg('');
    await sendMessage(text, role);
  };

  const handlePhotoUpload = async (file, label) => {
    if (!file) return;
    setUploadingLabel(label); setPhotoError('');
    try {
      const url = await uploadPhoto(job.id, file, label);
      setPhotos(prev => [...prev.filter(p => !p.name?.startsWith(label)), { url, label: label === 'before' ? 'Před opravou' : 'Po opravě', name: `${label}-${Date.now()}` }]);
      onToast('Foto uloženo ✓');
    } catch (err) {
      setPhotoError(err.message || 'Nepodařilo se nahrát fotku.');
      onToast('Chyba: ' + (err.message || 'nahrávání selhalo'));
    } finally { setUploadingLabel(null); }
  };

  const handleSaveSignature = async () => {
    if (!hasDrawnSomething.current) { onToast('Nejdřív se podepište do pole.'); return; }
    setSavingSignature(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      await onSaveSignature(job.id, dataUrl);
      setSavedSignature(dataUrl);
      onToast('Podpis uložen ✓');
    } catch (err) {
      onToast('Chyba při ukládání podpisu: ' + (err.message || ''));
    } finally { setSavingSignature(false); }
  };

  const handleResignature = () => {
    setSavedSignature(null); hasDrawnSomething.current = false;
    setTimeout(() => { if (canvasRef.current) canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }, 0);
  };

  // Navigovat = zaznamenáme startovní GPS pozici + otevřeme mapy
  const handleNavigate = async () => {
    await recordStart(); // uloží pozici do localStorage před přepnutím
    window.open(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`, '_blank');
    if (onStatusChange && job.status === 'pending') onStatusChange(job.id, 'on_the_way');
  };

  // "Jsem u zákazníka" = zaznamenáme koncovou pozici a vypočítáme km
  const handleAtCustomer = async () => {
    const finalKm = await recordEnd();
    setSavedKm(finalKm); // uložíme do local state PŘED re-renderem způsobeným onStatusChange
    if (onStatusChange) onStatusChange(job.id, 'at_customer');
    onToast(`Příjezd zaznamenán — ${finalKm} km`);
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const finalKm = savedKm > 0 ? savedKm : (job.km_travel || 0);
      const laborHours = parseFloat(manualHours) || 0;
      await onComplete({ notes, usedParts: selectedParts, kmTravel: finalKm, laborHours, complexity, signatureData: savedSignature });
    } catch { onToast('Chyba při ukládání'); }
    finally { setSubmitting(false); }
  };

  const usedCount = Object.keys(selectedParts).length;
  const isCompleted = job.status === 'completed';
  const canComplete = role === 'mechanic' && !isCompleted;
  const statusFlow = STATUS_FLOW[job.status];

  // Vlastní handler pro status flow — "Jsem u zákazníka" má speciální logiku
  const handleStatusButton = () => {
    if (job.status === 'on_the_way') {
      handleAtCustomer();
    } else if (statusFlow) {
      onStatusChange && onStatusChange(job.id, statusFlow.next);

    }
  };

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={{ padding:'12px 16px 0', display:'flex', justifyContent:'center' }}>
          <div style={{ width:36, height:4, background:C.border, borderRadius:2 }} />
        </div>

        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:'monospace', fontSize:12, color:C.sub }}>ZAK-{String(job.id).slice(-6).toUpperCase()}</div>
            <div style={{ fontWeight:700, fontSize:17, marginTop:2 }}>{job.client}</div>
            <div style={{ display:'flex', gap:8, marginTop:4, fontSize:13, color:STATUS_COLOR[job.status] }}>
              <Dot color={STATUS_COLOR[job.status]} />{STATUS_LABEL[job.status] || job.status}
              <span style={{ color:C.sub }}>· {PRIORITY_LABEL[job.priority]}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:C.sub, cursor:'pointer', padding:0 }}>×</button>
        </div>

        <div style={{ display:'flex', borderBottom:`1px solid ${C.border}` }}>
          {[['detail','Detail'],['chat',`Chat${messages.length>0?` (${messages.length})`:''}`],['sign',`Podpis${hasSignature?' ✓':''}`]].map(([k,l]) => (
            <button key={k} onClick={() => setView(k)} style={{ flex:1, padding:'9px', background:C.bg, border:'none', borderBottom:view===k?`2px solid ${C.text}`:'2px solid transparent', fontFamily:'inherit', fontSize:12, fontWeight:view===k?600:400, color:view===k?C.text:C.sub, cursor:'pointer' }}>{l}</button>
          ))}
        </div>

        {view === 'detail' && (
          <div>
            {/* Adresa + navigace */}
            <div style={s.section}>
              <div style={s.label}>Adresa</div>
              <div style={{ marginTop:4, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                <span style={{ flex:1 }}>{job.address}</span>
                {role === 'mechanic' && !isCompleted && (
                  <button
                    onClick={handleNavigate}
                    disabled={gpsStatus === 'getting_start'}
                    style={{ ...s.btnPrimary, opacity: gpsStatus === 'getting_start' ? 0.6 : 1 }}
                  >
                    {gpsStatus === 'getting_start' ? 'Načítám...' : 'Navigovat'}
                  </button>
                )}
              </div>

              {/* GPS status */}
              {role === 'mechanic' && !isCompleted && (
                <div style={{ marginTop:10 }}>
                  {gpsStatus === 'idle' && (
                    <div style={{ fontSize:12, color:C.sub }}>Klikni Navigovat — uloží se tvoje startovní pozice před přepnutím do map.</div>
                  )}
                  {gpsStatus === 'navigating' && (
                    <div style={{ fontSize:12, color:C.blue, fontWeight:500 }}>
                      🔵 Startovní pozice uložena. Naviguj v mapách, pak se vrať a klikni "Jsem u zákazníka".
                    </div>
                  )}
                  {gpsStatus === 'getting_end' && (
                    <div style={{ fontSize:12, color:C.sub }}>Zjišťuji polohu...</div>
                  )}
                  {gpsStatus === 'done' && (
                    <div style={{ fontSize:12, color:C.green, fontWeight:600 }}>
                      ✓ Vzdálenost: {savedKm} km (tam a zpět)
                    </div>
                  )}
                  {gpsError && <div style={{ fontSize:11, color:C.red, marginTop:4 }}>{gpsError}</div>}
                </div>
              )}
            </div>

            {/* Status flow */}
            {role === 'mechanic' && statusFlow && (
              <div style={{ ...s.section, background:'#F0F9FF' }}>
                <div style={s.label}>Aktuální stav</div>
                <button
                  onClick={handleStatusButton}
                  disabled={gpsStatus === 'getting_end'}
                  style={{ ...s.btnPrimary, marginTop:8, width:'100%', opacity: gpsStatus === 'getting_end' ? 0.6 : 1 }}
                >
                  {gpsStatus === 'getting_end' ? 'Zjišťuji polohu...' : `→ ${statusFlow.label}`}
                </button>
              </div>
            )}

            {job.time_window && (
              <div style={s.section}>
                <div style={s.label}>Časové okno</div>
                <div style={{ marginTop:4, fontWeight:500 }}>{job.time_window}</div>
              </div>
            )}

            <div style={s.section}>
              <div style={s.label}>Skútr</div>
              <div style={{ marginTop:4 }}>{job.scooter_type}</div>
            </div>
            <div style={s.section}>
              <div style={s.label}>Popis závady</div>
              <div style={{ marginTop:4, color:C.sub, lineHeight:1.6 }}>{job.description}</div>
            </div>

            {role === 'mechanic' && !isCompleted && (
              <div style={s.section}>
                <div style={s.label}>Čas u zákazníka</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
                  <input
                    type="number" min="0" step="0.5"
                    value={manualHours}
                    onChange={e => setManualHours(e.target.value)}
                    style={{ ...s.input, maxWidth:90 }}
                    placeholder="0"
                  />
                  <span style={{ fontSize:14, color:C.sub }}>hodin</span>
                </div>
                <div style={{ fontSize:12, color:C.sub, marginTop:4 }}>Zadej počet hodin strávených u zákazníka (např. 1.5 = hodina a půl)</div>
              </div>
            )}

            {role === 'mechanic' && (
              <div style={s.section}>
                <div style={{ ...s.label, marginBottom:10 }}>Fotodokumentace</div>
                {photoError && <div style={{ fontSize:12, color:C.red, marginBottom:8, padding:'8px 10px', background:'#FEF2F2', borderRadius:4 }}>{photoError}</div>}
                <div style={{ display:'flex', gap:10 }}>
                  {['before','after'].map(type => {
                    const label = type === 'before' ? 'Před opravou' : 'Po opravě';
                    const existing = photos.find(p => p.name?.startsWith(type));
                    const isUploading = uploadingLabel === type;
                    return (
                      <label key={type} style={{ flex:1, border:`1px dashed ${existing?C.green:C.border}`, borderRadius:4, overflow:'hidden', cursor:isUploading?'wait':'pointer', opacity:isUploading?0.6:1 }}>
                        <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} disabled={isUploading}
                          onChange={e => handlePhotoUpload(e.target.files[0], type)} />
                        {existing
                          ? <img src={existing.url} alt={label} style={{ width:'100%', height:80, objectFit:'cover', display:'block' }} />
                          : <div style={{ padding:'18px 10px', textAlign:'center', color:C.sub, fontSize:13 }}>
                              <div style={{ fontSize:20, marginBottom:4 }}>{isUploading?'…':'+'}</div>{isUploading?'Nahrávám...':label}
                            </div>
                        }
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {canComplete && (
              <>
                <div style={s.section}>
                  <div style={{ ...s.label, marginBottom:6 }}>Provedené opravy</div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Co jste opravili..." style={{ ...s.input, minHeight:72, resize:'vertical' }} />
                </div>
                <div style={s.section}>
                  <div style={{ ...s.label, marginBottom:6 }}>Náročnost opravy</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {[['easy','Snadná'],['medium','Střední'],['hard','Složitá']].map(([v,l]) => (
                      <button key={v} onClick={() => setComplexity(v)}
                        style={{ ...s.btnSecondary, fontSize:12, padding:'5px 10px', fontWeight:complexity===v?700:400, borderColor:complexity===v?C.text:C.border }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div style={s.section}>
                  <div style={{ ...s.label, marginBottom:2 }}>Použité díly ze skladu</div>
                  {usedCount > 0 && <div style={{ fontSize:12, color:C.sub, marginBottom:10 }}>{usedCount} {usedCount===1?'díl vybrán':'díly vybrány'} · {Object.values(selectedParts).reduce((a,b)=>a+b,0)} ks</div>}
                  <PartsPicker stock={stock} selected={selectedParts} onChange={setSelectedParts} />
                </div>
                <div style={{ padding:16 }}>
                  {!hasSignature && <div style={{ fontSize:12, color:C.amber, marginBottom:8 }}>Zákazník zatím nepodepsal (záložka Podpis).</div>}
                  <button onClick={handleComplete} disabled={submitting} style={{ ...s.btnPrimary, width:'100%', opacity:submitting?0.6:1 }}>
                    {submitting?'Ukládání...':'Dokončit zakázku'}
                  </button>
                </div>
              </>
            )}

            {role === 'dispatcher' && isCompleted && (
              <>
                {job.repair_notes && <div style={s.section}><div style={s.label}>Provedené opravy</div><div style={{ marginTop:4, color:C.sub, lineHeight:1.6 }}>{job.repair_notes}</div></div>}
                {job.complexity && <div style={s.section}><div style={s.label}>Náročnost</div><div style={{ marginTop:4 }}>{ {easy:'Snadná',medium:'Střední',hard:'Složitá'}[job.complexity] }</div></div>}
                {job.parts?.length > 0 && (
                  <>{<div style={{ ...s.label, padding:'12px 16px 8px' }}>Použité díly</div>}
                  {job.parts.map((p,i) => <div key={i} style={{ ...s.section, display:'flex', justifyContent:'space-between' }}><span style={{ color:C.sub }}>{p.stock_items?.name}</span><span style={{ fontFamily:'monospace' }}>{p.qty} ks</span></div>)}</>
                )}
                <div style={{ ...s.label, padding:'12px 16px 8px' }}>Vyúčtování</div>
                {[['Výjezdné',`${job.earnings?.callout??40} €`],[`Kilometry (${job.km_travel??0} km)`,`${job.earnings?.travel??0} €`],[`Práce (${job.labor_hours??0} h)`,`${job.earnings?.labor??0} €`],['Celkem',`${job.earnings?.total??0} €`]].map(([l,v]) => (
                  <div key={l} style={{ ...s.section, display:'flex', justifyContent:'space-between', fontWeight:l==='Celkem'?700:400, background:l==='Celkem'?C.surface:C.bg }}>
                    <span style={{ color:l==='Celkem'?C.text:C.sub }}>{l}</span><span style={{ fontFamily:'monospace' }}>{v}</span>
                  </div>
                ))}
                {photos.length > 0 && <div style={s.section}><div style={{ ...s.label, marginBottom:10 }}>Fotodokumentace</div>{photos.map((p,i) => <div key={i} style={{ marginBottom:10 }}><div style={{ fontSize:12, color:C.sub, marginBottom:4 }}>{p.label}</div><img src={p.url} alt={p.label} style={{ maxWidth:'100%', borderRadius:4, border:`1px solid ${C.border}` }} /></div>)}</div>}
                {hasSignature && <div style={s.section}><div style={{ ...s.label, marginBottom:10 }}>Podpis zákazníka</div><img src={savedSignature} alt="Podpis" style={{ maxWidth:300, border:`1px solid ${C.border}`, borderRadius:4 }} /></div>}
                <div style={{ padding:16 }}>
                  <button onClick={() => generatePDF({ ...job, photos, signature_data: savedSignature })} style={{ ...s.btnSecondary, width:'100%' }}>Stáhnout PDF report</button>
                </div>
              </>
            )}
          </div>
        )}

        {view === 'chat' && (
          <div style={{ display:'flex', flexDirection:'column', height:400 }}>
            <div style={{ flex:1, overflow:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
              {messages.length === 0 && <div style={{ color:C.sub, fontSize:13 }}>Žádné zprávy.</div>}
              {messages.map((m,i) => (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:m.from_role===role?'flex-end':'flex-start' }}>
                  <div style={{ background:m.from_role===role?C.blue:C.surface, color:m.from_role===role?'#fff':C.text, padding:'8px 12px', borderRadius:8, maxWidth:'80%', fontSize:13, lineHeight:1.5 }}>{m.text}</div>
                  <div style={{ fontSize:11, color:C.sub, marginTop:3 }}>{m.from_role==='dispatcher'?'Dispečer':'Mechanik'} · {new Date(m.created_at).toLocaleTimeString('cs',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop:`1px solid ${C.border}`, padding:12, display:'flex', gap:8 }}>
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendChat()} placeholder="Napište zprávu..." style={{ ...s.input, flex:1 }} />
              <button onClick={handleSendChat} style={s.btnPrimary}>Odeslat</button>
            </div>
          </div>
        )}

        {view === 'sign' && (
          <div style={{ padding:16 }}>
            <div style={{ ...s.label, marginBottom:12 }}>Podpis zákazníka</div>
            {hasSignature ? (
              <>
                <div style={{ border:`1px solid ${C.green}`, borderRadius:4, padding:12, textAlign:'center' }}>
                  <img src={savedSignature} alt="Podpis" style={{ maxWidth:'100%', maxHeight:160 }} />
                  <div style={{ color:C.green, fontWeight:600, fontSize:13, marginTop:8 }}>✓ Podpis uložen</div>
                </div>
                {role === 'mechanic' && !isCompleted && (
                  <button onClick={handleResignature} style={{ ...s.btnSecondary, width:'100%', marginTop:12 }}>Podepsat znovu</button>
                )}
              </>
            ) : (
              <>
                <canvas ref={canvasRef} width={500} height={160}
                  style={{ border:`1px solid ${C.border}`, borderRadius:4, width:'100%', touchAction:'none', display:'block', cursor:'crosshair', background:'#fff' }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                <div style={{ fontSize:12, color:C.sub, marginTop:6 }}>Zákazník podepisuje prstem nebo myší</div>
                <div style={{ display:'flex', gap:8, marginTop:12 }}>
                  <button onClick={clearCanvas} style={{ ...s.btnSecondary, flex:1 }}>Smazat</button>
                  <button onClick={handleSaveSignature} disabled={savingSignature} style={{ ...s.btnPrimary, flex:1, opacity:savingSignature?0.6:1 }}>
                    {savingSignature?'Ukládám...':'Uložit podpis'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
