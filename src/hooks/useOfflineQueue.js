import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const QUEUE_KEY = 'skootr-offline-queue';

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function saveQueue(queue) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
}

// Fronta akcí prováděných offline — synchronizuje se po obnovení připojení.
// Podporuje: complete_job, send_chat, update_stock
export function useOfflineQueue() {
  const [online, setOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState(loadQueue());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const enqueue = useCallback((action) => {
    setQueue(prev => {
      const next = [...prev, { ...action, id: Date.now(), createdAt: new Date().toISOString() }];
      saveQueue(next);
      return next;
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (syncing) return;
    const current = loadQueue();
    if (current.length === 0) return;
    setSyncing(true);

    const remaining = [];
    for (const action of current) {
      try {
        if (action.type === 'chat_message') {
          await supabase.from('chat_messages').insert([action.payload]);
        } else if (action.type === 'stock_update') {
          await supabase.from('stock_items').update(action.payload.updates).eq('id', action.payload.id);
        } else if (action.type === 'job_update') {
          await supabase.from('jobs').update(action.payload.updates).eq('id', action.payload.id);
        }
      } catch (e) {
        remaining.push(action); // keep for retry
      }
    }
    saveQueue(remaining);
    setQueue(remaining);
    setSyncing(false);
  }, [syncing]);

  useEffect(() => {
    if (online && queue.length > 0) processQueue();
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  return { online, queue, enqueue, processQueue, pendingCount: queue.length };
}
