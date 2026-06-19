import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisDraftService } from './redis-draft.service';
import OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import * as mammoth from 'mammoth';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

type NormalizedQuestion = {
  texto: string;
  opciones: string[];
  respuestaCorrecta: number;
};

const CACHE_FRESHNESS_DAYS = 7;
const MAX_TEXTO_LEN = 500;
const MAX_OPCION_LEN = 200;
const OPTIONS_PER_QUESTION = 4;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private draftStore: RedisDraftService,
  ) {
    const apiKey =
      this.configService.get<string>('AI_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error(
        'AI provider API key is missing. Set AI_API_KEY (or OPENAI_API_KEY) in the environment.',
      );
    }

    this.openai = new OpenAI({
      apiKey,
      // Default provider: Groq (OpenAI-compatible endpoint). Overridable
      // via AI_API_URL to swap to any other compatible host.
      baseURL:
        this.configService.get<string>('AI_API_URL') ||
        'https://api.groq.com/openai/v1',
      timeout: 35_000,
      maxRetries: 2,
    });
  }

  async extractText(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.logger.debug(
      `extractText — mimetype=${file.mimetype} size=${file.size}B`,
    );

    try {
      let rawText: string;

      if (file.mimetype === 'application/pdf') {
        const result = await pdfParse(file.buffer);
        rawText = result.text;
      } else if (
        file.mimetype ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        rawText = result.value;
      } else if (file.mimetype.startsWith('text/')) {
        rawText = file.buffer.toString('utf-8');
      } else {
        throw new BadRequestException(
          'Unsupported file format. Please upload PDF, DOCX, or TXT.',
        );
      }

      const cleaned = this.cleanText(rawText);
      this.logger.debug(
        `extractText — rawChars=${rawText.length} cleanedWords=${cleaned.split(/\s+/).length}`,
      );
      return cleaned;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        'extractText failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Error extracting text from file');
    }
  }

  private cleanText(raw: string): string {
    const baseCleaned = raw
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s*\d+\s*$/gm, '')
      .replace(/[ \t]{2,}/g, ' ')
      .split('\n')
      .map((l) => l.trim())
      .join('\n')
      .trim();

    const markdown = this.normalizeToMarkdown(baseCleaned);
    return markdown.split(/\s+/).slice(0, 4000).join(' ');
  }

  private normalizeToMarkdown(text: string): string {
    const lines = text.split('\n');
    const out: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      const line = lines[i]; // i is a bounded numeric loop index — not user-controlled
      const trimmed = line.trim();

      if (!trimmed) {
        out.push('');
        continue;
      }

      const bulletMatch = trimmed.match(/^[-*•·]\s*(.+)$/);
      if (bulletMatch) {
        out.push(`- ${bulletMatch[1]}`);
        continue;
      }

      if (/[A-Za-zÁÉÍÓÚÑáéíóúñ0-9].*:$/.test(trimmed) && trimmed.length <= 80) {
        const next = (lines[i + 1] ?? '').trim();
        if (/^[-*•·]/.test(next) || /^\d+[.)]\s/.test(next)) {
          out.push(`## ${trimmed.replace(/:$/, '')}`);
          continue;
        }
      }

      const letters = trimmed.replace(/[^A-Za-zÁÉÍÓÚÑ]/g, '');
      if (
        letters.length >= 3 &&
        letters.length <= 60 &&
        letters === letters.toUpperCase() &&
        /^[A-ZÁÉÍÓÚÑ0-9\s.,;:¿?¡!()'"-]+$/.test(trimmed)
      ) {
        out.push(`## ${trimmed}`);
        continue;
      }

      out.push(trimmed);
    }

    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  private computeSourceHash(
    text: string,
    amount: number,
    difficulty: string,
    context: string | undefined,
  ): string {
    return createHash('sha256')
      .update(`${text}|${amount}|${difficulty}|${context ?? ''}`)
      .digest('hex');
  }

  async generateQuestions(
    text: string,
    tema: string,
    amount: number,
    difficulty: string,
    context: string | undefined,
    userId: string,
    force: boolean,
    filename: string,
    paraleloId?: string,
  ): Promise<{
    cached: boolean;
    questions: NormalizedQuestion[];
    source_id: string;
  }> {
    const sourceHash = this.computeSourceHash(
      text,
      amount,
      difficulty,
      context,
    );

    // Búsqueda en base de datos (Postgres) para verificar si ya existe este recurso
    // con preguntas válidas generadas hace poco.
    const since = new Date(Date.now() - CACHE_FRESHNESS_DAYS * 86_400_000);
    const existingSource = await this.prisma.questionSource.findFirst({
      where: {
        teacher_id: userId,
        source_hash: sourceHash,
        created_at: { gte: since },
      },
      include: {
        questions: true,
      },
    });

    if (existingSource && existingSource.questions.length > 0 && !force) {
      this.logger.log(
        `cache hit source_hash=${sourceHash} teacher=${userId} count=${existingSource.questions.length}`,
      );

      const cachedQuestions: NormalizedQuestion[] =
        existingSource.questions.map((q) => {
          const opciones = Array.isArray(q.opciones)
            ? (q.opciones as string[])
            : [];
          const correctIndex = opciones.indexOf(q.respuesta_correcta);
          return {
            texto: q.texto,
            opciones,
            respuestaCorrecta: correctIndex !== -1 ? correctIndex : 0,
          };
        });

      return {
        cached: true,
        questions: cachedQuestions,
        source_id: existingSource.id,
      };
    }

    const model =
      this.configService.get<string>('AI_MODEL') || 'llama-3.3-70b-versatile';

    const contextPart =
      context && context.trim() ? `\nConsideración extra: ${context.trim()}` : '';
    const prompt = `Genera ${amount} preguntas de opción múltiple para niños de 8-10 años (3ro-5to EGB), nivel ${difficulty}, basadas SOLO en este texto:

"""
${text}
"""${contextPart}

Reglas:
- Cada pregunta debe poder responderse leyendo el texto.
- 4 opciones por pregunta, exactamente una correcta.
- Lenguaje simple y claro para niños.
- No inventes datos que no estén en el texto.

Devuelve SOLO este JSON (sin markdown, sin texto extra):
{"preguntas":[{"texto":"...","opciones":["...","...","...","..."],"respuestaCorrecta":0}]}

respuestaCorrecta = índice 0-3 de la opción correcta.`;

    this.logger.debug(
      `generateQuestions — model=${model} amount=${amount} textWords=${text.split(/\s+/).length}`,
    );

    const startedAt = Date.now();
    try {
      const response = await this.callLlmWithJsonModeFallback(
        model,
        prompt,
        amount,
      );
      const latencyMs = Date.now() - startedAt;
      const choice = response.choices[0];
      const usage = response.usage;
      this.logger.log(
        `LLM usage — tema=${tema} latency=${latencyMs}ms finish=${choice?.finish_reason} ` +
          `prompt_tokens=${usage?.prompt_tokens ?? 'n/a'} completion_tokens=${usage?.completion_tokens ?? 'n/a'} ` +
          `total_tokens=${usage?.total_tokens ?? 'n/a'} cached=false`,
      );

      const rawQuestions = this.parseLlmResponse(choice);
      const validQuestions = this.validateLlmQuestions(rawQuestions);

      if (validQuestions.length === 0) {
        throw new Error(
          `LLM returned ${rawQuestions.length} item(s) but none passed validation`,
        );
      }
      if (validQuestions.length < rawQuestions.length) {
        this.logger.warn(
          `Filtered ${rawQuestions.length - validQuestions.length} invalid question(s) of ${rawQuestions.length} returned by LLM`,
        );
      }

      // Guardar el borrador en Redis utilizando la nueva clave (userId, sourceHash)
      await this.draftStore.saveDraft(userId, sourceHash, {
        questions: validQuestions,
        sourceHash,
      });

      // Crear o retornar la fuente de la pregunta
      let sourceId = existingSource?.id;
      if (!sourceId) {
        const source = await this.prisma.questionSource.create({
          data: {
            teacher_id: userId,
            paralelo_id: paraleloId || null,
            filename: filename || 'documento.pdf',
            source_hash: sourceHash,
            tema: tema,
          },
        });
        sourceId = source.id;
      }

      return { cached: false, questions: validQuestions, source_id: sourceId };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      this.logger.error(
        `generateQuestions failed after ${latencyMs}ms`,
        error instanceof Error ? error.stack : String(error),
      );
      throw this.mapLlmError(error);
    }
  }

  /**
   * Maps low-level provider errors (OpenAI-compatible SDK) into HTTP
   * exceptions the frontend can render usefully. Free-tier hosts return
   * 429 under TPM/RPM pressure — surfacing that as 500 would make the UI
   * say "internal error" when the right message is "try again soon".
   */
  private mapLlmError(error: unknown): HttpException {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? (error as { status?: number }).status
        : undefined;

    if (status === 429) {
      return new HttpException(
        'El proveedor de IA está saturado o alcanzó su cuota gratuita. Espera 1-2 minutos y vuelve a intentar.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (status === 401 || status === 403) {
      return new HttpException(
        'Credenciales de IA inválidas o sin permiso para el modelo configurado. Avisa al admin.',
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (status === 502 || status === 503 || status === 504) {
      return new ServiceUnavailableException(
        'El proveedor de IA no respondió a tiempo. Intenta de nuevo en un momento.',
      );
    }
    return new InternalServerErrorException(
      'No se pudieron generar las preguntas con la IA en este momento.',
    );
  }

  /**
   * Thin wrapper around `openai.chat.completions.create` for non-JSON
   * chat use-cases (e.g. the student chatbot fallback). Returns the
   * trimmed assistant text plus token usage so callers can log cost.
   *
   * Kept inside AiService so a single class owns provider config / retries
   * / timeouts. ChatService consumes this via dependency injection.
   */
  async chatCompletion(
    messages: ChatCompletionMessageParam[],
    opts: { maxTokens?: number; model?: string } = {},
  ): Promise<{
    text: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    finishReason?: string | null;
  }> {
    const model =
      opts.model ||
      this.configService.get<string>('AI_MODEL') ||
      'llama-3.3-70b-versatile';

    const response = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: opts.maxTokens ?? 200,
      temperature: 0.5,
      top_p: 0.9,
    });

    const choice = response.choices[0];
    // Some providers (reasoning / thinking models) split content from a
    // reasoning_content field. Try content first; if empty, look for the
    // reasoning field via a permissive cast so we don't lose the answer.
    const msg = choice?.message as unknown as
      | { content?: string; reasoning_content?: string }
      | undefined;
    const raw =
      (msg?.content ?? '').trim() || (msg?.reasoning_content ?? '').trim();
    const text = raw;

    return {
      text,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
      finishReason: choice?.finish_reason ?? null,
    };
  }

  private async callLlmWithJsonModeFallback(
    model: string,
    prompt: string,
    amount: number,
  ): Promise<ChatCompletion> {
    // Output budget tuned for ~80-token JSON envelope + ~120 tokens per
    // question on a 70B-class model. Keeping the cap tight matters more
    // on free tiers (lower TPM ceiling) than on Groq specifically, but
    // it's a fine default in either case.
    const baseParams: ChatCompletionCreateParamsNonStreaming = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300 + amount * 130,
      temperature: 0.4,
      top_p: 0.9,
    };

    try {
      return await this.openai.chat.completions.create({
        ...baseParams,
        response_format: { type: 'json_object' },
      });
    } catch (err) {
      if (this.isJsonModeUnsupportedError(err)) {
        this.logger.warn(
          'Provider rejected response_format=json_object — retrying without JSON mode.',
        );
        return this.openai.chat.completions.create(baseParams);
      }
      throw err;
    }
  }

  private isJsonModeUnsupportedError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const e = err as { status?: number; message?: string };
    if (e.status !== 400) return false;
    const msg = (e.message ?? '').toLowerCase();
    return (
      msg.includes('response_format') ||
      msg.includes('json_object') ||
      msg.includes('json mode')
    );
  }

  private parseLlmResponse(
    choice: ChatCompletion['choices'][number] | undefined,
  ): unknown[] {
    const msg = choice?.message as Record<string, unknown> | undefined;
    const content =
      (msg?.content as string | undefined) ||
      (msg?.reasoning_content as string | undefined) ||
      (msg?.reasoning as string | undefined) ||
      (
        msg?.tool_calls as { function?: { arguments?: string } }[] | undefined
      )?.[0]?.function?.arguments;

    if (!content) {
      throw new Error(
        `No content from LLM. finish_reason: ${choice?.finish_reason}`,
      );
    }

    const jsonStr = content.replace(/```(?:json)?/gi, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      this.logger.warn(
        `JSON.parse failed, attempting recovery (raw head: ${jsonStr.slice(0, 200)})`,
      );

      const fullMatch = jsonStr.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (fullMatch) {
        try {
          parsed = JSON.parse(fullMatch[0]);
        } catch {
          parsed = this.recoverPartialObjects(jsonStr);
        }
      } else {
        parsed = this.recoverPartialObjects(jsonStr);
      }
    }

    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      // k and arrayKey come from Object.keys() of a parsed JSON object — not user-controlled keys.
      // eslint-disable-next-line security/detect-object-injection
      const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      if (arrayKey) {
        this.logger.debug(`Unwrapping array from key=${arrayKey}`);
        // eslint-disable-next-line security/detect-object-injection
        return obj[arrayKey] as unknown[];
      }
    }
    throw new Error('LLM did not return an array of questions');
  }

  private recoverPartialObjects(jsonStr: string): unknown[] {
    const matches = [
      ...jsonStr.matchAll(/\{[^{}]*"respuestaCorrecta"\s*:\s*\d[^{}]*\}/g),
    ];
    if (matches.length === 0) {
      throw new Error(
        'Could not recover any valid questions from LLM response',
      );
    }
    this.logger.warn(
      `Recovered ${matches.length} question(s) from truncated response`,
    );
    return matches.map((m) => JSON.parse(m[0]));
  }

  private validateLlmQuestions(raw: unknown[]): NormalizedQuestion[] {
    const valid: NormalizedQuestion[] = [];
    for (const item of raw) {
      const normalized = this.normalizeOne(item);
      if (normalized) valid.push(normalized);
    }
    return valid;
  }

  private normalizeOne(item: unknown): NormalizedQuestion | null {
    if (!item || typeof item !== 'object') return null;
    const q = item as Record<string, unknown>;

    const textoRaw = q.texto ?? q.prompt;
    const opcionesRaw = q.opciones ?? q.options;
    const respuestaRaw = q.respuestaCorrecta ?? q.correctOptionIndex;

    if (typeof textoRaw !== 'string') return null;
    const texto = textoRaw.trim();
    if (!texto || texto.length > MAX_TEXTO_LEN) return null;

    if (
      !Array.isArray(opcionesRaw) ||
      opcionesRaw.length !== OPTIONS_PER_QUESTION
    )
      return null;
    const opciones: string[] = [];
    for (const o of opcionesRaw) {
      if (typeof o !== 'string') return null;
      const trimmed = o.trim();
      if (!trimmed || trimmed.length > MAX_OPCION_LEN) return null;
      opciones.push(trimmed);
    }

    if (typeof respuestaRaw !== 'number' || !Number.isInteger(respuestaRaw))
      return null;
    if (respuestaRaw < 0 || respuestaRaw >= OPTIONS_PER_QUESTION) return null;

    return { texto, opciones, respuestaCorrecta: respuestaRaw };
  }

  async saveQuestions(
    tema: string,
    sourceId: string | null,
    questions: any[],
    userId: string,
    paraleloId?: string,
  ) {
    try {
      if (questions.length === 0) {
        throw new BadRequestException('No hay preguntas para guardar.');
      }

      // Si existe un sourceId, eliminamos preguntas previas para evitar duplicidad al editar
      if (sourceId) {
        await this.prisma.question.deleteMany({
          where: { source_id: sourceId },
        });
      }

      // Guardamos cada pregunta en el banco global de preguntas
      const savedQuestions = [];
      for (const q of questions) {
        const saved = await this.prisma.question.create({
          data: {
            teacher_id: userId,
            paralelo_id: paraleloId || null,
            source_id: sourceId || null,
            tema: tema,
            texto: q.texto,
            opciones: q.opciones,
            respuesta_correcta: q.respuesta_correcta,
          },
        });
        savedQuestions.push(saved);
      }

      // Limpiamos el borrador de Redis si hay un sourceId
      if (sourceId) {
        const source = await this.prisma.questionSource.findUnique({
          where: { id: sourceId },
        });
        if (source) {
          await this.draftStore.clearDraft(userId, source.source_hash);
        }
      }

      return { count: savedQuestions.length, questions: savedQuestions };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        'saveQuestions failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Error saving questions to DB');
    }
  }
}
