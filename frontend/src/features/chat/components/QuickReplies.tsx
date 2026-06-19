interface QuickRepliesProps {
  suggestions: string[];
  onPick: (suggestion: string) => void;
  disabled?: boolean;
}

/**
 * Chip row under the chat input. Tapping a chip sends it as a user
 * message. Kept stateless so the parent owns suggestion churn.
 */
export function QuickReplies({
  suggestions,
  onPick,
  disabled = false,
}: QuickRepliesProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-xs">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s)}
          className="border-2 border-on-background bg-secondary-container px-sm py-xs text-xs font-bold text-on-secondary-container shadow-[2px_2px_0_0_#1d1c17] transition-transform hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
