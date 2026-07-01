import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const DEFAULT_RATES = { callout: 40, km_rate: 1.2, hourly_rate: 40 };

export function useRates() {
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);

  const fetchRates = useCallback(async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (!error && data) {
      setRates({ callout: data.callout, km_rate: data.km_rate, hourly_rate: data.hourly_rate });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRates();
    const channel = supabase.channel('settings-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchRates)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchRates]);

  const updateRates = async (newRates) => {
    const { error } = await supabase.from('settings').upsert({ id: 1, ...newRates });
    if (error) throw error;
    setRates(newRates);
  };

  return { rates, loading, updateRates };
}
