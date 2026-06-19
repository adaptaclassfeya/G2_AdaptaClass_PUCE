import api from '../../../services/api';

export interface ChatbotConfig {
  chatbot_enabled: boolean;
  chatbot_llm_enabled: boolean;
  chatbot_persona_name: string | null;
  chatbot_extra_suggestions: string[];
}

/**
 * Teacher-facing client for /paralelos/:id/chatbot-config. The student
 * client lives in features/chat/services/chat.service.ts and only
 * surfaces the trimmed view the FAB needs.
 */
export const chatbotConfigService = {
  get: async (paraleloId: string): Promise<ChatbotConfig> => {
    const res = await api.get<ChatbotConfig>(
      `/paralelos/${paraleloId}/chatbot-config`,
    );
    return res.data;
  },

  update: async (
    paraleloId: string,
    patch: Partial<ChatbotConfig>,
  ): Promise<ChatbotConfig> => {
    const res = await api.patch<ChatbotConfig>(
      `/paralelos/${paraleloId}/chatbot-config`,
      patch,
    );
    return res.data;
  },
};
