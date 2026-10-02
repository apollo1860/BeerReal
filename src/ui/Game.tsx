import { useEffect, useRef, useState } from 'react';
import { useNow, useWakeLock } from '../hooks/useGame';
import type { ClientAction, PlayerView } from '../game/types';
import type { RoomConnection } from '../net/types';
import { Announcements } from './Announcements';
import { Logo } from './Brand';
import { CardView } from './CardView';
import { DistributeSheet } from './DistributeSheet';
import { Feed } from './Feed';
import { MyOffer, OpenOffers } from './Offers';
import { Scoreboard } from './Scoreboard';
import { CollapsedMission, SecretMissionPanel, useCollapsed } from './SecretMission';

interface Props {
  view: PlayerView;
  conn: RoomConnection;
  send: (action: ClientAction) => void;
  onLeave: () => void;
}

export function Game({ view, conn, send, onLeave }: Props) {
  const now = useNow(conn.clockOffset());
  useWakeLock(true);
  const [menu, setMenu] = useState(false);
  const me = view.players.find((p) => p.id === view.me)!;
  const isHost = view.hostId === view.me;

  const mission = view.missions.find((m) => m.playerId === view.me && m.status === 'active') ?? null;
  const myOffer = view.offers.find((o) => o.playerId === view.me && (o.status === 'pending' || o.status === 'accepted')) ?? null;
  const distribution = view.distributions.find((d) => d.playerId === view.me) ?? null;
  const [missionCollapsed, setMissionCollapsed] = useCollapsed(mission?.id);

  // Unauffällig vibrieren, wenn etwas Neues für mich da ist
  useBuzz(mission?.id, [80, 60, 80]);
  useBuzz(myOffer?.status === 'pending' ? `${myOffer.id}-${myOffer.round}` : undefined, [150]);

  const disconnected = !conn.session.isHost && Date.now() - conn.lastSeen() > 30_000;

  return (
    <div className="screen game">
      <header className="topbar">
        <div className="topbar-side">
          <span className="code-chip">{view.code}</span>
          {mission && missionCollapsed && <CollapsedMission mission={mission} now={now} onExpand={() => setMissionCollapsed(false)} />}
        </div>
        <div className="topbar-center">
          <Logo size="sm" />
          <span className="me-line">
            {me.name} · 🍺 {me.stats.sipsDrunk}
          </span>
        </div>
        <div className="topbar-side right">
          <button className="icon-btn" aria-label="Menü" onClick={() => setMenu(!menu)}>
            ☰
          </button>
        </div>
      </header>

      {disconnected && <div className="warning">⚠️ Keine Verbindung zum Host – hat der Host die App noch offen?</div>}

      {menu && (
        <section className="panel">
          <Scoreboard view={view} />
          {isHost && (
            <button className="btn danger" onClick={() => confirm('Spiel für alle beenden?') && send({ type: 'end' })}>
              Spiel beenden
            </button>
          )}
          {isHost && import.meta.env.DEV && (
            <div className="row">
              <button className="btn ghost" onClick={() => send({ type: 'debugSpawn', what: 'mission' })}>
                🧪 Mission jetzt
              </button>
              <button className="btn ghost" onClick={() => send({ type: 'debugSpawn', what: 'offer' })}>
                🧪 Angebot jetzt
              </button>
            </div>
          )}
          <button className="btn ghost" onClick={() => confirm('Raum wirklich verlassen?') && onLeave()}>
            Raum verlassen
          </button>
        </section>
      )}

      {mission && !missionCollapsed && (
        <SecretMissionPanel mission={mission} now={now} send={send} onCollapse={() => setMissionCollapsed(true)} />
      )}
      {myOffer && <MyOffer offer={myOffer} now={now} send={send} />}

      {view.rule && (
        <div className="rule-chip">
          📜 <span>{view.rule.text.replace(/^Neue Regel:\s*/, '')}</span>
        </div>
      )}

      {view.card && <CardView view={view} card={view.card} send={send} />}

      <OpenOffers view={view} now={now} />
      <Feed view={view} />

      <Announcements view={view} />
      {distribution && <DistributeSheet key={distribution.id} view={view} distribution={distribution} send={send} />}
    </div>
  );
}

function useBuzz(key: string | undefined, pattern: number[]) {
  const last = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (key && key !== last.current) navigator.vibrate?.(pattern);
    last.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
