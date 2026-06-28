import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useStock(mechanicId) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = useCallback(async () => {
    const { data } = await supabase
      .from('stock_items')
      .select('*')
      .eq('mechanic_id', mechanicId)
      .order('name');
    setStock(data ?? []);
    setLoading(false);
  }, [mechanicId]);

  useEffect(() => {
    if (!mechanicId) return;
    fetchStock();

    const channel = supabase
      .channel('stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items', filter: `mechanic_id=eq.${mechanicId}` }, fetchStock)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [mechanicId, fetchStock]);

  const adjustQty = async (itemId, delta) => {
    const item = stock.find(i => i.id === itemId);
    if (!item) return;
    const newQty = Math.max(0, item.qty + delta);
    await supabase.from('stock_items').update({ qty: newQty }).eq('id', itemId);
    setStock(prev => prev.map(i => i.id === itemId ? { ...i, qty: newQty } : i));

    // Check if low and send notification
    if (newQty <= item.min_qty && newQty > 0) {
      await supabase.functions.invoke('send-notification', {
        body: {
          userId: mechanicId,
          title: 'Nízký sklad',
          body: `${item.name}: zbývá ${newQty} ks`,
        }
      });
    }
  };

  const addItem = async (name, minQty = 1, multi = false) => {
    const { data } = await supabase
      .from('stock_items')
      .insert([{ mechanic_id: mechanicId, name, qty: 0, min_qty: minQty, multi }])
      .select()
      .single();
    setStock(prev => [...prev, data]);
  };

  return { stock, loading, adjustQty, addItem, refetch: fetchStock };
}
