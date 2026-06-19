import { useState } from 'react';
import type { FormEvent } from 'react';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { TeacherShell } from '../components/TeacherShell';
import { useParalelos } from '../hooks/useParalelos';
import { paralelosService } from '../../paralelos/services/paralelos.service';
import { MissionForm } from '../../missions/components/MissionForm';
import { ParaleloDetailPanel } from '../components/ParaleloDetailPanel';
import { MissionsPanel } from '../../missions/components/MissionsPanel';
import { ChatbotConfigPanel } from '../components/ChatbotConfigPanel';

function formatGrade(grade: number) {
  const labels: Record<number, string> = {
    3: '3ro EGB',
    4: '4to EGB',
    5: '5to EGB',
    6: '6to EGB',
    7: '7mo EGB',
    8: '8vo BGU',
    9: '9no BGU',
    10: '10mo BGU',
  };
  return labels[grade] ?? `${grade} EGB`;
}

// Three independent collapsible panels per card. Tracked by id so only one
// card can have a particular panel open at a time, and so refreshing the
// parent list doesn't accidentally close them.
type PanelKey = 'assign' | 'students' | 'tasks' | 'chatbot';

export function TeacherClassroomPage() {
  const { paralelos, isLoading, error, refresh } = useParalelos();
  const [copiedCode, setCopiedCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ nombre: '', grado: 3 });
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Map of { paraleloId -> active panel }. null means all panels collapsed.
  const [openPanels, setOpenPanels] = useState<Record<string, PanelKey | null>>({});
  // Bumped per paralelo when we create a mission, so MissionsPanel refreshes.
  const [missionsBump, setMissionsBump] = useState<Record<string, number>>({});

  const togglePanel = (paraleloId: string, key: PanelKey) => {
    setOpenPanels((current) => ({
      ...current,
      [paraleloId]: current[paraleloId] === key ? null : key,
    }));
  };

  const handleRotate = async (id: string) => {
    if (!window.confirm('El código actual dejará de funcionar. ¿Continuar?')) return;
    setActionError(null);
    setRotatingId(id);
    try {
      await paralelosService.rotateCode(id);
      await refresh();
    } catch (requestError: unknown) {
      setActionError(getApiErrorMessage(requestError, 'No se pudo rotar el código.'));
    } finally {
      setRotatingId(null);
    }
  };

  const copyAccessCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
  };

  const createParalelo = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setIsCreating(true);

    try {
      await paralelosService.create(form);
      setForm({ nombre: '', grado: 3 });
      setCreateSuccess('Paralelo creado.');
      await refresh();
    } catch (requestError: unknown) {
      setCreateError(getApiErrorMessage(requestError, 'No se pudo crear el paralelo'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <TeacherShell title="Aula">
      <section className="mb-lg border-b-4 border-on-background pb-md">
        <h2 className="font-headline text-2xl font-bold uppercase tracking-normal md:text-5xl">Paralelos</h2>
        <p className="mt-xs max-w-3xl text-sm md:text-lg leading-relaxed text-on-surface-variant">
          Administra tus cursos y comparte códigos de acceso para que los estudiantes se unan desde su dashboard.
        </p>
      </section>

      <form onSubmit={createParalelo} className="mb-lg grid gap-md border-4 border-on-background bg-surface-container-lowest p-sm md:p-md shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17] md:grid-cols-[1fr_180px_auto]">
        <label className="flex flex-col gap-xs text-sm font-bold uppercase">
          Nombre del paralelo
          <input
            className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
            value={form.nombre}
            onChange={(event) => setForm({ ...form, nombre: event.target.value })}
            placeholder="Ej: 3ro A"
            required
          />
        </label>
        <label className="flex flex-col gap-xs text-sm font-bold uppercase">
          Grado
          <select
            className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
            value={form.grado}
            onChange={(event) => setForm({ ...form, grado: Number(event.target.value) })}
          >
            <option value={3}>3ro EGB</option>
            <option value={4}>4to EGB</option>
            <option value={5}>5to EGB</option>
            <option value={6}>6to EGB</option>
            <option value={7}>7mo EGB</option>
            <option value={8}>8vo BGU</option>
            <option value={9}>9no BGU</option>
            <option value={10}>10mo BGU</option>
          </select>
        </label>
        <button
          className="w-full md:w-auto self-end border-2 border-on-background bg-primary px-md py-2.5 font-headline text-sm font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] md:shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:opacity-60"
          type="submit"
          disabled={isCreating}
        >
          {isCreating ? 'Creando' : 'Crear paralelo'}
        </button>
        {createError && <p className="text-sm font-bold text-error md:col-span-3">{createError}</p>}
        {createSuccess && !createError && (
          <p className="text-sm font-bold text-primary md:col-span-3">{createSuccess}</p>
        )}
      </form>

      {isLoading && (
        <div className="border-4 border-on-background bg-surface-container-lowest p-lg text-center shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
          Cargando paralelos
        </div>
      )}

      {error && !isLoading && (
        <div className="border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
          {error}
        </div>
      )}

      {!isLoading && !error && paralelos.length === 0 && (
        <div className="border-4 border-dashed border-on-background bg-surface-container-lowest p-lg text-center text-on-surface-variant">
          Aún no has creado paralelos. Usa el formulario de arriba para empezar.
        </div>
      )}

      {!isLoading && !error && paralelos.length > 0 && (
        <div className="grid gap-md md:grid-cols-2">
          {paralelos.map((paralelo) => {
            const activePanel = openPanels[paralelo.id] ?? null;
            return (
              <article key={paralelo.id} className="border-4 border-on-background bg-surface-container-lowest p-sm md:p-md shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
                <div className="flex items-start justify-between gap-sm">
                  <div>
                    <h3 className="font-headline text-2xl font-bold uppercase text-primary">{paralelo.nombre}</h3>
                    <p className="text-on-surface-variant">{formatGrade(paralelo.grado)}</p>
                  </div>
                </div>

                <div className="mt-md border-2 border-on-background bg-surface-container-low p-sm">
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Código de acceso</p>
                  <div className="mt-xs flex items-center justify-between gap-sm">
                    <code className="font-headline text-3xl font-bold">{paralelo.codigo_acceso}</code>
                    <div className="flex items-center gap-xs">
                      <button
                        className="border-2 border-on-background bg-background px-sm py-xs text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17]"
                        type="button"
                        onClick={() => copyAccessCode(paralelo.codigo_acceso)}
                      >
                        {copiedCode === paralelo.codigo_acceso ? 'Copiado' : 'Copiar'}
                      </button>
                      <button
                        className="border-2 border-on-background bg-tertiary px-sm py-xs text-sm font-bold uppercase text-on-tertiary shadow-[2px_2px_0_0_#1d1c17] disabled:opacity-60"
                        type="button"
                        onClick={() => handleRotate(paralelo.id)}
                        disabled={rotatingId === paralelo.id}
                        title="Generar un código nuevo (el anterior queda inválido)"
                      >
                        {rotatingId === paralelo.id ? '...' : 'Rotar'}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="mt-md text-sm font-medium text-on-surface-variant">
                  {paralelo._count?.students ?? 0} estudiantes registrados
                </p>

                <div className="mt-md flex flex-wrap items-center gap-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel(paralelo.id, 'assign')}
                    className="border-2 border-on-background bg-secondary px-sm py-xs text-sm font-bold uppercase text-on-secondary shadow-[2px_2px_0_0_#1d1c17]"
                  >
                    {activePanel === 'assign' ? 'Cerrar' : 'Asignar misión'}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePanel(paralelo.id, 'students')}
                    className="border-2 border-on-background bg-surface px-sm py-xs text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17]"
                  >
                    {activePanel === 'students' ? 'Ocultar' : 'Estudiantes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePanel(paralelo.id, 'tasks')}
                    className="border-2 border-on-background bg-surface px-sm py-xs text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17]"
                  >
                    {activePanel === 'tasks' ? 'Ocultar misiones' : 'Ver misiones'}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePanel(paralelo.id, 'chatbot')}
                    className="border-2 border-on-background bg-surface px-sm py-xs text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17]"
                  >
                    {activePanel === 'chatbot' ? 'Cerrar chatbot' : 'Chatbot'}
                  </button>
                </div>

                {activePanel === 'assign' && (
                  <MissionForm
                    paraleloId={paralelo.id}
                    paraleloNombre={paralelo.nombre}
                    paraleloGrado={formatGrade(paralelo.grado)}
                    onSuccess={() => {
                      setMissionsBump((current) => ({
                        ...current,
                        [paralelo.id]: (current[paralelo.id] ?? 0) + 1,
                      }));
                      togglePanel(paralelo.id, 'assign');
                    }}
                    onCancel={() => togglePanel(paralelo.id, 'assign')}
                  />
                )}
                {activePanel === 'students' && <ParaleloDetailPanel paraleloId={paralelo.id} />}
                {activePanel === 'tasks' && (
                  <MissionsPanel
                    paraleloId={paralelo.id}
                    refreshKey={missionsBump[paralelo.id] ?? 0}
                  />
                )}
                {activePanel === 'chatbot' && (
                  <div className="mt-md">
                    <ChatbotConfigPanel paraleloId={paralelo.id} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {actionError && (
        <p className="mt-md border-2 border-error bg-error-container px-sm py-2 text-sm font-bold text-on-error-container">
          {actionError}
        </p>
      )}
    </TeacherShell>
  );
}
