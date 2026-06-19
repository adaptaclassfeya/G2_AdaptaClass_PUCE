import api from '../../../services/api';

export type ChatReplySource = 'deterministic' | 'cached' | 'llm' | 'canned';

export interface ChatAskResponse {
  reply: string;
  source: ChatReplySource;
  suggestions: string[];
}

export interface ChatConfigResponse {
  enabled: boolean;
  llm_enabled: boolean;
  persona_name: string;
  suggestions: string[];
}

/**
 * Client for /chat. The shape mirrors ChatService on the backend so the
 * UI can render `source` (e.g. tag "cached" responses) without an extra
 * round-trip. CSRF + auth cookies are handled by the shared `api` axios
 * instance — no need to wire anything else here.
 */
export const chatService = {
  getConfig: async (): Promise<ChatConfigResponse> => {
    const res = await api.get<ChatConfigResponse>('/chat/config');
    return res.data;
  },

  ask: async (
    message: string,
    currentPath?: string,
  ): Promise<ChatAskResponse> => {
    const safePath = normalizeCurrentPath(currentPath);
    const payload: { message: string; currentPath?: string } = { message };
    if (safePath) payload.currentPath = safePath;
    const res = await api.post<ChatAskResponse>('/chat/ask', payload);
    return res.data;
  },
};

/**
 * Mirror the backend DTO's rules client-side so a malformed location.
 * pathname never trips the 400 — silently drops it instead. Strips
 * query / hash and validates the same character class the DTO expects.
 */
function normalizeCurrentPath(input: string | undefined): string | undefined {
  if (typeof input !== 'string' || input.length === 0) return undefined;
  const head = input.split('?')[0].split('#')[0];
  if (head.length === 0 || head.length > 200) return undefined;
  if (!/^\/[A-Za-z0-9/_-]{0,199}$/.test(head)) return undefined;
  return head;
}
