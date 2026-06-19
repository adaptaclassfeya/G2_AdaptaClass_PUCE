import api from '../../../services/api';

export interface GeneratedQuestionPreview {
  texto: string;
  opciones: string[];
  respuestaCorrecta: number;
}

export interface GenerateQuestionsResponse {
  cached: boolean;
  questions: GeneratedQuestionPreview[];
  source_id: string;
}

export const aiService = {
  generateQuestions: async (formData: FormData): Promise<GenerateQuestionsResponse> => {
    const response = await api.post<GenerateQuestionsResponse>('/ai/generate-questions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Saves a batch of (AI-generated or manually-typed) questions into the
  // teacher's global bank. The legacy `tema` field is intentionally not
  // sent — the backend stamps a default tag for schema compatibility.
  saveQuestions: async (data: {
    source_id: string | null;
    paralelo_id?: string;
    tema?: string;
    questions: Array<{ texto: string; opciones: string[]; respuestaCorrecta: number }>;
  }): Promise<unknown> => {
    const mappedQuestions = data.questions.map((q) => ({
      texto: q.texto,
      opciones: q.opciones,
      respuesta_correcta: q.opciones[q.respuestaCorrecta] || '',
    }));

    const response = await api.post('/ai/save-questions', {
      source_id: data.source_id,
      paralelo_id: data.paralelo_id,
      tema: data.tema,
      questions: mappedQuestions,
    });
    return response.data;
  },
};
