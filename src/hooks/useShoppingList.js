import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useShoppingList(mechanicId) {
  const [lists, setLists] = useState([]);

  useEffect(() => {
    if (!mechanicId) return;
    fetchLists();

    const channel = supabase
      .channel('shopping')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists' }, fetchLists)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [mechanicId]);

  const fetchLists = async () => {
    const { data } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('mechanic_id', mechanicId)
      .order('sent_at', { ascending: false });
    setLists(data ?? []);
  };

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
