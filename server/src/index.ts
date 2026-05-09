import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { config, validateConfig } from './config.js';
import webhookZapiRouter from './routes/webhookZapi.js';
import supervisorRouter from './routes/supervisor.js';
import supervisorConfigRouter from './routes/supervisorConfig.js';
import sendMessageRouter from './routes/sendMessage.js';
import whatsappRouter from './routes/whatsapp.js';
import { runCrmExtraction } from './services/crmExtraction.js';

// Validate environment before anything else
validateConfig();

const app = express();

// CORS — restrict in production
const corsOptions: cors.CorsOptions = {
  origin: config.corsOrigins === '*'
    ? '*'
    : config.corsOrigins.split(',').map((o) => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Client-Token'],
};
app.use(cors(corsOptions));

// Parse JSON bodies (Z-API payloads can be large with media metadata)
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Routes
app.use(webhookZapiRouter);
app.use(supervisorRouter);
app.use('/api/supervisor-config', supervisorConfigRouter);
app.use('/api/send-message', sendMessageRouter);
app.use('/api/whatsapp', whatsappRouter);

// Global error handler (prevents unhandled rejections from crashing the server)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] Unhandled error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRM Extraction cron job — runs every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  try {
    await runCrmExtraction();
  } catch (error) {
    console.error('[cron] CRM extraction failed:', error);
  }
});

// Handle unhandled rejections globally
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});

// Start server
app.listen(config.port, () => {
  console.log(`[server] Z-API Server running on port ${config.port}`);
  console.log(`[server] Environment: ${config.nodeEnv}`);
  console.log(`[server] CORS origins: ${config.corsOrigins}`);
  console.log(`[server] Model: ${config.deepseekModel}`);
  console.log(`[server] Webhook: POST /api/webhooks/zapi`);
  console.log(`[server] CRM extraction cron: every 2 minutes`);
});
