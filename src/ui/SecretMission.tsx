import { useState } from 'react';
import { sips } from '../game/engine';
import type { ClientAction, SecretMission } from '../game/types';
import { Countdown, formatRemaining } from './Countdown';

interface Props {
  mission: SecretMission;
  now: number;
  send: (action: ClientAction) => void;
  onCollapse: () => void;
}

/**
 * Bewusst unauffällig: Der Inhalt ist nur sichtbar, solange man den Finger
 * draufhält – so kann niemand über die Schulter mitlesen.
 */
export function SecretMissionPanel({ mission, now, send, onCollapse }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState<null | boolean>(null);

  const show = () => setRevealed(true);
  const hide = () => setRevealed(false);

  return (
    <section className="panel secret">
      <div className="secret-head">
        <span>📩 Private Nachricht</span>
        <Countdown until={mission.deadline} now={now} total={mission.deadline - mission.issuedAt} />
        <button className="icon-btn small" aria-label="Einklappen" title="Einklappen" onClick={onCollapse}>
          ▴
        </button>
      </div>

      <div
        className={`secret-body ${revealed ? 'revealed' : ''}`}
        onPointerDown={show}
        onPointerUp={hide}
        onPointerLeave={hide}
        onPointerCancel={hide}
        onContextMenu={(e) => e.preventDefault()}
      >
        {revealed ? (
          <>
            <strong>🤫 Geheime Mission</strong>
            <p>{mission.text}</p>
            {mission.proof && <p className="muted">Beweis: {mission.proof}</p>}
            <p className="muted">
              Geschafft: {sips(mission.reward)} verteilen · Erwischt/Zeit um: {sips(mission.penalty)} trinken
            </p>
          </>
        ) : (
          <span className="muted">Gedrückt halten zum Lesen</span>
        )}
      </div>

      {confirming === null ? (
        <div className="row">
          <button className="btn" onClick={() => setConfirming(true)}>
            ✅ Geschafft
          </button>
          <button className="btn ghost" onClick={() => setConfirming(false)}>
            ❌ Erwischt
          </button>
        </div>
      ) : (
        <div className="row">
          <span className="grow">{confirming ? 'Wirklich geschafft? Die Mission wird für alle aufgedeckt.' : 'Wirklich aufgeben?'}</span>
          <button className="btn" onClick={() => send({ type: 'resolveMission', missionId: mission.id, success: confirming })}>
            Ja
          </button>
          <button className="btn ghost" onClick={() => setConfirming(null)}>
            Nein
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Eingeklappte Mission: nur eine unscheinbare Restzeit oben in der Leiste,
 * ohne Icon oder Text – sieht aus wie eine Uhr. Antippen klappt wieder auf.
 */
export function CollapsedMission({ mission, now, onExpand }: { mission: SecretMission; now: number; onExpand: () => void }) {
  return (
    <button className="collapsed-mission" aria-label="Nachricht aufklappen" onClick={onExpand}>
      {formatRemaining(mission.deadline - now)}
    </button>
  );
}

/** Merkt sich pro Mission, ob sie eingeklappt ist (übersteht auch ein Neuladen). */
export function useCollapsed(missionId: string | undefined): [boolean, (v: boolean) => void] {
  const key = missionId ? `beerreal:collapsed:${missionId}` : null;
  const read = () => {
    try {
      return key ? sessionStorage.getItem(key) === '1' : false;
    } catch {
      return false;
    }
  };
  const [state, setState] = useState<{ key: string | null; value: boolean }>(() => ({ key, value: read() }));
  const value = state.key === key ? state.value : read();
  const set = (v: boolean) => {
    try {
      if (key) sessionStorage.setItem(key, v ? '1' : '0');
    } catch {
      // egal
    }
    setState({ key, value: v });
  };
  return [value, set];
}
