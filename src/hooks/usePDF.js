// PDF generování pomocí vanilla JS — žádná externí knihovna
// Generuje HTML a tiskne ho jako PDF

export function generatePDF(job) {
  const parts = job.parts?.map(p => `
    <tr>
      <td>${p.stock_items?.name ?? '—'}</td>
      <td style="text-align:right">${p.qty} ks</td>
    </tr>`).join('') || '<tr><td colspan="2">—</td></tr>';

  const photos = job.photos?.map(p => `
    <div style="margin-bottom:12px">
      <div style="font-size:11px;color:#666;margin-bottom:4px">${p.label}</div>
      <img src="${p.url}" style="max-width:100%;border-radius:4px;border:1px solid #eee" />
    </div>`).join('') || '';

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8"/>
<title>Report ${job.id}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 0; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
  .total { font-weight: 700; font-size: 15px; }
  .signature { border: 1px solid #ccc; border-radius: 4px; max-width: 300px; margin-top: 8px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>SkootrServis — Servisní report</h1>
<div class="sub">Zakázka ${String(job.id).slice(-6).toUpperCase()} · ${new Date(job.completed_at || job.created_at).toLocaleDateString('cs')}</div>

<div class="section">
  <div class="section-title">Zákazník</div>
  <table>
    <tr><td>Jméno</td><td>${job.client}</td></tr>
    <tr><td>Adresa</td><td>${job.address}</td></tr>
    <tr><td>Skútr</td><td>${job.scooter_type || '—'}</td></tr>
    <tr><td>Mechanik</td><td>${job.mechanic?.name || '—'}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Popis závady</div>
  <p style="margin:0;line-height:1.6;color:#444">${job.description || '—'}</p>
</div>

<div class="section">
  <div class="section-title">Provedené opravy</div>
  <p style="margin:0;line-height:1.6;color:#444">${job.repair_notes || '—'}</p>
</div>

<div class="section">
  <div class="section-title">Použité díly</div>
  <table>${parts}</table>
</div>

${photos ? `<div class="section"><div class="section-title">Fotodokumentace</div>${photos}</div>` : ''}

<div class="section">
  <div class="section-title">Vyúčtování</div>
  <table>
    <tr><td>Výjezdné</td><td style="text-align:right">${job.earnings?.callout ?? 40} €</td></tr>
    <tr><td>Kilometry (${job.km_travel ?? 0} km × 1,20 €)</td><td style="text-align:right">${job.earnings?.travel ?? 0} €</td></tr>
    <tr><td>Práce (${job.labor_hours ?? 0} h × 40 €)</td><td style="text-align:right">${job.earnings?.labor ?? 0} €</td></tr>
    <tr class="total"><td>Celkem</td><td style="text-align:right">${job.earnings?.total ?? 0} €</td></tr>
  </table>
</div>

${job.signature_data ? `
<div class="section">
  <div class="section-title">Podpis zákazníka</div>
  <img src="${job.signature_data}" class="signature" alt="Podpis" />
</div>` : ''}

<div style="margin-top:40px;font-size:11px;color:#999">Vygenerováno ${new Date().toLocaleString('cs')} · SkootrServis</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}
