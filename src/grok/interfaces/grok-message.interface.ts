/** Message format for the xAI Support Agent API. */
export interface SupportAgentMessage {
  role: 'ROLE_USER' | 'ROLE_ASSISTANT' | 'ROLE_TOOL';
  content?: Array<{ text: string }>;
  message_id?: string;
  created_at?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** Response from the xAI Support Agent /chat endpoint. */
export interface SupportAgentResponse {
  message: {
    role: string;
    content: Array<{ text: string }> | string;
    tool_calls?: ToolCall[];
  };
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  rag_results?: unknown[];
}

/** Internal message format used for session history. */
export interface GrokMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  functionsCalled?: string[];
}
