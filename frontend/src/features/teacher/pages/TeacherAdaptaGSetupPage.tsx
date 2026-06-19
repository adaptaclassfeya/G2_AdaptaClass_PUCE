import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeacherShell } from '../components/TeacherShell';
import api from '../../../services/api';
import { adaptaGService } from '../../games/services/adapta-g.service';
import { routePaths } from '../../../app/router/routePaths';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { useParalelos } from '../hooks/useParalelos';
import { studentGamesService } from '../../student/services/student.service';
import type { StudentGame } from '../../student/types/student.types';

interface BankQuestion {
  id: string;
  paralelo_id: string | null;
}

// Sentinel for the "General" paralelo filter: matches questions with no
// paralelo assigned (paralelo_id === null).
const GENERAL = '';

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(value, max));
};

export function TeacherAdaptaGSetupPage() {
  const navigate = useNavigate();
  const { paralelos } = useParalelos();

  const [allQuestions, setAllQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Paralelo scope for the question pool. Drives the available count.
  const [filterParaleloId, setFilterParaleloId] = useState<string>(GENERAL);

  const [selectedCount, setSelectedCount] = useState(5);
  const [mode, setMode] = useState<'NORMAL' | 'DINERO'>('NORMAL');

  const [gamesCatalog, setGamesCatalog] = useState<StudentGame[]>([]);
  const [selectedGameRoute, setSelectedGameRoute] = useState<string>('');
  const [miniGameDuration, setMiniGameDuration] = useState(30);

  // When a minigame is selected the teacher can push some bank questions into
  // the game itself. Off by default: students play the arcade game with no
  // questions on screen and only see them in the kahoot round.
  const [questionsInGame, setQuestionsInGame] = useState(false);
  const [gameQuestionCount, setGameQuestionCount] = useState(0);
  const [kahootQuestionCount, setKahootQuestionCount] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<BankQuestion[]>('/questions'),
      studentGamesService.getAvailableGames(),
    ])
      .then(([questionsRes, gamesData]) => {
        setAllQuestions(questionsRes.data);
        setGamesCatalog(gamesData);
        // Seed the partida size from the default "General" pool.
        const generalCount = questionsRes.data.filter((q) => q.paralelo_id == null).length;
        setSelectedCount(generalCount === 0 ? 0 : Math.min(10, generalCount));
        setLoading(false);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Error al cargar datos iniciales'));
        setLoading(false);
      });
  }, []);

  // Questions available for a paralelo (exact match, mirroring the Bank page
  // filter). "General" keeps only the unassigned ones.
  const countForParalelo = (id: string) =>
    allQuestions.filter((q) => (id === GENERAL ? q.paralelo_id == null : q.paralelo_id === id)).length;

  const availableCount = countForParalelo(filterParaleloId);
  const hasGame = selectedGameRoute !== '';
  const splitEnabled = hasGame && questionsInGame;
  const splitTotal = gameQuestionCount + kahootQuestionCount;
  const splitInvalid = splitEnabled && (splitTotal < 1 || splitTotal > selectedCount);

  // All re-clamping happens in event handlers (not effects) so the partida
  // size and the game/kahoot split always stay within the available pool.
  const handleFilterChange = (id: string) => {
    const newAvail = countForParalelo(id);
    const nextCount = clamp(selectedCount || Math.min(10, newAvail), newAvail === 0 ? 0 : 1, newAvail);
    setFilterParaleloId(id);
    setSelectedCount(nextCount);
    setGameQuestionCount((g) => clamp(g, 0, nextCount));
    setKahootQuestionCount((k) => clamp(k, 0, nextCount));
  };

  const handleSelectedCountChange = (raw: number) => {
    const next = clamp(raw, 1, availableCount);
    setSelectedCount(next);
    setGameQuestionCount((g) => clamp(g, 0, next));
    setKahootQuestionCount((k) => clamp(k, 0, next));
  };

  const handleGameSelect = (route: string) => {
    setSelectedGameRoute(route);
    if (route === '') setQuestionsInGame(false);
  };

  const handleToggleQuestionsInGame = () => {
    const next = !questionsInGame;
    setQuestionsInGame(next);
    if (next) {
      const half = Math.floor(selectedCount / 2);
      setGameQuestionCount(half);
      setKahootQuestionCount(selectedCount - half);
    }
  };

  const canStart =
    !creating &&
    availableCount > 0 &&
    selectedCount >= 1 &&
    selectedCount <= availableCount &&
    !splitInvalid;

  const handleStart = async () => {
    if (!canStart) return;
    setCreating(true);
    setError(null);
    try {
      const res = await adaptaGService.createRoom({
        questionCount: splitEnabled ? kahootQuestionCount : selectedCount,
        mode,
        miniGameRoute: selectedGameRoute || undefined,
        miniGameDuration: hasGame ? miniGameDuration : undefined,
        paraleloId: filterParaleloId || undefined,
        gameQuestionCount: splitEnabled ? gameQuestionCount : 0,
      });
      navigate(routePaths.teacherAdaptaGHost.replace(':pin', res.data.pin));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo crear la sala.'));
      setCreating(false);
    }
  };

  return (
    <TeacherShell title="Adapta - G Setup">
      <div className="mx-auto mt-lg max-w-[36rem] border-4 border-on-background bg-surface-container-lowest p-lg shadow-[8px_8px_0_0_#1d1c17]">
        <h2 className="mb-md font-headline text-2xl font-bold uppercase text-primary">Nueva Partida Adapta - G</h2>

        {loading ? (
          <p>Cargando banco de preguntas...</p>
        ) : error && allQuestions.length === 0 ? (
          <p className="font-bold text-error">{error}</p>
        ) : (
          <div className="space-y-md">
            {/* Paralelo filter — scopes the available question pool */}
            <div className="flex flex-col gap-2">
              <label htmlFor="paralelo" className="text-sm font-bold uppercase">
                Filtrar preguntas por paralelo
              </label>
              <select
                id="paralelo"
                value={filterParaleloId}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full border-4 border-on-background bg-surface p-sm font-bold outline-none focus:border-primary"
              >
                <option value={GENERAL}>General (sin paralelo)</option>
                {paralelos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            {availableCount === 0 ? (
              <p className="border-4 border-on-background bg-error-container p-md font-bold text-on-error-container">
                No hay preguntas en «
                {filterParaleloId === GENERAL
                  ? 'General'
                  : (paralelos.find((p) => p.id === filterParaleloId)?.nombre ?? 'este paralelo')}
                ». Elige otro paralelo o agrega preguntas en el Generador.
              </p>
            ) : (
              <>
                <p className="text-lg">
                  Tienes <strong className="text-xl">{availableCount}</strong>{' '}
                  {availableCount === 1 ? 'pregunta disponible' : 'preguntas disponibles'} para este paralelo.
                </p>

                <div className="flex flex-col gap-2">
                  <label htmlFor="qcount" className="text-sm font-bold uppercase">
                    ¿Cuántas preguntas quieres en esta partida?
                  </label>
                  <input
                    id="qcount"
                    type="number"
                    min={1}
                    max={availableCount}
                    value={selectedCount}
                    onChange={(e) => handleSelectedCountChange(parseInt(e.target.value, 10))}
                    className="w-full border-4 border-on-background bg-surface p-sm font-mono text-xl font-bold outline-none focus:border-primary"
                  />
                  <p className="text-xs text-on-surface-variant">Máximo {availableCount} (las que tienes en el banco).</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold uppercase">Modo de Juego</label>
                  <div className="flex gap-sm">
                    <button
                      onClick={() => setMode('NORMAL')}
                      className={`flex-1 border-4 border-on-background py-sm font-bold uppercase transition-all ${mode === 'NORMAL' ? 'bg-primary text-on-primary shadow-[4px_4px_0_0_#1d1c17]' : 'bg-surface text-on-surface hover:bg-surface-container-highest'}`}
                    >
                      Síncrono (Puntos)
                    </button>
                    <button
                      onClick={() => setMode('DINERO')}
                      className={`flex-1 border-4 border-on-background py-sm font-bold uppercase transition-all ${mode === 'DINERO' ? 'bg-tertiary text-on-tertiary shadow-[4px_4px_0_0_#1d1c17]' : 'bg-surface text-on-surface hover:bg-surface-container-highest'}`}
                    >
                      Asíncrono (Dinero)
                    </button>
                  </div>
                </div>

                <div className="mt-lg border-4 border-on-background bg-[#ffe4e6] p-md shadow-[4px_4px_0_0_#1d1c17]">
                  <div className="flex items-center gap-sm mb-md text-[#be185d]">
                    <span className="material-symbols-outlined text-3xl">videogame_asset</span>
                    <h3 className="font-headline text-xl font-bold uppercase">Agregar Minijuego (Opcional)</h3>
                  </div>
                  <p className="mb-sm text-sm text-[#9d174d]">
                    Los estudiantes jugarán esto antes de empezar las preguntas y ganarán puntos base.
                  </p>

                  <div className="space-y-sm">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="gameRoute" className="text-xs font-bold uppercase text-[#9d174d]">Juego</label>
                      <select
                        id="gameRoute"
                        value={selectedGameRoute}
                        onChange={(e) => handleGameSelect(e.target.value)}
                        className="w-full border-4 border-[#be185d] bg-white p-sm font-bold text-[#be185d] outline-none"
                      >
                        <option value="">Ninguno</option>
                        {gamesCatalog.map((g) => (
                          <option key={g.id} value={g.route}>{g.title}</option>
                        ))}
                      </select>
                    </div>

                    {hasGame && (
                      <div className="flex flex-col gap-1">
                        <label htmlFor="duration" className="text-xs font-bold uppercase text-[#9d174d]">Duración (Segundos)</label>
                        <input
                          id="duration"
                          type="number"
                          min={10}
                          max={60}
                          value={miniGameDuration}
                          onChange={(e) => setMiniGameDuration(clamp(parseInt(e.target.value, 10), 10, 60))}
                          className="w-full border-4 border-[#be185d] bg-white p-sm font-mono text-xl font-bold text-[#be185d] outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Questions-in-game toggle — only when a minigame is selected */}
                {hasGame && (
                  <div className="border-4 border-on-background bg-[#dbeafe] p-md shadow-[4px_4px_0_0_#1d1c17]">
                    <div className="flex items-center justify-between gap-md">
                      <div>
                        <h3 className="font-headline text-lg font-bold uppercase text-[#1e3a8a]">
                          Habilitar preguntas para el juego
                        </h3>
                        <p className="mt-xs text-xs text-[#1d4ed8]">
                          Muestra algunas preguntas dentro del minijuego. El resto van al kahoot.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={questionsInGame}
                        aria-label="Habilitar preguntas para el juego"
                        onClick={handleToggleQuestionsInGame}
                        className="relative h-9 w-16 shrink-0 border-2 border-on-background shadow-[2px_2px_0_0_#1d1c17] transition-colors"
                        style={{ backgroundColor: questionsInGame ? '#93c5fd' : '#e5e7eb' }}
                      >
                        <span
                          className="absolute top-0.5 h-7 w-7 border-2 border-on-background bg-white transition-all"
                          style={{ left: questionsInGame ? '30px' : '2px' }}
                        />
                      </button>
                    </div>

                    {splitEnabled && (
                      <div className="mt-md grid grid-cols-2 gap-sm border-t-2 border-[#1e3a8a]/30 pt-md">
                        <div className="flex flex-col gap-1">
                          <label htmlFor="gameQ" className="text-xs font-bold uppercase text-[#1e3a8a]">
                            Preguntas en el juego
                          </label>
                          <input
                            id="gameQ"
                            type="number"
                            min={0}
                            max={selectedCount}
                            value={gameQuestionCount}
                            onChange={(e) =>
                              setGameQuestionCount(clamp(parseInt(e.target.value, 10), 0, selectedCount))
                            }
                            className="w-full border-4 border-[#1e3a8a] bg-white p-sm font-mono text-xl font-bold text-[#1e3a8a] outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="kahootQ" className="text-xs font-bold uppercase text-[#1e3a8a]">
                            Preguntas en el kahoot
                          </label>
                          <input
                            id="kahootQ"
                            type="number"
                            min={0}
                            max={selectedCount}
                            value={kahootQuestionCount}
                            onChange={(e) =>
                              setKahootQuestionCount(clamp(parseInt(e.target.value, 10), 0, selectedCount))
                            }
                            className="w-full border-4 border-[#1e3a8a] bg-white p-sm font-mono text-xl font-bold text-[#1e3a8a] outline-none"
                          />
                        </div>
                        <p
                          className={`col-span-2 text-xs font-bold ${splitInvalid ? 'text-error' : 'text-[#1d4ed8]'}`}
                        >
                          {splitTotal} de {selectedCount} preguntas asignadas
                          {splitInvalid
                            ? splitTotal > selectedCount
                              ? ' — la suma no puede superar el total de la partida.'
                              : ' — asigna al menos 1 pregunta.'
                            : '.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {error && <p className="font-bold text-error">{error}</p>}

                <button
                  onClick={handleStart}
                  disabled={!canStart}
                  className="mt-xl w-full border-4 border-on-background bg-primary p-md font-headline text-xl font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
                >
                  {creating ? 'Creando sala...' : 'Iniciar Actividad'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
