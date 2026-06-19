// Sanitize untrusted strings before injecting them into an LLM prompt.
//
// Threat model: any text that ultimately comes from a user (a teacher's
// uploaded filename, a student's display name, a chat message echoed
// back, etc.) must NOT be able to issue instructions to the model.
//
// Approach:
//   1. Reject every control character (incl. zero-width / direction
//      overrides) so smuggled "system:" tokens can't slip through.
//   2. Whitelist a small set of characters: Unicode letters, digits,
//      whitespace, and basic punctuation. Everything else is dropped.
//      We allow accented letters because we run in Spanish.
//   3. Cap the length. A 4KB filename in a prompt is an attack surface
//      AND a budget problem — both pressures point to the same bound.
//
// This is intentionally permissive on punctuation (commas, periods,
// hyphens, parens, quotes) so legitimate filenames like
// "comprension_lectora_3ero.pdf" round-trip intact.

const DEFAULT_MAX_LENGTH = 80;

/**
 * Returns a copy of `input` safe to embed inside an LLM prompt.
 *
 * Edge cases:
 *   - empty / non-string input → empty string
 *   - input that is *only* disallowed characters → empty string
 *   - input longer than `maxLength` → truncated at a word boundary
 *     when possible, hard-cut otherwise
 */
export function sanitizeForPrompt(
  input: unknown,
  maxLength = DEFAULT_MAX_LENGTH,
): string {
  if (typeof input !== 'string' || input.length === 0) return '';

  // Whitelist allowed characters with a single positive regex. Anything
  // outside the allow-list (including ASCII control chars, zero-width
  // chars, RTL/LTR overrides, BOM, $, @, backticks, brackets, etc.)
  // becomes a space. Whitespace is then collapsed.
  //
  // Allow-list:
  //   \p{L}        — any Unicode letter (covers Ñ, á, ü, etc.)
  //   \p{N}        — any Unicode number
  //   [ \t\n\r]    — ASCII whitespace ONLY (excludes U+2028/U+2029)
  //   . , ; : ! ? — common sentence punctuation
  //   - _ ( ) " '  — common name / filename punctuation
  //
  // Note we deliberately do NOT use \s for whitespace because \s
  // matches Unicode separators that a smuggler could use to break
  // tokenizer assumptions in the model.
  const whitelisted = input
    .replace(/[^\p{L}\p{N} \t\n\r.,;:!?\-_()"']/gu, ' ')
    .replace(/[ \t\n\r]+/g, ' ')
    .trim();

  if (whitelisted.length <= maxLength) return whitelisted;

  // Truncate at the last whitespace inside the budget so we don't cut a
  // word in half. If no whitespace exists, hard-cut.
  const head = whitelisted.slice(0, maxLength);
  const lastSpace = head.lastIndexOf(' ');
  if (lastSpace >= Math.floor(maxLength * 0.6)) {
    return head.slice(0, lastSpace);
  }
  return head;
}
