import React from 'react';
import Phaser from 'phaser';
import GameScene from './GameScene';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const BombGamePage: React.FC = () => {
  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent, questions) => {
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 800,
          height: 800,
        },
        parent,
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 300 }, debug: false },
        },
        scene: [],
      });
      // BombGame uses scene.add() with question data injected as scene init
      // payload (legacy contract that other scenes here don't share).
      game.scene.add('GameScene', GameScene, true, { preguntasDelNivel: questions });
      return game;
    },
  );

  return (
    <GameConsoleWrapper
      title="Bomb-Man"
      description="Controla al personaje para esquivar bombas, recoger estrellas y responder preguntas sobre textos y lecturas."
      objective="Recoge todas las estrellas posibles. Si tocas un enemigo o una bomba, se te presentará una pregunta para salvar tu vida. Toca los botiquines para responder preguntas y curarte."
      controlsPc={[
        'Moverse: Flechas Izquierda/Derecha o A/D',
        'Saltar: Barra Espaciadora o Flecha Arriba o W',
        'Pausar: Tecla ESC',
      ]}
      controlsMobile={[
        'Moverse: Flechas Izquierda/Derecha en el D-Pad',
        'Saltar: Botón A',
        'Pausar: Botón Pausa',
      ]}
      hasGamepad={true}
      phaserGameRef={phaserGame}
      gameRef={gameRef}
      gameStarted={gameStarted}
      setGameStarted={setGameStarted}
      onQuit={quitHandler}
      aspectRatio="1 / 1"
    />
  );
};
