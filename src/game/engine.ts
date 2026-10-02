import { CARD_KIND_WEIGHTS, CARD_TEMPLATES, KMK_SETS } from './content/cards';
import { MISSION_TEMPLATES } from './content/missions';
import { OFFER_TEMPLATES } from './content/offers';
import { pick, pickWeighted, randInt, randRange, shuffle } from './random';
import {
  GameError,
  MIN_PLAYERS,
  type Action,
  type ActiveCard,
  type Announcement,
  type CardKind,
  type CardTemplate,
  type EngineContext,
  type GameState,
  type Offer,
  type Player,
  type PlayerId,
  type SecretMission,
  type Settings,
  type Tempo,
} from './types';

/**
 * Die Spiel-Engine ist rein funktional: (Zustand, Aktion) -> neuer Zustand.
 * Sie läuft nur beim Host (lokal) bzw. später in einer Cloud Function /
 * beim Host-Client mit Firebase. Alle Zeiten sind Millisekunden-Timestamps.
 */

const MINUTE = 60_000;
export const OFFER_RESPONSE_MS = 90_000;
export const MAX_PLAYERS = 20;
const FEED_LIMIT = 60;
const RECENT_LIMIT = 80;
const RETRY_MS = 30_000;

/** Abstand zwischen zwei neuen Missionen/Angeboten (in Minuten). */
export const TEMPO_INTERVALS: Record<Tempo, { missions: [number, number]; offers: [number, number] }> = {
  chill: { missions: [5, 9], offers: [4, 8] },
  normal: { missions: [3, 6], offers: [3, 6] },
  chaos: { missions: [1.5, 3], offers: [1.5, 3] },
};

export const DEFAULT_SETTINGS: Settings = {
  tempo: 'normal',
  missionsEnabled: true,
  offersEnabled: true,
  spicy: true,
};

export function createGame(code: string, host: { id: PlayerId; name: string }, now: number): GameState {
  return {
    code,
    hostId: host.id,
    phase: 'lobby',
    createdAt: now,
    players: [newPlayer(host.id, host.name, now)],
    settings: { ...DEFAULT_SETTINGS },
    card: null,
    cardsPlayed: 0,
    rule: null,
    missions: [],
    offers: [],
    distributions: [],
    feed: [],
    announcements: [],
    nextMissionAt: null,
    nextOfferAt: null,
    recentTemplates: [],
    seq: 0,
  };
}

