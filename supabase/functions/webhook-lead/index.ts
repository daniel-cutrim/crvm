// @ts-nocheck - This file runs in Deno runtime (Supabase Edge Functions), not Node.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate API key
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("WEBHOOK_LEAD_API_KEY");

  if (!expectedKey || apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: invalid or missing x-api-key header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    console.log("Lead webhook received (sanitized log)");

    // XSS Prevention: strip HTML tags from all string inputs
    function sanitize(val: unknown): string | null {
      if (typeof val !== 'string') return null;
      return val.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').trim().slice(0, 500);
    }

    const nome = sanitize(body.nome || body.name || body.full_name);
    const telefone = sanitize(body.telefone || body.phone || body.whatsapp);
    
    const url = new URL(req.url);
    const clinica_id = url.searchParams.get("clinica_id") || body.clinica_id;

    if (!nome || !telefone || !clinica_id) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: nome, telefone e clinica_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract and sanitize UTM parameters
    const utm_source = sanitize(body.utm_source);
    const utm_medium = sanitize(body.utm_medium);
    const utm_campaign = sanitize(body.utm_campaign);
    const utm_term = sanitize(body.utm_term);
    const utm_content = sanitize(body.utm_content);

    // Optional fields (sanitized)
    const email = sanitize(body.email);
    const interesse = sanitize(body.interesse || body.interest);

    // Support raw origem and utms
    const origemInput = sanitize(body.origem || body.origin);
    
    // Funnel and Stage extraction
    const funil_id = sanitize(body.funil_id || body.pipeline_id || url.searchParams.get("funil_id") || url.searchParams.get("pipeline_id")) || null;
    const etapa_id = sanitize(body.etapa_id || body.stage_id || url.searchParams.get("etapa_id") || url.searchParams.get("stage_id")) || null;

    if (!funil_id || !etapa_id) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Bad Request: Os parâmetros 'funil_id' e 'etapa_id' agora são OBRIGATÓRIOS para a nova arquitetura do CRM."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and coerce origem against DB Enum constraint
    const finalOrigem = normalizeOrigem(origemInput, utm_source);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve dynamic stage name and default funnel stage
    let resolvedEtapaFunil = "Novo Lead";
    let resolvedEtapaId = etapa_id;

    if (etapa_id) {
       const { data: eData } = await supabase.from("funil_etapas").select("nome").eq("id", etapa_id).maybeSingle();
       if (eData) resolvedEtapaFunil = eData.nome;
    } else if (funil_id) {
       const { data: firstEtapa } = await supabase.from("funil_etapas").select("id, nome").eq("funil_id", funil_id).order("ordem", { ascending: true }).limit(1).maybeSingle();
       if (firstEtapa) {
           resolvedEtapaId = firstEtapa.id;
           resolvedEtapaFunil = firstEtapa.nome;
       }
    }

    // Check if lead already exists by phone
    const digits = telefone.replace(/\D/g, "");
    const last8 = digits.slice(-8);

    const { data: existingLeads } = await supabase
      .from("leads")
      .select("id, telefone")
      .eq("clinica_id", clinica_id)
      .like("telefone", `%${last8.slice(0, 4)}%${last8.slice(4)}%`);

    const duplicate = existingLeads?.find((l: any) => {
      const stored = (l.telefone || "").replace(/\D/g, "");
      return stored.endsWith(last8);
    });

    if (duplicate) {
      // Update UTMs and funnel if empty or newly provided on existing lead
      const updateData: Record<string, string> = {};
      if (utm_source) updateData.utm_source = utm_source;
      if (utm_medium) updateData.utm_medium = utm_medium;
      if (utm_campaign) updateData.utm_campaign = utm_campaign;
      if (utm_term) updateData.utm_term = utm_term;
      if (utm_content) updateData.utm_content = utm_content;
      if (funil_id) updateData.funil_id = funil_id;
      
      if (resolvedEtapaId || funil_id) {
         if (resolvedEtapaId) updateData.etapa_id = resolvedEtapaId;
         if (resolvedEtapaFunil !== "Novo Lead" || !funil_id) {
             updateData.etapa_funil = resolvedEtapaFunil;
         }
      }

      if (Object.keys(updateData).length > 0) {
        await supabase.from("leads").update(updateData).eq("id", duplicate.id);
      }

      // Ensure chat_conversas exists for duplicate lead too
      const dupPhone = digits.startsWith("55") ? digits : `55${digits}`;
      const { data: dupConv } = await supabase
        .from("chat_conversas")
        .select("id")
        .eq("phone", dupPhone)
        .maybeSingle();

      if (!dupConv) {
        await supabase.from("chat_conversas").insert({
          phone: dupPhone,
          nome: nome,
          lead_id: duplicate.id,
          ultima_mensagem: `Lead retornou via ${deriveOrigem(utm_source)}`,
          ultima_mensagem_at: new Date().toISOString(),
          nao_lidas: 1,
        });
      }

      // Insert tracking journey checkpoint for returning lead
      await supabase.from("lead_jornada").insert({
        lead_id: duplicate.id,
        clinica_id: clinica_id,
        plataforma: finalOrigem,
        utm_source,
        utm_medium,
        utm_campaign,
        descricao: 'Lead retornou via Webhook'
      });

      return new Response(
        JSON.stringify({ status: "duplicate", lead_id: duplicate.id, message: "Lead já existe, Tracking Rastreamento Inserido." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone
    let formattedPhone = digits;
    const localDigits = digits.startsWith("55") ? digits.slice(2) : digits;
    if (localDigits.length === 11) {
      formattedPhone = `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7)}`;
    } else if (localDigits.length === 10) {
      formattedPhone = `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;
    }

    const { data: newLead, error } = await supabase
      .from("leads")
      .insert({
        clinica_id,
        nome,
        telefone: formattedPhone,
        email,
        origem: finalOrigem,
        interesse,
        etapa_funil: resolvedEtapaFunil,
        funil_id,
        etapa_id: resolvedEtapaId,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating lead:", error);
      return new Response(
        JSON.stringify({ status: "error", message: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Lead created via webhook:", newLead.id);

    // Build tracking journey for the new lead
    await supabase.from("lead_jornada").insert({
      lead_id: newLead.id,
      clinica_id: clinica_id,
      plataforma: finalOrigem,
      utm_source,
      utm_medium,
      utm_campaign,
      descricao: 'Primeiro contato'
    });

    // Create chat_conversas entry so lead appears in Chat WhatsApp tab
    const whatsappPhone = digits.startsWith("55") ? digits : `55${digits}`;

    // Check if conversation already exists for this phone
    const { data: existingConv } = await supabase
      .from("chat_conversas")
      .select("id")
      .eq("phone", whatsappPhone)
      .maybeSingle();

    let conversaId = existingConv?.id;

    if (!existingConv) {
      const { data: newConv, error: convError } = await supabase
        .from("chat_conversas")
        .insert({
          phone: whatsappPhone,
          nome: nome,
          lead_id: newLead.id,
          ultima_mensagem: `Novo lead via ${finalOrigem}`,
          ultima_mensagem_at: new Date().toISOString(),
          nao_lidas: 1,
        })
        .select("id")
        .single();

      if (convError) {
        console.error("Error creating chat_conversas:", convError);
      } else {
        conversaId = newConv.id;
        console.log("Chat conversa created:", newConv.id);
      }
    } else {
      // Link existing conversation to lead if not linked
      await supabase
        .from("chat_conversas")
        .update({ lead_id: newLead.id })
        .eq("id", existingConv.id);
    }

    // Send welcome WhatsApp message via Evolution API
    try {
      const API_URL = Deno.env.get("EVOLUTION_API_URL");
      const GLOBAL_KEY = Deno.env.get("EVOLUTION_GLOBAL_KEY");

      if (API_URL && GLOBAL_KEY) {
        // Find active Evolution instance for this clinica
        const { data: integracao } = await supabase
          .from("integracoes")
          .select("credentials")
          .eq("clinica_id", clinica_id)
          .eq("tipo", "evolution_api")
          .eq("ativo", true)
          .limit(1)
          .maybeSingle();

        if (integracao && integracao.credentials) {
          const creds = integracao.credentials as { instanceName?: string };

          if (creds.instanceName) {
            const welcomeMessage = `Olá ${nome}! 👋\nRecebemos seu contato. Em breve nossa equipe vai te atender!\nObrigado pelo interesse! 😊`;

            const evoRes = await fetch(
              `${API_URL}/message/sendText/${creds.instanceName}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": GLOBAL_KEY,
                },
                body: JSON.stringify({
                  number: whatsappPhone,
                  textMessage: { text: welcomeMessage },
                }),
              }
            );

            const evoData = await evoRes.json();
            console.log("Evolution API send result:", JSON.stringify(evoData));

            const messageId = evoData?.key?.id || evoData?.messageId || null;

            // Save sent message in chat_mensagens
            if (conversaId) {
              await supabase.from("chat_mensagens").insert({
                conversa_id: conversaId,
                from_me: true,
                tipo: "text",
                conteudo: welcomeMessage,
                message_id: messageId,
                status: "sent",
              });

              // Update conversation last message
              await supabase
                .from("chat_conversas")
                .update({
                  ultima_mensagem: welcomeMessage,
                  ultima_mensagem_at: new Date().toISOString(),
                })
                .eq("id", conversaId);
            }
          }
        }
      }
    } catch (evoErr) {
      console.error("Error sending WhatsApp welcome:", evoErr);
    }

    return new Response(
      JSON.stringify({ status: "created", lead_id: newLead.id, conversa_id: conversaId || null }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook lead error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function normalizeOrigem(origem: string | null, utmSource: string | null): string {
  const val = (origem || "").toLowerCase();
  
  if (val.includes("instagram") || val.includes("ig")) return "Instagram";
  if (val.includes("google") || val.includes("adwords")) return "Google Ads";
  if (val.includes("facebook") || val.includes("fb")) return "Facebook";
  if (val.includes("whatsapp") || val.includes("wpp")) return "WhatsApp";
  if (val.includes("indica")) return "Indicação";
  if (val.includes("site") || val.includes("web") || val.includes("landing")) return "Site";

  if (!origem && utmSource) {
    const s = utmSource.toLowerCase();
    if (s.includes("google")) return "Google Ads";
    if (s.includes("facebook") || s.includes("fb")) return "Facebook";
    if (s.includes("instagram") || s.includes("ig")) return "Instagram";
    if (s.includes("whatsapp")) return "WhatsApp";
    return "Site";
  }

  return "Outro";
}
