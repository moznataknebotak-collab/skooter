import { useState, useRef, useCallback, useEffect } from 'react';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const STORAGE_KEY = 'skootr-gps-start';

function saveStart(pos) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
}
function loadStart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function clearStart() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS není dostupné v tomto prohlížeči.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export function useGPS(onArrival) {
  // Načteme startovní pozici z localStorage při každém mount —
  // tím přežije i re-render způsobený změnou statusu zakázky
  const startPos = useRef(loadStart());

  const [status, setStatus] = useState(() => {
    return loadStart() ? 'navigating' : 'idle';
  });
  const [error, setError] = useState(null);

  // Synchronizuj startPos.current při každém renderu
  // (pro případ že se localStorage změnilo v jiné záložce)
  useEffect(() => {
    const saved = loadStart();
    if (saved && !startPos.current) {
      startPos.current = saved;
      setStatus('navigating');
    }
  }, []);

  // Krok 1: Uloží startovní pozici PŘED přepnutím do map
  const recordStart = useCallback(async () => {
    setStatus('getting_start');
    setError(null);
    try {
      const pos = await getCurrentPosition();
      const start = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      startPos.current = start;
      saveStart(start); // klíčové: přežije přepnutí záložky
      setStatus('navigating');
    } catch (e) {
      setError('Nepodařilo se získat polohu: ' + e.message);
      setStatus('idle');
    }
  }, []);

  // Krok 2: Po návratu z map zjistí koncovou pozici a vypočítá km
  const recordEnd = useCallback(async () => {
    setStatus('getting_end');
    setError(null);

    // Znovu načteme z localStorage — pro jistotu
    const start = startPos.current || loadStart();

    try {
      const pos = await getCurrentPosition();
      const end = { lat: pos.coords.latitude, lon: pos.coords.longitude };

      let finalKm = 0;
      if (start) {
        const oneway = haversine(start.lat, start.lon, end.lat, end.lon);
        finalKm = Math.round(oneway * 2 * 10) / 10; // tam a zpět
      } else {
        // Startovní pozice chybí — nestalo se nic špatného,
        // ale nemůžeme vypočítat vzdálenost
        console.warn('GPS: startovní pozice chybí, vzdálenost bude 0');
      }

      clearStart();
      startPos.current = null;
      setStatus('done');

      if (onArrival) onArrival(finalKm);
      return finalKm;
    } catch (e) {
      setError('Nepodařilo se získat polohu: ' + e.message);
      setStatus('navigating');
      return 0;
    }
  }, [onArrival]);

  const reset = useCallback(() => {
    clearStart();
    startPos.current = null;
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    error,
    recordStart,
    recordEnd,
    reset,
    // Zpětná kompatibilita
    tracking: status === 'navigating',
    arrived: status === 'done',
    km: 0, // km se drží v JobSheet state (savedKm), ne tady
  };
}
