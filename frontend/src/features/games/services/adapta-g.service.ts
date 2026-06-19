import api from '../../../services/api';

export interface CreateRoomOptions {
  // Number of questions for the kahoot rounds.
  questionCount: number;
  mode?: 'NORMAL' | 'DINERO';
  miniGameRoute?: string;
  miniGameDuration?: number;
  // Paralelo scope for the question pool. Omit / undefined for "General".
  paraleloId?: string;
  // How many questions to inject into the minigame (0 = none on screen).
  gameQuestionCount?: number;
}

export const adaptaGService = {
  createRoom: (opts: CreateRoomOptions) => api.post('/adapta-g/create', opts),
  
  joinRoom: (pin: string) => 
    api.post(`/adapta-g/${pin}/join`),
  
  startMiniGame: (pin: string) =>
    api.post(`/adapta-g/${pin}/start-minigame`),

  miniGameTick: (pin: string, points: number) =>
    api.post(`/adapta-g/${pin}/minigame-tick`, { points }),

  startNextQuestion: (pin: string) => 
    api.post(`/adapta-g/${pin}/start-question`),
  
  answerQuestion: (pin: string, answerIndex: number) => 
    api.post(`/adapta-g/${pin}/answer`, { answerIndex }),

  getRoomState: (pin: string) =>
    api.get(`/adapta-g/${pin}`),
};
