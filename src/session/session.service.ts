import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GrokMessage } from '../grok/interfaces/grok-message.interface.js';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  // TODO: Migrar a Redis en producción
  private readonly sessions = new Map<string, GrokMessage[]>();

  generateSessionId(): string {
    return randomUUID();
  }

  getHistory(sessionId: string): GrokMessage[] {
    const history = this.sessions.get(sessionId);
    if (history) {
      return history;
    }

    // No system prompt — the xAI Support Agent has its own prompt
    const initial: GrokMessage[] = [];
    this.sessions.set(sessionId, initial);
    return initial;
  }

  saveHistory(sessionId: string, messages: GrokMessage[]): void {
    this.sessions.set(sessionId, messages);
    this.logger.debug(
      `Session ${sessionId}: saved ${messages.length} messages`,
    );
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger.debug(`Session ${sessionId}: cleared`);
  }
}