export function applyAction(state: GameState, action: Action, ctx: EngineContext): GameState {
  if (action.type === 'tick') return tick(state, ctx);

  const s = structuredClone(state);
  const by = action.by;

  if (action.type === 'join') {
    join(s, by, action.name, ctx);
    return s;
  }

  const me = s.players.find((p) => p.id === by);
  if (!me) throw new GameError('Du bist nicht (mehr) in diesem Raum.');

  switch (action.type) {
    case 'leave':
      leave(s, by, ctx);
      return s;

    case 'updateSettings':
      requireHost(s, by);
      s.settings = { ...s.settings, ...action.settings };
      return s;

    case 'start':
      requireHost(s, by);
      if (s.phase !== 'lobby') throw new GameError('Das Spiel läuft bereits.');
      if (s.players.length < MIN_PLAYERS) throw new GameError(`Ihr braucht mindestens ${MIN_PLAYERS} Spieler.`);
      s.phase = 'playing';
      s.nextMissionAt = ctx.now + randInt(ctx.rng, 1, 2) * MINUTE;
      s.nextOfferAt = ctx.now + randInt(ctx.rng, 2, 3) * MINUTE;
      addFeed(s, ctx, '🍻', 'Das Spiel beginnt! Handys bereithalten – es kann jederzeit eine geheime Nachricht kommen.');
      drawCard(s, ctx);
      return s;

    case 'nextCard':
      requirePlaying(s);
      // Doppelt getippt / veraltet -> ignorieren
      if ((s.card?.id ?? null) !== action.currentCardId) return state;
      drawCard(s, ctx);
      return s;

    case 'vote': {
      requirePlaying(s);
      const card = s.card;
      if (!card || card.id !== action.cardId || card.kind !== 'vote') throw new GameError('Diese Abstimmung ist vorbei.');
      if (card.result) throw new GameError('Die Abstimmung ist schon aufgelöst.');
      if (!s.players.some((p) => p.id === action.targetId)) throw new GameError('Unbekannter Spieler.');
      card.votes = { ...card.votes, [by]: action.targetId };
      if (s.players.every((p) => card.votes?.[p.id])) resolveVote(s, card, ctx);
      return s;
    }

    case 'revealVotes': {
      requirePlaying(s);
      const card = s.card;
      if (!card || card.id !== action.cardId || card.kind !== 'vote' || card.result) return state;
      if (Object.keys(card.votes ?? {}).length === 0) throw new GameError('Es hat noch niemand abgestimmt.');
      resolveVote(s, card, ctx);
      return s;
    }

    case 'resolveMission': {
      const mission = s.missions.find((m) => m.id === action.missionId);
      if (!mission || mission.playerId !== by) throw new GameError('Mission nicht gefunden.');
      if (mission.status !== 'active') throw new GameError('Diese Mission ist schon vorbei.');
      mission.resolvedAt = ctx.now;
      if (action.success) {
        mission.status = 'success';
        me.stats.missionsWon++;
        addDistribution(s, ctx, by, mission.reward, `Geheime Mission: „${mission.text}“`);
        addFeed(s, ctx, '🕵️', `${me.name} hat eine geheime Mission erfüllt: „${mission.text}“ – und darf ${sips(mission.reward)} verteilen!`);
        announce(s, ctx, {
          icon: '🕵️',
          title: `${me.name} hat eine geheime Mission geschafft!`,
          text: `„${mission.text}“ – ${me.name} verteilt gleich ${sips(mission.reward)}.`,
          actorId: by,
        });
      } else {
        mission.status = 'failed';
        me.stats.missionsFailed++;
        drink(s, by, mission.penalty);
        addFeed(s, ctx, '🚨', `${me.name} ist an einer geheimen Mission gescheitert: „${mission.text}“ – ${me.name} trinkt ${sips(mission.penalty)}.`);
        announce(s, ctx, {
          icon: '🚨',
          title: `${me.name} wurde erwischt!`,
          text: `Geheime Mission: „${mission.text}“`,
          sips: { [by]: mission.penalty },
          actorId: by,
        });
      }
      return s;
    }

    case 'respondOffer': {
      const offer = s.offers.find((o) => o.id === action.offerId);
      if (!offer || offer.playerId !== by || offer.status !== 'pending') throw new GameError('Dieses Angebot gilt nicht mehr.');
      if (action.accept) {
        offer.status = 'accepted';
        addFeed(s, ctx, '🤝', `${me.name} nimmt das Angebot an: „${offer.text}“ – Belohnung: ${sips(offer.reward)} verteilen.`);
      } else {
        declineOffer(s, offer, ctx, 'lehnt ab');
      }
      return s;
    }

    case 'completeOffer': {
      const offer = s.offers.find((o) => o.id === action.offerId);
      if (!offer || offer.playerId !== by || offer.status !== 'accepted') throw new GameError('Dieses Angebot gilt nicht mehr.');
      offer.resolvedAt = ctx.now;
      if (action.done) {
        offer.status = 'done';
        me.stats.offersDone++;
        addDistribution(s, ctx, by, offer.reward, 'Angebot erfüllt');
        addFeed(s, ctx, '✅', `${me.name} hat „${offer.text}“ durchgezogen und verteilt ${sips(offer.reward)}!`);
      } else {
        offer.status = 'chickened';
        drink(s, by, offer.reward);
        addFeed(s, ctx, '🐔', `${me.name} hat gekniffen und trinkt selbst ${sips(offer.reward)}.`);
      }
      return s;
    }

    case 'distribute': {
      const dist = s.distributions.find((d) => d.id === action.distributionId);
      if (!dist || dist.playerId !== by) throw new GameError('Nichts zu verteilen.');
      const entries = Object.entries(action.allocation).filter(([, n]) => n > 0);
      let total = 0;
      for (const [id, n] of entries) {
        if (!Number.isInteger(n)) throw new GameError('Nur ganze Schlücke, bitte.');
        if (id === by) throw new GameError('Du kannst dir nicht selbst Schlücke geben.');
        if (!s.players.some((p) => p.id === id)) throw new GameError('Unbekannter Spieler.');
        total += n;
      }
      if (total !== dist.sips) throw new GameError(`Du musst genau ${sips(dist.sips)} verteilen.`);
      for (const [id, n] of entries) drink(s, id, n);
      me.stats.sipsGiven += total;
      s.distributions = s.distributions.filter((d) => d !== dist);
      const list = entries.map(([id, n]) => `${playerName(s, id)} ${n}`).join(', ');
      addFeed(s, ctx, '🍺', `${me.name} verteilt: ${list}.`);
      announce(s, ctx, {
        icon: '🍺',
        title: `${me.name} verteilt ${sips(total)}`,
        text: dist.reason,
        sips: Object.fromEntries(entries),
        actorId: by,
      });
      return s;
    }

    case 'end':
      requireHost(s, by);
      endGame(s, ctx);
      return s;

    case 'debugSpawn':
      requireHost(s, by);
      requirePlaying(s);
      if (!(action.what === 'mission' ? issueMission(s, ctx) : issueOffer(s, ctx))) {
        throw new GameError('Gerade hat schon jede*r etwas offen.');
      }
      return s;
  }
}

