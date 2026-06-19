import React from 'react';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { StoryScene } from './scenes/StoryScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const PirateSurvivalGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
        backgroundColor: '#1a0a00',
        parent,
        scene: [BootScene, StoryScene, MainMenuScene, GameScene],
      }),
  );

  return (
    <GameConsoleWrapper
      title="Pirate Survival"
      description="Combate oleadas de esqueletos pirata usando tu espada. Muévete rápido para evitar que te rodeen y contraataca."
      objective="Elimina a todos los esqueletos de cada ronda. Responde correctamente a las preguntas al final de cada ronda para curar tu vida."
      controlsPc={[
        'Moverse: Flechas del Teclado o Teclas W/A/S/D',
        'Atacar con Espada: Tecla Z',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Moverse: Mueve el joystick en cualquier dirección',
        'Atacar con Espada: Botón A',
        'Pausar: Botón Pausa',
      ]}
      hasGamepad={true}
      phaserGameRef={phaserGame}
      gameRef={gameRef}
      gameStarted={gameStarted}
      setGameStarted={setGameStarted}
      onQuit={quitHandler}
      aspectRatio="16 / 9"
      joystickDeadzone={0.15}
    />
  );
};
