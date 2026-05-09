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
 * Proxies the Z-API QR code image to avoid exposing the token to the browser.
 * Returns the PNG image directly.
 */
router.get('/qr-code', async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await fetch(`${ZAPI_BASE}/qr-code/image`, { headers: zapiHeaders });

    if (!r.ok) {
      res.status(r.status).json({ error: `Z-API returned ${r.status}` });
      return;
    }

    const contentType = r.headers.get('content-type') || 'image/png';
    const buffer = await r.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store'); // QR codes expire — never cache
    res.send(Buffer.from(buffer));
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
