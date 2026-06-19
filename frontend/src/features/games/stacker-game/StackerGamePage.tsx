import React from 'react';
import Phaser from 'phaser';
import { Boot, Instructions, StackerGame, GameOver } from './scenes/Stacker';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const StackerGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1024, height: 768 },
        parent,
        scene: [Boot, Instructions, StackerGame, GameOver],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Stacker"
      description="Pon a prueba tus reflejos apilando filas de bloques en movimiento. Debes alinearlas con precisión."
      objective="Construye la torre más alta posible. Si fallas en colocar un bloque de forma estable, se te presentará una pregunta para salvarte y continuar la partida."
      controlsPc={[
        'Fijar/Apilar bloque: Barra Espaciadora o Clic Izquierdo',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Fijar/Apilar bloque: Toca cualquier parte de la pantalla de juego',
        'Pausar: Botón Pausa',
      ]}
      hasGamepad={false}
      phaserGameRef={phaserGame}
      gameRef={gameRef}
      gameStarted={gameStarted}
      setGameStarted={setGameStarted}
      onQuit={quitHandler}
      aspectRatio="4 / 3"
    />
  );
};
