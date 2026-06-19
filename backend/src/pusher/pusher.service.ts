import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class PusherService {
  private readonly appId: string | null;
  private readonly key: string | null;
  private readonly secret: string | null;
  private readonly cluster: string | null;
  private readonly logger = new Logger(PusherService.name);

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('PUSHER_APP_ID') ?? null;
    this.key = this.configService.get<string>('PUSHER_KEY') ?? null;
    this.secret = this.configService.get<string>('PUSHER_SECRET') ?? null;
    this.cluster = this.configService.get<string>('PUSHER_CLUSTER') ?? null;

    if (this.appId && this.key && this.secret && this.cluster) {
      this.logger.log(`Pusher initialized for cluster ${this.cluster}`);
    } else {
      this.logger.warn('Pusher credentials not found in env. Real-time events will not be sent.');
    }
  }

  async triggerEvent(channel: string, event: string, data: unknown) {
    if (!this.appId || !this.key || !this.secret || !this.cluster) {
      this.logger.debug(`Pusher mock: event "${event}" on channel "${channel}" (no credentials).`);
      return;
    }

    try {
      const body = JSON.stringify({
        name: event,
        channels: [channel],
        data: JSON.stringify(data),
      });

      const bodyMd5 = crypto.createHash('md5').update(body).digest('hex');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const path = `/apps/${this.appId}/events`;

      // Build sorted query string for signing (auth_signature excluded from signing).
      const params: Record<string, string> = {
        auth_key: this.key,
        auth_timestamp: timestamp,
        auth_version: '1.0',
        body_md5: bodyMd5,
      };
      const sortedQuery = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&');

      const toSign = `POST\n${path}\n${sortedQuery}`;
      const signature = crypto
        .createHmac('sha256', this.secret)
        .update(toSign)
        .digest('hex');

      const url = `https://api-${this.cluster}.pusher.com${path}?${sortedQuery}&auth_signature=${signature}`;

      await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error triggering Pusher event on channel ${channel}: ${msg}`);
    }
  }
}
