import { Router, type Request, type Response } from 'express';
import { supabase } from '../supabase.js';
import QRCode from 'qrcode';

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

function zapiBase(creds: ZapiCredentials) {
  return `https://api.z-api.io/instances/${creds.instanceId}/token/${creds.token}`;
}

function zapiHeaders(creds: ZapiCredentials) {
  return {
    'Client-Token': creds.clientToken || '',
    'Content-Type': 'application/json',
  };
}

/**
 * GET /api/whatsapp/status?empresa_id=UUID
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  const empresaId = req.query.empresa_id as string;
  if (!empresaId) {
    res.status(400).json({ error: 'empresa_id é obrigatório' });
    return;
  }

  const creds = await getZapiCredentials(empresaId);
  if (!creds) {
    res.status(404).json({ error: 'Integração Z-API não configurada para esta empresa', connected: false, state: 'unknown' });
    return;
  }

  try {
    const r = await fetch(`${zapiBase(creds)}/status`, { headers: zapiHeaders(creds) });
    const data = await r.json() as Record<string, unknown>;

    console.log('[whatsapp] status raw:', JSON.stringify(data));

    let connected = false;
    if (typeof data.connected === 'boolean') {
      connected = data.connected;
    } else if (typeof data.connected === 'string') {
      connected = data.connected.toLowerCase() === 'true';
    } else if (typeof data.value === 'string') {
      connected = (data.value as string).toUpperCase() === 'CONNECTED';
    } else if (typeof data.status === 'string') {
      connected = (data.status as string).toUpperCase() === 'CONNECTED';
    }

    res.json({
      connected,
      smartphoneConnected: data.smartphoneConnected ?? false,
      state: connected ? 'open' : 'close',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error(`[whatsapp] status error: ${msg}`);
    res.status(500).json({ error: msg, connected: false, state: 'unknown' });
  }
});


/**
 * GET /api/whatsapp/qr-code?empresa_id=UUID
 */
router.get('/qr-code', async (req: Request, res: Response): Promise<void> => {
  const empresaId = req.query.empresa_id as string;
  if (!empresaId) {
    res.status(400).json({ error: 'empresa_id é obrigatório' });
    return;
  }

  const creds = await getZapiCredentials(empresaId);
  if (!creds) {
    res.status(404).json({ error: 'Integração Z-API não configurada para esta empresa', qrCode: null });
    return;
  }

  try {
    const r = await fetch(`${zapiBase(creds)}/qr-code`, { headers: zapiHeaders(creds) });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error(`[whatsapp] qr-code Z-API error ${r.status}: ${body.slice(0, 200)}`);
      res.status(r.status).json({ error: `Z-API returned ${r.status}`, qrCode: null });
      return;
    }

    const data = await r.json() as { value?: string };
    if (!data.value) {
      res.json({ qrCode: null });
      return;
    }

    const dataUrl = await QRCode.toDataURL(data.value, { width: 300, margin: 2 });
    res.json({ qrCode: dataUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error(`[whatsapp] qr-code error: ${msg}`);
    res.status(500).json({ error: msg, qrCode: null });
  }
});


/**
 * POST /api/whatsapp/disconnect
 * Body: { empresa_id: string }
 */
router.post('/disconnect', async (req: Request, res: Response): Promise<void> => {
  const { empresa_id } = req.body as { empresa_id?: string };
  if (!empresa_id) {
    res.status(400).json({ error: 'empresa_id é obrigatório' });
    return;
  }

  const creds = await getZapiCredentials(empresa_id);
  if (!creds) {
    res.status(404).json({ error: 'Integração Z-API não configurada para esta empresa' });
    return;
  }

  try {
    const r = await fetch(`${zapiBase(creds)}/disconnect`, {
      method: 'GET',
      headers: zapiHeaders(creds),
    });
    const data = await r.json() as Record<string, unknown>;
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    res.status(500).json({ error: msg });
  }
});

export default router;
