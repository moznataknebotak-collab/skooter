import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// Konvertuje uživatelské jméno na interní email pro Supabase Auth
function usernameToEmail(username) {
  return `${username.toLowerCase().trim()}@skootr.internal`;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const buildProfile = (session) => {
    if (!session?.user) return null;
    const meta = session.user.user_metadata || {};
    return {
      name: meta.name || meta.username || session.user.email,
      role: meta.role || 'mechanic',
      username: meta.username || '',
    };
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setProfile(buildProfile(session));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProfile(buildProfile(session));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Přihlášení přes uživatelské jméno (ne email)
  const signIn = async (username, password) => {
    const email = usernameToEmail(username);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, profile, loading, signIn, signOut, usernameToEmail };
}
