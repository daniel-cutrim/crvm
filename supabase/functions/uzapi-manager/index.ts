// @ts-nocheck - This file runs in Deno runtime (Supabase Edge Functions), not Node.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUzapiBaseConfig, uzapiHeaders, uzapiUrl } from "../_shared/uzapi.ts";

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ status: "error", error: "Missing authorization header" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.replace("Bearer ", "").replace("bearer ", "");
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ status: "error", error: `Unauthorized: ${userError?.message || "No user found"}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { baseUrl, username } = getUzapiBaseConfig();

    const bodyData = await req.json();
    const { action, phoneNumberId, setorId, phone } = bodyData;

    const { data: userData, error: userDataError } = await adminClient
      .from("usuarios").select("clinica_id").eq("auth_user_id", user.id).single();
    if (userDataError || !userData) throw new Error("Usuário não encontrado na base de dados");
    const clinica_id = userData.clinica_id;

    // Helper: get token from DB credentials for a given phoneNumberId
    async function getInstanceToken(pnId: string): Promise<string> {
      const { data } = await adminClient.from("integracoes")
        .select("credentials")
        .eq("tipo", "uzapi")
        .filter("credentials->>phoneNumberId", "eq", pnId)
        .single();
      const token = (data?.credentials as any)?.token;
      if (!token) throw new Error("Token não encontrado para esta instância");
      return token;
    }

    // --- CREATE INSTANCE (no token needed, just username) ---
    if (action === "create_instance") {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/webhook-uzapi`;

      const response = await fetch(`${baseUrl}/${username}/v1/instance/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authenticationMethod: "QRCode",
          webhook: WEBHOOK_URL,
          autoRejectCall: false,
          appVersion: "latest",
          ...(phone ? { phoneNumber: String(phone).replace(/\D/g, "") } : {}),
          resources: {
            requests: { cpu: "50m", memory: "70Mi" },
            limits: { cpu: "100m", memory: "256Mi" },
          },
        }),
      });

      const apiData = await response.json();
      // Response can be an array
      const instanceData = Array.isArray(apiData) ? apiData[0] : apiData;

      if (!response.ok) {
        console.error("UZAPI create error:", JSON.stringify(apiData));
        // message can be a string or nested object
        const rawMsg = instanceData?.message;
        const errMsg = typeof rawMsg === "string"
          ? rawMsg
          : rawMsg?.message || instanceData?.error || "Erro ao criar instância UZAPI";
        throw new Error(errMsg);
      }

      const newPhoneNumberId = instanceData.phone_number_id;
      const instanceToken = instanceData.token;

      if (!newPhoneNumberId) {
        console.error("UZAPI response missing phone_number_id:", JSON.stringify(instanceData));
        throw new Error("Resposta da UZAPI não contém phone_number_id");
      }

      const { data: novaIntegracao, error: dbError } = await adminClient.from("integracoes").insert({
        clinica_id,
        setor_id: setorId,
        tipo: "uzapi",
        ativo: true,
        credentials: {
          phoneNumberId: String(newPhoneNumberId),
          token: instanceToken || null,
          instanceId: instanceData.id || null,
        },
      }).select().single();

      if (dbError) throw dbError;

      return new Response(JSON.stringify({
        success: true,
        instance: novaIntegracao,
        qrcode: instanceData.qrcode || instanceData.qr_code || null,
        deploymentStatus: instanceData.deploymentStatus || null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // --- GET QR CODE ---
    if (action === "get_qr_code") {
      if (!phoneNumberId) throw new Error("phoneNumberId is required");
      const token = await getInstanceToken(phoneNumberId);
      const headers = uzapiHeaders(token);

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/webhook-uzapi`;

      await fetch(uzapiUrl(baseUrl, username, phoneNumberId, "instance/update"), {
        method: "PUT", headers,
        body: JSON.stringify({ authenticationMethod: "QRCode", webhook: WEBHOOK_URL }),
      });

      const response = await fetch(uzapiUrl(baseUrl, username, phoneNumberId, "instance/restart"), {
        method: "POST", headers,
      });
      const data = await response.json();

      return new Response(JSON.stringify({
        success: true,
        base64: data.qrcode || data.qr_code || data.base64 || null,
        apiResponse: data,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- CHECK CONNECTION ---
    if (action === "check_connection") {
      if (!phoneNumberId) throw new Error("phoneNumberId is required");
      const token = await getInstanceToken(phoneNumberId);

      const response = await fetch(uzapiUrl(baseUrl, username, phoneNumberId, "instance"), {
        method: "GET", headers: uzapiHeaders(token),
      });
      const data = await response.json();
      const raw = Array.isArray(data) ? data[0] : data;

      let state = "unknown";
      const s = raw?.deploymentStatus || raw?.status || raw?.state || raw?.connection || "";
      if (s === "connected" || s === "running") state = "open";
      else if (s === "disconnected" || s === "desconnected" || s === "pending_auth") state = "close";
      else if (s === "connecting") state = "connecting";

      return new Response(JSON.stringify({ success: true, state }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- LOGOUT ---
    if (action === "logout") {
      if (!phoneNumberId) throw new Error("phoneNumberId is required");
      const token = await getInstanceToken(phoneNumberId);
      await fetch(uzapiUrl(baseUrl, username, phoneNumberId, "instance/logout"), {
        method: "POST", headers: uzapiHeaders(token),
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- DELETE INSTANCE ---
    if (action === "delete_instance") {
      if (!phoneNumberId) throw new Error("phoneNumberId is required");
      const token = await getInstanceToken(phoneNumberId);
      await fetch(uzapiUrl(baseUrl, username, phoneNumberId, "instance/delete"), {
        method: "DELETE", headers: uzapiHeaders(token),
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CHECK WHATSAPP NUMBER ---
    if (action === "check_whatsapp") {
      if (!phone || !phoneNumberId) throw new Error("phone and phoneNumberId are required");
      const token = await getInstanceToken(phoneNumberId);
      const digits = phone.replace(/\D/g, "");
      const uzPhone = digits.startsWith("55") ? digits : `55${digits}`;

      const response = await fetch(uzapiUrl(baseUrl, username, phoneNumberId, "contacts"), {
        method: "POST", headers: uzapiHeaders(token),
        body: JSON.stringify({ action: "get", filter: uzPhone, limit: 1 }),
      });
      const data = await response.json();
      const exists = Array.isArray(data) ? data.length > 0 : !!data?.contacts?.length;

      return new Response(JSON.stringify({ success: true, exists, formattedPhone: uzPhone }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("UZAPI Manager Error:", error);
    return new Response(JSON.stringify({ status: "error", error: error.message || "Internal server error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
