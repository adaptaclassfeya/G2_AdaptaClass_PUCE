import { useState } from 'react';

interface ManualQuestion {
  texto: string;
  opciones: [string, string, string, string];
  respuestaCorrecta: number;
}

interface ManualQuestionFormProps {
  onSave: (questions: ManualQuestion[], tema: string, paraleloId?: string) => Promise<void>;
  paralelos?: { id: string; nombre: string }[];
  existingTemas?: string[];
}

export function ManualQuestionForm({ onSave, paralelos = [], existingTemas = [] }: ManualQuestionFormProps) {
  const [questions, setQuestions] = useState<ManualQuestion[]>([
    { texto: '', opciones: ['', '', '', ''], respuestaCorrecta: 0 }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [tema, setTema] = useState('');
  const [paraleloId, setParaleloId] = useState('');

  const handleAddQuestion = () => {
    setQuestions([...questions, { texto: '', opciones: ['', '', '', ''], respuestaCorrecta: 0 }]);
  };

  const handleQuestionChange = (index: number, field: string, value: string | number, optionIndex?: number) => {
    const updatedQuestions = [...questions];
    if (field === 'texto') {
      updatedQuestions[index].texto = value as string;
    } else if (field === 'respuestaCorrecta') {
      updatedQuestions[index].respuestaCorrecta = value as number;
    } else if (field === 'opcion' && optionIndex !== undefined) {
      updatedQuestions[index].opciones[optionIndex] = value as string;
    }
    setQuestions(updatedQuestions);
  };

  const handleRemoveQuestion = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    setQuestions(updatedQuestions);
  };

  const handleSave = async () => {
    setValidationError('');

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.texto.trim() || q.opciones.some((opt) => !opt.trim())) {
        setValidationError(
          `La pregunta ${i + 1} está incompleta. Llena la pregunta y todas sus opciones.`,
        );
        return;
      }
    }

    try {
      setIsSaving(true);
      await onSave(questions, tema, paraleloId || undefined);
      // Reset after save
      setQuestions([{ texto: '', opciones: ['', '', '', ''], respuestaCorrecta: 0 }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-md border-2 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17] mt-xl">
      <div className="border-b-2 border-on-background pb-sm">
        <h2 className="font-headline text-2xl font-bold text-secondary">Añadir Preguntas Manuales</h2>
        <p className="text-on-surface-variant">
          Agrega tus propias preguntas directamente a tu banco. Se mostrarán en todos los juegos.
        </p>
      </div>

      <label className="flex flex-col gap-sm text-sm font-bold uppercase">
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-xl">category</span>
          Tema
        </div>
        <input
          type="text"
          list="manual-temas-list"
          className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:bg-yellow-100 focus:ring-2 focus:ring-primary transition-colors"
          placeholder="Ej: Sumas, Lectura, Unidad 1..."
          value={tema}
          onChange={(e) => setTema(e.target.value)}
        />
        <datalist id="manual-temas-list">
          {existingTemas.map(t => <option key={t} value={t} />)}
        </datalist>
      </label>

      <label className="flex flex-col gap-sm text-sm font-bold uppercase">
        Asignar a Paralelo
        <select 
          className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          value={paraleloId}
          onChange={(e) => setParaleloId(e.target.value)}
        >
          <option value="">Generales (Todos los paralelos)</option>
          {paralelos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-lg mt-sm">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="border-2 border-outline-variant p-md flex flex-col gap-sm relative bg-surface-variant">
            {questions.length > 1 && (
              <button 
                onClick={() => handleRemoveQuestion(qIndex)}
                className="absolute top-2 right-2 text-error hover:text-on-error hover:bg-error transition-colors p-1"
                title="Eliminar pregunta"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
            
            <label className="flex flex-col gap-xs text-sm font-bold uppercase">
              Pregunta {qIndex + 1}
              <textarea
                className="rounded-none border-2 border-on-background bg-surface-container-lowest p-2 font-normal normal-case outline-none focus:ring-2 focus:ring-primary resize-y"
                placeholder="Escribe la pregunta aquí..."
                value={q.texto}
                onChange={(e) => handleQuestionChange(qIndex, 'texto', e.target.value)}
                rows={2}
              />
            </label>
            
            <div className="flex flex-col gap-xs">
              <span className="text-sm font-bold uppercase text-on-surface-variant">Opciones (Selecciona la correcta)</span>
              {q.opciones.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-sm">
                  <input 
                    type="radio" 
                    name={`correct-${qIndex}`}
                    className="w-5 h-5 accent-primary cursor-pointer shrink-0"
                    checked={q.respuestaCorrecta === optIndex}
                    onChange={() => handleQuestionChange(qIndex, 'respuestaCorrecta', optIndex)}
                    title={`Marcar Opción ${String.fromCharCode(65 + optIndex)} como correcta`}
                  />
                  <div className="flex items-center bg-surface border-2 border-on-background w-full">
                    <span className="bg-on-background text-surface font-bold px-3 py-2 uppercase">
                      {String.fromCharCode(65 + optIndex)}
                    </span>
                    <input
                      className="w-full p-2 outline-none font-normal"
                      placeholder={`Opción ${String.fromCharCode(65 + optIndex)}`}
                      value={opt}
                      onChange={(e) => handleQuestionChange(qIndex, 'opcion', e.target.value, optIndex)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {validationError && (
        <p className="border-2 border-error bg-error-container px-sm py-2 text-sm font-bold text-on-error-container">
          {validationError}
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-md mt-sm">
        <button
          className="flex-1 flex items-center justify-center gap-sm border-2 border-on-background bg-surface-variant px-4 py-3 font-headline font-bold uppercase hover:bg-surface-dim transition-all active:translate-x-0.5 active:translate-y-0.5"
          onClick={handleAddQuestion}
        >
          <span className="material-symbols-outlined">add</span>
          Añadir otra pregunta
        </button>

        <button
          className="flex-1 flex items-center justify-center gap-sm border-2 border-on-background bg-secondary px-4 py-3 font-headline font-bold uppercase text-on-secondary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:opacity-60"
          onClick={handleSave}
          disabled={isSaving}
        >
          <span className="material-symbols-outlined">save</span>
          {isSaving ? 'Guardando...' : 'Guardar en el Banco'}
        </button>
      </div>

    </section>
  );
}
