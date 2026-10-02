import { initializeApp } from 'firebase/app';
import { browserSessionPersistence, connectAuthEmulator, getAuth, setPersistence, signInAnonymously } from 'firebase/auth';
import {
  connectDatabaseEmulator,
  get,
  getDatabase,
  onChildAdded,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type Database,
  type DataSnapshot,
} from 'firebase/database';
import { applyAction, createGame } from '../game/engine';
import { roomCode } from '../game/random';
import { GameError, type Action, type ClientAction, type GameState, type PlayerId } from '../game/types';
import { mergeView, privateView, publicView, type PrivateView } from '../game/view';
import { BaseConnection, errorMessage } from './base';
import { firebaseConfig, useEmulator } from './firebaseConfig';
import type { GameBackend, Session } from './types';

/**
 * Firebase-Backend (Realtime Database + anonyme Anmeldung).
 *
 * rooms/{code}/meta           { hostId, createdAt }                 – lesbar für alle Angemeldeten
 * rooms/{code}/public         JSON: öffentlicher Zustand            – schreibt nur der Host
 * rooms/{code}/private/{uid}  JSON: eigene Mission, eigene Stimme   – liest nur {uid}
 * rooms/{code}/host           JSON: kompletter Zustand              – nur Host (für Reload)
 * rooms/{code}/actions/{id}   { by, action, at }                    – Spieler schreiben, Host verarbeitet & löscht
 * rooms/{code}/errors/{uid}   { message, at }                       – Fehlermeldungen an einen Spieler
 * rooms/{code}/hostSeen       Server-Zeit des letzten Host-Lebenszeichens
 *
 * Der Host-Client führt die Engine aus (wie beim lokalen Modus). Zustände
 * werden als JSON-Strings gespeichert, weil die Realtime Database leere Arrays
 * und undefined-Werte sonst verschluckt.
 */

const TICK_MS = 1000;
const HEARTBEAT_MS = 10_000;
const JOIN_TIMEOUT_MS = 10_000;

let services: Promise<{ db: Database; uid: string }> | null = null;

function connect() {
  services ??= (async () => {
    const app = initializeApp(
      useEmulator
        ? { apiKey: 'demo-key', projectId: 'demo-beerreal', databaseURL: 'https://demo-beerreal-default-rtdb.firebaseio.com' }
        : firebaseConfig,
    );
    const auth = getAuth(app);
    const db = getDatabase(app);
    if (useEmulator) {
      connectAuthEmulator(auth, `http://${location.hostname}:9099`, { disableWarnings: true });
      connectDatabaseEmulator(db, location.hostname, 9000);
    }
    // Pro Tab eine eigene Identität – so kann man auch mit mehreren Tabs testen.
    await setPersistence(auth, browserSessionPersistence);
    await auth.authStateReady();
    const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
    return { db, uid: user.uid };
  })().catch((err: { code?: string; message?: string }) => {
    services = null;
    console.error(err);
    const code = err.code ?? '';
    if (code.includes('configuration-not-found') || code.includes('operation-not-allowed') || code.includes('admin-restricted')) {
      throw new Error('Firebase: Anonyme Anmeldung ist nicht aktiviert (Authentication → Anmeldemethode → Anonym).');
    }
    if (code.includes('unauthorized-domain') || code.includes('requests-from-referer')) {
      throw new Error(`Firebase: Domain ${location.hostname} ist nicht autorisiert (Authentication → Einstellungen → Autorisierte Domains).`);
    }
    throw new Error(`Verbindung zu Firebase fehlgeschlagen${code ? ` (${code})` : ''}.`);
  });
  return services;
}

function serverOffset(db: Database): Promise<number> {
  return new Promise((resolve) => {
    onValue(ref(db, '.info/serverTimeOffset'), (snap) => resolve(Number(snap.val()) || 0), { onlyOnce: true });
  });
}

const roomPath = (code: string, sub = '') => `rooms/${code}${sub ? `/${sub}` : ''}`;

