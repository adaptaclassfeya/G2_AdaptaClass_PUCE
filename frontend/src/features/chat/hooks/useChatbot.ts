import { useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { chatService } from '../services/chat.service';
import type { ChatReplySource } from '../services/chat.service';

export interface ChatTurn {
  id: number;
  role: 'student' | 'bot';
  text: string;
  source?: ChatReplySource;
  ts: number;
}

interface UseChatbotArgs {
  personaName: string;
  initialSuggestions: string[];
}

interface UseChatbotResult {
  turns: ChatTurn[];
  suggestions: string[];
  isSending: boolean;
  error: string | null;
  send: (message: string) => Promise<void>;
  reset: () => void;
}

/**
 * In-memory chat state. Persistent history is explicitly v2 (see
 * CLAUDE.md "Chatbot / Pendientes que NO entran en v1"). When the user
 * closes the FAB and reopens it the history stays for the same browser
 * session; reload clears it.
 */
export function useChatbot({
  personaName,
  initialSuggestions,
}: UseChatbotArgs): UseChatbotResult {
  // Monotonic id so React keys are stable even if two turns land in the
  // same millisecond.
  const nextIdRef = useRef(1);
  const [turns, setTurns] = useState<ChatTurn[]>(() => [
    {
      id: 0,
      role: 'bot',
      text: `¡Hola! Soy ${personaName}. Pregúntame por tus tareas, tu XP o cómo vas en el ranking.`,
      source: 'canned',
      ts: Date.now(),
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>(initialSuggestions);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the route at SEND time so the backend can resolve "what game
  // is the student on?" without us having to add a prop chain through
  // every page that mounts the widget. We use a ref-style capture via
  // useLocation re-renders so the latest pathname is always the one
  // shipped on click.
  const location = useLocation();

  const pushTurn = useCallback((turn: Omit<ChatTurn, 'id' | 'ts'>) => {
    setTurns((prev) => [
      ...prev,
      { ...turn, id: nextIdRef.current++, ts: Date.now() },
    ]);
  }, []);

  const send = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || isSending) return;

      pushTurn({ role: 'student', text: trimmed });
      setIsSending(true);
      setError(null);

      try {
        const result = await chatService.ask(trimmed, location.pathname);
        pushTurn({
          role: 'bot',
          text: result.reply,
          source: result.source,
        });
        // Suggestions are returned per-response so deterministic intents
        // can surface follow-up chips ("¿Cuántos minutos me faltan?"
        // after MISSIONS_PENDING). Keep them sticky if the response
        // returned none.
        if (result.suggestions.length > 0) {
          setSuggestions(result.suggestions);
        }
      } catch (err) {
        // Try to surface the API error (429 throttle, 401, etc.) without
        // leaking implementation details.
        const message =
          (err as { response?: { status?: number } })?.response?.status === 429
            ? 'Estás escribiendo muy rápido. Espera un momento.'
            : 'No pude responder ahora mismo. Intenta de nuevo.';
        setError(message);
        pushTurn({ role: 'bot', text: message, source: 'canned' });
      } finally {
        setIsSending(false);
      }
    },
    [isSending, location.pathname, pushTurn],
  );

  const reset = useCallback(() => {
    nextIdRef.current = 1;
    setTurns([
      {
        id: 0,
        role: 'bot',
        text: `¡Hola! Soy ${personaName}. ¿En qué te ayudo?`,
        source: 'canned',
        ts: Date.now(),
      },
    ]);
    setSuggestions(initialSuggestions);
    setError(null);
  }, [personaName, initialSuggestions]);

  return { turns, suggestions, isSending, error, send, reset };
}
