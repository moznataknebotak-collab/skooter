export function exportJobsToCSV(jobs, filename = 'zakazky.csv') {
  const headers = ['ID', 'Klient', 'Adresa', 'Skútr', 'Stav', 'Mechanik', 'Vytvořeno', 'Dokončeno', 'Km', 'Hodiny', 'Výjezdné', 'Km náhrada', 'Práce', 'Celkem'];
  const rows = jobs.map(j => [
    String(j.id).slice(-6),
    j.client,
    j.address,
    j.scooter_type || '',
    j.status,
    j.mechanic?.name || '',
    j.created_at ? new Date(j.created_at).toLocaleDateString('cs') : '',
    j.completed_at ? new Date(j.completed_at).toLocaleDateString('cs') : '',
    j.km_travel ?? 0,
    j.labor_hours ?? 0,
    j.earnings?.callout ?? 0,
    j.earnings?.travel ?? 0,
    j.earnings?.labor ?? 0,
    j.earnings?.total ?? 0,
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
