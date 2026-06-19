import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Throttles `POST /chat/ask` per authenticated user (not IP) — same
 * tracker pattern as AiThrottlerGuard, but tied to the `chat-ask`
 * named throttler. 20 req/min is the user-facing ceiling for ANY chat
 * message; the LLM fallback path has its own tighter limiter
 * (LlmRateLimiterService) so unknown questions can't drain credits even
 * while the general bucket has headroom.
 */
@Injectable()
export class ChatThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req?.user?.sub;
    if (typeof userId === 'string' && userId.length > 0) {
      return `user:${userId}`;
    }
    return `ip:${req?.ip ?? 'unknown'}`;
  }
}
