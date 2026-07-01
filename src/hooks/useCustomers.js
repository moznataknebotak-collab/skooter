import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';

// Vrací unikátní zákazníky z historie zakázek pro autocomplete
export function useCustomers() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    supabase.from('jobs').select('client, address, scooter_type').then(({ data }) => setJobs(data ?? []));
  }, []);

  const customers = useMemo(() => {
    const map = new Map();
    jobs.forEach(j => {
      if (!map.has(j.client)) map.set(j.client, { client: j.client, address: j.address, scooterType: j.scooter_type });
    });
    return Array.from(map.values());
  }, [jobs]);

  const search = (query) => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return customers.filter(c => c.client.toLowerCase().includes(q)).slice(0, 5);
  };

  return { customers, search };
}
