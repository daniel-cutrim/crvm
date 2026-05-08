import { z } from 'zod';
import { supabase } from '../supabase.js';
import { config } from '../config.js';
import { CRM_EXTRACTION_PROMPT } from '../prompts/crmExtraction.js';

const CrmSchema = z.object({
  crm_nome: z.string().nullable(),
  crm_telefone: z.string().nullable(),
  crm_etapa_funil: z.string().nullable(),
  crm_interesse: z.string().nullable(),
  crm_problemas_identificados: z.string().nullable(),
  crm_urgencia: z.string().nullable(),
  crm_preferencia_modalidade: z.string().nullable(),
  crm_objecoes: z.string().nullable(),
  crm_preferencia_horario: z.string().nullable(),
  crm_resumo_geral: z.string().nullable(),
});

type CrmData = z.infer<typeof CrmSchema>;

// Track consecutive failures per conversation to avoid infinite retries
const failureCount = new Map<string, number>();
const MAX_RETRIES = 3;

/**
 * Runs debounced CRM extraction for conversations with pending extraction.
 * Only processes conversations where last message was 5+ minutes ago (debounce).
 */
export async function runCrmExtraction(): Promise<void> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Find conversations with pending extraction and debounced (5+ min since last msg)
    const { data: conversations, error: queryError } = await supabase
      .from('chat_conversas')
      .select('id, phone')
      .eq('extraction_pending', true)
      .lte('ultima_mensagem_at', fiveMinutesAgo)
      .limit(10);

    if (queryError) {
      console.error(`[crm-extraction] Query error: ${queryError.message}`);
      return;
    }

    if (!conversations || conversations.length === 0) {
      return; // Nothing to process — silent
    }

    console.log(`[crm-extraction] Processing ${conversations.length} conversation(s)`);

    // Process sequentially to avoid DeepSeek rate limits
    for (const conv of conversations) {
      const failures = failureCount.get(conv.id) || 0;
      if (failures >= MAX_RETRIES) {
        // Too many failures — mark as done to avoid infinite loop
        console.warn(`[crm-extraction] Max retries (${MAX_RETRIES}) reached for ${conv.id}, clearing pending flag`);
        await supabase
          .from('chat_conversas')
          .update({ extraction_pending: false })
          .eq('id', conv.id);
        failureCount.delete(conv.id);
        continue;
      }

      const success = await extractForConversation(conv.id);
      if (success) {
        failureCount.delete(conv.id);
      } else {
        failureCount.set(conv.id, failures + 1);
      }
    }
  } catch (error) {
    console.error('[crm-extraction] Error:', error);
  }
}

async function extractForConversation(conversationId: string): Promise<boolean> {
  try {
    // Fetch LAST 50 messages: order DESC to get most recent, then reverse for chronological
    const { data: messagesDesc, error: msgError } = await supabase
      .from('chat_mensagens')
      .select('from_me, conteudo, created_at')
      .eq('conversa_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (msgError || !messagesDesc || messagesDesc.length === 0) {
      console.log(`[crm-extraction] No messages for ${conversationId}`);
      return false;
    }

    // Reverse to chronological order
    const messages = messagesDesc.reverse();

    const conversationHistory = messages
      .map((msg) => {
        const role = msg.from_me ? '[ATENDENTE]' : '[LEAD]';
        return `${role}: ${msg.conteudo || '[mídia]'}`;
      })
      .join('\n');

    // Call DeepSeek with JSON response format
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: config.deepseekModel,
        messages: [
          { role: 'system', content: CRM_EXTRACTION_PROMPT },
          { role: 'user', content: conversationHistory },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 800,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[crm-extraction] DeepSeek error ${response.status}: ${errText.slice(0, 300)}`);
      return false; // Keep extraction_pending = true for retry
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawContent = data.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      console.error(`[crm-extraction] Empty response for ${conversationId}`);
      return false;
    }

    // Parse and validate JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error(`[crm-extraction] Invalid JSON for ${conversationId}: ${rawContent.slice(0, 200)}`);
      return false;
    }

    const result = CrmSchema.safeParse(parsed);

    if (!result.success) {
      console.error(`[crm-extraction] Zod validation failed for ${conversationId}:`, result.error.issues);
      return false;
    }

    // Build partial update (only non-null fields)
    const updateData: Record<string, unknown> = { extraction_pending: false };
    const crmFields = result.data as CrmData;

    for (const [key, value] of Object.entries(crmFields)) {
      if (value !== null) {
        updateData[key] = value;
      }
    }

    const { error: updateError } = await supabase
      .from('chat_conversas')
      .update(updateData)
      .eq('id', conversationId);

    if (updateError) {
      console.error(`[crm-extraction] Update failed for ${conversationId}: ${updateError.message}`);
      return false;
    }

    console.log(`[crm-extraction] CRM fields updated for ${conversationId}`);
    return true;
  } catch (error) {
    console.error(`[crm-extraction] Error for ${conversationId}:`, error);
    return false;
  }
}
