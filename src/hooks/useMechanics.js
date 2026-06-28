import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useMechanics() {
  const [mechanics, setMechanics] = useState([]);

  useEffect(() => {
    supabase
      .from('users')
      .select('id, name, role')
      .eq('role', 'mechanic')
      .then(({ data }) => setMechanics(data ?? []));
  }, []);

  return { mechanics };
}
