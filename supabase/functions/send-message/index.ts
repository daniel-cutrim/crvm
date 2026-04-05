// @ts-nocheck - This file runs in Deno runtime (Supabase Edge Functions), not Node.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ status: "error", error: "Unauthorized: Missing header" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ status: "error", error: "Unauthorized: Invalid JWT" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { phone, message, conversa_id, type = "text", audio_url, clinica_id, setor_id } = body;

    if (!phone) {
      console.warn("Missing phone parameter");
      return new Response(JSON.stringify({ status: "error", error: "phone is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!clinica_id) {
      console.warn("Missing clinica_id parameter");
      return new Response(JSON.stringify({ status: "error", error: "clinica_id is required for multi-tenant" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "text" && !message) {
      console.warn("Missing message text for text type");
      return new Response(JSON.stringify({ status: "error", error: "message is required for text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "audio" && !audio_url) {
      console.warn("Missing audio_url for audio type");
      return new Response(JSON.stringify({ status: "error", error: "audio_url is required for audio" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // IDOR Protection: Verify user belongs to the claimed clinica_id
    const { data: userRecord } = await serviceClient
      .from("usuarios")
      .select("clinica_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!userRecord || userRecord.clinica_id !== clinica_id) {
      console.warn("IDOR Block - Mismatched Clinica_ID:", clinica_id);
      return new Response(JSON.stringify({ status: "error", error: "Acesso negado: clínica inválida" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch dynamic Evolution API credentials for this clinica/setor
    let integracaoQuery = serviceClient
      .from("integracoes")
      .select("credentials")
      .eq("clinica_id", clinica_id)
      .eq("tipo", "evolution_api")
      .eq("ativo", true);

    if (setor_id) {
      integracaoQuery = integracaoQuery.eq("setor_id", setor_id);
    }

    const { data: integracao } = await integracaoQuery.limit(1).maybeSingle();

    if (!integracao || !integracao.credentials) {
      console.warn(`Integration not found for Clinica: ${clinica_id}, Setor: ${setor_id}`);
      return new Response(JSON.stringify({ status: "error", error: "O WhatsApp deste setor/clínica não está conectado." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creds = integracao.credentials as { instanceName?: string; token?: string };
    const instanceName = creds.instanceName;

    if (!instanceName) {
      console.warn("instanceName missing in credentials", creds);
      return new Response(JSON.stringify({ status: "error", error: "Credenciais de WhatsApp incompletas no banco de dados." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const API_URL = Deno.env.get("EVOLUTION_API_URL");
    const GLOBAL_KEY = Deno.env.get("EVOLUTION_GLOBAL_KEY");

    if (!API_URL || !GLOBAL_KEY) {
      return new Response(JSON.stringify({ status: "error", error: "Evolution API server not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const digits = phone.replace(/\D/g, "");
    const evoPhone = digits.startsWith("55") ? digits : `55${digits}`;

    let evoUrl: string;
    let evoBody: Record<string, unknown>;

    if (type === "audio") {
      evoUrl = `${API_URL}/message/sendWhatsAppAudio/${instanceName}`;
      evoBody = {
        number: evoPhone,
        audio: audio_url,
        options: { delay: 1200, presence: "composing", encoding: true }
      };
    } else {
      evoUrl = `${API_URL}/message/sendText/${instanceName}`;
      evoBody = {
        number: evoPhone,
        text: message,
        delay: 1200,
        presence: "composing",
        linkPreview: false
      };
    }

    const evoRes = await fetch(evoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": GLOBAL_KEY,
      },
      body: JSON.stringify(evoBody),
    });

    const evoData = await evoRes.json();
    console.log("Evolution API send response:", JSON.stringify(evoData));

    if (!evoRes.ok) {
      return new Response(JSON.stringify({ status: "error", error: "Failed to send message: " + (evoData?.response?.message?.[0] || evoData?.message || "Serviço Inativo") }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract message ID from Evolution response
    const messageId = evoData?.key?.id || evoData?.messageId || null;

    let conversaId = conversa_id;
    if (!conversaId) {
      const { data: existing } = await serviceClient
        .from("chat_conversas")
        .select("id")
        .eq("phone", evoPhone)
        .eq("clinica_id", clinica_id)
        .maybeSingle();

      if (existing) {
        conversaId = existing.id;
      } else {
        const { data: newConv } = await serviceClient
          .from("chat_conversas")
          .insert({ phone: evoPhone, nome: `WhatsApp ${phone}`, clinica_id })
          .select("id")
          .single();
        conversaId = newConv?.id;
      }
    }

    if (conversaId) {
      const msgLabel = type === "audio" ? "[Áudio]" : message;

      await serviceClient.from("chat_mensagens").insert({
        conversa_id: conversaId,
        message_id: messageId,
        from_me: true,
        tipo: type,
        conteudo: type === "text" ? message : null,
        status: "sent",
        clinica_id: clinica_id,
      });

      await serviceClient.from("chat_conversas").update({
        ultima_mensagem: msgLabel,
        ultima_mensagem_at: new Date().toISOString(),
      }).eq("id", conversaId);
    }

    // Log success
    await serviceClient.from("system_logs").insert({
      clinica_id: clinica_id,
      level: "info",
      action: "send_evolution_message",
      details: { phone: evoPhone, type, messageId, instanceName }
    });

    return new Response(
      JSON.stringify({ status: "sent", messageId, conversa_id: conversaId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Send error:", err);

    try {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await serviceClient.from("system_logs").insert({
        level: "error",
        action: "send_evolution_message_error",
        details: { error: String(err) }
      });
    } catch (_logErr) {
      // Silently fail log insertion
    }

    return new Response(
      JSON.stringify({ status: "error", error: String(err) || "Internal server error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
