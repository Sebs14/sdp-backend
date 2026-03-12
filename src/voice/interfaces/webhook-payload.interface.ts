/**
 * Payload received from xAI's dispatcher when a phone call arrives.
 *
 * Flow: Phone → Twilio → SIP → xAI LiveKit → POST /voice/webhook
 */
export interface WebhookPayload {
  /** LiveKit room token — used to join the call */
  token: string;
  /** Parsed LiveKit webhook event body */
  body: Record<string, unknown>;
  /** xAI Support Agent ID (same one used for text chat) */
  supportAgentId: string;
  /** Caller's phone number (E.164 format) */
  phoneNumber: string;
  /** Unique conversation ID for this call */
  conversationId: string;
  /** Team ID from xAI Console */
  teamId: string;
  /** LiveKit room name */
  roomName: string;
  /** Whether DTMF tones are enabled */
  dtmfEnabled: boolean;
  /** Participant info from the LiveKit event */
  participant: Record<string, unknown>;
}
