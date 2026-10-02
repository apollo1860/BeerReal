import { useState } from 'react';
import { sips } from '../game/engine';
import type { ClientAction, SecretMission } from '../game/types';
import { Countdown } from './Countdown';

interface Props {
  mission: SecretMission;
  now: number;
  send: (action: ClientAction) => void;
}

/**
 * Bewusst unauffällig: Der Inhalt ist nur sichtbar, solange man den Finger
 * draufhält – so kann niemand über die Schulter mitlesen.
 */
export function SecretMissionPanel({ mission, now, send }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState<null | boolean>(null);

  const show = () => setRevealed(true);
  const hide = () => setRevealed(false);

  return (
    <section className="panel secret">
      <div className="secret-head">
        <span>📩 Private Nachricht</span>
        <Countdown until={mission.deadline} now={now} total={mission.deadline - mission.issuedAt} />
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
