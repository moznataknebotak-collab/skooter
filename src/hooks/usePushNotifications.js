import { useState, useCallback } from 'react';

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const notify = useCallback((title, options = {}) => {
    if (permission !== 'granted') return;
    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, { icon: '/logo192.png', badge: '/logo192.png', ...options });
        });
      } else {
        new Notification(title, options);
      }
    } catch (e) {
      console.warn('Notification failed', e);
    }
  }, [permission]);

  return { permission, requestPermission, notify };
}
