import { Router, type Request, type Response } from 'express';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

const router = Router();

/** Middleware: validate API key */
function validateApiKey(req: Request, res: Response, next: () => void): void {
  if (config.apiKey && req.headers['x-api-key'] !== config.apiKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(validateApiKey);

/**
 * Calls the Z-API send text message endpoint.
 */
async function zapiSendText(phone: string, message: string): Promise<void> {
  const url = `https://api.z-api.io/instances/${config.zapiInstanceId}/token/${config.zapiToken}/send-text`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': config.zapiClientToken,
    },
    body: JSON.stringify({ phone, message }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Z-API error ${res.status}: ${body.slice(0, 300)}`);
  }
}

/**
 * Calls the Z-API send audio (base64) endpoint.
 */
async function zapiSendAudio(phone: string, base64: string): Promise<void> {
  const url = `https://api.z-api.io/instances/${config.zapiInstanceId}/token/${config.zapiToken}/send-audio`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': config.zapiClientToken,
    },
    body: JSON.stringify({ phone, audio: base64 }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Z-API error ${res.status}: ${body.slice(0, 300)}`);
  }
}

/**
 * POST /api/send-message
 * Sends a WhatsApp message via Z-API and saves it to the database.
 *
 * Body:
 *   - phone: string            — recipient phone (digits only, with country code)
 *   - conversa_id: string      — conversation UUID
 *   - clinica_id: string       — clinic UUID
 *   - type: 'text' | 'audio'  — message type
 *   - message?: string         — text content (required for type=text)
 *   - base64_audio?: string    — base64 audio (required for type=audio)
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { phone, conversa_id, clinica_id, type, message, base64_audio } = req.body as {
    phone?: string;
    conversa_id?: string;
    clinica_id?: string;
    type?: string;
    message?: string;
    base64_audio?: string;
  };

  if (!phone || !conversa_id || !clinica_id || !type) {
    res.status(400).json({ error: 'phone, conversa_id, clinica_id and type are required' });
    return;
  }

  if (type === 'text' && !message?.trim()) {
    res.status(400).json({ error: 'message is required for type=text' });
    return;
  }

  if (type === 'audio' && !base64_audio) {
    res.status(400).json({ error: 'base64_audio is required for type=audio' });
    return;
  }

  try {
    // 1. Send via Z-API
    if (type === 'text') {
      await zapiSendText(phone, message!);
    } else if (type === 'audio') {
      await zapiSendAudio(phone, base64_audio!);
    } else {
      res.status(400).json({ error: `Unsupported message type: ${type}` });
      return;
    }

    // 2. Save message to database as sent (from_me = true)
    const { error: insertErr } = await supabase.from('chat_mensagens').insert({
      clinica_id,
      conversa_id,
      from_me: true,
      tipo: type === 'audio' ? 'audio' : 'text',
      conteudo: type === 'text' ? message : '[áudio]',
      status: 'sent',
    });

    if (insertErr) {
      // Message was sent but DB insert failed — log but don't fail the request
      console.error(`[send-message] DB insert failed: ${insertErr.message}`);
    }

    // 3. Update conversation's last message
    if (type === 'text') {
      await supabase
        .from('chat_conversas')
        .update({
          ultima_mensagem: message!.slice(0, 200),
          ultima_mensagem_at: new Date().toISOString(),
        })
        .eq('id', conversa_id);
    }

    res.json({ status: 'sent' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[send-message] Error: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

export default router;
