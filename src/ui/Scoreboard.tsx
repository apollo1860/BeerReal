import type { Player, PlayerStats, PlayerView } from '../game/types';

const AWARDS: { stat: keyof PlayerStats; title: string }[] = [
  { stat: 'sipsDrunk', title: '🍺 Schluckspecht' },
  { stat: 'sipsGiven', title: '🎁 Großzügigste Seele' },
  { stat: 'missionsWon', title: '🕵️ Meisterspion' },
  { stat: 'missionsFailed', title: '🚨 Auffälligste Person' },
  { stat: 'offersDone', title: '🤝 Macht alles mit' },
];

function leader(players: Player[], stat: keyof PlayerStats): Player | null {
  const best = [...players].sort((a, b) => b.stats[stat] - a.stats[stat])[0];
  return best && best.stats[stat] > 0 ? best : null;
}

export function Scoreboard({ view }: { view: PlayerView }) {
  const sorted = [...view.players].sort((a, b) => b.stats.sipsDrunk - a.stats.sipsDrunk);
  return (
    <div className="scoreboard">
      <table>
        <thead>
          <tr>
            <th>Spieler</th>
            <th title="getrunken">🍺</th>
            <th title="verteilt">🎁</th>
            <th title="Missionen geschafft / gescheitert">🕵️</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} className={p.id === view.me ? 'me' : ''}>
              <td>{p.name}</td>
              <td>{p.stats.sipsDrunk}</td>
              <td>{p.stats.sipsGiven}</td>
              <td>
                {p.stats.missionsWon}/{p.stats.missionsFailed}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {view.phase === 'ended' && (
        <ul className="awards">
          {AWARDS.map(({ stat, title }) => {
            const p = leader(view.players, stat);
            return p ? (
              <li key={stat}>
                {title}: <strong>{p.name}</strong> ({p.stats[stat]})
              </li>
            ) : null;
          })}
        </ul>
      )}
      <p className="muted small">Gezählt werden nur Schlücke, die die App zuteilt.</p>
    </div>
  );
}
