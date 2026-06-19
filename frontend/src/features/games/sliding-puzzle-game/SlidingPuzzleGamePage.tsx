import React from 'react';
import Phaser from 'phaser';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const SlidingPuzzleGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1024, height: 768 },
        backgroundColor: '#002157',
        parent,
        scene: [Preloader, MainMenu, Game],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Sliding Puzzle"
      description="Desliza las piezas desordenadas hacia el espacio vacío contiguo para revelar la ilustración completa."
      objective="Ordena el rompecabezas en el menor número de movimientos. Responde las preguntas de desafío para ganar."
      controlsPc={[
        'Mover piezas: Clic izquierdo sobre una pieza adyacente al espacio vacío',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Mover piezas: Toca las piezas directamente',
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
