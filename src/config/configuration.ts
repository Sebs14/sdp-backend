export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  xai: {
    apiKey: process.env.XAI_API_KEY,
    supportAgentId: process.env.XAI_SUPPORT_AGENT_ID,
    chatUrl:
      process.env.XAI_SUPPORT_AGENT_CHAT_URL ||
      'https://api.x.ai/v1/support-agent/chat',
    completionsUrl:
      process.env.XAI_COMPLETIONS_URL ||
      'https://api.x.ai/v1/chat/completions',
    extractionModel:
      process.env.XAI_EXTRACTION_MODEL || 'grok-3-mini',
    sessionUrl:
      process.env.XAI_SUPPORT_AGENT_SESSION_URL ||
      'https://api.x.ai/v1/support-agent/session',
  },
  voice: {
    livekitHost:
      process.env.LIVEKIT_HOST || 'wss://livekit-enterprise.grok.com',
    voiceApiUrl:
      process.env.XAI_VOICE_API_URL ||
      'wss://api.x.ai/v1/support-agent/voice',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'sdp_mined',
  },
  serviceDesk: {
    url:
      process.env.SERVICE_DESK_URL ||
      'https://atencion-mined-qa.goes.gob.sv/api/v3/requests',
    apiToken: process.env.SERVICE_DESK_TOKEN || '',
  },
});
