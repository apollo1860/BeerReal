import { useEffect } from 'react';
import { useGame } from './hooks/useGame';
import { Game } from './ui/Game';
import { Home } from './ui/Home';
import { Lobby } from './ui/Lobby';
import { Scoreboard } from './ui/Scoreboard';

export function App() {
  const game = useGame();
  const { view, conn, error, clearError } = game;

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(clearError, 4000);
    return () => window.clearTimeout(t);
  }, [error, clearError]);

  let screen;
  if (!conn || !view) {
    screen = <Home busy={game.busy} onCreate={game.createRoom} onJoin={game.joinRoom} />;
  } else if (!view.players.some((p) => p.id === view.me)) {
    screen = (
      <div className="screen center">
        <p>Du bist nicht mehr in diesem Raum.</p>
        <button className="btn" onClick={game.leave}>Zurück</button>
      </div>
    );
  } else if (view.phase === 'lobby') {
    screen = <Lobby view={view} send={game.send} onLeave={game.leave} />;
  } else if (view.phase === 'playing') {
    screen = <Game view={view} conn={conn} send={game.send} onLeave={game.leave} />;
  } else {
    screen = (
      <div className="screen">
        <h1 className="logo small">BeerReal 🍺</h1>
        <h2>Spiel vorbei!</h2>
        <Scoreboard view={view} />
        <button className="btn" onClick={game.leave}>Neues Spiel</button>
      </div>
    );
  }

  return (
    <>
      {screen}
      {error && (
        <div className="toast" role="alert" onClick={clearError}>
          {error}
        </div>
      )}
    </>
  );
}
