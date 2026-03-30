import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("FRONTEND_URL") || "http://localhost:5173",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const API_URL = Deno.env.get("EVOLUTION_API_URL");
    const GLOBAL_KEY = Deno.env.get("EVOLUTION_GLOBAL_KEY");

    if (!API_URL || !GLOBAL_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    const { action, instanceName, setorId } = await req.json();
    
    // We need to verify if the user sending the req belongs to the instance's clinica
    // For simplicity of this MVP, the user handles their own instances.
    const { data: userData } = await supabaseClient.from('usuarios').select('clinica_id').eq('auth_user_id', user.id).single();
    if(!userData) throw new Error("Usuário não encontrado");
    
    const clinica_id = userData.clinica_id;

    if (action === 'create_instance') {
      const uniqueName = `inst_${clinica_id}_${setorId}_${Date.now()}`;
      
      const response = await fetch(`${API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': GLOBAL_KEY
        },
        body: JSON.stringify({
          instanceName: uniqueName,
          token: uniqueName,
          qrcode: true
        })
      });

      const evoData = await response.json();
      
      if(!response.ok) {
        throw new Error(evoData.message || 'Error creating Evolution instance');
      }

      // Save to Integracoes
      const { data: novaIntegracao, error: dbError } = await supabaseClient.from('integracoes').insert({
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

      if(dbError) throw dbError;

      // Automatically configure Evolution webhook for this instance
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/webhook-evolution`;
      
      await fetch(`${API_URL}/webhook/set/${uniqueName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': GLOBAL_KEY },
        body: JSON.stringify({
          url: WEBHOOK_URL,
          webhookByEvents: false,
          webhookBase64: false,
          events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE", "CONNECTION_UPDATE"]
        })
      });

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

    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error("Evolution API Manager Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
