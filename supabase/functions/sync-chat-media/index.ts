// @ts-nocheck - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { downloadAndUploadMediaDetailed } from "../_shared/uzapi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find messages where media_url is a raw numeric ID (not a URL)
    const { data: brokenMessages, error: queryError } = await supabaseClient
      .from("chat_mensagens")
      .select("id, clinica_id, tipo, media_url, media_mime_type, message_id")
      .in("tipo", ["audio", "video", "image", "document", "sticker"])
      .not("media_url", "is", null)
      .not("media_url", "like", "http%")
      .order("timestamp", { ascending: false })
      .limit(50);

    if (queryError) {
      return new Response(JSON.stringify({ error: queryError.message }), { status: 500 });
    }

    if (!brokenMessages || brokenMessages.length === 0) {
      return new Response(JSON.stringify({ status: "no_broken_media", count: 0 }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    console.log(`sync-chat-media: Found ${brokenMessages.length} messages with raw media IDs`);

    // Get UZAPI credentials for each clinica
    const clinicaIds = [...new Set(brokenMessages.map(m => m.clinica_id))];
    const credsByClinica: Record<string, { phoneNumberId: string; token: string }> = {};

    for (const cid of clinicaIds) {
      const { data: integ } = await supabaseClient
        .from("integracoes")
        .select("credentials")
        .eq("tipo", "uzapi")
        .eq("clinica_id", cid)
        .eq("ativo", true)
        .maybeSingle();

      if (integ?.credentials) {
        const c = integ.credentials as Record<string, unknown>;
        credsByClinica[cid] = {
          phoneNumberId: c.phoneNumberId as string,
          token: c.token as string,
        };
      }
    }

    const results = {
      total: brokenMessages.length,
      fixed: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{ id: string; tipo: string; status: string; error?: string }>,
    };

    for (const msg of brokenMessages) {
      const creds = credsByClinica[msg.clinica_id];
      if (!creds) {
        results.skipped++;
        results.details.push({ id: msg.id, tipo: msg.tipo, status: "skipped_no_creds" });
        continue;
      }

      const cleanMime = (msg.media_mime_type || "application/octet-stream").split(";")[0].trim();
      const ext = cleanMime.split("/")[1] || "bin";
      const uploadPath = `${msg.clinica_id}/${msg.message_id || msg.id}.${ext}`;

      const result = await downloadAndUploadMediaDetailed(
        supabaseClient,
        creds,
        msg.media_url,
        msg.media_mime_type || "application/octet-stream",
        uploadPath
      );

      if (result.publicUrl) {
        // Update the message with the correct URL
        await supabaseClient
          .from("chat_mensagens")
          .update({ media_url: result.publicUrl })
          .eq("id", msg.id);

        results.fixed++;
        results.details.push({ id: msg.id, tipo: msg.tipo, status: "fixed" });
      } else {
        results.failed++;
        results.details.push({
          id: msg.id,
          tipo: msg.tipo,
          status: `failed_${result.step}`,
          error: result.error || undefined,
        });
      }
    }

    console.log(`sync-chat-media: Done. fixed=${results.fixed} failed=${results.failed} skipped=${results.skipped}`);

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("sync-chat-media error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});
