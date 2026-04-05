import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ status: "error", error: "Missing authorization header" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the JWT token from "Bearer <token>"
    const jwt = authHeader.replace("Bearer ", "").replace("bearer ", "");

    // Admin client: used for both auth validation and DB operations (bypasses RLS)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Validate the user by passing JWT directly to getUser
    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt);

    if (userError || !user) {
      console.error("Auth failed:", userError?.message || "No user");
      return new Response(JSON.stringify({ status: "error", error: `Unauthorized: ${userError?.message || 'No user found'}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const API_URL = Deno.env.get("EVOLUTION_API_URL");
    const GLOBAL_KEY = Deno.env.get("EVOLUTION_GLOBAL_KEY");

    if (!API_URL || !GLOBAL_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    const bodyData = await req.json();
    const { action, instanceName, setorId, phone } = bodyData;
    
    // Use adminClient to bypass RLS on usuarios table
    const { data: userData, error: userDataError } = await adminClient
      .from('usuarios')
      .select('clinica_id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (userDataError || !userData) {
      console.error("User lookup failed:", userDataError?.message);
      throw new Error("Usuário não encontrado na base de dados");
    }
    
    const clinica_id = userData.clinica_id;

    if (action === 'create_instance') {
      const uniqueName = `inst_${clinica_id}_${setorId}_${Date.now()}`;
      
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/webhook-evolution`;

      console.log("Creating instance:", uniqueName, "Webhook:", WEBHOOK_URL);

      const response = await fetch(`${API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': GLOBAL_KEY
        },
        body: JSON.stringify({
          instanceName: uniqueName,
          token: uniqueName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          groupsIgnore: true,
          webhook: {
            url: WEBHOOK_URL,
            byEvents: false,
            base64: false,
            events: [
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "SEND_MESSAGE",
              "CONNECTION_UPDATE"
            ]
          }
        })
      });

      const evoData = await response.json();
      
      if (!response.ok) {
        console.error("Evolution API error:", JSON.stringify(evoData));
        throw new Error(evoData.message || 'Error creating Evolution instance');
      }

      // Save to Integracoes using admin client to bypass RLS
      const { data: novaIntegracao, error: dbError } = await adminClient.from('integracoes').insert({
        clinica_id,
        setor_id: setorId,
        tipo: 'evolution_api',
        ativo: true,
        credentials: {
          instanceName: uniqueName,
          token: uniqueName,
          hash: evoData.hash,
          proxy: evoData.proxy || null
        }
      }).select().single();

      if (dbError) {
        console.error("DB insert error:", dbError.message);
        throw dbError;
      }

      return new Response(JSON.stringify({ success: true, instance: novaIntegracao, qrcode: evoData.qrcode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === 'get_qr_code') {
      
      const response = await fetch(`${API_URL}/instance/connect/${instanceName}`, {
        headers: { 'apikey': GLOBAL_KEY }
      });
      const data = await response.json();
      
      return new Response(JSON.stringify({ success: true, base64: data.base64 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === 'check_connection') {
      
      const response = await fetch(`${API_URL}/instance/connectionState/${instanceName}`, {
        headers: { 'apikey': GLOBAL_KEY }
      });
      const data = await response.json();
      
      return new Response(JSON.stringify({ success: true, state: data.instance?.state || 'disconnected' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === 'logout') {
      
      await fetch(`${API_URL}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': GLOBAL_KEY }
      });
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === 'check_whatsapp') {
      if (!phone || !instanceName) {
        throw new Error('Phone and instanceName are required');
      }

      const digits = phone.replace(/\D/g, "");
      const evoPhone = digits.startsWith("55") ? digits : `55${digits}`;

      const response = await fetch(`${API_URL}/chat/whatsappNumbers/${instanceName}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': GLOBAL_KEY 
        },
        body: JSON.stringify({ numbers: [evoPhone] })
      });

      const data = await response.json();
      const exists = data[0]?.exists || false;
      const formattedPhone = data[0]?.jid ? data[0]?.jid.replace('@s.whatsapp.net', '') : evoPhone;
      
      return new Response(JSON.stringify({ success: true, exists, formattedPhone }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error("Evolution API Manager Error:", error);
    return new Response(JSON.stringify({ status: "error", error: error.message || "Internal server error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
