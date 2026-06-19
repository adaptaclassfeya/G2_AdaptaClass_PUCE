import React, { useState, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import Phaser from 'phaser';
import { useAuthStore } from '../../auth/store/authStore';
import { MissionProgressOverlay } from './MissionProgressOverlay';

if (typeof window !== 'undefined') {
  (window as any).virtualGamepad = {
    up: false,
    down: false,
    left: false,
    right: false,
    A: false,
    B: false,
    upPressedCount: 0,
    downPressedCount: 0,
    leftPressedCount: 0,
    rightPressedCount: 0,
    aPressedCount: 0,
    bPressedCount: 0,
  };
}

type GameConsoleWrapperProps = {
  title: string;
  description: string;
  objective: string;
  controlsPc: string[];
  controlsMobile: string[];
  hasGamepad: boolean;
  phaserGameRef: React.MutableRefObject<Phaser.Game | null>;
  // React 19's useRef<HTMLDivElement>(null) widens to T | null.
  gameRef: RefObject<HTMLDivElement | null>;
  gameStarted: boolean;
  setGameStarted: (val: boolean) => void;
  onQuit: () => void;
  children?: React.ReactNode;
  aspectRatio?: string;
  gamepadType?: 'joystick' | 'arrows' | 'arrows-vertical';
  joystickAxes?: 'both' | 'horizontal' | 'vertical';
  /** Normalized joystick deadzone before key emulation starts. */
  joystickDeadzone?: number;
};

export const GameConsoleWrapper: React.FC<GameConsoleWrapperProps> = ({
  title,
  description,
  objective,
  controlsPc,
  controlsMobile,
  hasGamepad,
  phaserGameRef,
  gameRef,
  gameStarted,
  setGameStarted,
  onQuit,
  children,
  aspectRatio,
  gamepadType,
  joystickAxes,
  joystickDeadzone = 0.25,
}) => {
  // Surface the role so the wrapper can show a "preview mode" banner when
  // a teacher opens a game directly from the catalog. The flag is purely
  // visual — it doesn't gate anything in the scene.
  const role = useAuthStore((state) => state.user?.role);
  const isTeacherPreview = role === 'TEACHER';

  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isShortScreen, setIsShortScreen] = useState(false);
  const [isBtnAPressed, setIsBtnAPressed] = useState(false);
  const [isBtnBPressed, setIsBtnBPressed] = useState(false);
  // Surfaced by useGameSession when every question_id in the teacher's
  // bank has been answered at least once. The modal pauses the Phaser
  // scene so the kid can read their stats before deciding to bow out
  // (results page) or keep playing for fun (practice mode — no XP).
  const [bankSummary, setBankSummary] = useState<
    | { correct: number; attempted: number; minutes: number; total: number }
    | null
  >(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);

  const [joystickState, setJoystickState] = useState({
    active: false,
    baseX: 0,
    baseY: 0,
    stickX: 0,
    stickY: 0,
  });

  // Press state for the D-pad. We drive the visual highlight from React
  // state instead of relying on the CSS `:active` pseudo-class because
  // `:active` doesn't fire on iOS Safari once we call `e.preventDefault()`
  // on touchstart — and we need preventDefault on touchstart for the
  // gamepad flags to actually persist past the first frame.
  const [dpadPressed, setDpadPressed] = useState({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const activeKeysRef = useRef({ left: false, right: false, up: false, down: false });

  useEffect(() => {
    if (import.meta.env.DEV && !aspectRatio) {
      console.warn(`[GameConsoleWrapper] ${title} no recibió aspectRatio; usando fallback 4 / 3.`);
    }
  }, [aspectRatio, title]);

  // Initialize global virtual joystick object
  useEffect(() => {
    (window as any).virtualJoystick = {
      active: false,
      dx: 0,
      dy: 0,
      intensity: 0,
    };
    return () => {
      delete (window as any).virtualJoystick;
    };
  }, []);

  // Bank-completion modal. useGameSession fires this once the student has
  // answered every question in the teacher's bank at least once.
  useEffect(() => {
    const onExhausted = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        correct: number;
        attempted: number;
        minutes: number;
        total: number;
      };
      setBankSummary(detail);
      // Pause the Phaser scene so the kid can read the modal without
      // dodging enemies behind it.
      setIsPaused(true);
      if (phaserGameRef.current) {
        phaserGameRef.current.scene.scenes.forEach((scene) => {
          if (scene.scene.isActive()) scene.scene.pause();
        });
        phaserGameRef.current.sound.pauseAll();
      }
    };
    window.addEventListener('game:bankExhausted', onExhausted);
    return () => window.removeEventListener('game:bankExhausted', onExhausted);
  }, [phaserGameRef]);



  // Block ALL browser scroll, zoom, pull-to-refresh and text selection during gameplay
  useEffect(() => {
    if (!gameStarted || !(isMobile && hasGamepad)) return;

    const html = document.documentElement;
    const body = document.body;

    // Save original styles
    const origHtmlOverflow = html.style.overflow;
    const origBodyOverflow = body.style.overflow;
    const origHtmlTouchAction = html.style.touchAction;
    const origBodyTouchAction = body.style.touchAction;
    const origOverscroll = body.style.overscrollBehavior;
    const origUserSelect = body.style.userSelect;
    const origWebkitUserSelect = (body.style as any).webkitUserSelect;

    // Lock body
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.touchAction = 'none';
    body.style.touchAction = 'none';
    body.style.overscrollBehavior = 'none';
    body.style.userSelect = 'none';
    (body.style as any).webkitUserSelect = 'none';
    html.style.position = 'fixed';
    html.style.width = '100%';
    html.style.height = '100%';

    // Prevent default on touchmove globally to stop scroll/zoom
    const blockTouch = (e: TouchEvent) => {
      // Allow touches inside question modals (pointerdown on Phaser canvas)
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener('touchmove', blockTouch, { passive: false });

    // Prevent pinch-zoom via gesturestart (Safari). NB: pinch is already
    // blocked by `touchAction: 'none'` above + the touchmove preventDefault,
    // these gesture* listeners are belt-and-suspenders for older Safari.
    const blockGesture = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', blockGesture, { passive: false } as any);
    document.addEventListener('gesturechange', blockGesture, { passive: false } as any);

    // NOTE: previously this effect overwrote the <meta name="viewport"> with
    // `maximum-scale=1, user-scalable=no` while the game was running. That
    // forced the browser back to initial-scale=1 the moment the student
    // entered any game — overriding whatever browser zoom (Ctrl +/-) they
    // had applied. Symptom reported by the user: "in Vercel I need to zoom
    // out to 70% on every page, but the game pages snap back to 100% and
    // look huge". The touch/gesture handlers above already prevent pinch
    // zoom on mobile, so leaving the meta tag untouched is safe.

    return () => {
      html.style.overflow = origHtmlOverflow;
      body.style.overflow = origBodyOverflow;
      html.style.touchAction = origHtmlTouchAction;
      body.style.touchAction = origBodyTouchAction;
      body.style.overscrollBehavior = origOverscroll;
      body.style.userSelect = origUserSelect;
      (body.style as any).webkitUserSelect = origWebkitUserSelect;
      html.style.position = '';
      html.style.width = '';
      html.style.height = '';

      document.removeEventListener('touchmove', blockTouch);
      document.removeEventListener('gesturestart', blockGesture);
      document.removeEventListener('gesturechange', blockGesture);
    };
  }, [gameStarted, isMobile, hasGamepad]);

  const updateJoystickGlobalAndKeys = (dx: number, dy: number, distance: number, maxRadius: number) => {
    const normalX = dx / maxRadius;
    const normalY = dy / maxRadius;
    const intensity = Math.min(distance / maxRadius, 1);

    // `joystickAxes` only filters the synthetic keyboard emulation below —
    // the analog dx/dy values stay raw so scenes that read them directly
    // keep working (e.g. Tom's Tomato.ts uses `joystick.dy > 0.4` to duck).
    // The accidental-jump bug that motivated `joystickAxes='horizontal'`
    // happens because Tom uses `Phaser.Input.Keyboard.JustDown(this.cursor.up)`
    // for jumping, so blocking ArrowUp emulation is enough.
    const axisX = joystickAxes !== 'vertical';
    const axisY = joystickAxes !== 'horizontal';

    (window as any).virtualJoystick = {
      active: true,
      dx: normalX,
      dy: normalY,
      intensity: intensity,
    };

    // Keyboard emulation transitions
    const deadzone = joystickDeadzone;
    const keys = {
      left: axisX && normalX < -deadzone,
      right: axisX && normalX > deadzone,
      up: axisY && normalY < -deadzone,
      down: axisY && normalY > deadzone,
    };

    if ((window as any).virtualGamepad) {
      (window as any).virtualGamepad.left = keys.left;
      (window as any).virtualGamepad.right = keys.right;
      (window as any).virtualGamepad.up = keys.up;
      (window as any).virtualGamepad.down = keys.down;
    }

    const activeKeys = activeKeysRef.current;

    if (keys.left !== activeKeys.left) {
      simulateKey('ArrowLeft', 'ArrowLeft', 37, keys.left ? 'keydown' : 'keyup');
      activeKeys.left = keys.left;
    }
    if (keys.right !== activeKeys.right) {
      simulateKey('ArrowRight', 'ArrowRight', 39, keys.right ? 'keydown' : 'keyup');
      activeKeys.right = keys.right;
    }
    if (keys.up !== activeKeys.up) {
      simulateKey('ArrowUp', 'ArrowUp', 38, keys.up ? 'keydown' : 'keyup');
      activeKeys.up = keys.up;
    }
    if (keys.down !== activeKeys.down) {
      simulateKey('ArrowDown', 'ArrowDown', 40, keys.down ? 'keydown' : 'keyup');
      activeKeys.down = keys.down;
    }
  };

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = phaserGameRef.current?.canvas;
    if (canvas) canvas.focus();

    const rect = joystickAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const baseX = rect.width / 2;
    const baseY = rect.height / 2;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    let dx = localX - baseX;
    let dy = localY - baseY;
    const distance = Math.hypot(dx, dy);
    const maxRadius = 40;

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setJoystickState({
      active: true,
      baseX,
      baseY,
      stickX: dx,
      stickY: dy,
    });

    updateJoystickGlobalAndKeys(dx, dy, distance, maxRadius);

    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(15); } catch { /* ignore */ }
    }
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickState.active) return;
    e.preventDefault();

    const rect = joystickAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const baseX = rect.width / 2;
    const baseY = rect.height / 2;

    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      if (e.buttons !== 1) {
        handleJoystickEnd(e);
        return;
      }
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    let dx = localX - baseX;
    let dy = localY - baseY;
    const distance = Math.hypot(dx, dy);
    const maxRadius = 40;

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setJoystickState((prev) => ({
      ...prev,
      stickX: dx,
      stickY: dy,
    }));

    updateJoystickGlobalAndKeys(dx, dy, distance, maxRadius);
  };

  const handleJoystickEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!joystickState.active) return;

    setJoystickState({
      active: false,
      baseX: 0,
      baseY: 0,
      stickX: 0,
      stickY: 0,
    });

    (window as any).virtualJoystick = {
      active: false,
      dx: 0,
      dy: 0,
      intensity: 0,
    };

    if ((window as any).virtualGamepad) {
      (window as any).virtualGamepad.left = false;
      (window as any).virtualGamepad.right = false;
      (window as any).virtualGamepad.up = false;
      (window as any).virtualGamepad.down = false;
    }

    const activeKeys = activeKeysRef.current;
    if (activeKeys.left) { simulateKey('ArrowLeft', 'ArrowLeft', 37, 'keyup'); activeKeys.left = false; }
    if (activeKeys.right) { simulateKey('ArrowRight', 'ArrowRight', 39, 'keyup'); activeKeys.right = false; }
    if (activeKeys.up) { simulateKey('ArrowUp', 'ArrowUp', 38, 'keyup'); activeKeys.up = false; }
    if (activeKeys.down) { simulateKey('ArrowDown', 'ArrowDown', 40, 'keyup'); activeKeys.down = false; }
  };

  // Detect mobile device viewport size and touch capabilities
  useEffect(() => {
    const checkDevice = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmall = window.innerWidth < 768;
      setIsMobile(isSmall || isTouch);
      setIsShortScreen(window.innerHeight < 520);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Handle global Escape key to pause/resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!gameStarted) return;
        if (isPaused) {
          handleResume();
        } else {
          handlePause();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, isPaused]);

  // Lock scroll, gestures, and zoom when game starts and is not paused
  useEffect(() => {
    if (!gameStarted || isPaused || !(isMobile && hasGamepad)) return;

    // 1. Prevent default document touchmove to disable mobile scroll bounce/pull-to-refresh
    const preventTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    // 2. Lock body and html overflow/positioning. Cleanup resets to ''
    // (the canonical "unset" for style.*) so we don't need to snapshot
    // the previous values.
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';

    return () => {
      document.removeEventListener('touchmove', preventTouchMove);

      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';

      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.touchAction = '';
    };
  }, [gameStarted, isPaused, isMobile, hasGamepad]);

  const handleStart = () => {
    setGameStarted(true);
  };

  const handlePause = () => {
    // Bomb-game uses `isQuestionActive` instead of `isQuestionMode` (legacy
    // scene contract), so check both flags before allowing pause — otherwise
    // pausing during a bomb-game question stacks two modals on top of each
    // other with no way out.
    const hasModal = phaserGameRef.current?.scene.scenes.some(
      (s) =>
        s.scene.isActive() &&
        ((s as any).isQuestionMode === true || (s as any).isQuestionActive === true)
    );
    if (hasModal) return;
    setIsPaused(true);
    if (phaserGameRef.current) {
      phaserGameRef.current.scene.scenes.forEach((scene) => {
        if (scene.scene.isActive()) {
          scene.scene.pause();
        }
      });
      phaserGameRef.current.sound.pauseAll();
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    if (phaserGameRef.current) {
      phaserGameRef.current.scene.scenes.forEach((scene) => {
        if (scene.scene.isPaused()) {
          scene.scene.resume();
        }
      });
      phaserGameRef.current.sound.resumeAll();
    }
  };

  const handleRestart = () => {
    setIsPaused(false);
    if (phaserGameRef.current) {
      const game = phaserGameRef.current;
      const sceneManager = game.scene;
      
      // Stop all registered scenes
      sceneManager.scenes.forEach((scene) => {
        sceneManager.stop(scene.scene.key);
      });
      
      // Stop all audio
      game.sound.stopAll();
      game.sound.resumeAll();

      // Reset registry but preserve target level questions
      const questions = game.registry.get('preguntasDelNivel');
      game.registry.reset();
      if (questions) {
        game.registry.set('preguntasDelNivel', questions);
      }

      // Start the very first scene in the list (Boot/Preloader/MainMenu) to run a clean init
      if (sceneManager.scenes.length > 0) {
        const firstSceneKey = sceneManager.scenes[0].scene.key;
        sceneManager.start(firstSceneKey);
      }
    }
  };

  // Dispatch mock keyboard events to global window object, document, and phaser canvas
  const simulateKey = (key: string, code: string, keyCode: number, type: 'keydown' | 'keyup') => {
    const createEvent = () => {
      const event = new KeyboardEvent(type, {
        key: key,
        code: code,
        bubbles: true,
        cancelable: true,
      });
      // Force correct keyCode and which properties (needed for Phaser & Chrome/Safari compatibility)
      Object.defineProperty(event, 'keyCode', { value: keyCode, enumerable: true, configurable: true, writable: true });
      Object.defineProperty(event, 'which', { value: keyCode, enumerable: true, configurable: true, writable: true });
      return event;
    };

    window.dispatchEvent(createEvent());
    document.dispatchEvent(createEvent());

    const canvas = phaserGameRef.current?.canvas;
    if (canvas) {
      canvas.dispatchEvent(createEvent());
    }
  };

  const handleActionButtonDown = (e: React.TouchEvent | React.MouseEvent, button: 'A' | 'B') => {
    e.preventDefault();
    const canvas = phaserGameRef.current?.canvas;
    if (canvas) canvas.focus();
    if (button === 'A') {
      setIsBtnAPressed(true);
      if ((window as any).virtualGamepad) {
        (window as any).virtualGamepad.A = true;
        (window as any).virtualGamepad.aPressedCount = ((window as any).virtualGamepad.aPressedCount || 0) + 1;
      }
    } else {
      setIsBtnBPressed(true);
      if ((window as any).virtualGamepad) {
        (window as any).virtualGamepad.B = true;
        (window as any).virtualGamepad.bPressedCount = ((window as any).virtualGamepad.bPressedCount || 0) + 1;
      }
    }
    // Dispatch custom event for direct response
    window.dispatchEvent(new CustomEvent('gamepad:A'));

    // Both buttons fire Space AND Z so they always do the same thing
    simulateKey(' ', 'Space', 32, 'keydown');
    simulateKey('z', 'KeyZ', 90, 'keydown');
    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(10); } catch { /* ignore */ }
    }
  };

  const handleActionButtonUp = (e: React.TouchEvent | React.MouseEvent, button: 'A' | 'B') => {
    e.preventDefault();
    if (button === 'A') {
      setIsBtnAPressed(false);
      if ((window as any).virtualGamepad) (window as any).virtualGamepad.A = false;
    } else {
      setIsBtnBPressed(false);
      if ((window as any).virtualGamepad) (window as any).virtualGamepad.B = false;
    }
    simulateKey(' ', 'Space', 32, 'keyup');
    simulateKey('z', 'KeyZ', 90, 'keyup');
  };

  const handleDpadButtonDown = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent, key: 'up' | 'down' | 'left' | 'right') => {
    // preventDefault is REQUIRED here. Without it iOS Safari fires a
    // synthetic mouseup ~300ms after touchend AND can reorder events so
    // a "down → up" cycle resolves in a single frame, which makes
    // `virtualGamepad.up = true` flip back to false before
    // Player.preUpdate reads it. Symptom: the A button (which has
    // preventDefault) works, the arrow buttons don't. Visual press
    // feedback is driven from React state below instead of `:active`.
    e.preventDefault();
    setDpadPressed((prev) => ({ ...prev, [key]: true }));
    if ((window as any).virtualGamepad) {
      (window as any).virtualGamepad[key] = true;
      const counterKey = `${key}PressedCount`;
      (window as any).virtualGamepad[counterKey] = ((window as any).virtualGamepad[counterKey] || 0) + 1;
    }
    // NOTE: previously this handler also mutated `virtualJoystick.dx/dy`
    // to keep "compatibility" with scenes that only read the joystick
    // path. That caused a double-fire bug in Snowmen Attack: the scene
    // reads BOTH the joystick path AND `Phaser.Input.Keyboard.JustDown`
    // on the synthetic event below, so each ▲ tap moved the penguin TWO
    // lanes (and wrapped around). The discrete D-pad is for keyboard-
    // style input; the analog `virtualJoystick` must stay owned by the
    // actual joystick area handlers below.
    // Dispatch custom event for direct response
    window.dispatchEvent(new CustomEvent(`gamepad:${key}`));

    // Simulate keydown
    const keyMap = {
      up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
      down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
      left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
      right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    };
    const keyInfo = keyMap[key];
    if (keyInfo) {
      simulateKey(keyInfo.key, keyInfo.code, keyInfo.keyCode, 'keydown');
    }

    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(10); } catch { /* ignore */ }
    }
  };

  const handleDpadButtonUp = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent, key: 'up' | 'down' | 'left' | 'right') => {
    e.preventDefault();
    setDpadPressed((prev) => ({ ...prev, [key]: false }));
    if ((window as any).virtualGamepad) {
      (window as any).virtualGamepad[key] = false;
    }
    // See handleDpadButtonDown — discrete D-pad must NOT touch the
    // analog `virtualJoystick`. Touching it here also cleared state
    // belonging to the real joystick handlers (when both inputs were
    // somehow active during the same gesture).

    // Simulate keyup
    const keyMap = {
      up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
      down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
      left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
      right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    };
    const keyInfo = keyMap[key];
    if (keyInfo) {
      simulateKey(keyInfo.key, keyInfo.code, keyInfo.keyCode, 'keyup');
    }
  };

  const renderInstructionsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 select-none" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>
      <div 
        className="relative border-8 border-on-background bg-surface-container-lowest p-6 shadow-[12px_12px_0_0_#1d1c17] text-on-surface-container flex flex-col justify-between overflow-y-auto"
        style={{ width: '90%', maxWidth: '520px', minWidth: '280px', maxHeight: '95vh', boxSizing: 'border-box' }}
      >
        <div>
          {isTeacherPreview && (
            <div className="mb-3 border-4 border-tertiary bg-tertiary-container px-2 py-1 text-center font-mono text-xs font-bold uppercase text-on-tertiary-container">
              Modo previsualización · no cuenta como tarea
            </div>
          )}
          <h1 className="border-b-4 border-on-background pb-2 text-2xl md:text-3xl font-black uppercase tracking-widest text-center text-primary" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>
            {title}
          </h1>
          
          <div className="mt-4 space-y-4 leading-relaxed">
            <div>
              <span className="font-bold text-secondary uppercase block mb-1 text-lg md:text-xl" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>¿Cómo jugar?</span>
              <p className="text-on-surface-variant text-lg md:text-xl leading-relaxed" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>{description}</p>
            </div>

            <div>
              <span className="font-bold text-tertiary uppercase block mb-1 text-lg md:text-xl" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>Objetivo</span>
              <p className="text-on-surface-variant text-lg md:text-xl leading-relaxed" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>{objective}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t-2 border-dashed border-on-background/25 pt-4">
              <div>
                <span className="font-bold text-on-background uppercase block mb-1 text-sm md:text-base" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>⌨ Computadora</span>
                <ul className="list-disc pl-4 text-sm md:text-base space-y-1 text-on-surface-variant" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>
                  {controlsPc.map((ctrl, i) => <li key={i}>{ctrl}</li>)}
                </ul>
              </div>
              <div>
                <span className="font-bold text-on-background uppercase block mb-1 text-sm md:text-base" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>📱 Celular</span>
                <ul className="list-disc pl-4 text-sm md:text-base space-y-1 text-on-surface-variant" style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}>
                  {controlsMobile.map((ctrl, i) => <li key={i}>{ctrl}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleStart}
            className="w-full border-4 border-on-background bg-primary px-4 py-3 text-base font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
            style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}
          >
            Comenzar Juego
          </button>
          <button
            onClick={onQuit}
            className="w-full border-4 border-on-background bg-surface-variant px-4 py-3 text-base font-bold uppercase text-on-surface-variant shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
            style={{ fontFamily: 'Lexend, var(--font-body), sans-serif' }}
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );

  const handleContinuePracticing = () => {
    if (!bankSummary) return;
    // Tell the hook to stop posting attempts / heartbeats.
    window.dispatchEvent(new CustomEvent('game:enterPractice'));
    setIsPracticeMode(true);
    setBankSummary(null);
    setIsPaused(false);
    if (phaserGameRef.current) {
      phaserGameRef.current.scene.scenes.forEach((scene) => {
        if (scene.scene.isPaused()) scene.scene.resume();
      });
      phaserGameRef.current.sound.resumeAll();
    }
  };

  const handleViewResults = () => {
    setBankSummary(null);
    // onQuit triggers the hook's routeAwayFromGame which flushes a final
    // heartbeat and navigates to the results page.
    onQuit();
  };

  const renderBankCompletionModal = () => {
    if (!bankSummary) return null;
    const { correct, attempted, minutes, total } = bankSummary;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 select-none">
        <div
          className="border-8 border-on-background bg-surface-container-lowest p-6 shadow-[12px_12px_0_0_#1d1c17]"
          style={{ width: '92%', maxWidth: '460px', minWidth: '280px', boxSizing: 'border-box' }}
        >
          <h2 className="border-b-4 border-on-background pb-3 text-center font-headline text-2xl md:text-3xl font-black uppercase tracking-widest text-primary">
            ¡Banco completado!
          </h2>

          <p className="mt-3 text-center text-sm md:text-base text-on-surface-variant">
            Respondiste todas las preguntas del banco de tu docente.
          </p>

          <dl className="mt-5 grid grid-cols-3 gap-2">
            <div className="border-4 border-on-background bg-primary-container p-2 text-center shadow-[3px_3px_0_0_#1d1c17]">
              <dt className="font-mono text-[10px] font-bold uppercase text-on-primary-container">Aciertos</dt>
              <dd className="mt-1 font-headline text-2xl font-black text-on-primary-container">
                {correct}/{total}
              </dd>
            </div>
            <div className="border-4 border-on-background bg-secondary-container p-2 text-center shadow-[3px_3px_0_0_#1d1c17]">
              <dt className="font-mono text-[10px] font-bold uppercase text-on-secondary-container">Precisión</dt>
              <dd className="mt-1 font-headline text-2xl font-black text-on-secondary-container">
                {accuracy}%
              </dd>
            </div>
            <div className="border-4 border-on-background bg-tertiary-container p-2 text-center shadow-[3px_3px_0_0_#1d1c17]">
              <dt className="font-mono text-[10px] font-bold uppercase text-on-tertiary-container">Minutos</dt>
              <dd className="mt-1 font-headline text-2xl font-black text-on-tertiary-container">
                {minutes.toFixed(1)}
              </dd>
            </div>
          </dl>

          <p className="mt-5 border-2 border-dashed border-on-background/40 bg-surface-variant p-2 text-center font-mono text-[11px] uppercase text-on-surface-variant">
            Si sigues jugando, las preguntas se repiten y ya no ganas XP.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <button
              onClick={handleViewResults}
              className="flex items-center justify-center gap-2 border-4 border-on-background bg-primary px-4 py-3 font-headline text-base font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
            >
              <span className="material-symbols-outlined">flag</span>
              Ver mis resultados
            </button>
            <button
              onClick={handleContinuePracticing}
              className="flex items-center justify-center gap-2 border-4 border-on-background bg-surface-variant px-4 py-3 font-headline text-base font-bold uppercase text-on-surface-variant shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
            >
              <span className="material-symbols-outlined">replay</span>
              Seguir practicando
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPracticeBadge = () => (
    <div className="flex items-center gap-1 border-2 sm:border-4 border-on-background bg-tertiary-container px-2 py-1 sm:px-3 sm:py-2 font-mono text-[10px] sm:text-xs font-bold uppercase text-on-tertiary-container shadow-[2px_2px_0_0_#1d1c17] sm:shadow-[4px_4px_0_0_#1d1c17]">
      <span className="material-symbols-outlined text-xs sm:text-base">school</span>
      Práctica · sin XP
    </div>
  );

  const renderPauseModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 select-none">
      <div 
        className="border-8 border-on-background bg-surface-container p-6 shadow-[12px_12px_0_0_#1d1c17]"
        style={{ width: '90%', maxWidth: '380px', minWidth: '280px', boxSizing: 'border-box' }}
      >
        <h2 className="text-center font-headline text-3xl font-black uppercase tracking-widest text-error">
          Pausa
        </h2>
        
        <div className="mt-6 flex flex-col gap-4">
          <button
            onClick={handleResume}
            className="flex items-center justify-center gap-2 border-4 border-on-background bg-primary px-4 py-3 font-headline text-base font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            Continuar
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center justify-center gap-2 border-4 border-on-background bg-secondary px-4 py-3 font-headline text-base font-bold uppercase text-on-secondary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
          >
            <span className="material-symbols-outlined">replay</span>
            Reiniciar
          </button>
          <button
            onClick={onQuit}
            className="flex items-center justify-center gap-2 border-4 border-on-background bg-error px-4 py-3 font-headline text-base font-bold uppercase text-on-error shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
          >
            <span className="material-symbols-outlined">logout</span>
            Salir
          </button>
        </div>
      </div>
    </div>
  );

  // Derive directional highlight states from joystick position
  const joyLeft = joystickState.stickX < -8;
  const joyRight = joystickState.stickX > 8;
  const joyUp = joystickState.stickY < -8;
  const joyDown = joystickState.stickY > 8;

  const renderGamepad = () => (
    <div
      className="flex h-[32dvh] min-h-[180px] w-full select-none justify-around items-center bg-slate-900 px-6 md:px-24 py-4 border-t-8 border-on-background relative"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Visual background details */}
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px]" />
 
      {/* Joystick Area, Horizontal Arrows, or Vertical Arrows */}
      {gamepadType === 'arrows' ? (
        <div className="flex gap-4 select-none items-center justify-center" style={{ width: '140px', height: '140px' }}>
          {/* Left Arrow */}
          <button
            onTouchStart={(e) => handleDpadButtonDown(e, 'left')}
            onTouchEnd={(e) => handleDpadButtonUp(e, 'left')}
            onMouseDown={(e) => handleDpadButtonDown(e, 'left')}
            onMouseUp={(e) => handleDpadButtonUp(e, 'left')}
            onMouseLeave={(e) => handleDpadButtonUp(e, 'left')}
            className="flex h-14 w-14 items-center justify-center rounded-lg border-4 border-slate-950 hover:bg-slate-700/65 text-2xl font-black cursor-pointer select-none transition-all duration-75"
            style={{
              backgroundColor: dpadPressed.left ? 'rgba(249,115,22,0.85)' : 'rgba(30,41,59,0.65)',
              color: dpadPressed.left ? '#ffffff' : '#cbd5e1',
              transform: dpadPressed.left ? 'translateY(1px)' : 'translateY(0)',
              boxShadow: dpadPressed.left ? '1px 1px 0 0 #000' : '2px 2px 0 0 #000',
            }}
          >
            ◀
          </button>
          {/* Right Arrow */}
          <button
            onTouchStart={(e) => handleDpadButtonDown(e, 'right')}
            onTouchEnd={(e) => handleDpadButtonUp(e, 'right')}
            onMouseDown={(e) => handleDpadButtonDown(e, 'right')}
            onMouseUp={(e) => handleDpadButtonUp(e, 'right')}
            onMouseLeave={(e) => handleDpadButtonUp(e, 'right')}
            className="flex h-14 w-14 items-center justify-center rounded-lg border-4 border-slate-950 hover:bg-slate-700/65 text-2xl font-black cursor-pointer select-none transition-all duration-75"
            style={{
              backgroundColor: dpadPressed.right ? 'rgba(249,115,22,0.85)' : 'rgba(30,41,59,0.65)',
              color: dpadPressed.right ? '#ffffff' : '#cbd5e1',
              transform: dpadPressed.right ? 'translateY(1px)' : 'translateY(0)',
              boxShadow: dpadPressed.right ? '1px 1px 0 0 #000' : '2px 2px 0 0 #000',
            }}
          >
            ▶
          </button>
        </div>
      ) : gamepadType === 'arrows-vertical' ? (
        <div className="flex flex-col gap-4 select-none items-center justify-center" style={{ width: '140px', height: '140px' }}>
          {/* Up Arrow */}
          <button
            onTouchStart={(e) => handleDpadButtonDown(e, 'up')}
            onTouchEnd={(e) => handleDpadButtonUp(e, 'up')}
            onMouseDown={(e) => handleDpadButtonDown(e, 'up')}
            onMouseUp={(e) => handleDpadButtonUp(e, 'up')}
            onMouseLeave={(e) => handleDpadButtonUp(e, 'up')}
            className="flex h-14 w-14 items-center justify-center rounded-lg border-4 border-slate-950 hover:bg-slate-700/65 text-2xl font-black cursor-pointer select-none transition-all duration-75"
            style={{
              backgroundColor: dpadPressed.up ? 'rgba(249,115,22,0.85)' : 'rgba(30,41,59,0.65)',
              color: dpadPressed.up ? '#ffffff' : '#cbd5e1',
              transform: dpadPressed.up ? 'translateY(1px)' : 'translateY(0)',
              boxShadow: dpadPressed.up ? '1px 1px 0 0 #000' : '2px 2px 0 0 #000',
            }}
          >
            ▲
          </button>
          {/* Down Arrow */}
          <button
            onTouchStart={(e) => handleDpadButtonDown(e, 'down')}
            onTouchEnd={(e) => handleDpadButtonUp(e, 'down')}
            onMouseDown={(e) => handleDpadButtonDown(e, 'down')}
            onMouseUp={(e) => handleDpadButtonUp(e, 'down')}
            onMouseLeave={(e) => handleDpadButtonUp(e, 'down')}
            className="flex h-14 w-14 items-center justify-center rounded-lg border-4 border-slate-950 hover:bg-slate-700/65 text-2xl font-black cursor-pointer select-none transition-all duration-75"
            style={{
              backgroundColor: dpadPressed.down ? 'rgba(249,115,22,0.85)' : 'rgba(30,41,59,0.65)',
              color: dpadPressed.down ? '#ffffff' : '#cbd5e1',
              transform: dpadPressed.down ? 'translateY(1px)' : 'translateY(0)',
              boxShadow: dpadPressed.down ? '1px 1px 0 0 #000' : '2px 2px 0 0 #000',
            }}
          >
            ▼
          </button>
        </div>
      ) : (
        <div 
          ref={joystickAreaRef}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onMouseDown={handleJoystickStart}
          onMouseMove={handleJoystickMove}
          onMouseUp={handleJoystickEnd}
          onMouseLeave={handleJoystickEnd}
          className="relative flex items-center justify-center cursor-crosshair select-none"
          style={{ width: '140px', height: '140px' }}
        >
          {/* Directional indicators */}
          <span className="absolute top-0 left-1/2 -translate-x-1/2 text-lg select-none pointer-events-none transition-colors duration-75" style={{ color: joyUp ? '#fb923c' : 'rgba(148,163,184,0.35)' }}>▲</span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg select-none pointer-events-none transition-colors duration-75" style={{ color: joyDown ? '#fb923c' : 'rgba(148,163,184,0.35)' }}>▼</span>
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg select-none pointer-events-none transition-colors duration-75" style={{ color: joyLeft ? '#fb923c' : 'rgba(148,163,184,0.35)' }}>◀</span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg select-none pointer-events-none transition-colors duration-75" style={{ color: joyRight ? '#fb923c' : 'rgba(148,163,184,0.35)' }}>▶</span>

          {/* Fixed Outer Base (Always visible) */}
          <div 
            className="absolute rounded-full border-4 border-slate-400/40 bg-slate-700/20 shadow-inner flex items-center justify-center"
            style={{ width: '120px', height: '120px', pointerEvents: 'none' }}
          >
            {/* Stick (inner circle, always visible, moves relative to center) */}
            <div 
              className="absolute rounded-full border-4 border-slate-950 bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center"
              style={{
                width: '54px',
                height: '54px',
                transform: `translate3d(${joystickState.stickX}px, ${joystickState.stickY}px, 0)`,
                transition: joystickState.active ? 'none' : 'transform 0.15s ease-out',
                pointerEvents: 'none',
              }}
            >
              <div className="w-4 h-4 rounded-full bg-orange-300/60 shadow-inner" />
            </div>
          </div>
        </div>
      )}
 
      {/* The middle "Pausa / Start" button used to live here, but it
          duplicated the working pause icon already pinned to the top-right
          of the game canvas (line ~710) and confused testers because the
          retro-styled gamepad button looked clickable yet routed to the
          same handler. Removed for the mobile gamepad layout only — the
          desktop layout has its own dedicated pause button in the top
          action bar (line ~749) and is untouched. */}

      {/* Action Buttons A / B */}
      <div className="flex items-center gap-5 pr-1">
        {/* Button B */}
        <div className="flex flex-col items-center gap-1">
          <button
            onTouchStart={(e) => handleActionButtonDown(e, 'B')}
            onTouchEnd={(e) => handleActionButtonUp(e, 'B')}
            onMouseDown={(e) => handleActionButtonDown(e, 'B')}
            onMouseUp={(e) => handleActionButtonUp(e, 'B')}
            onMouseLeave={(e) => handleActionButtonUp(e, 'B')}
            className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-950 bg-[#8c1818] text-3xl font-black text-[#fca5a5] cursor-pointer transition-all duration-75"
            style={{
              transform: isBtnBPressed ? 'scale(0.9) translateY(2px)' : 'scale(1) translateY(0)',
              filter: isBtnBPressed ? 'brightness(1.25)' : 'brightness(1)',
              boxShadow: isBtnBPressed ? '1px 1px 0 0 #000' : '4px 4px 0 0 #000',
            }}
          >
            B
          </button>
        </div>
 
        {/* Button A */}
        <div className="flex flex-col items-center gap-1 -mt-10">
          <button
            onTouchStart={(e) => handleActionButtonDown(e, 'A')}
            onTouchEnd={(e) => handleActionButtonUp(e, 'A')}
            onMouseDown={(e) => handleActionButtonDown(e, 'A')}
            onMouseUp={(e) => handleActionButtonUp(e, 'A')}
            onMouseLeave={(e) => handleActionButtonUp(e, 'A')}
            className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-950 bg-[#c2410c] text-3xl font-black text-[#ffedd5] cursor-pointer transition-all duration-75"
            style={{
              transform: isBtnAPressed ? 'scale(0.9) translateY(2px)' : 'scale(1) translateY(0)',
              filter: isBtnAPressed ? 'brightness(1.25)' : 'brightness(1)',
              boxShadow: isBtnAPressed ? '1px 1px 0 0 #000' : '4px 4px 0 0 #000',
            }}
          >
            A
          </button>
        </div>
      </div>
    </div>
  );

  // If game is not started, show instructions
  if (!gameStarted) {
    return renderInstructionsModal();
  }

  // If game is paused, render overlay
  const pauseOverlay = isPaused ? renderPauseModal() : null;

  // On Mobile and hasGamepad configured: 70% game area + 30% retro control chassis
  if (isMobile && hasGamepad) {
    return (
      <div
        className="fixed inset-0 flex flex-col bg-slate-950 overflow-hidden select-none"
        style={{ touchAction: 'none', height: '100dvh' }}
        // Block long-press context menu so the kid doesn't get a "Save image"
        // popup when holding down a button on the virtual gamepad.
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Top Game viewport (70% height) */}
        <div className="relative flex h-[68dvh] w-full items-center justify-center bg-black p-1">
          {/* Retro Game Frame Border */}
          <div className="relative flex h-full w-full max-w-[800px] flex-col border-4 border-slate-800 bg-black">
            {/* Retro Battery Light detail */}
            <div className="absolute left-4 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 opacity-75">
              <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              <span className="font-mono text-[7px] font-bold text-red-500">BATTERY</span>
            </div>
            
            <div className="absolute right-4 top-4 z-30">
              <button
                onTouchStart={(e) => { e.preventDefault(); handlePause(); }}
                onMouseDown={(e) => { e.preventDefault(); handlePause(); }}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-slate-900/60 p-2 text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-md">pause</span>
              </button>
            </div>

            <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center">
              {children}
              <div ref={gameRef} className="h-full w-full" />
            </div>
          </div>
        </div>

        {/* Bottom Gamepad controls (32% height) */}
        {renderGamepad()}
        {/* Practice-mode badge over the canvas */}
        {isPracticeMode && !bankSummary && (
          <div className="absolute right-3 top-3 z-30">{renderPracticeBadge()}</div>
        )}
        {pauseOverlay}
        {renderBankCompletionModal()}
        <MissionProgressOverlay active={gameStarted} />
      </div>
    );
  }

  // Desktop or Mobile (without gamepad - full-screen touch mode)
  return (
    <div 
      className={`relative flex min-h-screen w-full flex-col items-center justify-center bg-surface-container ${isShortScreen ? 'p-1 overflow-hidden' : 'p-1 sm:p-4 md:p-8 overflow-y-auto'} ${gameStarted ? 'select-none' : ''}`}
      // Tailwind's `min-h-screen` gives 100vh as the baseline. The inline
      // style overrides with 100dvh when supported (modern Safari/Chrome)
      // so the page doesn't get cropped when iOS's URL bar collapses.
      // Browsers that don't understand dvh just keep the 100vh class value.
      style={{
        minHeight: '100dvh',
        touchAction: (isMobile && gameStarted) ? 'none' : 'auto',
      }}
    >
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-container via-surface to-background opacity-50" />

      {/* Top action bar */}
      <div className="absolute left-2 top-2 sm:left-4 sm:top-4 z-20 flex gap-2">
        <button
          onClick={onQuit}
          className="flex items-center gap-1 border-2 sm:border-4 border-on-background bg-surface px-2 py-1 sm:px-4 sm:py-2 font-headline text-xs sm:text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17] sm:shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm sm:text-base">arrow_back</span>
          Salir
        </button>
        <button
          onClick={handlePause}
          className="flex items-center gap-1 border-2 sm:border-4 border-on-background bg-surface px-2 py-1 sm:px-4 sm:py-2 font-headline text-xs sm:text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17] sm:shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm sm:text-base">pause</span>
          Pausa
        </button>
        {isTeacherPreview && (
          <div className="flex items-center gap-1 border-2 sm:border-4 border-tertiary bg-tertiary-container px-2 py-1 sm:px-3 sm:py-2 font-mono text-[10px] sm:text-xs font-bold uppercase text-on-tertiary-container shadow-[2px_2px_0_0_#1d1c17] sm:shadow-[4px_4px_0_0_#1d1c17]">
            <span className="material-symbols-outlined text-xs sm:text-base">visibility</span>
            Modo preview
          </div>
        )}
        {isPracticeMode && !bankSummary && renderPracticeBadge()}
      </div>

      <div
        className="z-10 flex flex-col border-4 sm:border-8 border-on-background bg-surface-container-lowest shadow-[8px_8px_0_0_#1d1c17] sm:shadow-[16px_16px_0_0_#1d1c17] mx-auto"
        style={{ 
          width: isShortScreen ? `calc(70vh * (${aspectRatio ?? '4 / 3'}) + 12px)` : '98%', 
          maxWidth: '800px', 
          boxSizing: 'border-box' 
        }}
      >
        {!isShortScreen && (
          <div className="flex items-center justify-center border-b-4 sm:border-b-8 border-on-background bg-primary px-2 py-3 sm:px-3 sm:py-4 text-on-primary">
            <h2 className="flex items-center gap-2 font-headline text-lg sm:text-2xl font-bold uppercase tracking-widest text-on-primary">
              {title}
            </h2>
          </div>
        )}

        <div className="flex w-full justify-center bg-surface-container-lowest p-1 sm:p-3">
          {/* Main game board */}
          <div
            className="relative overflow-hidden rounded-md border-2 sm:border-4 border-on-background shadow-inner bg-black mx-auto"
            style={{
              aspectRatio: aspectRatio ?? '4 / 3',
              maxWidth: '100%',
              maxHeight: isShortScreen ? '70vh' : undefined,
              width: isShortScreen ? `calc(70vh * (${aspectRatio ?? '4 / 3'}))` : '100%',
              height: 'auto',
            }}
          >
            {children}
            <div
              ref={gameRef}
              className="absolute inset-0 z-10 flex h-full w-full items-center justify-center"
            />
          </div>
        </div>
      </div>

      {pauseOverlay}
      {renderBankCompletionModal()}
      <MissionProgressOverlay active={gameStarted} />
    </div>
  );
};
