import { applyAction, createGame } from '../game/engine';
import { roomCode, uid } from '../game/random';
import { GameError, type Action, type ClientAction, type GameState, type PlayerId, type PlayerView } from '../game/types';
import { viewFor } from '../game/view';
import type { GameBackend, RoomConnection, Session } from './types';

/**
 * Lokales Backend zum Testen ohne Server: Jeder Browser-Tab ist ein Spieler.
 * Der Tab, der den Raum erstellt, ist Host und führt die Engine aus.
 * Kommunikation läuft über BroadcastChannel (nur gleicher Browser / gleiches Gerät).
 */

type Message =
  | { kind: 'action'; room: string; from: PlayerId; action: ClientAction }
  | { kind: 'sync'; room: string; from: PlayerId }
  | { kind: 'view'; room: string; to: PlayerId; view: PlayerView }
  | { kind: 'error'; room: string; to: PlayerId; message: string };

const CHANNEL = 'beerreal';
const TICK_MS = 1000;
const HEARTBEAT_MS = 4000;
const JOIN_TIMEOUT_MS = 3000;
const storageKey = (code: string) => `beerreal:room:${code}`;

abstract class BaseConnection implements RoomConnection {
  protected channel = new BroadcastChannel(CHANNEL);
  protected view: PlayerView | null = null;
  protected seen = Date.now();
  private listeners = new Set<(view: PlayerView) => void>();
  private errorListeners = new Set<(message: string) => void>();

  constructor(readonly session: Session) {}

  subscribe(listener: (view: PlayerView) => void) {
    this.listeners.add(listener);
    if (this.view) listener(this.view);
    return () => this.listeners.delete(listener);
  }

  onError(listener: (message: string) => void) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  lastSeen() {
    return this.seen;
  }

  protected emitView(view: PlayerView) {
    this.view = view;
    this.seen = Date.now();
    this.listeners.forEach((l) => l(view));
  }

  protected emitError(message: string) {
    this.errorListeners.forEach((l) => l(message));
  }

  abstract send(action: ClientAction): void;

  close() {
    this.channel.close();
    this.listeners.clear();
    this.errorListeners.clear();
  }
}

class HostConnection extends BaseConnection {
  private state: GameState;
  private timers: number[] = [];

  constructor(session: Session, state: GameState) {
    super(session);
    this.state = state;
    this.channel.onmessage = (e: MessageEvent<Message>) => this.onMessage(e.data);
    this.timers.push(window.setInterval(() => this.dispatch({ type: 'tick' }), TICK_MS));
    this.timers.push(window.setInterval(() => this.publish(), HEARTBEAT_MS));
    this.publish();
  }

  send(action: ClientAction) {
    try {
      this.dispatch({ ...action, by: this.session.playerId });
    } catch (err) {
      this.emitError(errorMessage(err));
    }
  }

  private onMessage(msg: Message) {
    if (msg.room !== this.session.code) return;
    if (msg.kind === 'sync') {
      if (this.state.players.some((p) => p.id === msg.from)) this.publishTo(msg.from);
      else this.post({ kind: 'error', room: msg.room, to: msg.from, message: 'Du bist nicht (mehr) in diesem Raum.' });
    } else if (msg.kind === 'action') {
      try {
        this.dispatch({ ...msg.action, by: msg.from });
        // Bei Reconnect ändert sich nichts am Zustand – trotzdem antworten
        if (msg.action.type === 'join') this.publishTo(msg.from);
      } catch (err) {
        this.post({ kind: 'error', room: msg.room, to: msg.from, message: errorMessage(err) });
      }
    }
  }

  private dispatch(action: Action) {
    const next = applyAction(this.state, action, { now: Date.now(), rng: Math.random });
    if (next === this.state) return;
    this.state = next;
    try {
      localStorage.setItem(storageKey(this.state.code), JSON.stringify(this.state));
    } catch {
      // Speicher voll / privat – Spiel läuft trotzdem weiter
    }
    this.publish();
  }

  private publish() {
    for (const p of this.state.players) {
      if (p.id !== this.session.playerId) this.publishTo(p.id);
    }
    this.emitView(viewFor(this.state, this.session.playerId));
  }

  private publishTo(id: PlayerId) {
    this.post({ kind: 'view', room: this.session.code, to: id, view: viewFor(this.state, id) });
  }

  private post(msg: Message) {
    this.channel.postMessage(msg);
  }

  close() {
    this.timers.forEach((t) => window.clearInterval(t));
    super.close();
  }
}

class ClientConnection extends BaseConnection {
  constructor(session: Session) {
    super(session);
    this.channel.onmessage = (e: MessageEvent<Message>) => {
      const msg = e.data;
      if (msg.room !== this.session.code) return;
      if (msg.kind === 'view' && msg.to === this.session.playerId) this.emitView(msg.view);
      if (msg.kind === 'error' && msg.to === this.session.playerId) this.emitError(msg.message);
    };
  }

  send(action: ClientAction) {
    this.channel.postMessage({ kind: 'action', room: this.session.code, from: this.session.playerId, action } satisfies Message);
  }

  sync() {
    this.channel.postMessage({ kind: 'sync', room: this.session.code, from: this.session.playerId } satisfies Message);
  }

  /** Wartet auf die erste Antwort des Hosts. */
  waitForHost(): Promise<this> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        window.clearTimeout(timer);
        offView();
        offError();
      };
      const timer = window.setTimeout(() => {
        cleanup();
        this.close();
        reject(new Error('Raum nicht gefunden. Ist der Host-Tab noch offen?'));
      }, JOIN_TIMEOUT_MS);
      const offView = this.subscribe(() => {
        cleanup();
        resolve(this);
      });
      const offError = this.onError((message) => {
        cleanup();
        this.close();
        reject(new Error(message));
      });
    });
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof GameError) return err.message;
  console.error(err);
  return 'Da ist etwas schiefgelaufen.';
}

function loadRoom(code: string): GameState | null {
  try {
    const raw = localStorage.getItem(storageKey(code));
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

export const localBackend: GameBackend = {
  async createRoom(name) {
    let code = roomCode();
    while (loadRoom(code)) code = roomCode();
    const playerId = uid();
    const state = createGame(code, { id: playerId, name }, Date.now());
    return new HostConnection({ code, playerId, name: state.players[0].name, isHost: true }, state);
  },

  async joinRoom(code, name) {
    const conn = new ClientConnection({ code: code.trim().toUpperCase(), playerId: uid(), name, isHost: false });
    const waiting = conn.waitForHost();
    conn.send({ type: 'join', name });
    return waiting;
  },

  async resume(session) {
    if (session.isHost) {
      const state = loadRoom(session.code);
      if (!state) throw new Error('Raum existiert nicht mehr.');
      return new HostConnection(session, state);
    }
    const conn = new ClientConnection(session);
    const waiting = conn.waitForHost();
    conn.sync();
    return waiting;
  },
};
