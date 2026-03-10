import { GrokMessage } from './grok-message.interface.js';

export interface GrokChoice {
  index: number;
  message: GrokMessage;
  finish_reason: string;
}

export interface GrokResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GrokChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
