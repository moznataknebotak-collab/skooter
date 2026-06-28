import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useJobs(mechanicId = null) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        mechanic:users!jobs_mechanic_id_fkey(id, name, role),
        parts:job_parts(id, stock_item_id, qty, stock_items(name))
      `)
      .order('created_at', { ascending: false });

    if (mechanicId) query = query.eq('mechanic_id', mechanicId);

    const { data } = await query;
    setJobs(data ?? []);
    setLoading(false);
  }, [mechanicId]);

  useEffect(() => {
    fetchJobs();

    // Realtime subscription
    const channel = supabase
      .channel('jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchJobs)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchJobs]);

  const createJob = async (jobData) => {
    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        client: jobData.client,
        address: jobData.address,
        scooter_type: jobData.scooterType,
        description: jobData.description,
        mechanic_id: jobData.mechanicId,
        priority: jobData.priority,
        status: 'pending',
      }])
      .select()
      .single();
    if (error) throw error;

    // Send push notification to mechanic
    await supabase.functions.invoke('send-notification', {
      body: {
        userId: jobData.mechanicId,
        title: 'Nová zakázka',
        body: `${jobData.client} — ${jobData.address}`,
      }
    });

    return data;
  };

  const completeJob = async (jobId, { notes, usedParts, laborHours, kmTravel, mechanicId }) => {
    const callout = 40;
    const travel = Math.round(kmTravel * 1.2 * 100) / 100;
    const labor = Math.round(laborHours * 40 * 100) / 100;
    const total = callout + travel + labor;

    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        repair_notes: notes,
        labor_hours: laborHours,
        km_travel: kmTravel,
        earnings: { callout, travel, labor, total },
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    if (error) throw error;

    // Insert used parts
    if (Object.keys(usedParts).length > 0) {
      const partsRows = Object.entries(usedParts).map(([stockItemId, qty]) => ({
        job_id: jobId,
        stock_item_id: Number(stockItemId),
        qty,
      }));
      await supabase.from('job_parts').insert(partsRows);

      // Deduct from stock
      for (const [stockItemId, qty] of Object.entries(usedParts)) {
        await supabase.rpc('deduct_stock', {
          p_mechanic_id: mechanicId,
          p_item_id: Number(stockItemId),
          p_qty: qty,
        });
      }
    }

    // Notify dispatcher
    await supabase.functions.invoke('send-notification', {
      body: {
        role: 'dispatcher',
        title: 'Zakázka dokončena',
        body: `Celkem: ${total} €`,
      }
    });
  };

  return { jobs, loading, createJob, completeJob, refetch: fetchJobs };
}
