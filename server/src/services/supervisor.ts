import { supabase } from '../supabase.js';
import { config } from '../config.js';
import { SUPERVISOR_SYSTEM_PROMPT } from '../prompts/supervisor.js';

/**
 * Fetches the supervisor config for a conversation's clinic.
 * Falls back to hardcoded default if none found.
 */
async function getSupervisorConfig(conversationId: string): Promise<{
  systemPrompt: string;
  salesScript: string;
}> {
  try {
    // Get empresa_id from conversation
    const { data: conv } = await supabase
      .from('chat_conversas')
      .select('empresa_id')
      .eq('id', conversationId)
      .single();

    if (conv?.empresa_id) {
      const { data: cfg } = await supabase
        .from('supervisor_config')
        .select('system_prompt, sales_script')
        .eq('empresa_id', conv.empresa_id)
        .maybeSingle();

      if (cfg) {
        return {
          systemPrompt: cfg.system_prompt,
          salesScript: cfg.sales_script || '',
        };
      }
    }
  } catch {
    // Fall through to default
  }

  return {
    systemPrompt: SUPERVISOR_SYSTEM_PROMPT,
    salesScript: '',
  };
}

/**
 * Builds the full system prompt by combining the system prompt + sales script.
 */
function buildFullPrompt(systemPrompt: string, salesScript: string): string {
  if (!salesScript.trim()) {
    return systemPrompt;
  }
  return `${systemPrompt}

=== SCRIPT DE VENDAS (use como referência) ===
${salesScript}
=== FIM DO SCRIPT ===`;
}

/**
 * Runs the AI Sales Supervisor for a conversation.
 * Fetches config from DB, last 30 messages, calls DeepSeek, saves guidance.
 */
export async function runSupervisor(conversationId: string): Promise<void> {
  try {
    // Fetch config from database
    const { systemPrompt, salesScript } = await getSupervisorConfig(conversationId);
    const fullPrompt = buildFullPrompt(systemPrompt, salesScript);

    // Fetch LAST 30 messages: order DESC to get most recent, then reverse for chronological order
    const { data: messagesDesc, error: msgError } = await supabase
      .from('chat_mensagens')
      .select('from_me, conteudo, created_at')
      .eq('conversa_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (msgError || !messagesDesc || messagesDesc.length === 0) {
      console.log(`[supervisor] No messages found for conversation ${conversationId}`);
      return;
    }

    // Reverse to chronological order (oldest first)
    const messages = messagesDesc.reverse();

    // Format conversation history
    const conversationHistory = messages
      .map((msg) => {
        const role = msg.from_me ? '[ATENDENTE]' : '[LEAD]';
        const content = msg.conteudo || '[mídia]';
        return `${role}: ${content}`;
      })
      .join('\n');

    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: config.deepseekModel,
        messages: [
          { role: 'system', content: fullPrompt },
          { role: 'user', content: conversationHistory },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[supervisor] DeepSeek API error ${response.status}: ${errText.slice(0, 300)}`);
      return;
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const guidance = data.choices?.[0]?.message?.content?.trim();

    if (!guidance) {
      console.log('[supervisor] Empty response from DeepSeek');
      return;
    }

    // Save guidance to conversation
    const { error: updateError } = await supabase
      .from('chat_conversas')
      .update({
        supervisor_guidance: guidance,
        supervisor_guidance_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error(`[supervisor] Failed to save guidance: ${updateError.message}`);
    } else {
      console.log(`[supervisor] Guidance saved for conversation ${conversationId}`);
    }
  } catch (error) {
    console.error(`[supervisor] Error:`, error);
  }
}
