import type { PlayerView } from '../game/types';

export function Feed({ view }: { view: PlayerView }) {
  if (view.feed.length === 0) return null;
  return (
    <section className="panel">
      <h3>Was passiert ist</h3>
      <ul className="feed">
        {view.feed.slice(0, 15).map((f) => (
          <li key={f.id}>
            <span className="feed-icon">{f.icon}</span>
            <span>{f.text}</span>
            <time>{new Date(f.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
