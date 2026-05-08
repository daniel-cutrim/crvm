import { Router, type Request, type Response, type NextFunction } from 'express';
import { supabase } from '../supabase.js';
import { config } from '../config.js';
import { parseZapiPayload } from '../services/zapiParser.js';
import { runSupervisor } from '../services/supervisor.js';

const router = Router();

/**
 * Validate Z-API Client-Token header.
 * Z-API sends a `Client-Token` header that must match our configured secret.
 * If ZAPI_CLIENT_TOKEN is not set, validation is skipped (dev mode).
 */
function validateZapiToken(req: Request, res: Response, next: NextFunction): void {
  if (!config.zapiClientToken) {
    // No token configured — skip validation (dev mode)
    next();
    return;
  }

  const clientToken = req.headers['client-token'] as string;

  if (clientToken !== config.zapiClientToken) {
    console.warn(`[webhook-zapi] Invalid client-token from ${req.ip}`);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

/**
 * POST /api/webhooks/zapi
 * Receives Z-API webhook events.
 * Returns 200 immediately — all async processing is fire-and-forget.
 */
router.post('/api/webhooks/zapi', validateZapiToken, async (req: Request, res: Response) => {
  // Return 200 immediately to prevent Z-API retries
  res.status(200).json({ status: 'received' });

  try {
    const body = req.body as Record<string, unknown>;

    const parsed = parseZapiPayload(body);

    if (!parsed) {
      return;
    }

    const clinicaId = config.defaultClinicaId;

    // --- Deduplication: check if this message already exists ---
    const { data: existingMsg } = await supabase
      .from('chat_mensagens')
      .select('id')
      .eq('message_id', parsed.messageId)
      .eq('clinica_id', clinicaId)
      .maybeSingle();

    if (existingMsg) {
      console.log(`[webhook-zapi] Duplicate message ${parsed.messageId} — skipping`);
      return;
    }

    // --- Upsert conversation ---
    const { data: existingConv } = await supabase
      .from('chat_conversas')
      .select('id, nao_lidas, supervisor_enabled')
      .eq('phone', parsed.phone)
      .eq('clinica_id', clinicaId)
      .maybeSingle();

    let conversationId: string;
    let supervisorEnabled = false;

    if (existingConv) {
      conversationId = existingConv.id;
      supervisorEnabled = existingConv.supervisor_enabled || false;

      const updatePayload: Record<string, unknown> = {
        ultima_mensagem: parsed.content.slice(0, 200), // Truncate for preview column
        ultima_mensagem_at: new Date().toISOString(),
        instance_id: parsed.instanceId,
      };

      if (parsed.role === 'lead') {
        if (parsed.contactName) updatePayload.nome = parsed.contactName;
        if (parsed.senderPhoto) updatePayload.foto_url = parsed.senderPhoto;
        updatePayload.extraction_pending = true;
        updatePayload.nao_lidas = (existingConv.nao_lidas || 0) + 1;
      }

      const { error: updateErr } = await supabase
        .from('chat_conversas')
        .update(updatePayload)
        .eq('id', conversationId);

      if (updateErr) {
        console.error(`[webhook-zapi] Failed to update conversation: ${updateErr.message}`);
      }
    } else {
      // --- Create new conversation + lead ---
      let leadId: string | null = null;

      // Check if lead exists by phone
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('clinica_id', clinicaId)
        .eq('telefone', parsed.phone)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        // Only create a lead for incoming messages (not outbound)
        if (parsed.role === 'lead') {
          const { data: newLead, error: leadErr } = await supabase
            .from('leads')
            .insert({
              clinica_id: clinicaId,
              nome: parsed.contactName,
              telefone: parsed.phone,
              origem: 'WhatsApp',
              etapa_funil: 'Novo Lead',
            })
            .select('id')
            .single();

          if (leadErr) {
            console.error(`[webhook-zapi] Failed to create lead: ${leadErr.message}`);
          } else {
            leadId = newLead?.id || null;
          }
        }
      }

      const { data: newConv, error: convErr } = await supabase
        .from('chat_conversas')
        .insert({
          clinica_id: clinicaId,
          phone: parsed.phone,
          nome: parsed.contactName,
          foto_url: parsed.senderPhoto,
          lead_id: leadId,
          instance_id: parsed.instanceId,
          ultima_mensagem: parsed.content.slice(0, 200),
          ultima_mensagem_at: new Date().toISOString(),
          nao_lidas: parsed.role === 'lead' ? 1 : 0,
          extraction_pending: parsed.role === 'lead',
        })
        .select('id, supervisor_enabled')
        .single();

      if (convErr || !newConv) {
        console.error(`[webhook-zapi] Failed to create conversation: ${convErr?.message || 'unknown'}`);
        return;
      }

      conversationId = newConv.id;
      supervisorEnabled = newConv.supervisor_enabled || false;
    }

    // --- Insert message ---
    const { error: msgErr } = await supabase.from('chat_mensagens').insert({
      clinica_id: clinicaId,
      conversa_id: conversationId,
      message_id: parsed.messageId,
      from_me: parsed.role === 'atendente',
      tipo: parsed.messageType,
      conteudo: parsed.content,
      media_url: parsed.mediaUrl,
      zapi_moment: parsed.moment,
      status: parsed.role === 'lead' ? 'delivered' : 'sent',
    });

    if (msgErr) {
      console.error(`[webhook-zapi] Failed to insert message: ${msgErr.message}`);
      return;
    }

    // --- If lead message + supervisor enabled: run supervisor async ---
    if (parsed.role === 'lead' && supervisorEnabled) {
      runSupervisor(conversationId).catch((err) => {
        console.error('[webhook-zapi] Supervisor error:', err);
      });
    }

    console.log(`[webhook-zapi] OK: ${parsed.role} msg for ${parsed.phone} (conv: ${conversationId})`);
  } catch (error) {
    console.error('[webhook-zapi] Processing error:', error);
  }
});

export default router;
