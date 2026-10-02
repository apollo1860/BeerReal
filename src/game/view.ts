import type { GameState, PlayerId, PlayerView, SecretMission } from './types';

/**
 * Sichtbarkeit:
 * - publicView: was alle sehen dürfen (fremde laufende Missionen raus, Stimmen verdeckt)
 * - privateView: was nur ein Spieler sieht (eigene laufende Mission, eigene Stimme)
 * Mit Firebase liegen beide Teile in getrennten Knoten mit eigenen Leserechten.
 */

export interface PrivateView {
  missions: SecretMission[];
  vote: { cardId: string; targetId: PlayerId } | null;
}

export function publicView(state: GameState): GameState {
  const card = state.card;
  const maskedCard =
    card && card.kind === 'vote' && !card.result
      ? { ...card, votes: Object.fromEntries(Object.keys(card.votes ?? {}).map((voter) => [voter, ''])) }
      : card;
  return {
    ...state,
    card: maskedCard,
    missions: state.missions.filter((m) => m.status !== 'active' && m.status !== 'cancelled'),
    recentTemplates: [],
  };
}

export function privateView(state: GameState, me: PlayerId): PrivateView {
  const card = state.card;
  const target = card && card.kind === 'vote' && !card.result ? card.votes?.[me] : undefined;
  return {
    missions: state.missions.filter((m) => m.playerId === me && m.status === 'active'),
    vote: card && target ? { cardId: card.id, targetId: target } : null,
  };
}

export function mergeView(pub: GameState, priv: PrivateView | null, me: PlayerId): PlayerView {
  let card = pub.card;
  if (card && priv?.vote && priv.vote.cardId === card.id && !card.result) {
    card = { ...card, votes: { ...card.votes, [me]: priv.vote.targetId } };
  }
  return { ...pub, me, card, missions: [...pub.missions, ...(priv?.missions ?? [])] };
}

export function viewFor(state: GameState, me: PlayerId): PlayerView {
  return mergeView(publicView(state), privateView(state, me), me);
}
