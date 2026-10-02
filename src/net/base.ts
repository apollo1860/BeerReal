import { GameError, type ClientAction, type PlayerView } from '../game/types';
import type { RoomConnection, Session } from './types';

/** Gemeinsame Listener-Verwaltung für alle Backends. */
export abstract class BaseConnection implements RoomConnection {
  protected view: PlayerView | null = null;
  protected seen = Date.now();
  protected offset = 0;
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

  clockOffset() {
    return this.offset;
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
    this.listeners.clear();
    this.errorListeners.clear();
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof GameError) return err.message;
  console.error(err);
  return 'Da ist etwas schiefgelaufen.';
}
