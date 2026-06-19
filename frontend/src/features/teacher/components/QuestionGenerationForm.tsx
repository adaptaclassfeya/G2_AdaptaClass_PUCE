import { useState } from 'react';

interface QuestionGenerationFormProps {
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
  paralelos?: { id: string; nombre: string }[];
  existingTemas?: string[];
}

export function QuestionGenerationForm({ onSubmit, isLoading, paralelos = [], existingTemas = [] }: QuestionGenerationFormProps) {
  const [amount, setAmount] = useState(10);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState('Basico');
  const [context, setContext] = useState('');
  const [tema, setTema] = useState('');
  const [paraleloId, setParaleloId] = useState('');

  const questionAmounts = [5, 10, 15];

  const handleSubmit = () => {
    if (!uploadedFile) return;

    // No `tema` field: the question bank is now global per teacher and
    // every question applies to every game. The backend stamps a default
    // classification tag for legacy schema compatibility.
    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('amount', amount.toString());
    formData.append('difficulty', difficulty);
    formData.append('context', context);
    if (tema.trim()) {
      formData.append('tema', tema.trim());
    }
    if (paraleloId) {
      formData.append('paralelo_id', paraleloId);
    }

    onSubmit(formData);
  };

  return (
    <section className="flex h-fit flex-col gap-md border-2 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17] md:col-span-1">
      <div className="border-b-2 border-on-background pb-sm">
        <h2 className="font-headline text-2xl font-bold text-primary">Parámetros de generación</h2>
        <p className="text-on-surface-variant">Configura las opciones para la IA.</p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-sm border-4 border-dashed border-outline-variant bg-surface-variant p-lg text-center transition-colors hover:bg-surface-dim">
        <span className="material-symbols-outlined text-[48px] text-outline">upload_file</span>
        <span className="text-sm font-medium uppercase">
          {uploadedFile ? uploadedFile.name : 'Subir documento base'}
        </span>
        <span className="text-sm text-on-surface-variant">
          {uploadedFile ? 'Archivo cargado en memoria' : 'PDF, DOCX o TXT, max 10MB'}
        </span>
        <input
          className="sr-only"
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={(event) => setUploadedFile(event.target.files?.[0] ?? null)}
        />
      </label>

      <div className="flex flex-col gap-sm">
        <label className="text-sm font-bold uppercase">Cantidad de preguntas</label>
        <div className="grid grid-cols-3 gap-sm">
          {questionAmounts.map((value) => (
            <button
              key={value}
              className={[
                'border-2 border-on-background py-2 font-headline text-2xl font-bold shadow-[2px_2px_0_0_#1d1c17] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                amount === value ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-lowest hover:bg-surface-variant',
              ].join(' ')}
              type="button"
              onClick={() => setAmount(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-sm text-sm font-bold uppercase">
        Nivel de dificultad
        <select 
          className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="Basico">Basico</option>
          <option value="Intermedio">Intermedio</option>
          <option value="Avanzado">Avanzado</option>
        </select>
      </label>

      <label className="flex flex-col gap-sm text-sm font-bold uppercase">
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-xl">category</span>
          Tema
        </div>
        <input
          type="text"
          list="temas-list"
          className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:bg-yellow-100 focus:ring-2 focus:ring-primary transition-colors"
          placeholder="Ej: Sumas, Lectura, Unidad 1..."
          value={tema}
          onChange={(e) => setTema(e.target.value)}
        />
        <datalist id="temas-list">
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

      <label className="flex flex-col gap-sm text-sm font-bold uppercase">
        Contexto adicional (opcional)
        <textarea
          className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          placeholder="Ej: Enfocar en comprensión lectora, vocabulario o figuras literarias..."
          rows={3}
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </label>

      <button
        className="mt-auto flex w-full items-center justify-center gap-sm border-2 border-on-background bg-primary px-4 py-2.5 font-headline text-lg md:text-2xl font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={!uploadedFile || isLoading}
        onClick={handleSubmit}
      >
        <span className="material-symbols-outlined">smart_toy</span>
        {isLoading ? 'Generando...' : 'Generar'}
      </button>
    </section>
  );
}