// ---------------------------------------------------------------------------
// Tick: Timer auswerten, neue Missionen/Angebote verschicken
// ---------------------------------------------------------------------------

export function tick(state: GameState, ctx: EngineContext): GameState {
  const { now } = ctx;
  const due =
    state.missions.some((m) => m.status === 'active' && m.deadline <= now) ||
    state.offers.some((o) => o.status === 'pending' && o.respondBy <= now) ||
    (state.phase === 'playing' &&
      ((state.settings.missionsEnabled && state.nextMissionAt !== null && state.nextMissionAt <= now) ||
        (state.settings.offersEnabled && state.nextOfferAt !== null && state.nextOfferAt <= now)));
  if (!due) return state;

  const s = structuredClone(state);

  for (const mission of s.missions) {
    if (mission.status !== 'active' || mission.deadline > now) continue;
    mission.status = 'expired';
    mission.resolvedAt = now;
    const player = s.players.find((p) => p.id === mission.playerId);
    if (player) player.stats.missionsFailed++;
    drink(s, mission.playerId, mission.penalty);
    addFeed(s, ctx, '⏰', `${playerName(s, mission.playerId)} hat eine geheime Mission nicht rechtzeitig geschafft: „${mission.text}“ – trinkt ${sips(mission.penalty)}.`);
    announce(s, ctx, {
      icon: '⏰',
      title: `${playerName(s, mission.playerId)} hat eine geheime Mission verpennt!`,
      text: `„${mission.text}“`,
      sips: { [mission.playerId]: mission.penalty },
    });
  }

  for (const offer of s.offers) {
    if (offer.status === 'pending' && offer.respondBy <= now) declineOffer(s, offer, ctx, 'hat zu lange gezögert');
  }

  if (s.phase === 'playing') {
    const intervals = TEMPO_INTERVALS[s.settings.tempo];
    if (s.settings.missionsEnabled && s.nextMissionAt !== null && s.nextMissionAt <= now) {
      const issued = issueMission(s, ctx);
      s.nextMissionAt = now + (issued ? randMinutes(ctx, intervals.missions) : RETRY_MS);
    }
    if (s.settings.offersEnabled && s.nextOfferAt !== null && s.nextOfferAt <= now) {
      const issued = issueOffer(s, ctx);
      s.nextOfferAt = now + (issued ? randMinutes(ctx, intervals.offers) : RETRY_MS);
    }
  }

  return s;
}

// ---------------------------------------------------------------------------
// Spieler
// ---------------------------------------------------------------------------

function newPlayer(id: PlayerId, name: string, now: number): Player {
  return {
    id,
    name: validName(name),
    joinedAt: now,
    stats: { sipsDrunk: 0, sipsGiven: 0, missionsWon: 0, missionsFailed: 0, offersDone: 0 },
  };
}

function validName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 1) throw new GameError('Bitte gib einen Namen ein.');
  if (name.length > 20) throw new GameError('Name ist zu lang (max. 20 Zeichen).');
  return name;
}

function join(s: GameState, id: PlayerId, name: string, ctx: EngineContext) {
  if (s.players.some((p) => p.id === id)) return; // Reconnect
  if (s.phase === 'ended') throw new GameError('Das Spiel ist schon vorbei.');
  if (s.players.length >= MAX_PLAYERS) throw new GameError('Der Raum ist voll.');
  const player = newPlayer(id, name, ctx.now);
  if (s.players.some((p) => p.name.toLowerCase() === player.name.toLowerCase())) {
    throw new GameError('Diesen Namen gibt es schon im Raum.');
  }
  s.players.push(player);
  addFeed(s, ctx, '👋', `${player.name} ist dabei.`);
}

