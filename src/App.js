import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './components/ui';
import Login from './components/Login';
import Dispatcher from './components/Dispatcher';
import Mechanic from './components/Mechanic';
import Admin from './components/Admin';

function AppInner() {
  const { user, profile, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#666' }}>
        Načítání...
      </div>
    );
  }

  if (!user || !profile) return <Login onLogin={signIn} />;
  if (profile.role === 'admin') return <Admin onLogout={signOut} />;
  if (profile.role === 'dispatcher') return <Dispatcher profile={profile} onLogout={signOut} />;
  return <Mechanic profile={profile} userId={user.id} onLogout={signOut} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
