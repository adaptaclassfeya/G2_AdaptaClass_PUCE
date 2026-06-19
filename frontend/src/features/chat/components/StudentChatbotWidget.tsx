import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useChatbot } from '../hooks/useChatbot';
import { ChatBubble } from './ChatBubble';
import { QuickReplies } from './QuickReplies';

interface StudentChatbotWidgetProps {
  personaName: string;
  initialSuggestions: string[];
}

/**
 * Floating chat widget mounted from StudentShell. Bottom-right FAB on
 * desktop; on mobile we sit above the bottom nav (which is z-50, so the
 * panel itself uses z-40 and the FAB uses z-40 too — both below the nav
 * but above page content).
 *
 * Lazy-imported from the shell so the chat code (services + hook) only
 * ships when the FAB renders.
 */
export function StudentChatbotWidget({
  personaName,
  initialSuggestions,
}: StudentChatbotWidgetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { turns, suggestions, isSending, error, send } = useChatbot({
    personaName,
    initialSuggestions,
  });

  // Auto-scroll to bottom on new turn.
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, open]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) {
      // Defer focus until after the panel paints.
      const id = window.requestAnimationFrame(() => inputRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;
    setDraft('');
    await send(message);
  };

  const handleQuickPick = async (text: string) => {
    if (isSending) return;
    await send(text);
  };

  return (
    <>
      {/* FAB — sits above the bottom nav (z-50) but we set z-[60] so it
          floats over it; the panel uses z-[55] to slip under the FAB but
          over page chrome. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
        className="fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center border-4 border-on-background bg-tertiary text-on-tertiary shadow-[4px_4px_0_0_#1d1c17] transition-transform hover:-translate-y-[2px] md:bottom-6 md:right-6"
      >
        <span className="material-symbols-outlined text-3xl">
          {open ? 'close' : 'smart_toy'}
        </span>
      </button>

      {open && (
        // Width: 20rem (320px) fixed, capped to viewport-minus-2rem on
        // narrow screens. Tailwind 4 needs underscore-as-space syntax
        // inside calc() arbitrary values — "calc(100vw-2rem)" without
        // underscores is parsed as an unknown identifier and the element
        // collapses to content width (~one character per bubble, the
        // bug reported in the first preview pass).
        //
        // Vertical: panel sits above the FAB. Mobile bottom-44 (176px)
        // clears the FAB (bottom-24 + h-14 ≈ 152px) which itself clears
        // the bottom nav. Desktop md:bottom-24 (96px) clears the desktop
        // FAB at md:bottom-6 (24px + 56px = 80px).
        <div
          className="fixed bottom-44 right-4 z-[55] flex h-[min(60vh,520px)] w-80 max-w-[calc(100vw_-_2rem)] flex-col border-4 border-on-background bg-surface shadow-[6px_6px_0_0_#1d1c17] md:bottom-24 md:right-6"
          role="dialog"
          aria-label="Asistente del estudiante"
        >
          <header className="flex items-center justify-between border-b-4 border-on-background bg-tertiary-container px-sm py-xs">
            <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-on-tertiary-container">
                smart_toy
              </span>
              <p className="font-headline text-sm font-bold uppercase tracking-wide text-on-tertiary-container">
                {personaName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="material-symbols-outlined text-on-tertiary-container hover:text-error"
            >
              close
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-sm overflow-y-auto bg-surface-container-lowest p-sm"
          >
            {turns.map((turn) => (
              <ChatBubble key={turn.id} turn={turn} personaName={personaName} />
            ))}
            {isSending && (
              <p className="font-mono text-xs italic text-on-surface-variant">
                {personaName} está pensando…
              </p>
            )}
          </div>

          <div className="space-y-xs border-t-2 border-on-background bg-surface-container p-sm">
            <QuickReplies
              suggestions={suggestions}
              onPick={handleQuickPick}
              disabled={isSending}
            />
            {error && (
              <p className="font-mono text-[11px] font-bold uppercase text-error">
                {error}
              </p>
            )}
            <form onSubmit={handleSubmit} className="flex gap-xs">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe tu pregunta…"
                maxLength={300}
                disabled={isSending}
                className="flex-1 border-2 border-on-background bg-surface px-sm py-xs text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                aria-label="Enviar"
                className="flex items-center justify-center border-2 border-on-background bg-primary px-sm py-xs text-on-primary shadow-[2px_2px_0_0_#1d1c17] transition-transform hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Default export so React.lazy() can pick it up in StudentShell.
export default StudentChatbotWidget;
