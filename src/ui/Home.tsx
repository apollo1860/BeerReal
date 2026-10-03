import { useState } from 'react';
import { backend } from '../hooks/useGame';
import { Logo } from './Brand';

interface Props {
  busy: boolean;
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
}

const NAME_KEY = 'beerreal:name';

export function Home({ busy, onCreate, onJoin }: Props) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '');

  const remember = () => localStorage.setItem(NAME_KEY, name.trim());

  return (
    <div className="screen">
      <div className="hero">
        <h1>
          <Logo size="lg" />
        </h1>
        <p className="tagline">Deine Freunde. Echt betrunken.</p>
        <p className="muted small">Das Trinkspiel mit geheimen Missionen · ab 2 Spielern · jede*r mit eigenem Handy</p>
      </div>

      <label className="field">
        <span>Dein Name</span>
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="z. B. Alex" autoComplete="nickname" />
      </label>

      <section className="panel">
        <h3>Raum beitreten</h3>
        <div className="row">
          <input
            className="code-input"
            value={code}
            maxLength={5}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            autoCapitalize="characters"
          />
          <button
            className="btn"
            disabled={busy || !name.trim() || code.trim().length < 5}
            onClick={() => {
              remember();
              onJoin(code, name);
            }}
          >
            Beitreten
          </button>
        </div>
      </section>

      <div className="divider">oder</div>

      <button
        className="btn primary big"
        disabled={busy || !name.trim()}
        onClick={() => {
          remember();
          onCreate(name);
        }}
      >
        Neuen Raum erstellen
      </button>

      {backend.kind === 'local' ? (
        <p className="hint">
          🧪 Lokaler Testmodus (kein Firebase konfiguriert): Mitspielen geht nur im selben Browser – öffne weitere Tabs und tritt mit dem Code bei.
        </p>
      ) : (
        <p className="hint">📱 Alle öffnen diese Seite auf ihrem Handy und treten mit dem Code bei. Der Host sollte die App während des Spiels offen lassen.</p>
      )}
    </div>
  );
}
