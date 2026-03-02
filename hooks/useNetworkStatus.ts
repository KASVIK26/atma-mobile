/**
 * useNetworkStatus
 *
 * Lightweight offline-detection hook that works without any extra native
 * packages.  It uses a HEAD request to a reliable, fast endpoint and checks
 * again whenever the app comes to the foreground.
 *
 * For a production app you can replace this with
 * @react-native-community/netinfo for richer information (wifi / cellular / etc.).
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const CHECK_URL = 'https://dns.google/resolve?name=example.com';
const CHECK_INTERVAL_MS = 15_000; // re-check every 15 s while online
const OFFLINE_RETRY_MS = 5_000;   // retry faster when we already know we're offline
const TIMEOUT_MS = 4_000;

async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(CHECK_URL, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const scheduleCheck = (online: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      async () => {
        if (!mountedRef.current) return;
        const result = await checkConnectivity();
        if (mountedRef.current) {
          setIsOnline(result);
          scheduleCheck(result);
        }
      },
      online ? CHECK_INTERVAL_MS : OFFLINE_RETRY_MS
    );
  };

  const doCheck = async () => {
    const result = await checkConnectivity();
    if (mountedRef.current) {
      setIsOnline(result);
      scheduleCheck(result);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    doCheck();

    // Re-check immediately when app comes to foreground
    let lastState: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (lastState !== 'active' && next === 'active') {
        doCheck();
      }
      lastState = next;
    });

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isOnline;
}
