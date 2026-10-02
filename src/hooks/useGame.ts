import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientAction, PlayerView } from '../game/types';
import { firebaseBackend } from '../net/firebase';
import { firebaseEnabled } from '../net/firebaseConfig';
import { localBackend } from '../net/local';
import type { GameBackend, RoomConnection, Session } from '../net/types';

export const backend: GameBackend = firebaseEnabled ? firebaseBackend : localBackend;
const SESSION_KEY = 'beerreal:session';

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // egal
  }
}

export function useGame() {
  const [conn, setConn] = useState<RoomConnection | null>(null);
  const [view, setView] = useState<PlayerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(() => loadSession() !== null);
  const connRef = useRef<RoomConnection | null>(null);

  const attach = useCallback((next: RoomConnection) => {
    connRef.current?.close();
    connRef.current = next;
    saveSession(next.session);
    next.subscribe(setView);
    next.onError(setError);
    setConn(next);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<RoomConnection>) => {
      setBusy(true);
      setError(null);
      try {
        attach(await fn());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [attach],
  );

  // Nach Reload wieder verbinden
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    backend
      .resume(session)
      .then(attach)
      .catch(() => saveSession(null))
      .finally(() => setBusy(false));
    return () => connRef.current?.close();
  }, [attach]);

  const send = useCallback((action: ClientAction) => connRef.current?.send(action), []);

  const leave = useCallback(() => {
    connRef.current?.send({ type: 'leave' });
    connRef.current?.close();
    connRef.current = null;
    saveSession(null);
    setConn(null);
    setView(null);
  }, []);

  return {
    conn,
    view,
    error,
    busy,
    clearError: () => setError(null),
    createRoom: (name: string) => run(() => backend.createRoom(name)),
    joinRoom: (code: string, name: string) => run(() => backend.joinRoom(code, name)),
    send,
    leave,
  };
}

/** Aktuelle Zeit (sekündlich), optional korrigiert um die Abweichung zur Serveruhr. */
export function useNow(offset = 0, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now + offset;
}

/** Bildschirm während des Spiels anlassen (sonst schläft v. a. der Host ein). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) l.release();
          else lock = l;
        })
        .catch(() => {});
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
