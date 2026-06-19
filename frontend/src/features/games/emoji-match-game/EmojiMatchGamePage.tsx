import React from 'react';
import Phaser from 'phaser';
import Boot from './scenes/Boot';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const EmojiMatchGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 800 },
        backgroundColor: '#008eb0',
        parent,
        scene: [Boot, Preloader, MainMenu, Game],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Emoji Match"
      description="Pon a prueba tu rapidez mental emparejando los emojis idénticos lo más rápido posible."
      objective="Empareja todos los emojis correctos antes de que el tiempo se agote. Si fallas, responde una pregunta para salvarte y seguir sumando puntos."
      controlsPc={[
        'Seleccionar emoji: Clic Izquierdo del mouse',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Seleccionar emoji: Toca directamente sobre la pantalla',
        'Pausar: Botón Pausa',
      ]}
      hasGamepad={false}
      phaserGameRef={phaserGame}
      gameRef={gameRef}
      gameStarted={gameStarted}
      setGameStarted={setGameStarted}
      onQuit={quitHandler}
      aspectRatio="1 / 1"
    />
  );
};
