import React from 'react';
import Phaser from 'phaser';
import Preloader from './scenes/Preloader';
import Menu from './scenes/Menu';
import Play from './scenes/Play';
import UI from './scenes/UI';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const TomGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 640, height: 360 },
        parent,
        pixelArt: true,
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 2000 } } },
        scene: [Preloader, UI, Play, Menu],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Tom"
      description="Ayuda a Tom a recolectar deliciosos tomates maduros mientras esquivas las bombas con pinchos."
      objective="Recoge la mayor cantidad posible de tomates. Si colisionas con una bomba con pinchos, tendrás una pregunta de salvación para evitar perder vida."
      controlsPc={[
        'Moverse: Flechas Izquierda / Derecha',
        'Saltar: Flecha Arriba o Barra Espaciadora',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Moverse: Flechas Izquierda / Derecha en el D-Pad',
        'Saltar: Botón A',
        'Pausar: Botón Pausa',
      ]}
      hasGamepad={true}
      joystickAxes="horizontal"
      aspectRatio="16 / 9"
      phaserGameRef={phaserGame}
      gameRef={gameRef}
      gameStarted={gameStarted}
      setGameStarted={setGameStarted}
      onQuit={quitHandler}
    />
  );
};
