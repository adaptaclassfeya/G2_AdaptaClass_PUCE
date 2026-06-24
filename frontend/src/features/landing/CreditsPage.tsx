import { Link } from 'react-router-dom';
import { routePaths } from '../../app/router/routePaths';

const team = [
  'Benjamin Azanza',
  'Paula Coronel',
  'Josue Tenesaca',
  'Mateo Torres',
];

export function CreditsPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface text-on-surface">
      <div className="bg-grid-retro absolute inset-0 z-0 opacity-40" />

      <nav className="relative z-10 flex w-full items-center justify-between border-b-4 border-on-background bg-surface px-gutter py-md shadow-[4px_4px_0_0_#1d1c17] md:px-margin-desktop">
        <Link
          to={routePaths.home}
          className="font-headline text-2xl font-bold uppercase tracking-normal text-primary"
        >
          Adaptaclass
        </Link>
        <Link
          to={routePaths.home}
          className="flex items-center gap-xs border-2 border-on-background bg-surface-container-lowest px-sm py-xs text-sm font-medium uppercase text-on-surface shadow-[2px_2px_0_0_#1d1c17] transition-colors hover:bg-surface-variant"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Volver
        </Link>
      </nav>

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-grow px-margin-mobile py-xl md:px-margin-desktop">

        {/* Header */}
        <div className="mb-xl border-4 border-on-background bg-primary-container p-lg shadow-[8px_8px_0_0_#1d1c17]">
          <div className="absolute -left-1 -top-1 h-5 w-5 border-2 border-on-background bg-secondary" />
          <p className="mb-xs font-mono text-xs font-bold uppercase tracking-widest text-on-primary">
            Proyecto académico · PUCE · 2026
          </p>
          <h1 className="font-headline text-4xl font-bold uppercase tracking-normal text-on-primary md:text-5xl">
            AdaptaClass
          </h1>
          <p className="mt-sm font-mono text-sm text-on-primary/80">
            Sistema gamificado de aprendizaje adaptativo
          </p>
        </div>

        <div className="flex flex-col gap-lg">

          {/* Equipo */}
          <section className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[6px_6px_0_0_#1d1c17]">
            <h2 className="mb-md border-b-2 border-on-background pb-xs font-headline text-xl font-bold uppercase text-primary">
              <span className="material-symbols-outlined mr-xs align-middle text-[22px]">group</span>
              Equipo desarrollador
            </h2>
            <ul className="flex flex-col gap-sm">
              {team.map((name, i) => (
                <li
                  key={name}
                  className="flex items-center gap-sm border-2 border-on-background bg-surface px-sm py-xs shadow-[3px_3px_0_0_#1d1c17]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-on-background bg-secondary font-mono text-xs font-bold text-on-surface">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-medium text-on-surface">{name}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Tutor */}
          <section className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[6px_6px_0_0_#1d1c17]">
            <h2 className="mb-md border-b-2 border-on-background pb-xs font-headline text-xl font-bold uppercase text-primary">
              <span className="material-symbols-outlined mr-xs align-middle text-[22px]">school</span>
              Tutor
            </h2>
            <div className="flex items-center gap-sm border-2 border-on-background bg-surface px-sm py-xs shadow-[3px_3px_0_0_#1d1c17]">
              <span className="material-symbols-outlined text-secondary">person</span>
              <span className="font-medium text-on-surface">
                Ing. Francisco Rodríguez{' '}
                <span className="font-normal text-on-surface-variant">— Profesor tutor</span>
              </span>
            </div>
          </section>

          {/* Contexto académico */}
          <section className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[6px_6px_0_0_#1d1c17]">
            <h2 className="mb-md border-b-2 border-on-background pb-xs font-headline text-xl font-bold uppercase text-primary">
              <span className="material-symbols-outlined mr-xs align-middle text-[22px]">info</span>
              Contexto académico
            </h2>
            <p className="leading-relaxed text-on-surface-variant">
              Este proyecto se realizó en el marco de la asignatura de{' '}
              <strong className="text-on-surface">Emprendimiento Tecnológico</strong>, con la
              metodología de <strong className="text-on-surface">Aprendizaje-Servicio</strong>, en
              la{' '}
              <strong className="text-on-surface">
                Pontificia Universidad Católica del Ecuador (PUCE)
              </strong>
              .
            </p>
          </section>

          {/* Agradecimientos */}
          <section className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[6px_6px_0_0_#1d1c17]">
            <h2 className="mb-md border-b-2 border-on-background pb-xs font-headline text-xl font-bold uppercase text-primary">
              <span className="material-symbols-outlined mr-xs align-middle text-[22px]">favorite</span>
              Agradecimientos
            </h2>
            <div className="flex flex-col gap-sm">
              <div className="border-l-4 border-secondary bg-surface pl-sm py-xs pr-xs">
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  A la <strong className="text-on-surface">Coordinación de Aprendizaje-Servicio de la PUCE</strong>{' '}
                  por su acompañamiento; sin su apoyo no habría sido posible esta iniciativa
                  innovadora dentro de la universidad.
                </p>
              </div>
              <div className="border-l-4 border-tertiary bg-surface pl-sm py-xs pr-xs">
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  A la <strong className="text-on-surface">Unidad Educativa Fe y Alegría</strong>{' '}
                  por las facilidades brindadas para el desarrollo de este proyecto.
                </p>
              </div>
            </div>
          </section>

          {/* Recursos */}
          <section className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[6px_6px_0_0_#1d1c17]">
            <h2 className="mb-md border-b-2 border-on-background pb-xs font-headline text-xl font-bold uppercase text-primary">
              <span className="material-symbols-outlined mr-xs align-middle text-[22px]">link</span>
              Recursos
            </h2>
            <p className="mb-md text-sm text-on-surface-variant">
              Este proyecto se distribuye como{' '}
              <strong className="text-on-surface">software libre</strong> e incluye manual de
              usuario y video tutorial.
            </p>
            <div className="flex flex-col gap-sm sm:flex-row">
              <a
                href="https://github.com/adaptaclassfeya/G2_AdaptaClass_PUCE.git"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-xs border-2 border-on-background bg-surface px-sm py-sm text-sm font-bold uppercase shadow-[3px_3px_0_0_#1d1c17] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-variant active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <span className="material-symbols-outlined text-[18px]">code</span>
                GitHub
              </a>
              <a
                href="https://youtu.be/X5ffUNhwCX4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-xs border-2 border-on-background bg-surface px-sm py-sm text-sm font-bold uppercase shadow-[3px_3px_0_0_#1d1c17] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-variant active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                Video tutorial
              </a>
            </div>
          </section>

        </div>
      </main>

      <footer className="relative z-10 border-t-4 border-on-background bg-surface-container-lowest">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-sm px-margin-mobile py-md md:flex-row md:justify-between md:px-margin-desktop">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            En colaboración con
          </span>
          <div className="border-2 border-on-background bg-on-background px-md py-xs shadow-[3px_3px_0_0_#1d1c17]">
            <img
              src="/assets/logos/puce.png"
              alt="Pontificia Universidad Católica del Ecuador"
              className="h-10 w-auto object-contain md:h-12"
            />
          </div>
          <p className="font-mono text-xs text-on-surface-variant md:text-right">
            Proyecto académico<br className="hidden md:block" /> G2 · 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
