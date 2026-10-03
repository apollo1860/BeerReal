import { describe, expect, it } from 'vitest';
import { applyAction, createGame, issueMission, issueOffer, OFFER_RESPONSE_MS } from './engine';
import { seededRng } from './random';
import { GameError, type Action, type EngineContext, type GameState } from './types';
import { privateView, publicView, viewFor } from './view';

function setup(playerCount = 4, seed = 1) {
  let now = 1_000_000;
  const rng = seededRng(seed);
  const ctx = (): EngineContext => ({ now, rng });
  let state = createGame('ABCDE', { id: 'p1', name: 'Anna' }, now);
  const names = ['Ben', 'Cara', 'Dani', 'Emil', 'Fiona'];
  for (let i = 2; i <= playerCount; i++) {
    state = applyAction(state, { type: 'join', by: `p${i}`, name: names[i - 2] }, ctx());
  }
  return {
    get state() {
      return state;
    },
    set state(s: GameState) {
      state = s;
    },
    act(action: Action) {
      state = applyAction(state, action, ctx());
      return state;
    },
    advance(ms: number) {
      now += ms;
      state = applyAction(state, { type: 'tick' }, ctx());
      return state;
    },
    ctx,
  };
}

describe('Lobby', () => {
  it('braucht mindestens 2 Spieler zum Starten', () => {
    const g = setup(1);
    expect(() => g.act({ type: 'start', by: 'p1' })).toThrow(GameError);
    g.act({ type: 'join', by: 'p2', name: 'Ben' });
    g.act({ type: 'start', by: 'p1' });
    expect(g.state.phase).toBe('playing');
    expect(g.state.card).not.toBeNull();
  });

  it('nur der Host darf starten', () => {
    const g = setup(3);
    expect(() => g.act({ type: 'start', by: 'p2' })).toThrow('Host');
  });

  it('verbietet doppelte Namen', () => {
    const g = setup(3);
    expect(() => g.act({ type: 'join', by: 'p9', name: 'anna' })).toThrow('Namen');
  });
});

describe('Karten', () => {
  it('ignoriert veraltete "Weiter"-Klicks', () => {
    const g = setup(3);
    g.act({ type: 'start', by: 'p1' });
    const first = g.state.card!.id;
    g.act({ type: 'nextCard', by: 'p2', currentCardId: first });
    const second = g.state.card!.id;
    g.act({ type: 'nextCard', by: 'p3', currentCardId: first });
    expect(g.state.card!.id).toBe(second);
  });

  it('Abstimmung wird aufgelöst, wenn alle abgestimmt haben', () => {
    const g = setup(3);
    g.act({ type: 'start', by: 'p1' });
    g.state = { ...g.state, card: { id: 'cx', templateId: 't', kind: 'vote', text: 'Wer?', sips: 2, playerIds: [], votes: {} } };
    g.act({ type: 'vote', by: 'p1', cardId: 'cx', targetId: 'p2' });
    g.act({ type: 'vote', by: 'p2', cardId: 'cx', targetId: 'p3' });
    expect(g.state.card!.result).toBeUndefined();
    // Stimmen anderer sind vor der Auflösung verborgen
    expect(viewFor(g.state, 'p3').card!.votes).toEqual({ p1: '', p2: '' });
    expect(viewFor(g.state, 'p1').card!.votes).toEqual({ p1: 'p2', p2: '' });
    expect(publicView(g.state).card!.votes).toEqual({ p1: '', p2: '' });
    g.act({ type: 'vote', by: 'p3', cardId: 'cx', targetId: 'p2' });
    expect(g.state.card!.result).toEqual({ loserIds: ['p2'], votes: 2 });
    expect(g.state.players.find((p) => p.id === 'p2')!.stats.sipsDrunk).toBe(2);
  });

  it('läuft mit 2 Spielern: Karten nennen nie dieselbe Person doppelt, Missionen und Angebote klappen', () => {
    const g = setup(2, 11);
    g.act({ type: 'start', by: 'p1' });
    for (let i = 0; i < 300; i++) {
      const card = g.state.card!;
      expect(new Set(card.playerIds).size).toBe(card.playerIds.length);
      expect(card.text).not.toMatch(/\{\w+\}/);
      g.act({ type: 'nextCard', by: 'p1', currentCardId: card.id });
    }
    const s = structuredClone(g.state);
    const mission = issueMission(s, g.ctx())!;
    expect(mission.targetIds).not.toContain(mission.playerId);
    const offer = issueOffer(s, g.ctx())!;
    expect(offer.targetIds).not.toContain(offer.playerId);
  });

  it('erzeugt nie Karten mit offenen Platzhaltern', () => {
    const g = setup(3, 7);
    g.act({ type: 'start', by: 'p1' });
    for (let i = 0; i < 300; i++) {
      expect(g.state.card!.text).not.toMatch(/\{\w+\}/);
      g.act({ type: 'nextCard', by: 'p1', currentCardId: g.state.card!.id });
    }
  });
});

