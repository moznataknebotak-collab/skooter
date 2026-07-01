import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const DEFAULT_RATES = { callout: 40, km_rate: 1.2, hourly_rate: 40 };

// Načte sazby — nejdřív per mechanik, pak globální výchozí
async function getRates(mechanicId) {
  // Per-mechanik sazby z tabulky users
  if (mechanicId) {
    const { data } = await supabase.from('users')
      .select('rate_callout, rate_km, rate_hourly')
      .eq('id', mechanicId).single();
    if (data?.rate_callout) {
      return { callout: data.rate_callout, km_rate: data.rate_km, hourly_rate: data.rate_hourly };
    }
  }
  // Globální výchozí sazby
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  return data ? { callout: data.callout, km_rate: data.km_rate, hourly_rate: data.hourly_rate } : DEFAULT_RATES;
}

export function useJobs(mechanicId = null) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    let query = supabase
      .from('jobs')
      .select(`*, mechanic:users!jobs_mechanic_id_fkey(id, name, role), parts:job_parts(id, stock_item_id, qty, stock_items(name))`)
      .order('created_at', { ascending: false });
    if (mechanicId) query = query.eq('mechanic_id', mechanicId);
    const { data } = await query;
    setJobs(data ?? []);
    setLoading(false);
  }, [mechanicId]);

  useEffect(() => {
    fetchJobs();
    const channel = supabase.channel('jobs-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchJobs)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchJobs]);

  const createJob = async (jobData) => {
    const { data, error } = await supabase.from('jobs').insert([{
      client: jobData.client,
      address: jobData.address,
      scooter_type: jobData.scooterType,
      description: jobData.description,
      mechanic_id: jobData.mechanicId,
      priority: jobData.priority,
      status: 'pending',
      time_window: jobData.timeWindow || null,
    }]).select().single();
    if (error) throw error;
    return data;
  };

  const completeJob = async (jobId, { notes, usedParts, laborHours, kmTravel, mechanicId: mechId, complexity, signatureData }) => {
    const rates = await getRates(mechId);
    const callout = rates.callout;
    const travel = Math.round(kmTravel * rates.km_rate * 100) / 100;
    const labor = Math.round(laborHours * rates.hourly_rate * 100) / 100;
    const total = Math.round((callout + travel + labor) * 100) / 100;

    const { error } = await supabase.from('jobs').update({
      status: 'completed',
      repair_notes: notes,
      labor_hours: laborHours,
      km_travel: kmTravel,
      earnings: { callout, travel, labor, total },
      complexity: complexity || null,
      signature_data: signatureData || null,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    if (error) throw error;

    if (Object.keys(usedParts).length > 0) {
      const partsRows = Object.entries(usedParts).map(([stockItemId, qty]) => ({
        job_id: jobId, stock_item_id: Number(stockItemId), qty,
      }));
      await supabase.from('job_parts').insert(partsRows);
      for (const [stockItemId, qty] of Object.entries(usedParts)) {
        await supabase.rpc('deduct_stock', { p_mechanic_id: mechId, p_item_id: Number(stockItemId), p_qty: qty });
      }
    }
  };

  const updateStatus = async (jobId, status) => {
    await supabase.from('jobs').update({ status }).eq('id', jobId);
  };

  return { jobs, loading, createJob, completeJob, updateStatus, refetch: fetchJobs };
}