// ---------------------------------------------------------------------------
// Host: führt die Engine aus
// ---------------------------------------------------------------------------

class FirebaseHost extends BaseConnection {
  private unsubs: (() => void)[] = [];
  private timers: number[] = [];
  private written = { public: '', private: new Map<PlayerId, string>() };

  constructor(
    session: Session,
    private db: Database,
    private state: GameState,
    offset: number,
  ) {
    super(session);
    this.offset = offset;
    this.unsubs.push(
      onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
        this.offset = Number(snap.val()) || 0;
      }),
      onChildAdded(ref(db, roomPath(session.code, 'actions')), (snap) => this.onAction(snap)),
    );
    this.timers.push(
      window.setInterval(() => this.dispatch({ type: 'tick' }), TICK_MS),
      window.setInterval(() => this.heartbeat(), HEARTBEAT_MS),
    );
    this.heartbeat();
    this.publish(true);
  }

  private now() {
    return Date.now() + this.offset;
  }

  send(action: ClientAction) {
    try {
      this.dispatch({ ...action, by: this.session.playerId });
    } catch (err) {
      this.emitError(errorMessage(err));
    }
  }

  private onAction(snap: DataSnapshot) {
    const data = snap.val() as { by: PlayerId; action: string } | null;
    remove(snap.ref).catch(console.error);
    if (!data) return;
    try {
      this.dispatch({ ...(JSON.parse(data.action) as ClientAction), by: data.by });
    } catch (err) {
      set(ref(this.db, roomPath(this.session.code, `errors/${data.by}`)), { message: errorMessage(err), at: this.now() }).catch(console.error);
    }
  }

  private dispatch(action: Action) {
    const next = applyAction(this.state, action, { now: this.now(), rng: Math.random });
    if (next === this.state) return;
    this.state = next;
    this.publish();
  }

  private heartbeat() {
    set(ref(this.db, roomPath(this.session.code, 'hostSeen')), serverTimestamp()).catch(console.error);
  }

  /** Schreibt nur geänderte Teile – in einem atomaren Multi-Path-Update. */
  private publish(force = false) {
    const pub = publicView(this.state);
    const updates: Record<string, unknown> = { host: JSON.stringify(this.state) };
    const pubJson = JSON.stringify(pub);
    if (force || pubJson !== this.written.public) {
      updates.public = pubJson;
      this.written.public = pubJson;
    }
    for (const p of this.state.players) {
      const json = JSON.stringify(privateView(this.state, p.id));
      if (force || this.written.private.get(p.id) !== json) {
        updates[`private/${p.id}`] = json;
        this.written.private.set(p.id, json);
      }
    }
    update(ref(this.db, roomPath(this.session.code)), updates).catch((err) => {
      console.error(err);
      this.emitError('Speichern fehlgeschlagen – Verbindung prüfen.');
    });
    this.emitView(mergeView(pub, privateView(this.state, this.session.playerId), this.session.playerId));
  }

  close() {
    this.unsubs.forEach((u) => u());
    this.timers.forEach((t) => window.clearInterval(t));
    super.close();
  }
}

// ---------------------------------------------------------------------------
// Mitspieler: lesen öffentlichen + eigenen privaten Zustand, schicken Aktionen
// ---------------------------------------------------------------------------

class FirebaseClient extends BaseConnection {
  private unsubs: (() => void)[] = [];
  private pub: GameState | null = null;
  private priv: PrivateView | null = null;

