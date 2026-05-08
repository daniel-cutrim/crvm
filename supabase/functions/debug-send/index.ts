// @ts-nocheck - Debug/diagnostic function for UZAPI integration
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUzapiBaseConfig, uzapiHeaders, uzapiUrl } from "../_shared/uzapi.ts";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json"
  };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { baseUrl, username } = getUzapiBaseConfig();

    const { data: integracao } = await supabase
      .from("integracoes")
      .select("*")
      .eq("tipo", "uzapi")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    const creds = integracao?.credentials as { phoneNumberId?: string; token?: string } | null;

    let instanceStatus = null;
    let testSend = null;

    if (creds?.phoneNumberId && creds?.token) {
      const headers = uzapiHeaders(creds.token);

      const statusRes = await fetch(uzapiUrl(baseUrl, username, creds.phoneNumberId, "instance"), {
        method: "GET", headers,
      });
      instanceStatus = await statusRes.json();

      const sendRes = await fetch(uzapiUrl(baseUrl, username, creds.phoneNumberId, "messages"), {
        method: "POST", headers,
        body: JSON.stringify({
          to: "559984041462",
          type: "text",
          text: { body: "Teste diagnóstico UZAPI " + new Date().toISOString() },
          delayMessage: 0, delayTyping: 0,
        }),
      });
      testSend = { status: sendRes.status, ok: sendRes.ok, data: await sendRes.json() };
    }

    return new Response(JSON.stringify({
      diagnosis: {
        config: { baseUrl, username },
        dbIntegracao: integracao ? { id: integracao.id, ativo: integracao.ativo, credentials: { phoneNumberId: creds?.phoneNumberId, hasToken: !!creds?.token } } : null,
        instanceStatus,
        testSend,
      }
    }, null, 2), { headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err), stack: err.stack }), { headers: corsHeaders });
  }
});
