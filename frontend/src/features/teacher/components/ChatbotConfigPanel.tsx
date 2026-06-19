import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  chatbotConfigService,
  type ChatbotConfig,
} from '../services/chatbot-config.service';
import { getApiErrorMessage } from '../../../lib/httpErrors';

interface ChatbotConfigPanelProps {
  paraleloId: string;
}

const MAX_EXTRA_SUGGESTIONS = 5;

const EMPTY_CONFIG: ChatbotConfig = {
  chatbot_enabled: true,
  chatbot_llm_enabled: false,
  chatbot_persona_name: null,
  chatbot_extra_suggestions: [],
};

/**
 * Per-paralelo chatbot configuration. Lives inside the paralelo detail
 * card next to MissionsPanel. Loads its own state on mount and saves on
 * "Guardar" — kept lightweight so it can be mounted/unmounted with the
 * accordion without losing data.
 */
export function ChatbotConfigPanel({ paraleloId }: ChatbotConfigPanelProps) {
  const [config, setConfig] = useState<ChatbotConfig>(EMPTY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newSuggestion, setNewSuggestion] = useState('');

  useEffect(() => {
    // Async IIFE so the initial setState calls happen inside a microtask
    // rather than synchronously in the effect body — keeps React from
    // reporting cascading renders on remount.
    let cancelled = false;
    (async () => {
      try {
        const data = await chatbotConfigService.get(paraleloId);
        if (cancelled) return;
        setConfig(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'No se pudo cargar la configuración.'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paraleloId]);

  const handleAddSuggestion = () => {
    const next = newSuggestion.trim();
    if (!next) return;
    if (config.chatbot_extra_suggestions.length >= MAX_EXTRA_SUGGESTIONS) return;
    if (next.length > 80) return;
    setConfig((prev) => ({
      ...prev,
      chatbot_extra_suggestions: [...prev.chatbot_extra_suggestions, next],
    }));
    setNewSuggestion('');
  };

  const handleRemoveSuggestion = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      chatbot_extra_suggestions: prev.chatbot_extra_suggestions.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await chatbotConfigService.update(paraleloId, {
        chatbot_enabled: config.chatbot_enabled,
        chatbot_llm_enabled: config.chatbot_llm_enabled,
        chatbot_persona_name: config.chatbot_persona_name || undefined,
        chatbot_extra_suggestions: config.chatbot_extra_suggestions,
      });
      setConfig(updated);
      setSuccess('Configuración guardada.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo guardar la configuración.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="border-4 border-on-background bg-surface-container-lowest p-md font-mono text-xs uppercase text-on-surface-variant shadow-[4px_4px_0_0_#1d1c17]">
        Cargando configuración del chatbot…
      </div>
    );
  }

  const remainingSlots =
    MAX_EXTRA_SUGGESTIONS - config.chatbot_extra_suggestions.length;

  return (
    <form
      onSubmit={handleSave}
      className="space-y-md border-4 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17]"
    >
      <div className="flex items-center justify-between gap-sm">
        <div>
          <h3 className="font-headline text-lg font-bold uppercase text-on-surface">
            Chatbot del estudiante
          </h3>
          <p className="font-mono text-xs uppercase text-on-surface-variant">
            Asistente flotante para tus estudiantes
          </p>
        </div>
        <span className="material-symbols-outlined text-3xl text-tertiary">
          smart_toy
        </span>
      </div>

      <label className="flex items-center justify-between gap-sm border-2 border-on-background bg-surface-container p-sm">
        <div>
          <p className="font-bold uppercase text-sm">Activar chatbot</p>
          <p className="font-mono text-[11px] text-on-surface-variant">
            Cuando está apagado, no se muestra el botón flotante.
          </p>
        </div>
        <input
          type="checkbox"
          checked={config.chatbot_enabled}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, chatbot_enabled: e.target.checked }))
          }
          className="h-5 w-5 cursor-pointer accent-primary"
        />
      </label>

      <label className="flex items-center justify-between gap-sm border-2 border-on-background bg-surface-container p-sm">
        <div>
          <p className="font-bold uppercase text-sm">
            Permitir respuestas con IA
          </p>
          <p className="font-mono text-[11px] text-on-surface-variant">
            Consume créditos. Usado solo cuando el bot no reconoce la pregunta.
          </p>
        </div>
        <input
          type="checkbox"
          checked={config.chatbot_llm_enabled}
          onChange={(e) =>
            setConfig((prev) => ({
              ...prev,
              chatbot_llm_enabled: e.target.checked,
            }))
          }
          className="h-5 w-5 cursor-pointer accent-primary"
        />
      </label>

      <div className="space-y-xs">
        <label
          htmlFor="persona"
          className="block font-bold uppercase text-sm"
        >
          Nombre del asistente
        </label>
        <input
          id="persona"
          type="text"
          maxLength={30}
          placeholder="Adapti"
          value={config.chatbot_persona_name ?? ''}
          onChange={(e) =>
            setConfig((prev) => ({
              ...prev,
              chatbot_persona_name: e.target.value,
            }))
          }
          className="w-full border-2 border-on-background bg-surface px-sm py-xs text-sm"
        />
      </div>

      <div className="space-y-xs">
        <p className="font-bold uppercase text-sm">
          Sugerencias extra ({config.chatbot_extra_suggestions.length}/
          {MAX_EXTRA_SUGGESTIONS})
        </p>
        <p className="font-mono text-[11px] text-on-surface-variant">
          Chips que aparecen bajo la pregunta del estudiante.
        </p>
        {config.chatbot_extra_suggestions.length > 0 && (
          <ul className="space-y-xs">
            {config.chatbot_extra_suggestions.map((s, idx) => (
              <li
                key={`${s}-${idx}`}
                className="flex items-center justify-between gap-xs border-2 border-on-background bg-surface px-sm py-xs"
              >
                <span className="truncate text-sm">{s}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSuggestion(idx)}
                  aria-label={`Quitar sugerencia ${idx + 1}`}
                  className="material-symbols-outlined text-on-surface-variant hover:text-error"
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        )}
        {remainingSlots > 0 && (
          <div className="flex gap-xs">
            <input
              type="text"
              maxLength={80}
              value={newSuggestion}
              onChange={(e) => setNewSuggestion(e.target.value)}
              placeholder="Ej: ¿De qué se trata el tema de hoy?"
              className="flex-1 border-2 border-on-background bg-surface px-sm py-xs text-sm"
            />
            <button
              type="button"
              onClick={handleAddSuggestion}
              disabled={!newSuggestion.trim()}
              className="border-2 border-on-background bg-secondary-container px-sm py-xs font-bold text-on-secondary-container shadow-[2px_2px_0_0_#1d1c17] disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Añadir
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="border-2 border-on-background bg-error-container px-sm py-xs font-mono text-xs uppercase text-on-error-container">
          {error}
        </p>
      )}
      {success && (
        <p className="border-2 border-on-background bg-primary-container px-sm py-xs font-mono text-xs uppercase text-on-primary-container">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full border-4 border-on-background bg-primary px-md py-sm font-headline text-sm font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-transform hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </form>
  );
}
