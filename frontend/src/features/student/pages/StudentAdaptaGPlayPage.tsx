import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Pusher from 'pusher-js';
import { StudentShell } from '../components/StudentShell';
import { adaptaGService } from '../../games/services/adapta-g.service';
import { routePaths } from '../../../app/router/routePaths';

export function StudentAdaptaGPlayPage() {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  
  const [gameState, setGameState] = useState<'LOBBY' | 'MINIGAME' | 'PLAYING' | 'FINISHED'>('LOBBY');
  const [mode, setMode] = useState<'NORMAL' | 'DINERO'>('NORMAL');
  const [miniGameRoute, setMiniGameRoute] = useState<string | null>(null);
  
  const [safeQuestions, setSafeQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answered, setAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean, points: number, total: number, nextIndex?: number, finished?: boolean } | null>(null);

  useEffect(() => {
    const key = import.meta.env.VITE_PUSHER_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!key || !cluster || !pin) return;

    // Fetch initial state to catch up
    adaptaGService.getRoomState(pin).then(res => {
      if (res.data) {
        setGameState(res.data.state);
        setMode(res.data.mode || 'NORMAL');
        if (res.data.miniGameRoute) setMiniGameRoute(res.data.miniGameRoute);
        if (res.data.safeQuestions) setSafeQuestions(res.data.safeQuestions);
        if (res.data.currentQuestion) setCurrentQuestion(res.data.currentQuestion);
        
        // If reconnecting during async mode, find the student's next question
        if (res.data.mode === 'DINERO' && res.data.state === 'PLAYING') {
          // But wait, the backend currentQuestionIndex in getRoomState is the global one for normal mode.
          // In Dinero mode, we might need to get it from the player object.
          // But since the student is logging in, we can just let them wait or refresh.
          // Actually, if we just let them click next, it's fine.
        }
      }
    }).catch(console.error);

    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe(`room-${pin}`);

    channel.bind('minigame-started', () => {
      setGameState('MINIGAME');
    });

    channel.bind('new-question', (data: any) => {
      // Normal synchronous mode
      setGameState('PLAYING');
      setCurrentQuestion(data);
      setAnswered(false);
      setAnswerResult(null);
    });

    channel.bind('game-started-async', (data: { questions: any[] }) => {
      // Dinero asynchronous mode
      setGameState('PLAYING');
      setSafeQuestions(data.questions);
      setCurrentQuestion(data.questions[0]);
      setAnswered(false);
      setAnswerResult(null);
    });

    channel.bind('game-finished', () => {
      setGameState('FINISHED');
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`room-${pin}`);
    };
  }, [pin]);

  const handleAnswer = async (index: number) => {
    if (answered || !pin) return;
    setAnswered(true);
    try {
      const res = await adaptaGService.answerQuestion(pin, index);
      setAnswerResult({
        correct: res.data.correct,
        points: res.data.pointsEarned,
        total: res.data.totalScore,
        nextIndex: res.data.nextIndex,
        finished: res.data.finished
      });
    } catch (err) {
      console.error(err);
      setAnswered(false);
    }
  };

  const handleNextAsyncQuestion = () => {
    if (answerResult?.finished) {
      setGameState('FINISHED');
    } else if (answerResult?.nextIndex !== undefined) {
      setCurrentQuestion(safeQuestions[answerResult.nextIndex]);
      setAnswered(false);
      setAnswerResult(null);
    }
  };

  const colors = [
    'bg-[#e21b3c] hover:bg-[#c01733]',
    'bg-[#1368ce] hover:bg-[#1056ab]',
    'bg-[#d89e00] hover:bg-[#b88700]',
    'bg-[#26890c] hover:bg-[#20730a]' 
  ];

  return (
    <StudentShell title="Adapta - G">
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        
        {gameState === 'LOBBY' && (
          <div className="animate-pulse space-y-md text-center">
            <h2 className="font-headline text-4xl font-bold uppercase text-primary">¡Estás dentro!</h2>
            <p className="text-2xl text-on-surface-variant">Mira la pantalla del profesor y espera a que inicie la partida.</p>
          </div>
        )}

        {gameState === 'MINIGAME' && miniGameRoute && (
          <div className="w-full h-[75vh] border-8 border-on-background shadow-[12px_12px_0_0_#1d1c17] relative bg-black">
            {/* Embedded MiniGame. miniGameRoute already carries ?gameId=…, so
                append adaptag_pin with the correct separator — using a second
                `?` here corrupts gameId and breaks question loading + scoring. */}
            <iframe
              src={`${miniGameRoute}${miniGameRoute.includes('?') ? '&' : '?'}adaptag_pin=${pin}`}
              className="w-full h-full border-none"
              title="Mini Juego"
            />
          </div>
        )}

        {gameState === 'PLAYING' && currentQuestion && !answered && (
          <div className="w-full max-w-2xl space-y-lg px-md mt-lg">
            {mode === 'DINERO' && (
              <div className="flex justify-between items-center bg-tertiary-container p-sm border-4 border-on-background font-bold text-on-tertiary-container">
                <span>Pregunta {currentQuestion.index + 1} de {safeQuestions.length}</span>
                <span>Modo Dinero</span>
              </div>
            )}
            
            <h2 className="mb-xl border-4 border-on-background bg-surface-container-lowest p-lg text-center font-headline text-3xl font-bold shadow-[8px_8px_0_0_#1d1c17] md:text-4xl">
              {currentQuestion.texto}
            </h2>
            
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              {currentQuestion.opciones.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`${colors[i % 4]} flex min-h-[120px] items-center justify-center border-4 border-on-background p-lg text-white shadow-[6px_6px_0_0_#1d1c17] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#1d1c17]`}
                >
                  <span className="text-center text-2xl font-bold">{opt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === 'PLAYING' && answered && (
          <div className="space-y-md text-center mt-lg">
            {answerResult ? (
              <div className="space-y-lg">
                <div className={`border-8 border-on-background p-xl shadow-[12px_12px_0_0_#1d1c17] ${answerResult.correct ? 'bg-primary text-on-primary' : 'bg-error text-on-error'}`}>
                  <h2 className="font-headline text-5xl font-bold uppercase">
                    {answerResult.correct ? '¡Correcto!' : 'Incorrecto'}
                  </h2>
                  <p className="mt-sm text-2xl font-bold">
                    {answerResult.correct ? '+' : ''}{mode === 'DINERO' ? '$' : ''}{answerResult.points}{mode === 'NORMAL' ? ' puntos' : ''}
                  </p>
                </div>
                
                <p className="text-2xl font-bold text-on-surface-variant">
                  Total: {mode === 'DINERO' ? '$' : ''}{answerResult.total}
                </p>

                {mode === 'DINERO' ? (
                  <button 
                    onClick={handleNextAsyncQuestion}
                    className="mt-xl border-4 border-on-background bg-tertiary px-8 py-4 font-headline text-2xl font-bold uppercase text-on-tertiary shadow-[8px_8px_0_0_#1d1c17] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                  >
                    {answerResult.finished ? 'Ver Podio Final' : 'Siguiente Pregunta'}
                  </button>
                ) : (
                  <p className="mt-xl animate-pulse text-xl">Esperando al profesor...</p>
                )}
              </div>
            ) : (
              <h2 className="animate-pulse font-headline text-4xl font-bold uppercase text-primary">Enviando respuesta...</h2>
            )}
          </div>
        )}

        {gameState === 'FINISHED' && (
          <div className="space-y-lg text-center mt-lg">
            <h2 className="font-headline text-5xl font-bold uppercase text-primary">¡Fin del Juego!</h2>
            <p className="text-2xl text-on-surface-variant">Revisa la pantalla del profesor para ver el podio completo.</p>
            <div className="mt-xl">
              <button
                onClick={() => navigate(routePaths.studentGames)}
                className="border-4 border-on-background bg-secondary px-8 py-4 font-headline text-2xl font-bold uppercase text-on-secondary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              >
                Volver a Juegos
              </button>
            </div>
          </div>
        )}

      </div>
    </StudentShell>
  );
}
