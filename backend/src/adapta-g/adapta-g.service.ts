import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AdaptaGRedisService, AdaptaGRoomState } from './adapta-g-redis.service';
import { PusherService } from '../pusher/pusher.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdaptaGService {
  private readonly logger = new Logger(AdaptaGService.name);

  constructor(
    private readonly redisService: AdaptaGRedisService,
    private readonly pusherService: PusherService,
    private readonly prisma: PrismaService,
  ) {}

  private generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  }

  async createRoom(
    teacherId: string,
    // Number of questions for the kahoot rounds.
    questionCount: number,
    mode: 'NORMAL' | 'DINERO' = 'NORMAL',
    miniGameRoute?: string,
    miniGameDuration?: number,
    // Exact-match paralelo scope: a specific id pulls only that classroom's
    // questions; falsy (the "General" option) pulls only the unassigned ones.
    // Mirrors the Bank page filter so the count the teacher saw matches the pool.
    paraleloId?: string,
    // How many questions to inject into the Phaser minigame. The game and the
    // kahoot draw disjoint slices from the same shuffled pool.
    gameQuestionCount = 0,
  ) {
    const allQuestions = await this.prisma.question.findMany({
      where: { teacher_id: teacherId, paralelo_id: paraleloId || null },
    });

    if (allQuestions.length === 0) {
      throw new BadRequestException(
        'No hay preguntas disponibles para el paralelo seleccionado.',
      );
    }

    const normalize = (q: (typeof allQuestions)[number]) => {
      const opciones = Array.isArray(q.opciones) ? (q.opciones as string[]) : [];
      const correctIndex = opciones.indexOf(q.respuesta_correcta);
      return {
        id: q.id,
        texto: q.texto,
        opciones,
        respuestaCorrecta: correctIndex !== -1 ? correctIndex : 0,
      };
    };

    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());

    // Clamp both counts to what's actually available, drawing the minigame
    // slice first and the kahoot slice from the remainder so they never overlap.
    const safeGameCount = Math.max(0, Math.min(gameQuestionCount, shuffled.length));
    const safeKahootCount = Math.max(
      0,
      Math.min(questionCount, shuffled.length - safeGameCount),
    );

    const gameQuestions = shuffled
      .slice(0, safeGameCount)
      .map(normalize)
      .map((q, i) => ({ ...q, index: i }));
    const kahootQuestions = shuffled
      .slice(safeGameCount, safeGameCount + safeKahootCount)
      .map(normalize)
      .map((q, i) => ({ ...q, index: i }));

    const pin = this.generatePin();
    const roomState: AdaptaGRoomState = {
      pin,
      teacherId,
      mode,
      state: 'LOBBY',
      miniGameRoute,
      miniGameDuration,
      questions: kahootQuestions,
      gameQuestions,
      currentQuestionIndex: -1,
      questionStartedAt: null,
      answeredBy: [],
      players: {},
    };

    await this.redisService.saveRoom(pin, roomState);
    return {
      pin,
      questions: kahootQuestions.length,
      gameQuestions: gameQuestions.length,
    };
  }

  async getRoomState(pin: string) {
    const room = await this.redisService.getRoom(pin);
    if (!room) throw new NotFoundException('Sala no encontrada');
    
    const safeQuestions = room.questions.map(q => ({
      index: q.index,
      texto: q.texto,
      opciones: q.opciones
    }));

    // Minigame questions carry the correct answer because the Phaser scene
    // scores locally (same contract as GET /games/:id/questions). They're a
    // disjoint set from the kahoot questions, so this doesn't leak answers.
    const gameQuestions = (room.gameQuestions ?? []).map(q => ({
      id: q.id,
      index: q.index,
      texto: q.texto,
      opciones: q.opciones,
      respuestaCorrecta: q.respuestaCorrecta,
    }));

    return {
      pin: room.pin,
      state: room.state,
      mode: room.mode,
      miniGameRoute: room.miniGameRoute,
      miniGameDuration: room.miniGameDuration,
      miniGameStartedAt: room.miniGameStartedAt,
      currentQuestionIndex: room.currentQuestionIndex,
      players: room.players,
      answeredBy: room.answeredBy,
      totalQuestions: room.questions.length,
      gameQuestions, // empty unless the teacher enabled questions in the minigame
      currentQuestion: room.state === 'PLAYING' ? safeQuestions[room.currentQuestionIndex] : null,
      safeQuestions: room.mode === 'DINERO' ? safeQuestions : undefined // Dinero mode needs all questions client-side
    };
  }

  async joinRoom(pin: string, studentName: string, studentId: string) {
    const room = await this.redisService.getRoom(pin);
    if (!room) throw new NotFoundException('Sala no encontrada');
    if (room.state !== 'LOBBY') throw new BadRequestException('La partida ya ha comenzado');

    if (!room.players[studentId]) {
      const sessionId = randomUUID();
      try {
        let game = null;
        if (room.miniGameRoute) {
          // This relies on finding the game by its default config. It's a bit
          // hacky, but safe since config is known.
          const games = await this.prisma.game.findMany();
          game = games.find(g => (g.config_default as any)?.rutaJuego === room.miniGameRoute);
        }
        if (!game) {
          game = await this.prisma.game.findFirst(); // Fallback
        }
        
        if (game) {
          await this.prisma.gameSession.create({
            data: {
              id: sessionId,
              student_id: studentId,
              game_id: game.id,
              minutos_jugados: 0,
              preguntas_correctas: 0,
              preguntas_intentadas: 0,
            }
          });
        }
      } catch (err) {
        this.logger.error(`Failed to create GameSession for student ${studentId}`, err);
      }

      room.players[studentId] = { 
        name: studentName, 
        score: 0, 
        money: 0, 
        streak: 0, 
        currentQuestionIndex: 0,
        gameSessionId: sessionId
      };
      await this.redisService.saveRoom(pin, room);
      
      await this.pusherService.triggerEvent(`room-${pin}`, 'player-joined', {
        id: studentId,
        name: studentName,
        totalPlayers: Object.keys(room.players).length
      });
    }

    return { success: true };
  }

  async startMiniGame(pin: string, teacherId: string) {
    const room = await this.redisService.getRoom(pin);
    if (!room) throw new NotFoundException('Sala no encontrada');
    if (room.teacherId !== teacherId) throw new BadRequestException('No eres el dueño de esta sala');
    if (!room.miniGameRoute) throw new BadRequestException('No hay minijuego configurado');

    room.state = 'MINIGAME';
    room.miniGameStartedAt = Date.now();
    await this.redisService.saveRoom(pin, room);

    await this.pusherService.triggerEvent(`room-${pin}`, 'minigame-started', {
      startedAt: room.miniGameStartedAt,
      duration: room.miniGameDuration
    });

    return { state: 'MINIGAME' };
  }

  async miniGameTick(pin: string, studentId: string, points: number) {
    const room = await this.redisService.getRoom(pin);
    if (!room || room.state !== 'MINIGAME') return { success: false };

    if (room.players[studentId]) {
      if (room.mode === 'DINERO') {
        room.players[studentId].money += points;
      } else {
        room.players[studentId].score += points;
      }
      await this.redisService.saveRoom(pin, room);
      
      // Notify teacher ranking update silently
      await this.pusherService.triggerEvent(`room-${pin}`, 'player-score-update', {
        id: studentId,
        score: room.players[studentId].score,
        money: room.players[studentId].money
      });
    }

    return { success: true };
  }

  async startNextQuestion(pin: string, teacherId: string) {
    const room = await this.redisService.getRoom(pin);
    if (!room) throw new NotFoundException('Sala no encontrada');
    if (room.teacherId !== teacherId) throw new BadRequestException('No eres el dueño de esta sala');

    if (room.mode === 'DINERO') {
      // Asynchronous mode: start once, broadcast "go", and students handle their own state
      room.state = 'PLAYING';
      room.questionStartedAt = Date.now();
      await this.redisService.saveRoom(pin, room);
      
      const safeQuestions = room.questions.map(q => ({
        index: q.index,
        texto: q.texto,
        opciones: q.opciones
      }));

      await this.pusherService.triggerEvent(`room-${pin}`, 'game-started-async', {
        questions: safeQuestions
      });
      return { state: 'PLAYING' };
    }

    // Synchronous NORMAL mode
    room.currentQuestionIndex++;
    if (room.currentQuestionIndex >= room.questions.length) {
      room.state = 'FINISHED';
      await this.redisService.saveRoom(pin, room);
      
      const ranking = Object.values(room.players).sort((a, b) => b.score - a.score);
      await this.pusherService.triggerEvent(`room-${pin}`, 'game-finished', { ranking });
      return { state: 'FINISHED', ranking };
    }

    room.state = 'PLAYING';
    room.questionStartedAt = Date.now();
    room.answeredBy = [];
    await this.redisService.saveRoom(pin, room);

    const question = room.questions[room.currentQuestionIndex];
    
    await this.pusherService.triggerEvent(`room-${pin}`, 'new-question', {
      index: room.currentQuestionIndex,
      texto: question.texto,
      opciones: question.opciones,
      timeLimit: 20
    });

    return { state: 'PLAYING', questionIndex: room.currentQuestionIndex };
  }

  async answerQuestion(pin: string, studentId: string, answerIndex: number) {
    const room = await this.redisService.getRoom(pin);
    if (!room) throw new NotFoundException('Sala no encontrada');
    if (room.state !== 'PLAYING') throw new BadRequestException('No hay una pregunta activa');
    
    if (room.mode === 'DINERO') {
      const player = room.players[studentId];
      if (!player) throw new NotFoundException('Jugador no encontrado');
      if (player.currentQuestionIndex >= room.questions.length) throw new BadRequestException('Ya terminaste');

      const question = room.questions[player.currentQuestionIndex];
      const correct = answerIndex === question.respuestaCorrecta;
      
      if (player.gameSessionId) {
        this.prisma.questionAttempt.create({
          data: {
            id: randomUUID(),
            student_id: studentId,
            question_id: question.id,
            game_session_id: player.gameSessionId,
            correcta: correct
          }
        }).catch(err => this.logger.error(`Failed to save QuestionAttempt: ${err}`));
      }
      
      let moneyEarned = 0;
      if (correct) {
        // Progression: 1, 5, 15, 30, 50, 100...
        const rewards = [1, 5, 15, 30, 50, 75, 100, 150, 200, 300];
        moneyEarned = rewards[Math.min(player.streak, rewards.length - 1)];
        player.money += moneyEarned;
        player.streak++;
      } else {
        player.streak = 0; // Reset streak
      }

      player.currentQuestionIndex++;
      await this.redisService.saveRoom(pin, room);

      // Notify teacher ranking update
      await this.pusherService.triggerEvent(`room-${pin}`, 'player-score-update', {
        id: studentId,
        money: player.money,
        finished: player.currentQuestionIndex >= room.questions.length
      });

      // Check if this player finished all questions
      if (player.currentQuestionIndex >= room.questions.length) {
        // Auto-finish the game for everyone
        room.state = 'FINISHED';
        await this.redisService.saveRoom(pin, room);
        
        const ranking = Object.values(room.players).sort((a, b) => b.money - a.money);
        await this.pusherService.triggerEvent(`room-${pin}`, 'game-finished', { ranking });
      }

      return { 
        correct, 
        pointsEarned: moneyEarned, 
        totalScore: player.money,
        nextIndex: player.currentQuestionIndex,
        finished: player.currentQuestionIndex >= room.questions.length
      };
    }

    // NORMAL MODE
    if (room.answeredBy.includes(studentId)) throw new BadRequestException('Ya respondiste esta pregunta');

    const question = room.questions[room.currentQuestionIndex];
    let pointsEarned = 0;
    const correct = answerIndex === question.respuestaCorrecta;

    if (room.players[studentId]?.gameSessionId) {
      this.prisma.questionAttempt.create({
        data: {
          id: randomUUID(),
          student_id: studentId,
          question_id: question.id,
          game_session_id: room.players[studentId].gameSessionId,
          correcta: correct
        }
      }).catch(err => this.logger.error(`Failed to save QuestionAttempt: ${err}`));
    }

    if (correct) {
      const timeElapsed = Date.now() - (room.questionStartedAt || Date.now());
      const maxTime = 20000;
      if (timeElapsed < maxTime) {
        pointsEarned = 500 + Math.round((1 - timeElapsed / maxTime) * 500);
      } else {
        pointsEarned = 500;
      }
    }

    if (room.players[studentId]) {
      room.players[studentId].score += pointsEarned;
      room.answeredBy.push(studentId);
      await this.redisService.saveRoom(pin, room);
    }

    await this.pusherService.triggerEvent(`room-${pin}`, 'player-answered', {
      totalAnswered: room.answeredBy.length
    });

    return { correct, pointsEarned, totalScore: room.players[studentId]?.score || 0 };
  }
}
