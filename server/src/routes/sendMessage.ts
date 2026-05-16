import { Router, type Request, type Response } from 'express';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

const router = Router();

interface ZapiCredentials {
  instanceId: string;
  token: string;
  clientToken: string;
}

async function getZapiCredentials(empresaId: string): Promise<ZapiCredentials | null> {
  const { data, error } = await supabase
    .from('integracoes')
    .select('credentials')
    .eq('empresa_id', empresaId)
    .eq('tipo', 'zapi')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const creds = data.credentials as Partial<ZapiCredentials>;
  if (!creds.instanceId || !creds.token) return null;
  return creds as ZapiCredentials;
}

/** Middleware: validate API key */
function validateApiKey(req: Request, res: Response, next: () => void): void {
  if (config.apiKey && req.headers['x-api-key'] !== config.apiKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(validateApiKey);

async function zapiSendText(creds: ZapiCredentials, phone: string, message: string): Promise<void> {
  const url = `https://api.z-api.io/instances/${creds.instanceId}/token/${creds.token}/send-text`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': creds.clientToken || '' },
    body: JSON.stringify({ phone, message }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Z-API error ${res.status}: ${body.slice(0, 300)}`);
  }
}

async function zapiSendAudio(creds: ZapiCredentials, phone: string, base64: string): Promise<void> {
  const url = `https://api.z-api.io/instances/${creds.instanceId}/token/${creds.token}/send-audio`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': creds.clientToken || '' },
    body: JSON.stringify({ phone, audio: base64 }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Z-API error ${res.status}: ${body.slice(0, 300)}`);
  }
}

/**
 * POST /api/send-message
 * Body: { phone, conversa_id, empresa_id, type, message?, base64_audio? }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { phone, conversa_id, empresa_id, type, message, base64_audio } = req.body as {
    phone?: string;
    conversa_id?: string;
    empresa_id?: string;
    type?: string;
    message?: string;
    base64_audio?: string;
  };

  if (!phone || !conversa_id || !empresa_id || !type) {
    res.status(400).json({ error: 'phone, conversa_id, empresa_id and type are required' });
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

  const creds = await getZapiCredentials(empresa_id);
  if (!creds) {
    res.status(400).json({ error: 'Integração Z-API não configurada para esta empresa' });
    return;
  }

  try {
    if (type === 'text') {
      await zapiSendText(creds, phone, message!);
    } else if (type === 'audio') {
      await zapiSendAudio(creds, phone, base64_audio!);
    } else {
      res.status(400).json({ error: `Unsupported message type: ${type}` });
      return;
    }

    const { error: insertErr } = await supabase.from('chat_mensagens').insert({
      empresa_id,
      conversa_id,
      from_me: true,
      tipo: type === 'audio' ? 'audio' : 'text',
      conteudo: type === 'text' ? message : '[áudio]',
      status: 'sent',
    });

    if (insertErr) {
      console.error(`[send-message] DB insert failed: ${insertErr.message}`);
    }

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
