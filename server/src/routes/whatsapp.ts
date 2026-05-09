import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';
import QRCode from 'qrcode';

const router = Router();

const ZAPI_BASE = `https://api.z-api.io/instances/${config.zapiInstanceId}/token/${config.zapiToken}`;

const zapiHeaders = {
  'Client-Token': config.zapiClientToken,
  'Content-Type': 'application/json',
};

/**
 * GET /api/whatsapp/status
 * Returns the current Z-API instance connection status.
 * Z-API may return { connected: boolean } or { value: "CONNECTED"|"DISCONNECTED" }
 */
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await fetch(`${ZAPI_BASE}/status`, { headers: zapiHeaders });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await r.json() as Record<string, any>;

    // Log raw Z-API response to help debug status detection
    console.log('[whatsapp] status raw:', JSON.stringify(data));

    // Handle multiple possible Z-API response formats
    let connected = false;
    if (typeof data.connected === 'boolean') {
      connected = data.connected;
    } else if (typeof data.connected === 'string') {
      connected = data.connected.toLowerCase() === 'true';
    } else if (typeof data.value === 'string') {
      connected = data.value.toUpperCase() === 'CONNECTED';
    } else if (typeof data.status === 'string') {
      connected = data.status.toUpperCase() === 'CONNECTED';
    }

    res.json({
      connected,
      smartphoneConnected: data.smartphoneConnected ?? false,
      state: connected ? 'open' : 'close',
      raw: data, // useful for debugging on frontend console
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error(`[whatsapp] status error: ${msg}`);
    res.status(500).json({ error: msg, connected: false, state: 'unknown' });
  }
});


/**
 * GET /api/whatsapp/qr-code
 * Fetches QR code text from Z-API and generates a PNG data URL using the qrcode library.
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
    const qrText = data.value;

    if (!qrText) {
      res.json({ qrCode: null });
      return;
    }

    // Generate PNG data URL from the QR code text
    const dataUrl = await QRCode.toDataURL(qrText, { width: 300, margin: 2 });
    res.json({ qrCode: dataUrl });
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
