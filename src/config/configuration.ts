export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  xai: {
    apiKey: process.env.XAI_API_KEY,
    supportAgentId: process.env.XAI_SUPPORT_AGENT_ID,
    chatUrl:
      process.env.XAI_SUPPORT_AGENT_CHAT_URL ||
      'https://api.x.ai/v1/support-agent/chat',
    sessionUrl:
      process.env.XAI_SUPPORT_AGENT_SESSION_URL ||
      'https://api.x.ai/v1/support-agent/session',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'sdp_mined',
  },
});
