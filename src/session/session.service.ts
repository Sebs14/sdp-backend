import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GrokMessage } from '../grok/interfaces/grok-message.interface.js';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  // TODO: Migrar a Redis en producción
  private readonly sessions = new Map<string, GrokMessage[]>();
  private readonly activeAgents = new Map<string, string>();
  private readonly caseData = new Map<string, Record<string, unknown>>();

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

  setActiveAgent(sessionId: string, supportAgentId: string): void {
    this.activeAgents.set(sessionId, supportAgentId);
    this.logger.debug(
      `Session ${sessionId}: switched to agent ${supportAgentId}`,
    );
  }

  getActiveAgent(sessionId: string): string | undefined {
    return this.activeAgents.get(sessionId);
  }

  /**
   * Merge new data into the accumulated case data for this session.
   * Used to store centro escolar info, classification, user details, etc.
   */
  mergeCaseData(
    sessionId: string,
    data: Record<string, unknown>,
  ): void {
    const existing = this.caseData.get(sessionId) ?? {};
    const merged = { ...existing, ...data };
    this.caseData.set(sessionId, merged);
    this.logger.debug(
      `Session ${sessionId}: merged case data — keys: ${Object.keys(merged).join(', ')}`,
    );
  }

  getCaseData(sessionId: string): Record<string, unknown> {
    return this.caseData.get(sessionId) ?? {};
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.activeAgents.delete(sessionId);
    this.caseData.delete(sessionId);
    this.logger.debug(`Session ${sessionId}: cleared`);
  }
}
