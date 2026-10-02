import { useState } from 'react';
import { sips } from '../game/engine';
import type { ClientAction, Distribution, PlayerView } from '../game/types';

interface Props {
  view: PlayerView;
  distribution: Distribution;
  send: (action: ClientAction) => void;
}

export function DistributeSheet({ view, distribution, send }: Props) {
  const [alloc, setAlloc] = useState<Record<string, number>>({});
  const others = view.players.filter((p) => p.id !== view.me);
  const used = Object.values(alloc).reduce((a, b) => a + b, 0);
  const left = distribution.sips - used;

  const change = (id: string, delta: number) =>
    setAlloc((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      if (delta > 0 && left <= 0) return prev;
      return { ...prev, [id]: next };
    });

  return (
    <div className="sheet-backdrop">
      <section className="sheet">
        <h3>🍺 Du darfst {sips(distribution.sips)} verteilen!</h3>
        <p className="muted">{distribution.reason}</p>
        <ul className="distribute-list">
          {others.map((p) => (
            <li key={p.id}>
              <span className="grow">{p.name}</span>
              <button className="icon-btn" onClick={() => change(p.id, -1)} disabled={!alloc[p.id]}>
                −
              </button>
              <span className="count">{alloc[p.id] ?? 0}</span>
              <button className="icon-btn" onClick={() => change(p.id, 1)} disabled={left <= 0}>
                +
              </button>
            </li>
          ))}
        </ul>
        <button
          className="btn primary big"
          disabled={left !== 0}
          onClick={() => send({ type: 'distribute', distributionId: distribution.id, allocation: alloc })}
        >
          {left === 0 ? 'Verteilen' : `Noch ${sips(left)} übrig`}
        </button>
      </section>
    </div>
  );
}
