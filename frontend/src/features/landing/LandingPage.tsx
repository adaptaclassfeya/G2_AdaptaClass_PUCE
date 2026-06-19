import { Link } from 'react-router-dom';
import { routePaths } from '../../app/router/routePaths';

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface text-on-surface">
      <div className="scanlines absolute inset-0 z-50" />
      <div className="bg-grid-retro absolute inset-0 z-0 opacity-50" />

      <nav className="relative z-10 flex w-full items-center justify-between border-b-4 border-on-background bg-surface px-gutter py-md shadow-[4px_4px_0_0_#1d1c17] md:px-margin-desktop">
        <Link
          to={routePaths.home}
          className="font-headline text-2xl font-bold uppercase tracking-normal text-primary"
        >
          Adaptaclass
        </Link>
        <div className="flex gap-base">
          <Link
            className="border-2 border-on-background bg-surface-container-lowest px-sm py-xs text-sm font-medium uppercase text-on-surface shadow-[2px_2px_0_0_#1d1c17] transition-colors hover:bg-surface-variant"
            to={routePaths.login}
          >
            Log in
          </Link>
          <Link
            className="border-2 border-on-background bg-primary-container px-sm py-xs text-sm font-medium uppercase text-on-primary shadow-[2px_2px_0_0_#1d1c17] transition-colors hover:bg-primary"
            to={routePaths.register}
          >
            Sign up
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex flex-grow flex-col items-center justify-center p-margin-mobile md:p-margin-desktop">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-lg text-center">
          <section className="relative w-full overflow-hidden border-4 border-on-background bg-surface-container-lowest p-lg shadow-[8px_8px_0_0_#1d1c17]">
            <div className="absolute left-0 top-0 h-2 w-full bg-primary-container" />
            <div className="absolute bottom-0 left-0 h-2 w-full bg-tertiary-container" />
            <h1 className="mb-sm font-headline text-4xl font-bold uppercase leading-tight tracking-normal text-primary md:text-5xl">
              Adaptaclass
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-on-surface-variant">
              The next-generation educational protocol. System online. Ready for inputs.
            </p>
            <div className="absolute left-4 top-4 h-4 w-4 border-2 border-on-background bg-secondary" />
            <div className="absolute right-4 top-4 h-4 w-4 border-2 border-on-background bg-secondary" />
            <div className="absolute bottom-4 left-4 h-4 w-4 border-2 border-on-background bg-secondary" />
            <div className="absolute bottom-4 right-4 h-4 w-4 border-2 border-on-background bg-secondary" />
          </section>

          <Link
            className="group relative mt-xl border-4 border-on-background bg-primary-container px-md py-sm md:px-xl md:py-md shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17] transition-all duration-100 hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none"
            to={routePaths.login}
          >
            <span className="flex items-center gap-sm font-headline text-lg md:text-2xl font-bold uppercase text-on-primary">
              <span className="material-symbols-outlined filled">play_arrow</span>
              Insert coin
            </span>
            <span className="absolute -right-4 top-1/2 h-8 w-3 -translate-y-1/2 animate-pulse bg-on-background" />
          </Link>

          <div className="mt-xl flex flex-wrap justify-center gap-md border-2 border-on-background bg-surface p-sm text-sm font-medium uppercase text-on-surface-variant shadow-[4px_4px_0_0_#1d1c17]">
            <div className="flex items-center gap-xs">
              <span className="h-3 w-3 rounded-full border-2 border-on-background bg-primary-container" />
              Status: OK
            </div>
            <div className="flex items-center gap-xs border-l-2 border-on-background pl-md">
              <span className="material-symbols-outlined text-[18px]">memory</span>
              Memory: 640K
            </div>
            <div className="flex items-center gap-xs border-l-2 border-on-background pl-md">
              <span className="material-symbols-outlined text-[18px]">dns</span>
              Server: PUCE
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
