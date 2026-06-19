import React from 'react';
import Phaser from 'phaser';
import Boot from './scenes/Boot';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const AvoidGermsGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1024, height: 768 },
        backgroundColor: '#000000',
        parent,
        physics: { default: 'arcade', arcade: { debug: false } },
        scene: [Boot, Preloader, MainMenu, Game],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Avoid the Germs"
      description="Esquiva los gérmenes que flotan libremente por la pantalla moviendo a tu personaje de forma fluida."
      objective="Sobrevive el mayor tiempo posible acumulando puntos. Si chocas contra un germen, responde una pregunta de salvación para seguir jugando."
      controlsPc={[
        'Moverse: Arrastrar / Desplazar el cursor del mouse',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Moverse: Arrastrar el dedo por la pantalla para guiar al personaje',
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
