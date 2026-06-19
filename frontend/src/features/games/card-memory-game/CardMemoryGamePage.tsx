import React from 'react';
import Phaser from 'phaser';
import { Preloader } from './scenes/Preloader';
import { Play } from './scenes/Play';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const CardMemoryGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 900 },
        backgroundColor: '#192a56',
        parent,
        render: { pixelArt: true },
        scene: [Preloader, Play],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Card Memory"
      description="Encuentra las parejas de cartas iguales y entrena tu memoria en este clásico desafío de cartas."
      objective="Voltea las cartas de dos en dos y recuerda su ubicación para completar todas las parejas en el menor número de intentos."
      controlsPc={[
        'Seleccionar carta: Clic Izquierdo del mouse',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Seleccionar carta: Toca las cartas directamente',
        'Pausar: Botón Pausa',
      ]}
      hasGamepad={false}
      phaserGameRef={phaserGame}
      gameRef={gameRef}
      gameStarted={gameStarted}
      setGameStarted={setGameStarted}
      onQuit={quitHandler}
      aspectRatio="8 / 9"
    />
  );
};
