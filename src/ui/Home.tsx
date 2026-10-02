import { useState } from 'react';

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
      <h1 className="logo">BeerReal 🍺</h1>
      <p className="tagline">Das Trinkspiel mit geheimen Missionen. Ab 3 Spielern, jede*r mit eigenem Handy.</p>

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

      <p className="hint">
        🧪 Lokaler Testmodus: Mitspielen geht vorerst nur im selben Browser – öffne einfach weitere Tabs und tritt mit dem Code bei.
      </p>
    </div>
  );
}
