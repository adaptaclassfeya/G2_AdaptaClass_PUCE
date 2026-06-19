import { GameCard } from '../components/GameCard';
import { TeacherShell } from '../components/TeacherShell';
import { useTeacherGames } from '../hooks/useTeacherGames';

export function TeacherDashboardPage() {
  const { games, isLoading, error } = useTeacherGames();
  const totalQuestions = games.reduce((total, game) => total + (game.questionsCount ?? 0), 0);

  return (
    <TeacherShell title="Panel docente">
      <section className="mb-lg flex flex-col justify-between gap-md border-b-4 border-on-background pb-md md:flex-row md:items-end">
        <div>
          <h2 className="font-headline text-2xl font-bold uppercase tracking-normal md:text-5xl">Contenido de juegos</h2>
          <p className="mt-xs text-sm md:text-lg leading-relaxed text-on-surface-variant">
            Carga preguntas de Lengua y Literatura para los juegos cambiantes.
          </p>
        </div>
      </section>

      {isLoading && (
        <div className="border-4 border-on-background bg-surface-container-lowest p-lg text-center shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
          <p className="font-headline text-2xl font-bold uppercase">Cargando juegos</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="mb-md border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
          {error}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-3">
          {games.map((game, index) => (
            <GameCard key={game.id} game={game} index={index} />
          ))}
        </div>
      )}

      <section className="mt-xl grid grid-cols-1 gap-md md:grid-cols-2">
        <div className="border-4 border-on-background bg-primary-container p-sm md:p-lg text-on-primary-container shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
          <p className="mb-xs font-mono text-xs uppercase opacity-80">Juegos cambiantes</p>
          <h4 className="font-headline text-3xl md:text-5xl font-bold">{games.length}</h4>
          <div className="mt-md flex items-center gap-xs">
            <span className="material-symbols-outlined">stadia_controller</span>
            <span className="text-sm font-medium">Disponibles para Lengua y Literatura</span>
          </div>
        </div>
        <div className="border-4 border-on-background bg-secondary-container p-sm md:p-lg text-on-secondary-container shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
          <p className="mb-xs font-mono text-xs uppercase opacity-80">Preguntas creadas</p>
          <h4 className="font-headline text-3xl md:text-5xl font-bold">{totalQuestions}</h4>
          <div className="mt-md flex items-center gap-xs">
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="text-sm font-medium">Listas para jugar</span>
          </div>
        </div>
      </section>
    </TeacherShell>
  );
}
