import { Link } from 'react-router-dom';
import type { TeacherGame } from '../../games/types/game.types';
import { routePaths } from '../../../app/router/routePaths';

const categoryStyles = ['bg-secondary-container text-on-secondary-container', 'bg-tertiary-fixed text-on-tertiary-fixed', 'bg-primary-fixed text-on-primary-fixed'];

interface GameCardProps {
  game: TeacherGame;
  index: number;
}

export function GameCard({ game, index }: GameCardProps) {
  const categoryClass = categoryStyles[index % categoryStyles.length];
  const questionsCount = game.questionsCount ?? 0;

  return (
    <article className="group flex flex-col border-4 border-on-background bg-surface-container-lowest shadow-[8px_8px_0_0_#1d1c17]">
      <div className="relative h-48 overflow-hidden border-b-4 border-on-background bg-surface-variant">
        {game.imageUrl ? (
          <img
            alt={game.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            src={game.imageUrl}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[64px]">stadia_controller</span>
          </div>
        )}
        <span className={`absolute left-sm top-sm border-2 border-on-background px-sm py-xs text-sm font-medium uppercase ${categoryClass}`}>
          {game.category}
        </span>
      </div>
      <div className="flex flex-grow flex-col p-md">
        <h3 className="mb-base font-headline text-2xl font-bold">{game.title}</h3>
        <p className="mb-md text-on-surface-variant">{game.description}</p>
        <div className="mt-auto space-y-xs">
          <div className="flex justify-between text-sm font-medium">
            <span>Preguntas cargadas</span>
            <span>{questionsCount}/20</span>
          </div>
          <div className="h-4 w-full overflow-hidden border-2 border-on-background bg-surface-variant">
            <div className="h-full bg-primary-container" style={{ width: `${Math.min(questionsCount, 20) * 5}%` }} />
          </div>
          {questionsCount > 0 ? (
            <div className="mt-2 flex items-center gap-xs text-sm font-bold text-primary">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Preguntas cargadas correctamente
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-xs text-sm font-bold text-error">
              <span className="material-symbols-outlined text-base">warning</span>
              Falta cargar preguntas
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-sm border-t-2 border-on-background p-md">
        <p className="text-sm font-medium uppercase text-on-surface-variant">
          La carga se realiza desde Preguntas, seleccionando el juego destino.
        </p>
        <Link
          to={game.route ?? routePaths.bombGame}
          className="mt-xs flex w-full items-center justify-center gap-xs border-2 border-on-background bg-primary px-4 py-2 font-headline text-sm font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
        >
          <span className="material-symbols-outlined">play_arrow</span>
          Jugar / Previsualizar
        </Link>
      </div>
    </article>
  );
}
