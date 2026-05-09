import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';

const router = Router();

const ZAPI_BASE = `https://api.z-api.io/instances/${config.zapiInstanceId}/token/${config.zapiToken}`;

const zapiHeaders = {
  'Client-Token': config.zapiClientToken,
  'Content-Type': 'application/json',
};

/**
 * GET /api/whatsapp/status
 * Returns the current Z-API instance connection status.
 */
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await fetch(`${ZAPI_BASE}/status`, { headers: zapiHeaders });
    const data = await r.json() as { connected?: boolean; smartphoneConnected?: boolean };

    res.json({
      connected: data.connected ?? false,
      smartphoneConnected: data.smartphoneConnected ?? false,
      state: data.connected ? 'open' : 'close',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error(`[whatsapp] status error: ${msg}`);
    res.status(500).json({ error: msg, connected: false, state: 'unknown' });
  }
});

/**
 * GET /api/whatsapp/qr-code
 * Returns the Z-API QR code as a JSON object { qrCode: "data:image/png;base64,..." }
 */
router.get('/qr-code', async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await fetch(`${ZAPI_BASE}/qr-code`, { headers: zapiHeaders });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error(`[whatsapp] qr-code Z-API error ${r.status}: ${body.slice(0, 200)}`);
      res.status(r.status).json({ error: `Z-API returned ${r.status}`, detail: body.slice(0, 200) });
      return;
    }

    const data = await r.json() as { value?: string };
    res.json({ qrCode: data.value || null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error(`[whatsapp] qr-code error: ${msg}`);
    res.status(500).json({ error: msg });
  }
});


/**
 * POST /api/whatsapp/disconnect
 * Disconnects the Z-API instance (logout).
 */
router.post('/disconnect', async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await fetch(`${ZAPI_BASE}/disconnect`, {
      method: 'GET',
      headers: zapiHeaders,
    });
    const data = await r.json() as Record<string, unknown>;
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    res.status(500).json({ error: msg });
  }
});

export default router;
