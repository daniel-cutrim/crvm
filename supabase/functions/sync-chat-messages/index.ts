// @ts-nocheck - This file runs in Deno runtime (Supabase Edge Functions), not Node.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUzapiBaseConfig, uzapiUrl, uzapiHeaders, formatPhone } from "../_shared/uzapi.ts";

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

/** Extract text content from Baileys raw message object */
function extractContent(msg: Record<string, unknown>): { tipo: string; conteudo: string } {
  if (msg.Conversation) return { tipo: "text", conteudo: msg.Conversation as string };
  if (msg.ExtendedTextMessage) return { tipo: "text", conteudo: (msg.ExtendedTextMessage as any)?.text || "" };
  if (msg.ImageMessage) return { tipo: "image", conteudo: (msg.ImageMessage as any)?.caption || "\ud83d\udcf7 Imagem" };
  if (msg.AudioMessage) return { tipo: "audio", conteudo: "\ud83c\udfb5 \u00c1udio" };
  if (msg.VideoMessage) return { tipo: "video", conteudo: (msg.VideoMessage as any)?.caption || "\ud83c\udfa5 V\u00eddeo" };
  if (msg.DocumentMessage) return { tipo: "document", conteudo: (msg.DocumentMessage as any)?.fileName || "\ud83d\udcc4 Documento" };
  if (msg.StickerMessage) return { tipo: "sticker", conteudo: "\ud83c\udff7\ufe0f Sticker" };
  if (msg.ContactMessage) return { tipo: "contacts", conteudo: "\ud83d\udc64 Contato" };
  if (msg.LocationMessage) return { tipo: "location", conteudo: "\ud83d\udccd Localiza\u00e7\u00e3o" };
  return { tipo: "text", conteudo: "" };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRec } = await serviceClient
      .from("usuarios").select("clinica_id").eq("auth_user_id", user.id).single();
    if (!userRec) throw new Error("Usu\u00e1rio n\u00e3o encontrado");
    const clinica_id = userRec.clinica_id;

    const body = await req.json();
    const { phone: rawPhone } = body;
    if (!rawPhone) throw new Error("phone is required");
    const phone = formatPhone(rawPhone);

    // Get UZAPI credentials
    const { data: integracao } = await serviceClient
      .from("integracoes")
      .select("credentials")
      .eq("clinica_id", clinica_id)
      .eq("tipo", "uzapi")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (!integracao?.credentials) {
      return new Response(JSON.stringify({ error: "WhatsApp n\u00e3o conectado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creds = integracao.credentials as Record<string, unknown>;
    const token = creds.token as string;
    const phoneNumberId = creds.phoneNumberId as string;

    // Find the conversation
    const { data: conversa } = await serviceClient
      .from("chat_conversas")
      .select("id")
      .eq("clinica_id", clinica_id)
      .eq("phone", phone)
      .maybeSingle();

    if (!conversa) {
      return new Response(JSON.stringify({ synced: 0, message: "Conversa n\u00e3o encontrada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sent messages from UZAPI (last 24h)
    const { baseUrl, username } = getUzapiBaseConfig();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const uzRes = await fetch(uzapiUrl(baseUrl, username, phoneNumberId, "chats"), {
      method: "POST",
      headers: uzapiHeaders(token),
      body: JSON.stringify({
        delayMessage: 0,
        type: "chats",
        action: "list",
        chats: {
          onlyGroups: false,
          sendForMe: true,
          page: 1,
          pageSize: 50,
          startDate: oneDayAgo.toISOString(),
          endDate: now.toISOString(),
        },
      }),
    });

    if (!uzRes.ok) throw new Error(`UZAPI ${uzRes.status}`);
    const uzData = await uzRes.json();
    const allMessages = uzData?.data?.data?.messages || [];

    // Filter messages for this specific chat phone
    // UZAPI Chat field can be phone@s.whatsapp.net or a Meta user ID
    const phoneDigits = phone.replace(/\D/g, "");
    const chatMessages = allMessages.filter((m: any) => {
      const chatJid = (m.Info?.Chat || "").split("@")[0];
      return chatJid === phoneDigits || chatJid.endsWith(phoneDigits.slice(-8));
    });

    if (chatMessages.length === 0) {
      // Try page 2 in case messages are on next page
      const uzRes2 = await fetch(uzapiUrl(baseUrl, username, phoneNumberId, "chats"), {
        method: "POST",
        headers: uzapiHeaders(token),
        body: JSON.stringify({
          delayMessage: 0,
          type: "chats",
          action: "list",
          chats: {
            onlyGroups: false,
            sendForMe: true,
            page: 2,
            pageSize: 50,
            startDate: oneDayAgo.toISOString(),
            endDate: now.toISOString(),
          },
        }),
      });
      if (uzRes2.ok) {
        const uzData2 = await uzRes2.json();
        const page2 = uzData2?.data?.data?.messages || [];
        const filtered = page2.filter((m: any) => {
          const chatJid = (m.Info?.Chat || "").split("@")[0];
          return chatJid === phoneDigits || chatJid.endsWith(phoneDigits.slice(-8));
        });
        chatMessages.push(...filtered);
      }
    }

    // Get existing message IDs to avoid duplicates
    const uzMsgIds = chatMessages.map((m: any) => m.Info?.ID).filter(Boolean);
    const { data: existing } = await serviceClient
      .from("chat_mensagens")
      .select("message_id")
      .in("message_id", uzMsgIds.length > 0 ? uzMsgIds : ["__none__"]);
    const existingIds = new Set((existing || []).map((e: any) => e.message_id));

    // Insert missing sent messages
    const toInsert = chatMessages
      .filter((m: any) => m.Info?.ID && !existingIds.has(m.Info.ID))
      .map((m: any) => {
        const { tipo, conteudo } = extractContent(m.Message || {});
        return {
          clinica_id,
          conversa_id: conversa.id,
          message_id: m.Info.ID,
          from_me: true,
          tipo,
          conteudo,
          status: "sent",
          created_at: m.Info.Timestamp || new Date().toISOString(),
        };
      });

    if (toInsert.length > 0) {
      await serviceClient.from("chat_mensagens").insert(toInsert);

      // Update conversation with latest message
      const latest = toInsert.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      if (latest) {
        await serviceClient.from("chat_conversas").update({
          ultima_mensagem: latest.conteudo,
          ultima_mensagem_at: latest.created_at,
        }).eq("id", conversa.id);
      }
    }

    return new Response(JSON.stringify({ synced: toInsert.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-chat-messages error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
