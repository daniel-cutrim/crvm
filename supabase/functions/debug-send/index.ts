import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    const API_URL = Deno.env.get("EVOLUTION_API_URL");
    const GLOBAL_KEY = Deno.env.get("EVOLUTION_GLOBAL_KEY");

    // 1. List ALL instances on the server
    const listRes = await fetch(`${API_URL}/instance/fetchInstances`, {
      method: "GET", headers: { "apikey": GLOBAL_KEY! }
    });
    const allInstances = await listRes.json();

    // 2. Get integration from DB
    const { data: integracao } = await supabase
      .from("integracoes")
      .select("*")
      .eq("setor_id", "49c866d1-9a36-4425-b5c0-2f96777b30a5")
      .limit(1).maybeSingle();
      
    const instanceName = (integracao?.credentials as any)?.instanceName;

    // 3. Get detailed instance info
    const infoRes = await fetch(`${API_URL}/instance/connectionState/${instanceName}`, {
      method: "GET", headers: { "apikey": GLOBAL_KEY! }
    });
    const connectionState = await infoRes.json();

    // 4. Fetch instance settings/config
    const settingsRes = await fetch(`${API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: "GET", headers: { "apikey": GLOBAL_KEY! }
    });
    const instanceDetails = await settingsRes.json();

    // 5. Send a test message and capture FULL response
    const testBody = { number: "559984041462", text: "Teste diagnóstico " + new Date().toISOString() };
    const sendRes = await fetch(`${API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": GLOBAL_KEY! },
      body: JSON.stringify(testBody)
    });
    const sendHeaders: Record<string, string> = {};
    sendRes.headers.forEach((v, k) => sendHeaders[k] = v);
    const sendData = await sendRes.json();

    // 6. Try to check message status if we have a message ID
    let messageStatus = null;
    if (sendData?.key?.id) {
      try {
        const statusRes = await fetch(`${API_URL}/chat/findMessages/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": GLOBAL_KEY! },
          body: JSON.stringify({
            where: { key: { id: sendData.key.id } }
          })
        });
        messageStatus = await statusRes.json();
      } catch (e) {
        messageStatus = { error: String(e) };
      }
    }

    // 7. Check webhook configuration
    let webhookConfig = null;
    try {
      const whRes = await fetch(`${API_URL}/webhook/find/${instanceName}`, {
        method: "GET", headers: { "apikey": GLOBAL_KEY! }
      });
      webhookConfig = await whRes.json();
    } catch (e) {
      webhookConfig = { error: String(e) };
    }

    return new Response(JSON.stringify({
      diagnosis: {
        allInstances: allInstances,
        dbIntegracao: { id: integracao?.id, ativo: integracao?.ativo, credentials: integracao?.credentials },
        connectionState,
        instanceDetails,
        testSend: { status: sendRes.status, ok: sendRes.ok, headers: sendHeaders, data: sendData },
        messageStatus,
        webhookConfig
      }
    }, null, 2), { headers: corsHeaders });
    
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err), stack: err.stack }), { headers: corsHeaders });
  }
});
