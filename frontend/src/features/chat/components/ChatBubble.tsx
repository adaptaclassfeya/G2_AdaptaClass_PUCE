import type { ChatTurn } from '../hooks/useChatbot';

interface ChatBubbleProps {
  turn: ChatTurn;
  personaName: string;
}

/**
 * Single chat turn — neo-brutalist bubble (thick border + hard shadow).
 * Student turns sit right-aligned in primary; bot turns left-aligned in
 * surface-container. The `source` tag is only shown for non-canned bot
 * replies so the kid sees when an answer came from the LLM vs. live DB.
 */
export function ChatBubble({ turn, personaName }: ChatBubbleProps) {
  const isStudent = turn.role === 'student';
  const sourceLabel: Record<NonNullable<ChatTurn['source']>, string> = {
    deterministic: 'Datos en vivo',
    cached: 'Respuesta guardada',
    llm: 'IA',
    canned: '',
  };

  return (
    <div
      className={[
        'flex w-full',
        isStudent ? 'justify-end' : 'justify-start',
      ].join(' ')}
    >
      <div
        className={[
          'max-w-[85%] border-2 border-on-background p-sm shadow-[3px_3px_0_0_#1d1c17]',
          isStudent
            ? 'bg-primary text-on-primary'
            : 'bg-surface-container-lowest text-on-surface',
        ].join(' ')}
      >
        {!isStudent && (
          <p className="mb-xs font-mono text-[10px] font-bold uppercase text-on-surface-variant">
            {personaName}
            {turn.source && sourceLabel[turn.source] && (
              <span className="ml-xs border border-on-background bg-surface-container px-1 py-[1px] text-[9px] text-on-surface">
                {sourceLabel[turn.source]}
              </span>
            )}
          </p>
        )}
        <p className="whitespace-pre-line text-sm leading-snug">{turn.text}</p>
      </div>
    </div>
  );
}
