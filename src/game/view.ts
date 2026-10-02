import type { GameState, PlayerId, PlayerView } from './types';

/**
 * Projiziert den vollständigen Zustand auf das, was ein Spieler sehen darf:
 * - fremde, noch laufende geheime Missionen werden entfernt
 * - bei offenen Abstimmungen sieht man nur die eigene Stimme (andere nur als „hat abgestimmt“)
 *
 * Mit Firebase wird das später zu: öffentliches Raum-Dokument + private Dokumente pro Spieler.
 */
export function viewFor(state: GameState, me: PlayerId): PlayerView {
  const card = state.card;
  const maskedCard =
    card && card.kind === 'vote' && !card.result
      ? {
          ...card,
          votes: Object.fromEntries(Object.entries(card.votes ?? {}).map(([voter, target]) => [voter, voter === me ? target : ''])),
        }
      : card;

  return {
    ...state,
    me,
    card: maskedCard,
    missions: state.missions.filter((m) => m.playerId === me || (m.status !== 'active' && m.status !== 'cancelled')),
    recentTemplates: [],
  };
}
