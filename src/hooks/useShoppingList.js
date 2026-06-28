import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useShoppingList(mechanicId) {
  const [lists, setLists] = useState([]);

  const fetchLists = useCallback(async () => {
    let query = supabase
      .from('shopping_lists')
      .select('*');

    if (mechanicId) query = query.eq('mechanic_id', mechanicId);

    const { data } = await query.order('sent_at', { ascending: false });
    setLists(data ?? []);
  }, [mechanicId]);

  useEffect(() => {
    fetchLists();

    const channel = supabase
      .channel('shopping')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists' }, fetchLists)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchLists]);

  const sendList = async (items) => {
    const { data } = await supabase
      .from('shopping_lists')
      .insert([{
        mechanic_id: mechanicId,
        items,
        sent_at: new Date().toISOString(),
        resolved: false,
      }])
      .select()
      .single();

    // Notify dispatcher
    await supabase.functions.invoke('send-notification', {
      body: {
        role: 'dispatcher',
        title: 'Nový nákupní seznam',
        body: `Mechanik potřebuje ${items.length} položek`,
      }
    });

    return data;
  };

  const resolveList = async (listId) => {
    await supabase
      .from('shopping_lists')
      .update({ resolved: true })
      .eq('id', listId);
    fetchLists();
  };

  return { lists, sendList, resolveList, refetch: fetchLists };
}