function leave(s: GameState, id: PlayerId, ctx: EngineContext) {
  const name = playerName(s, id);
  if (id === s.hostId) {
    endGame(s, ctx);
    addFeed(s, ctx, '🚪', `${name} (Host) hat den Raum verlassen. Spiel beendet.`);
    return;
  }
  s.players = s.players.filter((p) => p.id !== id);
  for (const m of s.missions) {
    if (m.status === 'active' && (m.playerId === id || m.targetIds.includes(id))) {
      m.status = 'cancelled';
      m.resolvedAt = ctx.now;
    }
  }
  for (const o of s.offers) {
    if ((o.status === 'pending' || o.status === 'accepted') && (o.playerId === id || o.targetIds.includes(id))) {
      o.status = 'vanished';
      o.resolvedAt = ctx.now;
    }
  }
  s.distributions = s.distributions.filter((d) => d.playerId !== id);
  if (s.card?.votes) {
    const votes = Object.entries(s.card.votes).filter(([voter, target]) => voter !== id && target !== id);
    s.card.votes = Object.fromEntries(votes);
  }
  addFeed(s, ctx, '🚪', `${name} hat das Spiel verlassen.`);
}

function endGame(s: GameState, ctx: EngineContext) {
  s.phase = 'ended';
  s.nextMissionAt = null;
  s.nextOfferAt = null;
  for (const m of s.missions) {
    if (m.status === 'active') {
      m.status = 'cancelled';
      m.resolvedAt = ctx.now;
    }
  }
  for (const o of s.offers) {
    if (o.status === 'pending' || o.status === 'accepted') {
      o.status = 'vanished';
      o.resolvedAt = ctx.now;
    }
  }
}

// ---------------------------------------------------------------------------
// Karten
// ---------------------------------------------------------------------------

function cardAllowed(t: CardTemplate, s: GameState): boolean {
  return (t.minPlayers ?? 0) <= s.players.length && (s.settings.spicy || !t.spicy);
}

export function drawCard(s: GameState, ctx: EngineContext): ActiveCard {
  const allowed = CARD_TEMPLATES.filter((t) => cardAllowed(t, s));
  const fresh = allowed.filter((t) => !s.recentTemplates.includes(t.id));
  const pool = fresh.length > 0 ? fresh : allowed;

  const kinds = [...new Set(pool.map((t) => t.kind))];
  const kind = pickWeighted<CardKind>(ctx.rng, kinds, (k) => CARD_KIND_WEIGHTS[k]);
  const template = pick(ctx.rng, pool.filter((t) => t.kind === kind));

  const players = shuffle(ctx.rng, s.players);
  const n = template.sips ? randRange(ctx.rng, template.sips) : 0;
  const used = new Set<PlayerId>();
  let text = template.text.replace(/\{p([123])\}/g, (_, idx: string) => {
    const p = players[Number(idx) - 1] ?? players[0];
    used.add(p.id);
    return p.name;
  });
  if (text.includes('{x}')) {
    const others = players.filter((p) => !used.has(p.id));
    const usePlayers = others.length >= 3 && ctx.rng() < 0.5;
    const trio = usePlayers ? others.slice(0, 3).map((p) => p.name) : pick(ctx.rng, KMK_SETS);
    text = text.replace('{x}', trio.join(', '));
  }
  text = text.replace(/\{n\}/g, String(n));

  const card: ActiveCard = {
    id: nextId(s, 'c'),
    templateId: template.id,
    kind: template.kind,
    text,
    sips: n,
    playerIds: [...used],
  };
  if (card.kind === 'vote') {
    card.votes = {};
    card.sips = n || 2;
  }
  if (card.kind === 'rule') s.rule = { text, setAt: ctx.now };
  if (template.distribute && card.playerIds[0]) {
    addDistribution(s, ctx, card.playerIds[0], n, 'Karte');
  }

  s.card = card;
  s.cardsPlayed++;
  remember(s, template.id);
  return card;
}

