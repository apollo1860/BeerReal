import { useEffect, useRef, useState } from 'react';
import { playerName, sips } from '../game/engine';
import type { Announcement, PlayerView } from '../game/types';

/**
 * Zeigt neue Einblendungen (Mission geschafft, Schlücke verteilt …) groß für
 * alle an – nacheinander, jeweils mit „OK“ wegzutippen. Was beim Öffnen der
 * App schon da war, wird nicht nochmal gezeigt.
 */
export function Announcements({ view }: { view: PlayerView }) {
  const all = view.announcements ?? [];
  const storageKey = `beerreal:seen:${view.code}`;
  const [seen, setSeen] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      // egal
    }
    return new Set(all.map((a) => a.id));
  });

  const markSeen = (id: string) =>
    setSeen((prev) => {
      const next = new Set(prev).add(id);
      try {
        sessionStorage.setItem(storageKey, JSON.stringify([...next].slice(-50)));
      } catch {
        // egal
      }
      return next;
    });

  const current: Announcement | undefined = all.find((a) => !seen.has(a.id) && a.actorId !== view.me);

  const buzzed = useRef<string | null>(null);
  useEffect(() => {
    if (!current || buzzed.current === current.id) return;
    buzzed.current = current.id;
    navigator.vibrate?.(current.sips?.[view.me] ? [200, 80, 200] : [60]);
  }, [current, view.me]);

  if (!current) return null;
  const entries = Object.entries(current.sips ?? {}).sort(([a], [b]) => (a === view.me ? -1 : b === view.me ? 1 : 0));
  const mine = current.sips?.[view.me];

  return (
    <div className="sheet-backdrop announce-backdrop" onClick={() => markSeen(current.id)}>
      <section className="announce" onClick={(e) => e.stopPropagation()}>
        <div className="announce-icon">{current.icon}</div>
        <h2>{current.title}</h2>
        {current.text && <p className="announce-text">{current.text}</p>}
        {entries.length > 0 && (
          <ul className="announce-sips">
            {entries.map(([id, n]) => (
              <li key={id} className={id === view.me ? 'me' : ''}>
                <span>{id === view.me ? 'Du' : playerName(view, id)}</span>
                <strong>{sips(n)}</strong>
              </li>
            ))}
          </ul>
        )}
        {mine ? <p className="announce-mine">Prost! Du trinkst {sips(mine)} 🍻</p> : null}
        <button className="btn primary big" onClick={() => markSeen(current.id)}>
          OK
        </button>
      </section>
    </div>
  );
}
