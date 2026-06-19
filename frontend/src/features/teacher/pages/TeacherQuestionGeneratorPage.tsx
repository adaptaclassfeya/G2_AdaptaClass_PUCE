import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { QuestionGenerationForm } from '../components/QuestionGenerationForm';
import { QuestionPreview } from '../components/QuestionPreview';
import { TeacherShell } from '../components/TeacherShell';
import { aiService, type GeneratedQuestionPreview } from '../services/ai.service';
import { ManualQuestionForm } from '../components/ManualQuestionForm';
import { useParalelos } from '../hooks/useParalelos';

type Banner = { kind: 'success' | 'error'; message: string } | null;

export function TeacherQuestionGeneratorPage() {
  const [questions, setQuestions] = useState<GeneratedQuestionPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [selectedParaleloId, setSelectedParaleloId] = useState<string | null>(null);
  const [selectedTema, setSelectedTema] = useState<string | null>(null);

  const [existingTemas, setExistingTemas] = useState<string[]>([]);
  const { paralelos } = useParalelos();

  useEffect(() => {
    api.get<string[]>('/temas')
      .then(res => setExistingTemas(res.data))
      .catch(err => console.error('Failed to fetch temas:', err));
  }, []);

  const handleGenerate = async (formData: FormData) => {
    setBanner(null);
    setIsLoading(true);
    setSourceId(null);
    setSelectedParaleloId(formData.get('paralelo_id') as string | null);
    setSelectedTema(formData.get('tema') as string | null);
    try {
      const response = await aiService.generateQuestions(formData);
      setQuestions(response.questions);
      setSourceId(response.source_id);
      if (response.cached) {
        setBanner({ kind: 'success', message: 'Se recuperaron preguntas pre-generadas en caché para este documento.' });
      }
    } catch (error: unknown) {
      console.error('Error generating questions', error);
      setBanner({
        kind: 'error',
        message: getApiErrorMessage(error, 'Hubo un error al generar las preguntas.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setBanner(null);
    try {
      await aiService.saveQuestions({
        source_id: sourceId,
        questions,
        paralelo_id: selectedParaleloId || undefined,
        tema: selectedTema || 'General',
      });
      setBanner({ kind: 'success', message: 'Preguntas guardadas exitosamente en tu banco global.' });
      setQuestions([]);
      setSourceId(null);
      setSelectedParaleloId(null);
      setSelectedTema(null);
    } catch (error: unknown) {
      console.error('Error saving questions', error);
      setBanner({
        kind: 'error',
        message: getApiErrorMessage(error, 'Hubo un error al guardar las preguntas.'),
      });
    }
  };

  const handleSaveManual = async (
    manualQuestions: { texto: string; opciones: [string, string, string, string]; respuestaCorrecta: number }[],
    tema: string,
    paraleloId?: string
  ) => {
    setBanner(null);
    try {
      await aiService.saveQuestions({
        source_id: null,
        questions: manualQuestions,
        paralelo_id: paraleloId,
        tema: tema || 'General',
      });
      setBanner({ kind: 'success', message: 'Preguntas manuales añadidas exitosamente al banco.' });
    } catch (error: unknown) {
      console.error('Error saving manual questions', error);
      setBanner({
        kind: 'error',
        message: getApiErrorMessage(error, 'Hubo un error al guardar las preguntas manuales.'),
      });
    }
  };

  return (
    <TeacherShell title="Generador de Preguntas">
      {banner && (
        <div
          className={[
            'mb-md border-4 border-on-background p-md shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]',
            banner.kind === 'success'
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-error-container text-on-error-container',
          ].join(' ')}
          role="status"
        >
          {banner.message}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-lg md:grid-cols-3">
        <QuestionGenerationForm
          onSubmit={handleGenerate}
          isLoading={isLoading}
          paralelos={paralelos}
          existingTemas={existingTemas}
        />
        <QuestionPreview
          questions={questions}
          onSave={handleSave}
          onQuestionsChange={setQuestions}
        />
      </div>

      <div className="mt-xl">
        <ManualQuestionForm
          onSave={handleSaveManual}
          paralelos={paralelos}
          existingTemas={existingTemas}
        />
      </div>
    </TeacherShell>
  );
}
