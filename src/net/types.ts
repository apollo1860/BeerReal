import type { ClientAction, PlayerId, PlayerView } from '../game/types';

export interface Session {
  code: string;
  playerId: PlayerId;
  name: string;
  isHost: boolean;
}

/**
 * Verbindung eines Spielers zu einem Raum. Die UI kennt nur dieses Interface –
 * ob dahinter BroadcastChannel (lokal) oder später Firebase steckt, ist egal.
 */
export interface RoomConnection {
  readonly session: Session;
  /** Liefert sofort den letzten bekannten Stand (falls vorhanden) und danach jede Änderung. */
  subscribe(listener: (view: PlayerView) => void): () => void;
  onError(listener: (message: string) => void): () => void;
  /** Zeitpunkt der letzten Nachricht vom Host (für „Verbindung verloren“-Hinweis). */
  lastSeen(): number;
  /** Abweichung der lokalen Uhr zur Server-/Host-Uhr in ms (für Countdowns). */
  clockOffset(): number;
  send(action: ClientAction): void;
  close(): void;
}

export interface GameBackend {
  readonly kind: 'local' | 'firebase';
  createRoom(name: string): Promise<RoomConnection>;
  joinRoom(code: string, name: string): Promise<RoomConnection>;
  resume(session: Session): Promise<RoomConnection>;
}
