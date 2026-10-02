import { CARD_KIND_LABELS } from '../game/content/cards';
import { playerName, sips } from '../game/engine';
import type { ActiveCard, ClientAction, PlayerView } from '../game/types';

interface Props {
  view: PlayerView;
  card: ActiveCard;
  send: (action: ClientAction) => void;
}

export function CardView({ view, card, send }: Props) {
  const label = CARD_KIND_LABELS[card.kind];
  const isVote = card.kind === 'vote';
  const votes = card.votes ?? {};
  const voted = Object.keys(votes).length;
  const myVote = votes[view.me];

  return (
    <section className={`card kind-${card.kind}`}>
      <div className="card-label">
        {label.icon} {label.title} <span className="muted">#{view.cardsPlayed}</span>
      </div>
      <p className="card-text">{card.text}</p>

      {isVote && !card.result && (
        <>
          <p className="muted">
            Stimmt ab! Wer die meisten Stimmen hat, trinkt {sips(card.sips)}. ({voted}/{view.players.length})
          </p>
          <div className="vote-grid">
            {view.players.map((p) => (
              <button
                key={p.id}
                className={`btn ${myVote === p.id ? 'primary' : ''}`}
                onClick={() => send({ type: 'vote', cardId: card.id, targetId: p.id })}
              >
                {p.name}
              </button>
            ))}
          </div>
          {voted > 0 && (
            <button className="btn ghost" onClick={() => send({ type: 'revealVotes', cardId: card.id })}>
              Jetzt auflösen
            </button>
          )}
        </>
      )}

      {isVote && card.result && (
        <div className="vote-result">
          <strong>{card.result.loserIds.map((id) => playerName(view, id)).join(' & ')}</strong>{' '}
          {card.result.loserIds.length > 1 ? 'trinken' : 'trinkt'} {sips(card.sips)}!
          <ul className="muted">
            {Object.entries(votes).map(([voter, target]) => (
              <li key={voter}>
                {playerName(view, voter)} → {playerName(view, target)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="btn primary big" onClick={() => send({ type: 'nextCard', currentCardId: card.id })}>
        Nächste Karte →
      </button>
    </section>
  );
}
