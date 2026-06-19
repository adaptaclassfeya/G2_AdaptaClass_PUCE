import React from 'react';
import Phaser from 'phaser';
import Boot from './scenes/Boot';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const SnowmenAttackGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1024, height: 768 },
        backgroundColor: '#3366b2',
        parent,
        physics: { default: 'arcade', arcade: { debug: false } },
        scene: [Boot, Preloader, MainMenu, Game],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Snowmen Attack"
      description="Ayuda al pingüino a defenderse del ataque de los muñecos de nieve. Cambia de carril para esquivar sus proyectiles y lánzales bolas de nieve."
      objective="Sobrevive tanto como puedas. Cada 15 segundos responde una pregunta de desafío para obtener un doble disparo. Si te derrotan, responde la pregunta de salvación para seguir jugando."
      controlsPc={[
        'Moverse (Carriles): Flechas Arriba / Abajo',
        'Disparar bola de nieve: Barra Espaciadora',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Moverse: Flechas Arriba / Abajo en el D-Pad',
        'Disparar bola: Botón A',
        'Pausar: Botón Pausa',
      ]}
      hasGamepad={true}
      gamepadType="arrows-vertical"
      phaserGameRef={phaserGame}
      gameRef={gameRef}
      gameStarted={gameStarted}
      setGameStarted={setGameStarted}
      onQuit={quitHandler}
      aspectRatio="4 / 3"
    />
  );
};
