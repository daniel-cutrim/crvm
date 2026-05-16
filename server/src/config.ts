import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',

  // Used as fallback when the webhook doesn't match any integracoes record
  defaultEmpresaId: process.env.DEFAULT_EMPRESA_ID || '',

  // CORS: comma-separated allowed origins. Use '*' for dev
  corsOrigins: process.env.CORS_ORIGINS || '*',

  // Internal API key for supervisor routes (frontend → server)
  apiKey: process.env.API_KEY || '',
} as const;

export function validateConfig() {
  const required: (keyof typeof config)[] = [
    'supabaseUrl',
    'supabaseServiceRoleKey',
    'deepseekApiKey',
    'defaultEmpresaId',
  ];

  for (const key of required) {
    if (!config[key]) {
      console.error(`[config] Missing required env var: ${key}`);
      process.exit(1);
    }
  }

  if (!config.apiKey) {
    console.warn('[config] API_KEY not set — supervisor routes unprotected (dangerous in production)');
  }
}
