import { supabase } from '../supabase';

export async function uploadPhoto(jobId, file, label) {
  if (!file) throw new Error('Žádný soubor nevybrán');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `jobs/${jobId}/${label}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('job-photos')
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });

  if (error) {
    // Nejčastější příčiny: bucket neexistuje, nebo chybí storage policy
    console.error('Chyba uploadu fotky:', error.message);
    throw new Error(
      error.message.includes('not found')
        ? 'Storage bucket "job-photos" neexistuje. Spusť migraci v Supabase.'
        : error.message
    );
  }

  const { data } = supabase.storage.from('job-photos').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Nepodařilo se získat URL fotky.');
  return data.publicUrl;
}

export async function getJobPhotos(jobId) {
  const { data, error } = await supabase.storage.from('job-photos').list(`jobs/${jobId}`, {
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) {
    console.error('Chyba čtení fotek:', error.message);
    return [];
  }
  if (!data) return [];

  return data.map(f => ({
    name: f.name,
    url: supabase.storage.from('job-photos').getPublicUrl(`jobs/${jobId}/${f.name}`).data.publicUrl,
    label: f.name.startsWith('before') ? 'Před opravou' : 'Po opravě',
  }));
}