describe('Geheime Missionen', () => {
  it('niemand bekommt zwei aktive geheime Missionen', () => {
    const g = setup(3);
    g.act({ type: 'start', by: 'p1' });
    const s = structuredClone(g.state);
    const issued = [issueMission(s, g.ctx()), issueMission(s, g.ctx()), issueMission(s, g.ctx()), issueMission(s, g.ctx())];
    expect(issued.filter(Boolean)).toHaveLength(3);
    expect(issued[3]).toBeNull();
    const owners = s.missions.map((m) => m.playerId);
    expect(new Set(owners).size).toBe(3);
  });

  it('Zeitlimit liegt zwischen 3 und 10 Minuten und die Mission ist nur für den Empfänger sichtbar', () => {
    const g = setup(4);
    g.act({ type: 'start', by: 'p1' });
    const s = structuredClone(g.state);
    const mission = issueMission(s, g.ctx())!;
    const minutes = (mission.deadline - mission.issuedAt) / 60_000;
    expect(minutes).toBeGreaterThanOrEqual(3);
    expect(minutes).toBeLessThanOrEqual(10);
    expect(mission.targetIds).not.toContain(mission.playerId);

    const other = s.players.find((p) => p.id !== mission.playerId)!.id;
    expect(viewFor(s, mission.playerId).missions).toHaveLength(1);
    expect(viewFor(s, other).missions).toHaveLength(0);
    expect(publicView(s).missions).toHaveLength(0);
    expect(privateView(s, mission.playerId).missions).toHaveLength(1);
  });

  it('Erfolg -> verteilen, Misserfolg -> Strafschlücke, Ablauf -> Strafschlücke', () => {
    const g = setup(3);
    g.act({ type: 'start', by: 'p1' });
    const s = structuredClone(g.state);
    const a = issueMission(s, g.ctx())!;
    const b = issueMission(s, g.ctx())!;
    const c = issueMission(s, g.ctx())!;
    g.state = s;

    g.act({ type: 'resolveMission', by: a.playerId, missionId: a.id, success: true });
    expect(g.state.distributions).toContainEqual(expect.objectContaining({ playerId: a.playerId, sips: a.reward }));
    // nach Abschluss ist die Mission für alle sichtbar
    const other = g.state.players.find((p) => p.id !== a.playerId)!.id;
    expect(viewFor(g.state, other).missions.map((m) => m.id)).toContain(a.id);

    const ann = g.state.announcements.at(-1)!;
    expect(ann.title).toContain('geheime Mission geschafft');
    expect(ann.actorId).toBe(a.playerId);
    const dist = g.state.distributions.find((d) => d.playerId === a.playerId)!;
    const receiver = g.state.players.find((p) => p.id !== a.playerId)!.id;
    g.act({ type: 'distribute', by: a.playerId, distributionId: dist.id, allocation: { [receiver]: a.reward } });
    expect(g.state.announcements.at(-1)!.sips).toEqual({ [receiver]: a.reward });
    expect(g.state.announcements.at(-1)!.text).toContain(a.text);

    const before = g.state.players.find((p) => p.id === b.playerId)!.stats.sipsDrunk;
    g.act({ type: 'resolveMission', by: b.playerId, missionId: b.id, success: false });
    expect(g.state.players.find((p) => p.id === b.playerId)!.stats.sipsDrunk).toBe(before + b.penalty);

    expect(() => g.act({ type: 'resolveMission', by: a.playerId, missionId: c.id, success: true })).toThrow();
    g.advance(11 * 60_000);
    expect(g.state.missions.find((m) => m.id === c.id)!.status).toBe('expired');
  });

  it('Tick verschickt Missionen automatisch', () => {
    const g = setup(3);
    g.act({ type: 'start', by: 'p1' });
    g.advance(2 * 60_000 + 1);
    expect(g.state.missions.filter((m) => m.status === 'active').length).toBe(1);
  });
});

