import { Router, type Request, type Response, type NextFunction } from 'express';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

const router = Router();

/**
 * Optional API key middleware for supervisor routes.
 * Frontend sends `x-api-key` header. If API_KEY env var is set, it must match.
 * If API_KEY is not set, requests pass through (dev mode).
 */
function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!config.apiKey) {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] as string;

  if (apiKey !== config.apiKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

/**
 * GET /api/conversations/:id/supervisor-guidance
 * Returns the current supervisor guidance for a conversation.
 */
router.get('/api/conversations/:id/supervisor-guidance', validateApiKey, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || id.length < 10) {
    res.status(400).json({ error: 'Invalid conversation ID' });
    return;
  }

  const { data, error } = await supabase
    .from('chat_conversas')
    .select('supervisor_guidance, supervisor_guidance_at, supervisor_enabled')
    .eq('id', id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  res.json({
    guidance: data.supervisor_guidance || null,
    updated_at: data.supervisor_guidance_at || null,
    supervisor_enabled: data.supervisor_enabled || false,
  });
});

/**
 * PATCH /api/conversations/:id/supervisor-toggle
 * Toggle supervisor_enabled for a conversation.
 * Body: { "enabled": true | false }
 */
router.patch('/api/conversations/:id/supervisor-toggle', validateApiKey, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { enabled } = req.body as { enabled?: boolean };

  if (!id || id.length < 10) {
    res.status(400).json({ error: 'Invalid conversation ID' });
    return;
  }

  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled must be a boolean' });
    return;
  }

  const { error } = await supabase
    .from('chat_conversas')
    .update({ supervisor_enabled: enabled })
    .eq('id', id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ status: 'ok', supervisor_enabled: enabled });
});

export default router;
