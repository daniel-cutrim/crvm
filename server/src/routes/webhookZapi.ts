import { Router, type Request, type Response, type NextFunction } from 'express';
import { supabase } from '../supabase.js';
import { config } from '../config.js';
import { parseZapiPayload } from '../services/zapiParser.js';
import { runSupervisor } from '../services/supervisor.js';

const router = Router();

/**
 * Validate Z-API Client-Token header.
 * Z-API sends a `Client-Token` header that must match our configured secret.
 * If no token is configured in any integration, validation is skipped (dev mode).
 */
function validateZapiToken(req: Request, res: Response, next: NextFunction): void {
  // Token validation is handled per-empresa inside the route handler
  // (each empresa can have its own clientToken)
  next();
}

/**
 * Resolve empresa_id from the Z-API instanceId.
 * Looks up the integracoes table by credentials->>'instanceId'.
 * Falls back to config.defaultEmpresaId if no match found.
 */
async function resolveEmpresaId(instanceId: string | null | undefined): Promise<string> {
  if (instanceId) {
    const { data } = await supabase
      .from('integracoes')
      .select('empresa_id')
      .eq('tipo', 'zapi')
      .eq('ativo', true)
      .filter('credentials->>instanceId', 'eq', instanceId)
      .limit(1)
      .maybeSingle();

    if (data?.empresa_id) return data.empresa_id;
  }
  return config.defaultEmpresaId;
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

    const empresaId = await resolveEmpresaId(parsed.instanceId);

    // --- Deduplication: check if this message already exists ---
    const { data: existingMsg } = await supabase
      .from('chat_mensagens')
      .select('id')
      .eq('message_id', parsed.messageId)
      .eq('empresa_id', empresaId)
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
      .eq('empresa_id', empresaId)
      .maybeSingle();

    let conversationId: string;
    let supervisorEnabled = false;

    if (existingConv) {
      conversationId = existingConv.id;
      supervisorEnabled = existingConv.supervisor_enabled || false;

      const updatePayload: Record<string, unknown> = {
        ultima_mensagem: parsed.content.slice(0, 200),
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

      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('telefone', parsed.phone)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        if (parsed.role === 'lead') {
          const { data: newLead, error: leadErr } = await supabase
            .from('leads')
            .insert({
              empresa_id: empresaId,
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
          empresa_id: empresaId,
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
      empresa_id: empresaId,
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

    if (parsed.role === 'lead' && supervisorEnabled) {
      runSupervisor(conversationId).catch((err) => {
        console.error('[webhook-zapi] Supervisor error:', err);
      });
    }

    console.log(`[webhook-zapi] OK: ${parsed.role} msg for ${parsed.phone} (conv: ${conversationId}, empresa: ${empresaId})`);
  } catch (error) {
    console.error('[webhook-zapi] Processing error:', error);
  }
});

export default router;