describe('Offene Angebote', () => {
  function withOffer(seed = 3) {
    const g = setup(4, seed);
    g.act({ type: 'start', by: 'p1' });
    const s = structuredClone(g.state);
    const offer = issueOffer(s, g.ctx())!;
    g.state = s;
    return { g, offer };
  }

  it('Ablehnen gibt es erhöht an jemand anderen weiter', () => {
    const { g, offer } = withOffer();
    const first = offer.playerId;
    g.act({ type: 'respondOffer', by: first, offerId: offer.id, accept: false });
    const updated = g.state.offers.find((o) => o.id === offer.id)!;
    if (offer.escalationsLeft > 0) {
      expect(updated.status).toBe('pending');
      expect(updated.playerId).not.toBe(first);
      expect(updated.reward).toBeGreaterThan(offer.reward);
      expect(updated.targetIds).not.toContain(updated.playerId);
    } else {
      expect(updated.status).toBe('vanished');
    }
  });

  it('verschwindet, wenn niemand annimmt (max. 1–5 Erhöhungen)', () => {
    for (let seed = 1; seed < 20; seed++) {
      const { g, offer } = withOffer(seed);
      expect(offer.escalationsLeft).toBeGreaterThanOrEqual(1);
      expect(offer.escalationsLeft).toBeLessThanOrEqual(5);
      let current = g.state.offers.find((o) => o.id === offer.id)!;
      let rounds = 0;
      while (current.status === 'pending') {
        g.advance(OFFER_RESPONSE_MS); // Zeit läuft ab = Ablehnung
        current = g.state.offers.find((o) => o.id === offer.id)!;
        rounds++;
      }
      expect(current.status).toBe('vanished');
      expect(rounds).toBeLessThanOrEqual(Math.min(offer.escalationsLeft + 1, 4));
    }
  });

  it('Annehmen und Erledigen erzeugt eine Verteilung, Kneifen kostet Schlücke', () => {
    const { g, offer } = withOffer();
    g.act({ type: 'respondOffer', by: offer.playerId, offerId: offer.id, accept: true });
    g.act({ type: 'completeOffer', by: offer.playerId, offerId: offer.id, done: true });
    const dist = g.state.distributions.find((d) => d.playerId === offer.playerId)!;
    expect(dist.sips).toBe(offer.reward);

    const receiver = g.state.players.find((p) => p.id !== offer.playerId)!.id;
    expect(() =>
      g.act({ type: 'distribute', by: offer.playerId, distributionId: dist.id, allocation: { [receiver]: offer.reward + 1 } }),
    ).toThrow('genau');
    g.act({ type: 'distribute', by: offer.playerId, distributionId: dist.id, allocation: { [receiver]: offer.reward } });
    expect(g.state.players.find((p) => p.id === receiver)!.stats.sipsDrunk).toBe(offer.reward);
  });

  it('eine geheime und eine öffentliche Aufgabe gleichzeitig sind erlaubt, aber nicht zwei Angebote', () => {
    const g = setup(3);
    g.act({ type: 'start', by: 'p1' });
    const s = structuredClone(g.state);
    for (let i = 0; i < 3; i++) issueMission(s, g.ctx());
    for (let i = 0; i < 3; i++) issueOffer(s, g.ctx());
    expect(issueOffer(s, g.ctx())).toBeNull();
    for (const p of s.players) {
      expect(s.missions.filter((m) => m.playerId === p.id && m.status === 'active')).toHaveLength(1);
      expect(s.offers.filter((o) => o.playerId === p.id && o.status === 'pending')).toHaveLength(1);
    }
  });
});
