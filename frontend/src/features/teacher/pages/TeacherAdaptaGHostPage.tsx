import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Pusher from 'pusher-js';
import { TeacherShell } from '../components/TeacherShell';
import { adaptaGService } from '../../games/services/adapta-g.service';

interface Player {
  id: string;
  name: string;
  score: number;
  money: number;
  finished?: boolean;
}

export function TeacherAdaptaGHostPage() {
  const { pin } = useParams<{ pin: string }>();
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [gameState, setGameState] = useState<'LOBBY' | 'MINIGAME' | 'PLAYING' | 'FINISHED'>('LOBBY');
  const [mode, setMode] = useState<'NORMAL' | 'DINERO'>('NORMAL');
  const [hasMinigame, setHasMinigame] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [ranking, setRanking] = useState<Player[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);

  // Minigame state
  const [miniGameTimeLeft, setMiniGameTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const key = import.meta.env.VITE_PUSHER_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    if (pin) {
      adaptaGService.getRoomState(pin).then(res => {
        if (res.data) {
          setPlayers(res.data.players || {});
          setGameState(res.data.state);
          setMode(res.data.mode || 'NORMAL');
          setHasMinigame(!!res.data.miniGameRoute);
          if (res.data.currentQuestion) setCurrentQuestion(res.data.currentQuestion);
          setTotalAnswered(res.data.answeredBy?.length || 0);

          if (res.data.state === 'MINIGAME' && res.data.miniGameStartedAt) {
            const elapsed = Math.floor((Date.now() - res.data.miniGameStartedAt) / 1000);
            const remaining = Math.max(0, (res.data.miniGameDuration || 60) - elapsed);
            setMiniGameTimeLeft(remaining);
          }
        }
      }).catch(err => console.error('Error fetching room state:', err));
    }
    
    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe(`room-${pin}`);

    channel.bind('player-joined', (data: { id: string, name: string }) => {
      setPlayers(prev => ({ ...prev, [data.id]: { id: data.id, name: data.name, score: 0, money: 0 } }));
    });

    channel.bind('minigame-started', (data: { duration: number }) => {
      setGameState('MINIGAME');
      setMiniGameTimeLeft(data.duration);
    });

    channel.bind('player-score-update', (data: { id: string, score?: number, money?: number, finished?: boolean }) => {
      setPlayers(prev => {
        const p = prev[data.id];
        if (!p) return prev;
        return {
          ...prev,
          [data.id]: {
            ...p,
            score: data.score !== undefined ? data.score : p.score,
            money: data.money !== undefined ? data.money : p.money,
            finished: data.finished !== undefined ? data.finished : p.finished
          }
        };
      });
    });

    channel.bind('new-question', (data: any) => {
      setGameState('PLAYING');
      setCurrentQuestion(data);
      setTotalAnswered(0);
    });

    channel.bind('game-started-async', () => {
      setGameState('PLAYING');
    });

    channel.bind('player-answered', (data: { totalAnswered: number }) => {
      setTotalAnswered(data.totalAnswered);
    });

    channel.bind('game-finished', (data: { ranking: Player[] }) => {
      setGameState('FINISHED');
      setRanking(data.ranking);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`room-${pin}`);
    };
  }, [pin]);

  // Minigame Timer
  useEffect(() => {
    if (gameState === 'MINIGAME' && miniGameTimeLeft !== null && miniGameTimeLeft > 0) {
      const timer = setTimeout(() => setMiniGameTimeLeft(miniGameTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, miniGameTimeLeft]);

  const handleStartMinigame = async () => {
    if (!pin) return;
    setLoadingAction(true);
    try {
      await adaptaGService.startMiniGame(pin);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStartQuestions = async () => {
    if (!pin) return;
    setLoadingAction(true);
    try {
      await adaptaGService.startNextQuestion(pin);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAction(false);
    }
  };

  // Live ranking for Minigame or Dinero mode
  const liveRanking = Object.values(players).sort((a, b) => {
    if (mode === 'DINERO') return b.money - a.money;
    return b.score - a.score;
  });

  return (
    <TeacherShell title={`Adapta - G (PIN: ${pin})`}>
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        
        {/* LOBBY */}
        {gameState === 'LOBBY' && (
          <div className="space-y-lg text-center">
            <h2 className="font-headline text-3xl font-bold uppercase text-on-surface-variant">Únete en tu dispositivo</h2>
            <div className="border-8 border-on-background bg-primary-container p-xl font-mono text-8xl font-bold text-on-primary-container shadow-[12px_12px_0_0_#1d1c17]">
              {pin}
            </div>
            
            <div className="mt-xl">
              <h3 className="mb-md text-xl font-bold uppercase">Jugadores ({Object.keys(players).length})</h3>
              <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-sm">
                {Object.values(players).map(p => (
                  <div key={p.id} className="border-2 border-on-background bg-surface-container-high px-4 py-2 text-lg font-bold">
                    {p.name}
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={hasMinigame ? handleStartMinigame : handleStartQuestions}
              disabled={loadingAction || Object.keys(players).length === 0}
              className="mt-xl border-4 border-on-background bg-primary px-12 py-4 font-headline text-2xl font-bold uppercase text-on-primary shadow-[8px_8px_0_0_#1d1c17] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#1d1c17] disabled:opacity-50"
            >
              Comenzar Partida
            </button>
          </div>
        )}

        {/* MINIGAME PHASE */}
        {gameState === 'MINIGAME' && (
          <div className="w-full max-w-4xl space-y-lg text-center">
            <h2 className="font-headline text-5xl font-bold uppercase text-[#be185d]">
              {miniGameTimeLeft && miniGameTimeLeft > 0 ? '¡Fase de Minijuego!' : '¡Tiempo Fuera!'}
            </h2>
            
            <div className="mx-auto flex h-48 w-48 items-center justify-center border-8 border-on-background bg-surface-container-lowest font-mono text-7xl font-bold text-on-surface shadow-[12px_12px_0_0_#1d1c17]">
              {miniGameTimeLeft}
            </div>

            {miniGameTimeLeft === 0 ? (
              <div className="animate-bounce mt-xl">
                <button 
                  onClick={handleStartQuestions}
                  disabled={loadingAction}
                  className="border-4 border-on-background bg-primary px-12 py-4 font-headline text-3xl font-bold uppercase text-on-primary shadow-[8px_8px_0_0_#1d1c17] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                >
                  Hora de las Preguntas
                </button>
              </div>
            ) : (
              <p className="text-xl text-on-surface-variant mt-sm animate-pulse">Los estudiantes están jugando en sus dispositivos...</p>
            )}

            {/* Live Minigame Ranking */}
            <div className="mt-xl text-left">
              <h3 className="mb-sm font-headline text-2xl font-bold uppercase">Puntos del Minijuego</h3>
              <div className="grid grid-cols-2 gap-sm">
                {liveRanking.slice(0, 10).map((p, i) => (
                  <div key={p.id} className="flex justify-between border-2 border-on-background bg-surface px-md py-sm">
                    <span className="font-bold">#{i + 1} {p.name}</span>
                    <span className="font-mono">{mode === 'DINERO' ? `$${p.money}` : `${p.score} pts`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PLAYING - SYNCHRONOUS NORMAL MODE */}
        {gameState === 'PLAYING' && mode === 'NORMAL' && currentQuestion && (
          <div className="w-full max-w-4xl space-y-lg">
            <div className="mb-xl text-center">
              <span className="text-xl font-bold uppercase text-on-surface-variant">Pregunta {currentQuestion.index + 1}</span>
              <h2 className="mt-sm border-4 border-on-background bg-surface-container-lowest p-lg font-headline text-4xl font-bold text-on-surface shadow-[8px_8px_0_0_#1d1c17] md:text-5xl">
                {currentQuestion.texto}
              </h2>
            </div>
            
            <div className="mt-xl grid grid-cols-2 gap-md">
              {currentQuestion.opciones.map((opt: string, i: number) => {
                const colors = ['bg-[#e21b3c]', 'bg-[#1368ce]', 'bg-[#d89e00]', 'bg-[#26890c]']; 
                return (
                  <div key={i} className={`${colors[i % 4]} flex min-h-[120px] items-center justify-center border-4 border-on-background p-lg text-white shadow-[6px_6px_0_0_#1d1c17]`}>
                    <span className="text-2xl font-bold">{opt}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-xl flex items-center justify-between border-t-4 border-on-background pt-md">
              <div className="font-mono text-2xl font-bold">
                Respuestas: {totalAnswered} / {Object.keys(players).length}
              </div>
              <button 
                onClick={handleStartQuestions}
                disabled={loadingAction}
                className="border-4 border-on-background bg-secondary px-8 py-3 text-xl font-bold uppercase text-on-secondary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              >
                Siguiente Pregunta
              </button>
            </div>
          </div>
        )}

        {/* PLAYING - ASYNCHRONOUS DINERO MODE */}
        {gameState === 'PLAYING' && mode === 'DINERO' && (
          <div className="w-full max-w-4xl space-y-lg text-center">
            <h2 className="mb-sm font-headline text-5xl font-bold text-tertiary">Progreso en Vivo</h2>
            <p className="text-xl text-on-surface-variant mb-xl">Los estudiantes responden a su propio ritmo. El juego terminará automáticamente.</p>
            
            <div className="flex flex-col gap-sm">
              {liveRanking.map((player, idx) => (
                <div key={player.id} className="flex items-center justify-between border-4 border-on-background bg-surface-container p-md shadow-[4px_4px_0_0_#1d1c17]">
                  <div className="flex items-center gap-md">
                    <span className="font-mono text-xl font-bold">#{idx + 1}</span>
                    <span className="text-xl font-bold">{player.name}</span>
                    {player.finished && <span className="ml-sm rounded bg-primary px-2 py-1 text-xs font-bold text-on-primary uppercase">¡Terminó!</span>}
                  </div>
                  <span className="font-mono text-3xl font-bold text-[#16a34a]">${player.money}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINISHED */}
        {gameState === 'FINISHED' && (
          <div className="w-full max-w-2xl space-y-lg text-center">
            <h2 className="mb-xl font-headline text-5xl font-bold text-primary">¡Partida Terminada!</h2>
            
            <div className="flex flex-col gap-sm">
              {ranking.map((player, idx) => (
                <div key={player.id} className={`flex items-center justify-between border-4 border-on-background p-md ${idx === 0 ? 'bg-tertiary-container text-2xl text-on-tertiary-container shadow-[8px_8px_0_0_#1d1c17]' : 'bg-surface-container text-xl text-on-surface shadow-[4px_4px_0_0_#1d1c17]'}`}>
                  <div className="flex items-center gap-md">
                    <span className="font-mono font-bold">#{idx + 1}</span>
                    <span className="font-bold">{player.name}</span>
                  </div>
                  <span className="font-mono font-bold">{mode === 'DINERO' ? `$${player.score}` : `${player.score} pts`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
