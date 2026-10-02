import { Avatar, Logo } from './Brand';
import { MIN_PLAYERS, type ClientAction, type PlayerView, type Tempo } from '../game/types';

interface Props {
  view: PlayerView;
  send: (action: ClientAction) => void;
  onLeave: () => void;
}

const TEMPOS: { id: Tempo; label: string; hint: string }[] = [
  { id: 'chill', label: '😌 Chillig', hint: 'Missionen alle 5–9 Min.' },
  { id: 'normal', label: '🍻 Normal', hint: 'alle 3–6 Min.' },
  { id: 'chaos', label: '🔥 Chaos', hint: 'alle 1,5–3 Min.' },
];

export function Lobby({ view, send, onLeave }: Props) {
  const isHost = view.hostId === view.me;
  const link = `${location.origin}${location.pathname}?room=${view.code}`;
  const missing = MIN_PLAYERS - view.players.length;
  const s = view.settings;

  return (
    <div className="screen">
      <h1 className="center"><Logo /></h1>

      <section className="panel center">
        <div className="muted">Raumcode</div>
        <div className="room-code">{view.code}</div>
        <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(link)}>
          🔗 Einladungslink kopieren
        </button>
      </section>

      <section className="panel">
        <h3>Spieler ({view.players.length})</h3>
        <ul className="players">
          {view.players.map((p) => (
            <li key={p.id}>
              <Avatar name={p.name} me={p.id === view.me} />
              <span className="grow">{p.name}</span>
              {p.id === view.hostId && <span className="badge">Host</span>}
              {p.id === view.me && <span className="badge me">Du</span>}
            </li>
          ))}
        </ul>
        {missing > 0 && <p className="muted">Noch {missing} Spieler fehlen (mindestens {MIN_PLAYERS}).</p>}
      </section>

      <section className="panel">
        <h3>Einstellungen</h3>
        <div className="segmented">
          {TEMPOS.map((t) => (
            <button
              key={t.id}
              className={s.tempo === t.id ? 'active' : ''}
              disabled={!isHost}
              onClick={() => send({ type: 'updateSettings', settings: { tempo: t.id } })}
            >
              {t.label}
              <small>{t.hint}</small>
            </button>
          ))}
        </div>
        <Toggle label="🤫 Geheime Missionen" value={s.missionsEnabled} disabled={!isHost} onChange={(v) => send({ type: 'updateSettings', settings: { missionsEnabled: v } })} />
        <Toggle label="📣 Offene Angebote" value={s.offersEnabled} disabled={!isHost} onChange={(v) => send({ type: 'updateSettings', settings: { offersEnabled: v } })} />
        <Toggle label="🌶️ Spicy Inhalte" value={s.spicy} disabled={!isHost} onChange={(v) => send({ type: 'updateSettings', settings: { spicy: v } })} />
      </section>

      {isHost ? (
        <button className="btn primary big" disabled={missing > 0} onClick={() => send({ type: 'start' })}>
          Spiel starten
        </button>
      ) : (
        <p className="center muted">Warte, bis der Host das Spiel startet …</p>
      )}
      <button className="btn ghost" onClick={onLeave}>
        Raum verlassen
      </button>
    </div>
  );
}

function Toggle({ label, value, disabled, onChange }: { label: string; value: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
