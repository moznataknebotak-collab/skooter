import { useColors } from './ui';

export default function Dashboard({ jobs, mechanics }) {
  const C = useColors();
  const completed = jobs.filter(j => j.status === 'completed');
  const totalRevenue = completed.reduce((s, j) => s + (j.earnings?.total ?? 0), 0);
  const avgDuration = completed.length
    ? completed.reduce((s, j) => s + (j.labor_hours ?? 0), 0) / completed.length
    : 0;

  // Per-mechanic performance
  const perMechanic = mechanics.map(m => {
    const mJobs = completed.filter(j => j.mechanic_id === m.id);
    return {
      name: m.name,
      count: mJobs.length,
      revenue: mJobs.reduce((s, j) => s + (j.earnings?.total ?? 0), 0),
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Last 7 days job counts (simple bar chart)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dayCounts = days.map(d => {
    const dayStr = d.toDateString();
    return jobs.filter(j => new Date(j.created_at).toDateString() === dayStr).length;
  });
  const maxCount = Math.max(...dayCounts, 1);

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
        {[
          ['Měsíční výnos', `${totalRevenue.toFixed(0)} €`],
          ['Dokončené', completed.length],
          ['Průměrná oprava', `${avgDuration.toFixed(1)} h`],
        ].map(([l, v]) => (
          <div key={l} style={{ flex: '1 1 33%', padding: '12px 16px', borderRight: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Mini bar chart - last 7 days */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Zakázky — posledních 7 dní
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
          {dayCounts.map((c, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: Math.max(4, (c / maxCount) * 44), background: C.blue, borderRadius: 2 }} />
              <div style={{ fontSize: 10, color: C.sub }}>{days[i].toLocaleDateString('cs', { weekday: 'short' })}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per mechanic performance */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Výkon mechaniků
        </div>
        {perMechanic.map(m => (
          <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
            <span>{m.name}</span>
            <span style={{ color: C.sub }}>{m.count} zakázek · <strong style={{ color: C.text }}>{m.revenue.toFixed(0)} €</strong></span>
          </div>
        ))}
        {perMechanic.length === 0 && <div style={{ color: C.sub, fontSize: 13 }}>Žádná data.</div>}
      </div>
    </div>
  );
}
