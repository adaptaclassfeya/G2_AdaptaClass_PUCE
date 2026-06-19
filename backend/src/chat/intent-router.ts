// Deterministic intent matcher for the student chatbot.
//
// Why this exists (see CLAUDE.md "Chatbot"): we don't want every "¿qué
// tareas tengo?" question to spend tokens. The router pattern-matches the
// 80-90% of predictable questions and routes them to handlers that hit
// Postgres directly. Only unmatched messages fall back to the optional
// LLM path (and only if the teacher enabled it for the paralelo).
//
// Keep this file pure (no Nest DI, no Prisma). Handlers live next door.

export type IntentName =
  | 'GREETING'
  | 'HELP'
  | 'MISSIONS_PENDING'
  | 'MISSIONS_TIME_LEFT'
  | 'MISSIONS_COMPLETED'
  | 'NEXT_DEADLINE'
  | 'XP_STATUS'
  | 'STREAK'
  | 'LOGIN_BONUS'
  | 'NOTIFICATIONS_PENDING'
  | 'GAMES_AVAILABLE'
  | 'RECOMMEND_GAME'
  | 'RANKING'
  | 'ACHIEVEMENTS'
  | 'TOTAL_PLAY_TIME'
  | 'ANSWERS_STATS'
  | 'MY_TEACHER'
  | 'MY_PARALELO';

interface IntentRule {
  name: IntentName;
  // Patterns are matched against the *normalized* text (lowercase, no
  // diacritics, single spaces). Keep them ASCII to avoid surprises.
  patterns: RegExp[];
}

// Shared fragment: matches cuanto/cuanta/cuantos/cuantas as a single
// quantifier. Used by intents that count things ("cuántos juegos",
// "cuántas misiones", etc.).
const HOWMANY = '(cuant[oa]s?)';

