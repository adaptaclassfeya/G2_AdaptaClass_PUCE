import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Throttles `POST /ai/generate-questions` by authenticated userId rather than
 * IP, so a teacher hammering the LLM cannot dodge limits by switching
 * networks / VPNs, and shared-NAT classroom IPs are not collectively punished.
 *
 * Falls back to the default IP-based tracker when the request is somehow
 * unauthenticated (should not happen — the controller already guards with
 * JwtAuthGuard, but defense in depth).
 */
@Injectable()
export class AiThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req?.user?.sub;
    if (typeof userId === 'string' && userId.length > 0) {
      return `user:${userId}`;
    }
    return `ip:${req?.ip ?? 'unknown'}`;
  }
}
