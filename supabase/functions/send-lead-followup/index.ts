// @ts-nocheck - This file runs in Deno runtime (Supabase Edge Functions), not Node.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendUzapiTextMessage, formatPhone } from "../_shared/uzapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: conversas } = await supabase
      .from("chat_conversas")
      .select("id, phone, nome, lead_id, clinica_id, setor_id, ultima_mensagem_at")
      .not("lead_id", "is", null)
      .lt("ultima_mensagem_at", oneDayAgo);

    if (!conversas || conversas.length === 0) {
      return new Response(JSON.stringify({ status: "no_followups_needed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let skipped = 0;

    for (const conversa of conversas) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, etapa_funil, nome, clinica_id")
        .eq("id", conversa.lead_id)
        .single();

      if (!lead || !["Novo Lead", "Em Contato"].includes(lead.etapa_funil)) {
        skipped++;
        continue;
      }

      const { data: existing } = await supabase
        .from("automacao_mensagens")
        .select("id")
        .eq("tipo", "followup_1d")
        .eq("referencia_id", lead.id)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { data: lastMsg } = await supabase
        .from("chat_mensagens")
        .select("from_me")
        .eq("conversa_id", conversa.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      if (lastMsg && !lastMsg.from_me) {
        skipped++;
        continue;
      }

      const clinicaId = conversa.clinica_id || lead.clinica_id;

      let integracaoQuery = supabase
        .from("integracoes")
        .select("credentials")
        .eq("clinica_id", clinicaId)
        .eq("tipo", "uzapi")
        .eq("ativo", true);

      if (conversa.setor_id) {
        integracaoQuery = integracaoQuery.eq("setor_id", conversa.setor_id);
      }

      const { data: integracao } = await integracaoQuery.limit(1).maybeSingle();

      if (!integracao || !integracao.credentials) {
        console.warn(`No active UZAPI instance for clinica ${clinicaId}, skipping followup`);
        skipped++;
        continue;
      }

      const creds = integracao.credentials as { phoneNumberId?: string; token?: string };
      if (!creds.phoneNumberId || !creds.token) {
        skipped++;
        continue;
      }

      const uzapiPhone = formatPhone(conversa.phone);

      const FOLLOWUP_MESSAGE = `Olá! 😊\n\nNotamos que você entrou em contato conosco recentemente. Ainda podemos te ajudar com algum procedimento?\n\nEstamos à disposição para agendar sua avaliação! 🦷`;

      const apiData = await sendUzapiTextMessage(creds as { phoneNumberId: string; token: string }, uzapiPhone, FOLLOWUP_MESSAGE, 2, 5);
      console.log(`Follow-up sent to ${conversa.nome}:`, JSON.stringify(apiData));

      const messageId = apiData?.messages?.[0]?.id || apiData?.messageId || null;

      await supabase.from("automacao_mensagens").insert({
        tipo: "followup_1d",
        referencia_id: lead.id,
        conversa_id: conversa.id,
        phone: uzapiPhone,
      });

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversa.id,
        message_id: messageId,
        from_me: true,
        tipo: "text",
        conteudo: FOLLOWUP_MESSAGE,
        status: "sent",
      });

      await supabase.from("chat_conversas").update({
        ultima_mensagem: "[Follow-up automático]",
        ultima_mensagem_at: new Date().toISOString(),
      }).eq("id", conversa.id);

      await supabase.from("system_logs").insert({
        clinica_id: clinicaId,
        level: "info",
        action: "send_followup_uzapi",
        details: { phone: uzapiPhone, leadId: lead.id, phoneNumberId: creds.phoneNumberId }
      });

      sent++;
    }

    return new Response(
      JSON.stringify({ status: "ok", sent, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Followup error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