// Order matters — first match wins. Place specific patterns above generic
// ones (e.g. MISSIONS_TIME_LEFT before MISSIONS_PENDING; TOTAL_PLAY_TIME
// before MISSIONS_TIME_LEFT only because TOTAL needs different keywords).
// Intent patterns are matched against short normalised strings (≤300 chars).
// None have catastrophic backtracking — bounded input makes ReDoS impractical.
const RULES: IntentRule[] = [
  {
    name: 'GREETING',
    patterns: [
      /^(hola|holi|hey|buenas|buenos dias|buenas tardes|buenas noches)\b/,
    ],
  },
  {
    name: 'HELP',
    patterns: [
      /\bayuda\b/,
      /\bque puedes hacer\b/,
      /\bcomo funciona\b/,
      /^\?+$/,
    ],
  },

  // ─── Missions ─────────────────────────────────────────────────
  // NEXT_DEADLINE is more specific than MISSIONS_PENDING (it asks about
  // "cuándo vence") so it goes first.
  {
    name: 'NEXT_DEADLINE',
    patterns: [
      /\bcuando\s+vence\b/,
      /\bproxim[oa]\s+(vencimiento|fecha)/,
      /\bque\s+mision\s+(vence|termina)\b/,
      /\bdeadline\b/,
    ],
  },
  {
    name: 'MISSIONS_TIME_LEFT',
    patterns: [
      new RegExp(
        `${HOWMANY}\\s+minutos?\\s+(me\\s+faltan|quedan|restan|tengo que jugar)`,
      ),
      /tiempo\s+(restante|que me falta|que falta)/,
      /minutos?\s+(para\s+terminar|para\s+completar|pendientes)/,
    ],
  },
  {
    name: 'MISSIONS_COMPLETED',
    patterns: [
      new RegExp(
        `\\b(que|cuales|${HOWMANY})\\s+(misiones|tareas|retos)\\s+(he|ya)\\s+(complet|termin|hech|cumpl)`,
      ),
      /\bmis(iones)?\s+complet(adas|as)\b/,
      /\btareas\s+complet(adas|as)\b/,
    ],
  },
  {
    name: 'MISSIONS_PENDING',
    patterns: [
      new RegExp(
        `\\b(que|cuales|cual|${HOWMANY})\\s+(tareas|misiones|retos)\\b`,
      ),
      /\bmis(iones)?\b/,
      /\btareas\b/,
      /\bretos?\b/,
      /\bque (tengo que|debo) hacer\b/,
      /\bpendientes?\b/,
    ],
  },

  // ─── Personal stats ───────────────────────────────────────────
  {
    name: 'XP_STATUS',
    patterns: [
      new RegExp(`\\b${HOWMANY}\\s+(xp|puntos|experiencia)\\b`),
      /\bmis (puntos|xp)\b/,
      /\bmi (xp|experiencia)\b/,
    ],
  },
  {
    name: 'STREAK',
    patterns: [
      /\bmi racha\b/,
      /\bracha\b/,
      new RegExp(`\\b${HOWMANY}\\s+dias\\s+(seguidos|llevo)\\b`),
    ],
  },
  {
    name: 'LOGIN_BONUS',
    patterns: [
      /\b(bono|bonus)\s+(diario|hoy|de\s+login)/,
      new RegExp(`\\b${HOWMANY}\\s+(bono|bonus)\\b`),
      /\bmi\s+bono\b/,
    ],
  },
  {
    name: 'ACHIEVEMENTS',
    patterns: [
      new RegExp(
        `\\b(que|cuales|${HOWMANY})\\s+(logros?|medallas?|insignias?|trofeos?)`,
      ),
      /\bmis\s+(logros?|medallas?|insignias?|trofeos?)\b/,
    ],
  },
  {
    name: 'TOTAL_PLAY_TIME',
    patterns: [
      new RegExp(
        `\\b${HOWMANY}\\s+(tiempo|minutos?)\\s+(he|llevo|llevamos)\\s+jugad`,
      ),
      /\btiempo\s+total\s+jugado\b/,
      /\bminutos\s+totales\b/,
    ],
  },
  {
    name: 'ANSWERS_STATS',
    patterns: [
      new RegExp(
        `\\b${HOWMANY}\\s+(preguntas|respuestas)\\s+(correctas|he respondido|he acertado|llevo)`,
      ),
      // eslint-disable-next-line security/detect-unsafe-regex
      /\b(que\s+)?porcentaje\s+(acierto|de aciertos|tengo)/,
      /\bmi\s+(precision|acierto)\b/,
      /\bque\s+tan\s+bien\s+respond/,
    ],
  },
  {
    name: 'RANKING',
    patterns: [
      /\branking\b/,
      /\bmi\s+(posicion|puesto|lugar)\b/,
      /\bcomo voy\s+(en|contra)\b/,
      // eslint-disable-next-line security/detect-unsafe-regex
      /\btabla\s+(de\s+)?(posiciones|ranking)\b/,
    ],
  },

  // ─── Other ────────────────────────────────────────────────────
  {
    name: 'NOTIFICATIONS_PENDING',
    patterns: [
      new RegExp(`\\b${HOWMANY}\\s+notificaciones?\\b`),
      /\bnotificaciones?\b/,
      // eslint-disable-next-line security/detect-unsafe-regex
      /\b(que|algo)\s+(hay\s+)?(de\s+)?nuevo\b/,
      /\bavisos?\b/,
    ],
  },
  {
    // ONLY match questions whose subject is the teacher's identity.
    // We deliberately drop the bare `\bmi\s+profe(sor)?\b` pattern: it
    // swallowed sentences like "qué temas me DIO mi profesor", which
    // are really about MATERIALS or TOPICS and should reach the LLM
    // with the personalized context block.
    name: 'MY_TEACHER',
    patterns: [
      /\bquien\s+es\s+mi\s+(profe|profesor|profesora|maestr[ao])/,
      /\bcomo\s+se\s+llama\s+mi\s+(profe|profesor|profesora|maestr[ao])/,
      // The optional `(el\s+)?` is the lone optional group — no
      // nested quantifier, no catastrophic backtracking. Inputs are
      // bounded to 300 chars by the DTO. False-positive ReDoS warning.
      // eslint-disable-next-line security/detect-unsafe-regex
      /\b(el\s+)?nombre\s+de\s+mi\s+(profe|profesor|profesora|maestr[ao])/,
      // Very short standalone queries ("mi profe?", "mi profesora")
      // — anchor to start/end so it doesn't eat full sentences.
      // eslint-disable-next-line security/detect-unsafe-regex
      /^(?:cual\s+es\s+)?mi\s+(profe|profesor|profesora|maestr[ao])\??$/,
    ],
  },
  {
    // Same logic: drop the bare `mi paralelo` catch-all. Keep only
    // the explicit "what paralelo am I in" phrasings.
    name: 'MY_PARALELO',
    patterns: [
      /\ben\s+que\s+(paralelo|curso|aula|clase)\s+estoy\b/,
      /\bcual\s+es\s+mi\s+(paralelo|curso|aula|clase)\b/,
      /\bcomo\s+se\s+llama\s+mi\s+(paralelo|curso|aula|clase)\b/,
      /^mi\s+(paralelo|curso|aula|clase)\??$/,
    ],
  },
  {
    // Tight: must be a recommendation REQUEST ("recomiéndame", "qué
    // juego pruebo / juego / debería jugar"). Generic "qué juego" or
    // "a qué juego" alone is too ambiguous and now reaches the LLM.
    name: 'RECOMMEND_GAME',
    patterns: [
      // eslint-disable-next-line security/detect-unsafe-regex
      /\b(que|cual)\s+juego\s+(me\s+)?(recomiendas?|pruebo|juego|deberia)/,
      /\brecomiend[aoe]m?e?\s+(un|algun)?\s*juego/,
    ],
  },
  {
    // Tight: only match catalog-listing questions ("¿qué juegos hay?",
    // "¿qué juegos puedo jugar?", "¿cuántos juegos hay?"). Open-ended
    // questions like "¿de qué tratan los juegos?" now reach the LLM.
    name: 'GAMES_AVAILABLE',
    patterns: [
      new RegExp(`\\b${HOWMANY}\\s+juegos?\\b`),
      /\bque\s+juegos?\s+(hay|tengo|puedo\s+jugar|estan\s+disponibles)/,
      /\bjuegos?\s+(hay|tengo|puedo\s+jugar|disponibles)\b/,
      /\bcatalogo\s+de\s+juegos\b/,
      /\blistame?\s+los?\s+juegos/,
    ],
  },
];

