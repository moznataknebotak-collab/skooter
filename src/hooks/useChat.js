import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useChat(jobId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!jobId) return;

    // Load existing messages
    supabase
      .from('chat_messages')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at')
      .then(({ data }) => setMessages(data ?? []));

    // Realtime new messages
    const channel = supabase
      .channel(`chat:${jobId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `job_id=eq.${jobId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [jobId]);

  const sendMessage = async (text, fromRole) => {
    const { data } = await supabase
      .from('chat_messages')
      .insert([{ job_id: jobId, from_role: fromRole, text }])
      .select()
      .single();

    // Push notification to the other party
    await supabase.functions.invoke('send-notification', {
      body: {
        role: fromRole === 'dispatcher' ? 'mechanic' : 'dispatcher',
        jobId,
        title: fromRole === 'dispatcher' ? 'Zpráva od dispečera' : 'Zpráva od mechanika',
        body: text.length > 60 ? text.slice(0, 57) + '...' : text,
      }
    });

    return data;
  };

  return { messages, sendMessage };
}
