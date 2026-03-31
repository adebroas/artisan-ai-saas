import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { CallState } from '../types/orchestrator.types';

const SESSION_PREFIX = 'orchestrator:session:';
const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2h

// Token d'injection — doit correspondre à ce que fournit ton RedisModule
export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class StateStoreService {
  private readonly logger = new Logger(StateStoreService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(sessionId: string): string {
    return `${SESSION_PREFIX}${sessionId}`;
  }

  async save(state: CallState): Promise<void> {
    await this.redis.set(
      this.key(state.sessionId),
      JSON.stringify(state),
      'EX',
      SESSION_TTL_SECONDS,
    );
    this.logger.debug(
      `State saved: ${state.sessionId} [step=${state.currentStep}]`,
    );
  }

  async get(sessionId: string): Promise<CallState | null> {
    const raw = await this.redis.get(this.key(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as CallState;
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
  }

  async exists(sessionId: string): Promise<boolean> {
    return (await this.redis.exists(this.key(sessionId))) > 0;
  }
}