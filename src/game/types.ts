export type PlayerId = string;

export const MIN_PLAYERS = 3;

export interface PlayerStats {
  sipsDrunk: number;
  sipsGiven: number;
  missionsWon: number;
  missionsFailed: number;
  offersDone: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  joinedAt: number;
  stats: PlayerStats;
}

// ---------------------------------------------------------------------------
// Öffentliche Karten (Piccolo-Style)
// ---------------------------------------------------------------------------

export type CardKind =
  | 'drink'
  | 'task'
  | 'vote'
  | 'kmk'
  | 'neverHaveIEver'
  | 'rule'
  | 'category'
  | 'duel';

export interface CardTemplate {
  id: string;
  kind: CardKind;
  /** Platzhalter: {p1} {p2} {p3} = zufällige Spieler, {n} = Schlucke */
  text: string;
  sips?: [number, number];
  minPlayers?: number;
  spicy?: boolean;
  /** {p1} darf die {n} Schlucke direkt in der App verteilen */
  distribute?: boolean;
}

export interface VoteResult {
  loserIds: PlayerId[];
  votes: number;
}

export interface ActiveCard {
  id: string;
  templateId: string;
  kind: CardKind;
  text: string;
  sips: number;
  playerIds: PlayerId[];
  /** nur bei kind === 'vote': Wähler -> Gewählter */
  votes?: Record<PlayerId, PlayerId>;
  result?: VoteResult;
}

// ---------------------------------------------------------------------------
// Geheime Missionen
// ---------------------------------------------------------------------------

export interface MissionTemplate {
  id: string;
  /** {t} = Zielperson */
  text: string;
  minutes: [number, number];
  reward: [number, number];
  penalty: [number, number];
  /** Wie man beweist, dass man es geschafft hat */
  proof?: string;
  spicy?: boolean;
}

export type MissionStatus = 'active' | 'success' | 'failed' | 'expired' | 'cancelled';

export interface SecretMission {
  id: string;
  templateId: string;
  playerId: PlayerId;
  targetIds: PlayerId[];
  text: string;
  proof?: string;
  reward: number;
  penalty: number;
  issuedAt: number;
  deadline: number;
  status: MissionStatus;
  resolvedAt?: number;
}

// ---------------------------------------------------------------------------
// Offene Angebote
// ---------------------------------------------------------------------------

export interface OfferTemplate {
  id: string;
  /** {t} = Zielperson */
  text: string;
  reward: [number, number];
  spicy?: boolean;
}

export type OfferStatus = 'pending' | 'accepted' | 'done' | 'chickened' | 'vanished';

export interface Offer {
  id: string;
  templateId: string;
  text: string;
  targetIds: PlayerId[];
  reward: number;
  /** aktuell angebotener (bzw. annehmender) Spieler */
  playerId: PlayerId;
  declinedBy: PlayerId[];
  /** wie oft das Angebot nach Ablehnung noch erhöht weitergereicht wird */
  escalationsLeft: number;
  round: number;
  status: OfferStatus;
  issuedAt: number;
  respondBy: number;
  resolvedAt?: number;
}

// ---------------------------------------------------------------------------
// Sonstiges
// ---------------------------------------------------------------------------

export interface Distribution {
  id: string;
  playerId: PlayerId;
  sips: number;
  reason: string;
  createdAt: number;
}

export interface FeedEntry {
  id: string;
  at: number;
  icon: string;
  text: string;
}

/** Große Einblendung für alle Spieler (z. B. Mission geschafft, Schlücke verteilt). */
export interface Announcement {
  id: string;
  at: number;
  icon: string;
  title: string;
  text: string;
  /** Wer bekommt wie viele Schlücke */
  sips?: Record<PlayerId, number>;
  /** Wer das ausgelöst hat – bekommt die Einblendung selbst nicht */
  actorId?: PlayerId;
}

export type Tempo = 'chill' | 'normal' | 'chaos';

export interface Settings {
  tempo: Tempo;
  missionsEnabled: boolean;
  offersEnabled: boolean;
  spicy: boolean;
}

export type Phase = 'lobby' | 'playing' | 'ended';

export interface GameState {
  code: string;
  hostId: PlayerId;
  phase: Phase;
  createdAt: number;
  players: Player[];
  settings: Settings;
  card: ActiveCard | null;
  cardsPlayed: number;
  rule: { text: string; setAt: number } | null;
  missions: SecretMission[];
  offers: Offer[];
  distributions: Distribution[];
  feed: FeedEntry[];
  announcements: Announcement[];
  nextMissionAt: number | null;
  nextOfferAt: number | null;
  recentTemplates: string[];
  seq: number;
}

/** Was ein einzelner Spieler zu sehen bekommt (fremde aktive Missionen sind entfernt). */
export interface PlayerView extends GameState {
  me: PlayerId;
}

// ---------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------

export type ClientAction =
  | { type: 'join'; name: string }
  | { type: 'leave' }
  | { type: 'updateSettings'; settings: Partial<Settings> }
  | { type: 'start' }
  | { type: 'nextCard'; currentCardId: string | null }
  | { type: 'vote'; cardId: string; targetId: PlayerId }
  | { type: 'revealVotes'; cardId: string }
  | { type: 'resolveMission'; missionId: string; success: boolean }
  | { type: 'respondOffer'; offerId: string; accept: boolean }
  | { type: 'completeOffer'; offerId: string; done: boolean }
  | { type: 'distribute'; distributionId: string; allocation: Record<PlayerId, number> }
  | { type: 'end' }
  /** Nur zum Testen: sofort eine Mission/ein Angebot verschicken */
  | { type: 'debugSpawn'; what: 'mission' | 'offer' };

export type Action = (ClientAction & { by: PlayerId }) | { type: 'tick' };

export interface EngineContext {
  now: number;
  rng: () => number;
}

export class GameError extends Error {}
