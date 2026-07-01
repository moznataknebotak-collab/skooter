import { useColors } from './ui';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

export default function OfflineIndicator() {
  const C = useColors();
  const { online, pendingCount } = useOfflineQueue();

  if (online && pendingCount === 0) return null;

  return (
    <div style={{
      background: online ? '#FEF3C7' : '#FEE2E2',
      color: online ? C.amber : C.red,
      fontSize: 12,
      padding: '6px 16px',
      textAlign: 'center',
      fontWeight: 500,
    }}>
      {!online ? '📡 Offline — data se uloží lokálně' : `🔄 Synchronizace... (${pendingCount})`}
    </div>
  );
}
