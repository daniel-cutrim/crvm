import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok");
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();

    // evolution API webhook usually has:
    // payload.event (e.g., 'messages.upsert', 'connection.update')
    // payload.instance (name of the instance)
    
    if (!payload || !payload.instance || !payload.event) {
        return new Response(JSON.stringify({ status: "ignored" }), { status: 200 });
    }

    // Step 1: Find the tenant and sector that owns this instance
    const { data: integracao, error: integracaoError } = await supabaseClient
      .from('integracoes')
      .select('clinica_id, setor_id')
      .eq('tipo', 'evolution-api')
      .filter('credentials->>instanceName', 'eq', payload.instance)
      .single();

    if (integracaoError || !integracao) {
      console.warn("Instance not found in database:", payload.instance);
      return new Response(JSON.stringify({ error: "Instance unmanaged" }), { status: 404 });
    }

    const clinica_id = integracao.clinica_id;
    const setor_id = integracao.setor_id;

    const { event, instance, data, sender } = payload;
    
    // We only care about new incoming messages right now
    if (event !== 'messages.upsert') {
      return new Response(JSON.stringify({ status: "ignored event" }), { status: 200 });
    }

    // Usually Evolution sends an array of messages in data.messages
    // or a single message in data.
    const msgData = Array.isArray(data.messages) ? data.messages[0] : (data.messages || data);
    
    if (!msgData || !msgData.message) {
       return new Response(JSON.stringify({ status: "no message content" }), { status: 200 });
    }

    // Ignore own messages or status broadcasts
    if (msgData.key.fromMe || msgData.key.remoteJid === 'status@broadcast') {
       return new Response(JSON.stringify({ status: "ignored self/broadcast" }), { status: 200 });
    }

    const t = msgData.message.conversation 
          || msgData.message.extendedTextMessage?.text
          || "📷 Mídia";
          
    const remoteJid = msgData.key.remoteJid;
    const phone = remoteJid.split('@')[0];
    const pushName = msgData.pushName || phone;

    // 1. Find or create the Lead (Patient) in this Clinica/Sector
    // For simplicity, we search by phone. Real implementation needs robust phone matching (+country code)
    let { data: lead } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('clinica_id', clinica_id)
      .eq('telefone', phone)
      .single();

    if (!lead) {
      const { data: newLead } = await supabaseClient
        .from('leads')
        .insert({
          clinica_id,
          setor_id, // Associates the lead to the sector of the WhatsApp instance!
          nome: pushName,
          telefone: phone,
          origem: 'WhatsApp',
          etapa_funil: 'Novo Lead', // Fallback, could grab from Sector's default funnel
        })
        .select()
        .single();
      
      lead = newLead;
    }

    // 2. Save Message to chat_conversas
    if (lead) {
      await supabaseClient.from('chat_conversas').insert({
        clinica_id,
        setor_id, // Inherit sector ownership
        lead_id: lead.id,
        contato_telefone: phone,
        canal: 'WhatsApp',
        direcao: 'recebida',
        conteudo: t,
        status: 'entregue'
      });
      
      // Also log it via system_logs for QA/Audit
      await supabaseClient.from('system_logs').insert({
        clinica_id,
        level: 'info',
        action: 'webhook_evolution_message_received',
        details: { instance, phone, length: t.length }
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