/**
 * Strip diacritics, lowercase, collapse whitespace, and remove
 * non-alphanumeric noise (keeps ? for the help shortcut).
 */
export function normalizeMessage(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9?¿\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchIntent(message: string): IntentName | null {
  const normalized = normalizeMessage(message);
  if (!normalized) return null;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(normalized))) {
      return rule.name;
    }
  }
  return null;
}

// Soft prompt-injection sniffer. Heuristic only — its job is to save
// tokens, not to be a security boundary (the LLM has no tool access or
// PII anyway, see ChatService for the threat model). On match, the
// service responds with a friendly canned reply + chips, NOT a 400.
// Patterns are applied to short (≤300 char) normalised strings — ReDoS risk negligible.
const INJECTION_PATTERNS: RegExp[] = [
  // eslint-disable-next-line security/detect-unsafe-regex
  /ignora\s+(todo\s+)?lo\s+anterior/i,
  // eslint-disable-next-line security/detect-unsafe-regex
  /olvida\s+(tus\s+)?instrucciones/i,
  /\bahora\s+eres\b/i,
  /\bnuevo\s+rol\b/i,
  /\bsystem\s*[:\]]/i,
  /\[\s*system\s*\]/i,
  /override\s+(previous|system)/i,
];

export function looksLikeInjection(message: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(message));
}
