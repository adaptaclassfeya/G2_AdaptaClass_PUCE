import { useState } from 'react';

// `id` is optional because freshly generated questions (from
// /ai/generate-questions) don't have one yet — it's only assigned when
// the teacher saves them to the bank. The shape mirrors the shared
// `GeneratedQuestionPreview` from ai.service.ts, plus an optional id
// for rows that already exist server-side.
interface GeneratedQuestionPreview {
  id?: string;
  texto: string;
  opciones: string[];
  respuestaCorrecta: number;
}

interface QuestionPreviewProps {
  questions?: GeneratedQuestionPreview[];
  onSave?: () => void;
  onQuestionsChange?: (updated: GeneratedQuestionPreview[]) => void;
}

interface EditState {
  texto: string;
  opciones: string[];
  respuestaCorrecta: number;
}

function QuestionCard({
  question,
  index,
  onChange,
}: {
  question: GeneratedQuestionPreview;
  index: number;
  onChange: (updated: GeneratedQuestionPreview) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditState>({
    texto: question.texto,
    opciones: [...question.opciones],
    respuestaCorrecta: question.respuestaCorrecta,
  });

  const handleConfirm = () => {
    onChange({ ...question, ...draft });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({
      texto: question.texto,
      opciones: [...question.opciones],
      respuestaCorrecta: question.respuestaCorrecta,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-sm border-2 border-primary bg-surface-container-low p-md shadow-[2px_2px_0_0_var(--color-primary)]">
        <p className="text-xs font-bold uppercase text-primary">Editando pregunta {index + 1}</p>

        {/* Question text */}
        <textarea
          className="w-full rounded-none border-2 border-on-background bg-surface p-2 font-headline text-base font-bold shadow-[2px_2px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          rows={2}
          value={draft.texto}
          onChange={(e) => setDraft((d) => ({ ...d, texto: e.target.value }))}
        />

        {/* Options */}
        <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
          {draft.opciones.map((opt, i) => (
            <div key={i} className="flex items-center gap-xs">
              <button
                type="button"
                title="Marcar como correcta"
                onClick={() => setDraft((d) => ({ ...d, respuestaCorrecta: i }))}
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center border-2 font-bold text-sm transition-colors',
                  draft.respuestaCorrecta === i
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface text-on-surface-variant hover:border-primary',
                ].join(' ')}
              >
                {String.fromCharCode(65 + i)}
              </button>
              <input
                className="w-full rounded-none border-2 border-on-background bg-surface p-1.5 text-sm shadow-[2px_2px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
                value={opt}
                onChange={(e) => {
                  const next = [...draft.opciones];
                  next[i] = e.target.value;
                  setDraft((d) => ({ ...d, opciones: next }));
                }}
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-on-surface-variant">
          Haz clic en la letra para marcar la opción correcta.
        </p>

        {/* Actions */}
        <div className="flex gap-sm">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-xs border-2 border-on-background bg-primary px-3 py-1.5 font-headline text-sm font-bold uppercase text-on-primary shadow-[2px_2px_0_0_#1d1c17] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            <span className="material-symbols-outlined text-base">check</span>
            Confirmar
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-xs border-2 border-on-background bg-surface px-3 py-1.5 font-headline text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            <span className="material-symbols-outlined text-base">close</span>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-sm border-2 border-on-background p-md">
      <div className="flex items-start justify-between gap-sm">
        <p className="font-headline text-base font-bold">
          {index + 1}. {question.texto}
        </p>
        <button
          type="button"
          title="Editar pregunta"
          onClick={() => setIsEditing(true)}
          className="shrink-0 flex items-center justify-center border-2 border-on-background bg-surface p-1 text-on-surface-variant opacity-0 shadow-[2px_2px_0_0_#1d1c17] transition-all group-hover:opacity-100 hover:bg-surface-variant"
        >
          <span className="material-symbols-outlined text-base">edit</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-xs md:grid-cols-2">
        {question.opciones.map((opt, i) => (
          <div
            key={i}
            className={[
              'border-2 p-2 text-sm',
              i === question.respuestaCorrecta
                ? 'border-primary bg-primary/10 font-bold text-primary'
                : 'border-outline-variant text-on-surface-variant',
            ].join(' ')}
          >
            <span className="font-bold">{String.fromCharCode(65 + i)}.</span> {opt}
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuestionPreview({ questions = [], onSave, onQuestionsChange }: QuestionPreviewProps) {
  const hasQuestions = questions.length > 0;

  const handleChange = (index: number, updated: GeneratedQuestionPreview) => {
    if (!onQuestionsChange) return;
    const next = [...questions];
    next[index] = updated;
    onQuestionsChange(next);
  };

  return (
    <section className="flex flex-col gap-lg md:col-span-2">
      <div className="flex items-center justify-between border-2 border-on-background bg-surface-container-high p-md shadow-[4px_4px_0_0_#1d1c17]">
        <div>
          <h2 className="font-headline text-2xl font-bold">Vista previa</h2>
          <p className="mt-xs text-on-surface-variant">
            {hasQuestions
              ? `${questions.length} pregunta${questions.length !== 1 ? 's' : ''} generadas — pasa el cursor sobre cada una para editarla.`
              : 'Las preguntas aparecerán aquí después de generar contenido desde un documento.'}
          </p>
        </div>
        {hasQuestions && onSave && (
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-sm border-2 border-on-background bg-primary px-4 py-2 font-headline text-lg font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
          >
            <span className="material-symbols-outlined">save</span>
            Guardar
          </button>
        )}
      </div>

      <div
        className={[
          'border-2 border-on-background bg-surface-container-lowest shadow-[8px_8px_0_0_#1d1c17]',
          hasQuestions ? 'flex flex-col gap-sm p-md' : 'flex min-h-[420px] flex-col justify-center p-lg',
        ].join(' ')}
      >
        {!hasQuestions ? (
          <div className="flex w-full flex-col items-center gap-md text-center">
            <span className="material-symbols-outlined text-[64px] text-outline">hourglass_empty</span>
            <div className="w-full">
              <h3 className="font-headline text-3xl font-bold uppercase">Esperando generacion</h3>
              <p className="mt-sm text-base leading-relaxed text-on-surface-variant">
                Sube un documento, elige el juego destino y genera una vista previa antes de guardar.
              </p>
            </div>
            <div className="w-full border-2 border-dashed border-outline-variant bg-surface-container-low p-md text-sm leading-relaxed text-on-surface-variant">
              No hay preguntas cargadas en memoria para revisar.
            </div>
          </div>
        ) : (
          questions.map((q, i) => (
            <QuestionCard
              key={q.id || i}
              question={q}
              index={i}
              onChange={(updated) => handleChange(i, updated)}
            />
          ))
        )}
      </div>
    </section>
  );
}
