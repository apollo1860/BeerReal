import { CARD_KIND_LABELS } from '../game/content/cards';
import { playerName, sips } from '../game/engine';
import type { ActiveCard, ClientAction, PlayerView } from '../game/types';
import { Avatar, Logo, Shutter } from './Brand';

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
  // Der erste genannte Spieler „postet“ die Karte – sonst BeerReal selbst
  const main = card.playerIds[0] ? playerName(view, card.playerIds[0]) : null;

  return (
    <article className="post">
      <header className="post-head">
        {main ? <Avatar name={main} /> : <span className="avatar brand">🍺</span>}
        <div className="post-meta">
          <strong>{main ?? <Logo size="sm" />}</strong>
          <span className="muted small">
            {label.title} · Karte #{view.cardsPlayed}
          </span>
        </div>
      </header>

      <section className={`card kind-${card.kind}`}>
        <div className="post-inset" aria-hidden>
          {label.icon}
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

      </section>

      <Shutter label="Nächste Karte" onClick={() => send({ type: 'nextCard', currentCardId: card.id })} />
    </article>
  );
}