function resolveVote(s: GameState, card: ActiveCard, ctx: EngineContext) {
  const counts = new Map<PlayerId, number>();
  for (const target of Object.values(card.votes ?? {})) counts.set(target, (counts.get(target) ?? 0) + 1);
  const max = Math.max(...counts.values());
  const loserIds = [...counts.entries()].filter(([, n]) => n === max).map(([id]) => id);
  card.result = { loserIds, votes: max };
  for (const id of loserIds) drink(s, id, card.sips);
  const names = loserIds.map((id) => playerName(s, id)).join(' & ');
  addFeed(s, ctx, '🗳️', `${names} ${loserIds.length > 1 ? 'trinken' : 'trinkt'} ${sips(card.sips)} (${max} Stimme${max === 1 ? '' : 'n'}).`);
}

// ---------------------------------------------------------------------------
// Geheime Missionen
// ---------------------------------------------------------------------------

/** Wählt unter den Kandidaten diejenigen, die bisher am seltensten dran waren. */
function leastServed(candidates: Player[], count: (p: Player) => number): Player[] {
  const min = Math.min(...candidates.map(count));
  return candidates.filter((p) => count(p) === min);
}

export function issueMission(s: GameState, ctx: EngineContext): SecretMission | null {
  // Niemand darf zwei geheime Missionen gleichzeitig haben.
  const busy = new Set(s.missions.filter((m) => m.status === 'active').map((m) => m.playerId));
  const candidates = s.players.filter((p) => !busy.has(p.id));
  if (candidates.length === 0 || s.players.length < 2) return null;

  const player = pick(ctx.rng, leastServed(candidates, (p) => s.missions.filter((m) => m.playerId === p.id).length));
  const allowed = MISSION_TEMPLATES.filter((t) => s.settings.spicy || !t.spicy);
  const hadBefore = new Set(s.missions.filter((m) => m.playerId === player.id).map((m) => m.templateId));
  const fresh = allowed.filter((t) => !hadBefore.has(t.id) && !s.recentTemplates.includes(t.id));
  const template = pick(ctx.rng, fresh.length > 0 ? fresh : allowed);

  const targetIds: PlayerId[] = [];
  let text = template.text;
  if (text.includes('{t}')) {
    const target = pick(ctx.rng, s.players.filter((p) => p.id !== player.id));
    targetIds.push(target.id);
    text = text.replace(/\{t\}/g, target.name);
  }

  const mission: SecretMission = {
    id: nextId(s, 'm'),
    templateId: template.id,
    playerId: player.id,
    targetIds,
    text,
    proof: template.proof,
    reward: randRange(ctx.rng, template.reward),
    penalty: randRange(ctx.rng, template.penalty),
    issuedAt: ctx.now,
    deadline: ctx.now + randRange(ctx.rng, template.minutes) * MINUTE,
    status: 'active',
  };
  s.missions.push(mission);
  remember(s, template.id);
  return mission;
}

// ---------------------------------------------------------------------------
// Offene Angebote
// ---------------------------------------------------------------------------

function hasOpenOffer(s: GameState, id: PlayerId): boolean {
  return s.offers.some((o) => o.playerId === id && (o.status === 'pending' || o.status === 'accepted'));
}

function renderOffer(s: GameState, offer: Offer, ctx: EngineContext) {
  const template = OFFER_TEMPLATES.find((t) => t.id === offer.templateId);
  if (!template) return;
  offer.targetIds = [];
  offer.text = template.text;
  if (template.text.includes('{t}')) {
    const target = pick(ctx.rng, s.players.filter((p) => p.id !== offer.playerId));
    offer.targetIds = [target.id];
    offer.text = template.text.replace(/\{t\}/g, target.name);
  }
}

