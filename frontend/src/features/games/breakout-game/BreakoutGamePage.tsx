import React from 'react';
import Phaser from 'phaser';
import Breakout from './scenes/Breakout';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const BreakoutGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 600 },
        parent,
        physics: { default: 'arcade' },
        scene: [Breakout],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Breakout"
      description="Controla la plataforma en la base de la pantalla para rebotar la bola y romper los ladrillos de colores en la parte superior. Ciertos ladrillos especiales contienen preguntas que te darán puntos extra."
      objective="Destruye todos los ladrillos en la pantalla sin dejar que la bola caiga de la parte inferior. Si la bola cae, deberás responder una pregunta de salvación."
      controlsPc={[
        'Moverse: Mouse o Flechas Izquierda/Derecha',
        'Lanzar bola: Clic o Flecha Arriba o Espacio',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Moverse: Flechas Izquierda/Derecha en el D-Pad',
        'Lanzar bola: Botón A',
        'Pausar: Botón Pausa',
      ]}
      hasGamepad={true}
      phaserGameRef={phaserGame}
      gameRef={gameRef}
      gameStarted={gameStarted}
      setGameStarted={setGameStarted}
      onQuit={quitHandler}
      aspectRatio="4 / 3"
    />
  );
};
