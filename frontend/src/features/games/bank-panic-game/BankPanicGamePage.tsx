import React from 'react';
import Phaser from 'phaser';
import Boot from './scenes/Boot';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';
import { GameConsoleWrapper } from '../components/GameConsoleWrapper';
import { useGameSession } from '../hooks/useGameSession';

export const BankPanicGamePage: React.FC = () => {
  const [isPortrait, setIsPortrait] = React.useState(false);

  React.useEffect(() => {
    const checkOrientation = () => {
      const isPortraitMode = window.innerHeight > window.innerWidth;
      const isMobileDevice = window.innerWidth < 768 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      setIsPortrait(isPortraitMode && isMobileDevice);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const { gameRef, phaserGame, gameStarted, setGameStarted, quitHandler } = useGameSession(
    (parent) =>
      new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1024, height: 768 },
        backgroundColor: '#2e91f3',
        parent,
        scene: [Boot, Preloader, MainMenu, Game],
      }),
  );

  return (
    <>
      <GameConsoleWrapper
        title="Bank Panic"
        description="Eres el sheriff a cargo de proteger la sucursal del banco. Las puertas se abrirán revelando bandidos armados o inocentes rehenes."
        objective="Acaba con los ladrones antes de que disparen y recoge las bolsas de dinero de los clientes. Responde las preguntas de desafío para continuar."
        controlsPc={[
          'Disparar a puertas: Haz clic izquierdo directamente sobre la puerta para abrirla, recibir clientes o disparar a bandidos',
          'Pausar: Tecla ESC',
        ]}
        controlsMobile={[
          'Disparar a puertas: Toca directamente las puertas en pantalla para ahuyentar bandidos, recibir clientes o responder preguntas',
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

      {isPortrait && gameStarted && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center select-none" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>
          <div className="animate-bounce mb-6">
            <span className="material-symbols-outlined !text-7xl text-orange-500">screen_rotation</span>
          </div>
          <h2 className="text-2xl font-black uppercase mb-4 text-orange-500">Gira tu dispositivo</h2>
          <p className="text-lg max-w-[28rem] leading-relaxed text-slate-300">
            Para jugar <strong>Bank Panic</strong> correctamente, por favor gira tu celular a modo horizontal (paisaje).
          </p>
        </div>
      )}
    </>
  );
};
