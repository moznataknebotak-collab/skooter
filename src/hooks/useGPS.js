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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}
function clearStart() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('GPS není dostupné.')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export function useGPS(onArrival) {
  const [km, setKm] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const startPos = useRef(loadStart());

  useEffect(() => {
    if (startPos.current) setStatus('navigating');
  }, []);

  const recordStart = useCallback(async () => {
    setStatus('getting_start');
    setError(null);
    try {
      const pos = await getCurrentPosition();
      const start = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      startPos.current = start;
      saveStart(start);
      setStatus('navigating');
    } catch (e) {
      setError('Nepodařilo se získat polohu: ' + e.message);
      setStatus('idle');
    }
  }, []);

  const recordEnd = useCallback(async () => {
    setStatus('getting_end');
    setError(null);
    try {
      const pos = await getCurrentPosition();
      const end = { lat: pos.coords.latitude, lon: pos.coords.longitude };

      let finalKm = 0;
      if (startPos.current) {
        const oneway = haversine(startPos.current.lat, startPos.current.lon, end.lat, end.lon);
        finalKm = Math.round(oneway * 2 * 10) / 10;
      }

      setKm(finalKm);
      setStatus('done');
      clearStart();
      if (onArrival) onArrival(finalKm);
      return finalKm;
    } catch (e) {
      setError('Nepodařilo se získat polohu: ' + e.message);
      setStatus('navigating');
      return 0;
    }
  }, [onArrival]);

  const reset = useCallback(() => {
    setKm(0);
    setStatus('idle');
    setError(null);
    startPos.current = null;
    clearStart();
  }, []);

  return { km, status, error, recordStart, recordEnd, reset, tracking: status === 'navigating', arrived: status === 'done' };
}