export function issueOffer(s: GameState, ctx: EngineContext): Offer | null {
  const candidates = s.players.filter((p) => !hasOpenOffer(s, p.id));
  if (candidates.length === 0 || s.players.length < 2) return null;

  const player = pick(ctx.rng, leastServed(candidates, (p) => s.offers.filter((o) => o.playerId === p.id).length));
  const allowed = OFFER_TEMPLATES.filter((t) => s.settings.spicy || !t.spicy);
  const fresh = allowed.filter((t) => !s.recentTemplates.includes(t.id));
  const template = pick(ctx.rng, fresh.length > 0 ? fresh : allowed);

  const offer: Offer = {
    id: nextId(s, 'o'),
    templateId: template.id,
    text: template.text,
    targetIds: [],
    reward: randRange(ctx.rng, template.reward),
    playerId: player.id,
    declinedBy: [],
    // wird zwischen 1 und 5 Mal erhöht weitergereicht, bevor es verfällt
    escalationsLeft: randInt(ctx.rng, 1, 5),
    round: 1,
    status: 'pending',
    issuedAt: ctx.now,
    respondBy: ctx.now + OFFER_RESPONSE_MS,
  };
  renderOffer(s, offer, ctx);
  s.offers.push(offer);
  remember(s, template.id);
  addFeed(s, ctx, '📣', `Neues Angebot für ${player.name}: „${offer.text}“ – ${sips(offer.reward)} verteilen.`);
  return offer;
}

function declineOffer(s: GameState, offer: Offer, ctx: EngineContext, verb: string) {
  const prevName = playerName(s, offer.playerId);
  offer.declinedBy.push(offer.playerId);

  const candidates = s.players.filter((p) => !offer.declinedBy.includes(p.id) && !hasOpenOffer(s, p.id));
  if (offer.escalationsLeft <= 0 || candidates.length === 0) {
    offer.status = 'vanished';
    offer.resolvedAt = ctx.now;
    addFeed(s, ctx, '💨', `${prevName} ${verb}. Niemand will – das Angebot „${offer.text}“ ist verschwunden.`);
    return;
  }

  const next = pick(ctx.rng, candidates);
  offer.escalationsLeft--;
  offer.round++;
  offer.reward += randInt(ctx.rng, 1, 2);
  offer.playerId = next.id;
  offer.issuedAt = ctx.now;
  offer.respondBy = ctx.now + OFFER_RESPONSE_MS;
  if (offer.targetIds.includes(next.id)) renderOffer(s, offer, ctx);
  addFeed(s, ctx, '📈', `${prevName} ${verb}. Das Angebot geht an ${next.name} – jetzt für ${sips(offer.reward)}!`);
}

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------

function addDistribution(s: GameState, ctx: EngineContext, playerId: PlayerId, amount: number, reason: string) {
  if (amount <= 0 || s.players.length < 2) return;
  s.distributions.push({ id: nextId(s, 'd'), playerId, sips: amount, reason, createdAt: ctx.now });
}

function drink(s: GameState, id: PlayerId, amount: number) {
  const player = s.players.find((p) => p.id === id);
  if (player) player.stats.sipsDrunk += amount;
}

const ANNOUNCEMENT_LIMIT = 15;

function announce(s: GameState, ctx: EngineContext, a: Omit<Announcement, 'id' | 'at'>) {
  // ältere gespeicherte Spielstände haben das Feld noch nicht
  s.announcements ??= [];
  s.announcements.push({ id: nextId(s, 'a'), at: ctx.now, ...a });
  if (s.announcements.length > ANNOUNCEMENT_LIMIT) s.announcements.splice(0, s.announcements.length - ANNOUNCEMENT_LIMIT);
}

function addFeed(s: GameState, ctx: EngineContext, icon: string, text: string) {
  s.feed.unshift({ id: nextId(s, 'f'), at: ctx.now, icon, text });
  if (s.feed.length > FEED_LIMIT) s.feed.length = FEED_LIMIT;
}

function remember(s: GameState, templateId: string) {
  s.recentTemplates.push(templateId);
  if (s.recentTemplates.length > RECENT_LIMIT) s.recentTemplates.splice(0, s.recentTemplates.length - RECENT_LIMIT);
}

function nextId(s: GameState, prefix: string): string {
  s.seq++;
  return `${prefix}${s.seq}`;
}

function randMinutes(ctx: EngineContext, [min, max]: [number, number]): number {
  return Math.round((min + ctx.rng() * (max - min)) * MINUTE);
}

function requireHost(s: GameState, by: PlayerId) {
  if (s.hostId !== by) throw new GameError('Das darf nur der Host.');
}

function requirePlaying(s: GameState) {
  if (s.phase !== 'playing') throw new GameError('Das Spiel läuft gerade nicht.');
}

export function playerName(s: GameState, id: PlayerId): string {
  return s.players.find((p) => p.id === id)?.name ?? 'Jemand';
}

export function sips(n: number): string {
  return `${n} ${n === 1 ? 'Schluck' : 'Schlücke'}`;
}
