import { useEffect, useState, useCallback, useMemo } from 'react';
import { TeacherShell } from '../components/TeacherShell';
import { useParalelos } from '../hooks/useParalelos';
import api from '../../../services/api';
import { getApiErrorMessage } from '../../../lib/httpErrors';

interface QuestionSource {
  id: string;
  filename: string;
  source_hash: string;
  tema: string; // legacy classification tag (kept on the wire, hidden in UI)
  paralelo_id: string | null;
  created_at: string;
  _count: {
    questions: number;
  };
}

interface Question {
  id: string;
  texto: string;
  opciones: string[];
  respuesta_correcta: string;
  tema: string;
  paralelo_id: string | null;
  created_at: string;
}

// Sentinel value for the "General" filter option: matches items with no
// paralelo assigned (paralelo_id === null). Real paralelos use their uuid.
const GENERAL = '';

export function TeacherBankPage() {
  const [activeTab, setActiveTab] = useState<'sources' | 'questions'>('sources');

  // Shared paralelo filter for both tabs. Defaults to "General", which shows
  // the unassigned (global) documents/questions. Picking a paralelo narrows
  // the view to that classroom's assigned items.
  const [filterParaleloId, setFilterParaleloId] = useState<string>(GENERAL);
  const [filterTema, setFilterTema] = useState<string>(GENERAL);
  const { paralelos } = useParalelos();

  // Question sources (uploaded documents) state
  const [sources, setSources] = useState<QuestionSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  // Individual questions state. No more `tema` filter — the bank is now
  // global per teacher; every question feeds every game.
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    setSourcesError(null);
    try {
      const res = await api.get<QuestionSource[]>('/question-sources');
      setSources(res.data);
    } catch (err) {
      setSourcesError(getApiErrorMessage(err, 'Error al cargar el historial de documentos.'));
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    try {
      const res = await api.get<Question[]>('/questions');
      setQuestions(res.data);
    } catch (err) {
      setQuestionsError(getApiErrorMessage(err, 'Error al cargar el banco de preguntas.'));
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      if (activeTab === 'sources') {
        fetchSources();
      } else {
        fetchQuestions();
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeTab, fetchSources, fetchQuestions]);

  // Client-side filtering
  const matchesFilter = useCallback(
    (paraleloId: string | null, tema: string) => {
      const matchParalelo = filterParaleloId === GENERAL ? paraleloId == null : paraleloId === filterParaleloId;
      const matchTema = filterTema === GENERAL ? true : tema === filterTema;
      return matchParalelo && matchTema;
    },
    [filterParaleloId, filterTema],
  );

  const uniqueTemas = useMemo(() => {
    const temas = new Set<string>();
    sources.forEach((s) => s.tema && temas.add(s.tema));
    questions.forEach((q) => q.tema && temas.add(q.tema));
    return Array.from(temas).sort();
  }, [sources, questions]);

  const filteredSources = useMemo(
    () => sources.filter((s) => matchesFilter(s.paralelo_id, s.tema)),
    [sources, matchesFilter],
  );
  const filteredQuestions = useMemo(
    () => questions.filter((q) => matchesFilter(q.paralelo_id, q.tema)),
    [questions, matchesFilter],
  );

  const scopeLabel =
    filterParaleloId === GENERAL
      ? 'General'
      : (paralelos.find((p) => p.id === filterParaleloId)?.nombre ?? 'este paralelo');

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta pregunta del banco?')) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.delete(`/questions/${qId}`);
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      setActionSuccess('Pregunta eliminada del banco exitosamente.');
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'No se pudo eliminar la pregunta.'));
    }
  };

  const filteredCount = activeTab === 'sources' ? filteredSources.length : filteredQuestions.length;
  const filteredNoun =
    activeTab === 'sources'
      ? filteredCount === 1
        ? 'documento'
        : 'documentos'
      : filteredCount === 1
        ? 'pregunta'
        : 'preguntas';

  return (
    <TeacherShell title="Banco de Preguntas">
      <section className="mb-lg border-b-4 border-on-background pb-md">
        <h2 className="font-headline text-2xl font-bold uppercase tracking-normal md:text-5xl">
          Banco de Preguntas
        </h2>
        <p className="mt-xs max-w-3xl text-sm leading-relaxed text-on-surface-variant md:text-lg">
          Gestiona los documentos que has subido y consulta o elimina preguntas de tu banco. Las
          preguntas guardadas aquí se usan en <strong>todos los juegos</strong> que jueguen tus
          estudiantes.
        </p>
      </section>

      {actionSuccess && (
        <div className="mb-md border-4 border-on-background bg-primary-container p-md text-on-primary-container shadow-[4px_4px_0_0_#1d1c17]">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="mb-md border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17]">
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-lg flex border-b-4 border-on-background">
        <button
          onClick={() => setActiveTab('sources')}
          className={[
            'select-none border-x-4 border-t-4 border-transparent -mb-1 px-6 py-3 font-headline font-bold uppercase transition-all',
            activeTab === 'sources'
              ? 'translate-y-0.5 border-on-background border-t-primary bg-surface text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
          ].join(' ')}
        >
          Documentos Base ({sources.length})
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={[
            'select-none border-x-4 border-t-4 border-transparent -mb-1 px-6 py-3 font-headline font-bold uppercase transition-all',
            activeTab === 'questions'
              ? 'translate-y-0.5 border-on-background border-t-primary bg-surface text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
          ].join(' ')}
        >
          Preguntas Individuales ({questions.length})
        </button>
      </div>

      <div className="grid items-start gap-lg lg:grid-cols-[260px_1fr]">
        {/* Left filter column — shared across both tabs */}
        <aside className="self-start border-4 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17] lg:sticky lg:top-6">
          <h3 className="font-headline text-lg font-bold uppercase text-primary">
            Filtrar por paralelo
          </h3>
          <p className="mt-xs text-xs text-on-surface-variant">
            Elige un paralelo para ver solo sus elementos asignados. «General» muestra los que no
            están asignados a ningún paralelo.
          </p>
          <label className="mt-md flex flex-col gap-sm text-sm font-bold uppercase">
            Paralelo
            <select
              className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              value={filterParaleloId}
              onChange={(e) => setFilterParaleloId(e.target.value)}
            >
              <option value={GENERAL}>General</option>
              {paralelos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-md flex flex-col gap-sm text-sm font-bold uppercase">
            Tema
            <select
              className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              value={filterTema}
              onChange={(e) => setFilterTema(e.target.value)}
            >
              <option value={GENERAL}>Todos los temas</option>
              {uniqueTemas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-md border-t-2 border-on-background pt-md font-mono text-xs uppercase text-on-surface-variant">
            {filteredCount} {filteredNoun} en «{scopeLabel}»
          </p>
        </aside>

        {/* Right content column */}
        <div className="min-w-0">
          {activeTab === 'sources' ? (
            <div className="space-y-4">
              {sourcesLoading ? (
                <div className="border-4 border-on-background bg-surface-container-lowest p-lg text-center shadow-[4px_4px_0_0_#1d1c17]">
                  Cargando historial de documentos...
                </div>
              ) : sourcesError ? (
                <div className="border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17]">
                  {sourcesError}
                </div>
              ) : sources.length === 0 ? (
                <div className="border-4 border-dashed border-on-background bg-surface-container-lowest p-lg text-center text-on-surface-variant">
                  Aún no has subido ningún documento. Usa el Generador de Preguntas IA para cargar tu
                  primer archivo.
                </div>
              ) : filteredSources.length === 0 ? (
                <div className="border-4 border-dashed border-on-background bg-surface-container-lowest p-lg text-center text-on-surface-variant">
                  No hay documentos base en «{scopeLabel}». Cambia el filtro de paralelo para ver
                  otros.
                </div>
              ) : (
                <div className="grid gap-md md:grid-cols-2">
                  {filteredSources.map((source) => (
                    <article
                      key={source.id}
                      className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17]"
                    >
                      <div className="flex items-start justify-between gap-sm">
                        <h4 className="break-all font-headline text-xl font-bold uppercase text-primary">
                          {source.filename}
                        </h4>
                        <span className="shrink-0 border-2 border-on-background bg-secondary-container px-2 py-1 text-xs font-bold uppercase text-on-secondary-container">
                          {source._count.questions} preguntas
                        </span>
                      </div>

                      <p className="mt-md truncate font-mono text-xs text-on-surface-variant">
                        Hash: {source.source_hash}
                      </p>
                      <p className="mt-xs text-xs text-on-surface-variant">
                        Subido el: {new Date(source.created_at).toLocaleDateString()}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {questionsLoading ? (
                <div className="border-4 border-on-background bg-surface-container-lowest p-lg text-center shadow-[4px_4px_0_0_#1d1c17]">
                  Cargando banco de preguntas...
                </div>
              ) : questionsError ? (
                <div className="border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17]">
                  {questionsError}
                </div>
              ) : questions.length === 0 ? (
                <div className="border-4 border-dashed border-on-background bg-surface-container-lowest p-lg text-center text-on-surface-variant">
                  Aún no tienes preguntas en tu banco. Súbelas con el Generador de Preguntas IA o
                  agrégalas manualmente.
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="border-4 border-dashed border-on-background bg-surface-container-lowest p-lg text-center text-on-surface-variant">
                  No hay preguntas en «{scopeLabel}». Cambia el filtro de paralelo para ver otras.
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="font-mono text-xs uppercase text-on-surface-variant">
                    {filteredQuestions.length}{' '}
                    {filteredQuestions.length === 1 ? 'pregunta' : 'preguntas'} en «{scopeLabel}»
                  </p>
                  {filteredQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="relative flex flex-col items-start justify-between gap-md border-4 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17] md:flex-row md:items-center"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-sm">
                          <span className="bg-on-background px-2 py-0.5 text-xs font-bold text-surface">
                            Q{idx + 1}
                          </span>
                          <p className="text-lg font-bold text-on-surface">{q.texto}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-sm pl-6 text-sm sm:grid-cols-2">
                          {q.opciones.map((opt, oIdx) => {
                            const isCorrect = opt === q.respuesta_correcta;
                            return (
                              <div
                                key={oIdx}
                                className={[
                                  'border-2 px-3 py-1.5',
                                  isCorrect
                                    ? 'border-primary bg-primary-container font-semibold text-on-primary-container'
                                    : 'border-on-background/20 bg-surface text-on-surface-variant',
                                ].join(' ')}
                              >
                                <span className="mr-1.5 font-bold">
                                  {String.fromCharCode(65 + oIdx)})
                                </span>
                                {opt}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="shrink-0 border-2 border-error bg-error-container px-3 py-1.5 text-xs font-bold uppercase text-on-error-container shadow-[2px_2px_0_0_#1d1c17] transition-colors hover:bg-error hover:text-white"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TeacherShell>
  );
}