  constructor(
    session: Session,
    private db: Database,
  ) {
    super(session);
    const { code, playerId } = session;
    let firstError = true;
    this.unsubs.push(
      onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
        this.offset = Number(snap.val()) || 0;
      }),
      onValue(ref(db, roomPath(code, 'public')), (snap) => {
        this.pub = snap.exists() ? (JSON.parse(snap.val() as string) as GameState) : null;
        this.refresh();
      }),
      onValue(ref(db, roomPath(code, `private/${playerId}`)), (snap) => {
        this.priv = snap.exists() ? (JSON.parse(snap.val() as string) as PrivateView) : null;
        this.refresh();
      }),
      onValue(ref(db, roomPath(code, `errors/${playerId}`)), (snap) => {
        // Der erste Wert ist ein alter Stand – nur neue Fehler anzeigen
        if (!firstError && snap.exists()) this.emitError((snap.val() as { message: string }).message);
        firstError = false;
      }),
      onValue(ref(db, roomPath(code, 'hostSeen')), (snap) => {
        if (typeof snap.val() === 'number') this.seen = (snap.val() as number) - this.offset;
      }),
    );
  }

  private refresh() {
    if (!this.pub) return;
    const seen = this.seen;
    this.emitView(mergeView(this.pub, this.priv, this.session.playerId));
    this.seen = Math.max(seen, this.seen);
  }

  send(action: ClientAction) {
    push(ref(this.db, roomPath(this.session.code, 'actions')), {
      by: this.session.playerId,
      action: JSON.stringify(action),
      at: serverTimestamp(),
    }).catch((err) => {
      console.error(err);
      this.emitError('Senden fehlgeschlagen – Verbindung prüfen.');
    });
  }

  /** Wartet, bis der Host uns in die Spielerliste aufgenommen hat. */
  waitUntilJoined(): Promise<this> {
    return new Promise((resolve, reject) => {
      const done = (fn: () => void) => {
        window.clearTimeout(timer);
        offView();
        offError();
        fn();
      };
      const timer = window.setTimeout(
        () => done(() => (this.close(), reject(new Error('Der Host antwortet nicht. Ist sein Handy noch im Spiel?')))),
        JOIN_TIMEOUT_MS,
      );
      const offView = this.subscribe((view) => {
        if (view.players.some((p) => p.id === this.session.playerId)) done(() => resolve(this));
      });
      const offError = this.onError((message) => done(() => (this.close(), reject(new Error(message)))));
    });
  }

  close() {
    this.unsubs.forEach((u) => u());
    super.close();
  }
}

// ---------------------------------------------------------------------------

export const firebaseBackend: GameBackend = {
  kind: 'firebase',

  async createRoom(name) {
    createGame('XXXXX', { id: 'x', name }, 0); // Name prüfen, bevor etwas geschrieben wird
    const { db, uid } = await connect();
    const offset = await serverOffset(db);
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = roomCode();
      const result = await runTransaction(ref(db, roomPath(code, 'meta')), (meta) =>
        meta ? undefined : { hostId: uid, createdAt: Date.now() + offset },
      );
      if (!result.committed) continue;
      const state = createGame(code, { id: uid, name }, Date.now() + offset);
      return new FirebaseHost({ code, playerId: uid, name: state.players[0].name, isHost: true }, db, state, offset);
    }
    throw new Error('Konnte keinen freien Raumcode finden.');
  },

  async joinRoom(rawCode, name) {
    const code = rawCode.trim().toUpperCase();
    const { db, uid } = await connect();
    const meta = await get(ref(db, roomPath(code, 'meta')));
    if (!meta.exists()) throw new GameError('Raum nicht gefunden.');
    if ((meta.val() as { hostId: string }).hostId === uid) {
      return this.resume({ code, playerId: uid, name, isHost: true });
    }
    const client = new FirebaseClient({ code, playerId: uid, name, isHost: false }, db);
    const joined = client.waitUntilJoined();
    client.send({ type: 'join', name });
    return joined;
  },

  async resume(session) {
    const { db, uid } = await connect();
    if (uid !== session.playerId) throw new Error('Sitzung abgelaufen.');
    if (session.isHost) {
      const snap = await get(ref(db, roomPath(session.code, 'host')));
      if (!snap.exists()) throw new Error('Raum existiert nicht mehr.');
      return new FirebaseHost(session, db, JSON.parse(snap.val() as string) as GameState, await serverOffset(db));
    }
    return new FirebaseClient(session, db).waitUntilJoined();
  },
};
