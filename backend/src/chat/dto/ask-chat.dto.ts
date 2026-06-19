import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AskChatDto {
  // Max 300 chars is a soft cap to keep tokens predictable when the message
  // falls through to the LLM. The chat service additionally strips control
  // chars and refuses obvious prompt-injection patterns before matching.
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  message: string;

  /**
   * Optional route the student is currently on (e.g. "/games/snake").
   * The backend uses it to resolve which game (if any) is on screen so
   * the chatbot can answer "¿de qué trata este juego?" without the
   * client having to send a game id.
   *
   * Validation:
   *   - must start with "/" (absolute path)
   *   - only contains letters, digits, slashes, hyphens, underscores
   *   - max 200 chars
   *
   * The frontend already strips query and hash before sending. Anything
   * else is rejected at the DTO so it never reaches the regex-based
   * resolver, eliminating the ReDoS surface there.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\/[A-Za-z0-9/_-]{0,199}$/, {
    message: 'currentPath must be a clean absolute path',
  })
  currentPath?: string;
}
