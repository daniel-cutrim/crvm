// @ts-nocheck - This file runs in Deno runtime (Supabase Edge Functions), not Node.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendUzapiTextMessage, sendUzapiAudioMessage, formatPhone } from "../_shared/uzapi.ts";

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
    const { phone, message, conversa_id, type = "text", audio_url, base64_audio, clinica_id, setor_id } = body;

    if (!phone) {
      return new Response(JSON.stringify({ status: "error", error: "phone is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!clinica_id) {
      return new Response(JSON.stringify({ status: "error", error: "clinica_id is required for multi-tenant" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "text" && !message) {
      return new Response(JSON.stringify({ status: "error", error: "message is required for text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "audio" && !audio_url && !base64_audio) {
      return new Response(JSON.stringify({ status: "error", error: "audio_url or base64_audio is required for audio" }), {
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
      return new Response(JSON.stringify({ status: "error", error: "Acesso negado: clínica inválida" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch UZAPI credentials for this clinica/setor
    let integracaoQuery = serviceClient
      .from("integracoes")
      .select("credentials")
      .eq("clinica_id", clinica_id)
      .eq("tipo", "uzapi")
      .eq("ativo", true);

    if (setor_id) {
      integracaoQuery = integracaoQuery.eq("setor_id", setor_id);
    }

    const { data: integracao } = await integracaoQuery.limit(1).maybeSingle();

    if (!integracao || !integracao.credentials) {
      return new Response(JSON.stringify({ status: "error", error: "O WhatsApp deste setor/clínica não está conectado." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creds = integracao.credentials as { phoneNumberId?: string; token?: string };

    if (!creds.phoneNumberId || !creds.token) {
      return new Response(JSON.stringify({ status: "error", error: "Credenciais de WhatsApp incompletas no banco de dados." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uzapiPhone = formatPhone(phone);

    let finalAudioUrl = audio_url;

    if (type === "audio" && base64_audio) {
      try {
        // Extract base64 safely, ignoring any complex headers like audio/webm;codecs=opus
        const base64Data = base64_audio.includes(",") ? base64_audio.split(",")[1] : base64_audio;
        // Decode base64 using atob (standard in Deno/Browser)
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const fileName = `audio_${Date.now()}.ogg`;
        const filePath = `${clinica_id}/${fileName}`;
        
        const { error: uploadError } = await serviceClient.storage
           .from("chat-media")
           .upload(filePath, bytes, { contentType: "audio/ogg" });
           
        if (uploadError) throw new Error("Falha ao salvar audio no storage: " + uploadError.message);
        
        const { data: urlData } = serviceClient.storage.from("chat-media").getPublicUrl(filePath);
        finalAudioUrl = urlData.publicUrl;
      } catch (err: unknown) {
        return new Response(JSON.stringify({ status: "error", error: "Erro ao processar áudio: " + ((err as Error).message || "Desconhecido") }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let apiData: Record<string, unknown>;
    if (type === "audio") {
      apiData = await sendUzapiAudioMessage(creds as { phoneNumberId: string; token: string }, uzapiPhone, finalAudioUrl);
    } else {
      apiData = await sendUzapiTextMessage(creds as { phoneNumberId: string; token: string }, uzapiPhone, message);
    }

    console.log("UZAPI send response:", JSON.stringify(apiData));

    // Extract message ID from UZAPI response
    const messageId = apiData?.messages?.[0]?.id || apiData?.messageId || null;

    let conversaId = conversa_id;
    if (!conversaId) {
      const { data: existing } = await serviceClient
        .from("chat_conversas")
        .select("id")
        .eq("phone", uzapiPhone)
        .eq("clinica_id", clinica_id)
        .maybeSingle();

      if (existing) {
        conversaId = existing.id;
      } else {
        const { data: newConv } = await serviceClient
          .from("chat_conversas")
          .insert({ phone: uzapiPhone, nome: `WhatsApp ${phone}`, clinica_id })
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
        media_url: type === "audio" ? finalAudioUrl : null,
        media_mime_type: type === "audio" ? "audio/ogg" : null,
        status: "sent",
        clinica_id: clinica_id,
      });

      await serviceClient.from("chat_conversas").update({
        ultima_mensagem: msgLabel,
        ultima_mensagem_at: new Date().toISOString(),
      }).eq("id", conversaId);
    }

    await serviceClient.from("system_logs").insert({
      clinica_id: clinica_id,
      level: "info",
      action: "send_uzapi_message",
      details: { phone: uzapiPhone, type, messageId, phoneNumberId: creds.phoneNumberId }
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
        action: "send_uzapi_message_error",
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
