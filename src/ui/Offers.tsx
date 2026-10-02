import { playerName, sips } from '../game/engine';
import type { ClientAction, Offer, PlayerView } from '../game/types';
import { Notification } from './Brand';
import { Countdown } from './Countdown';

export function MyOffer({ offer, now, send }: { offer: Offer; now: number; send: (action: ClientAction) => void }) {
  if (offer.status === 'pending') {
    return (
      <section className="panel offer mine">
        <Notification
          title={offer.round > 1 ? `📈 Erhöhtes Angebot für dich (Runde ${offer.round})` : '📣 Neues Angebot für dich'}
          right={<Countdown until={offer.respondBy} now={now} total={offer.respondBy - offer.issuedAt} />}
        />
        <p className="offer-text">{offer.text}</p>
        <p className="reward">Belohnung: {sips(offer.reward)} verteilen</p>
        <div className="row">
          <button className="btn primary" onClick={() => send({ type: 'respondOffer', offerId: offer.id, accept: true })}>
            Annehmen
          </button>
          <button className="btn ghost" onClick={() => send({ type: 'respondOffer', offerId: offer.id, accept: false })}>
            Ablehnen
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel offer mine">
      <div className="offer-head">
        <span>🤝 Angenommen – jetzt durchziehen!</span>
      </div>
      <p className="offer-text">{offer.text}</p>
      <p className="reward">Danach darfst du {sips(offer.reward)} verteilen. Kneifen = {sips(offer.reward)} selbst trinken.</p>
      <div className="row">
        <button className="btn primary" onClick={() => send({ type: 'completeOffer', offerId: offer.id, done: true })}>
          ✅ Erledigt
        </button>
        <button className="btn ghost" onClick={() => send({ type: 'completeOffer', offerId: offer.id, done: false })}>
          🐔 Gekniffen
        </button>
      </div>
    </section>
  );
}

/** Angebote der anderen – die sind öffentlich. */
export function OpenOffers({ view, now }: { view: PlayerView; now: number }) {
  const open = view.offers.filter((o) => o.playerId !== view.me && (o.status === 'pending' || o.status === 'accepted'));
  if (open.length === 0) return null;
  return (
    <section className="panel">
      <h3>📣 Offene Angebote</h3>
      <ul className="offer-list">
        {open.map((o) => (
          <li key={o.id}>
            <div>
              <strong>{playerName(view, o.playerId)}</strong>{' '}
              {o.status === 'pending' ? 'überlegt noch' : 'hat angenommen'} · {sips(o.reward)}
              {o.status === 'pending' && (
                <>
                  {' '}
                  <Countdown until={o.respondBy} now={now} />
                </>
              )}
            </div>
            <div className="muted">{o.text}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
