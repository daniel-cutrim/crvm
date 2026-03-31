import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { timeMin, timeMax, filter_dentista_id } = body;

    if (!timeMin || !timeMax) {
      throw new Error("timeMin and timeMax are required");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing auth header. User must be logged in.");

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // 1. Authenticate user making the request explicitly using the extracted token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth Error details:", authError);
      throw new Error(`Unauthorized: ${authError?.message || 'Token is invalid'}`);
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get clinica_id of logging user
    const { data: userData, error: userError } = await supabaseService
      .from('usuarios')
      .select('clinica_id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userData) throw new Error("Usuário não encontrado.");

    // Fetch tokens for this clinic
    let query = supabaseService
      .from('auth_google_agenda')
      .select('*')
      .eq('clinica_id', userData.clinica_id);
      
    if (filter_dentista_id) {
      // Map filter_dentista_id (public.usuarios.id) to auth_user_id
        const { data: dentistaUsuario } = await supabaseService
          .from('usuarios')
          .select('auth_user_id')
          .eq('id', filter_dentista_id)
          .single();

      if (dentistaUsuario?.auth_user_id) {
          query = query.eq('user_id', dentistaUsuario.auth_user_id);
      } else {
         // If dentista has no auth_user_id mapped, it's impossible to have google calendar connected
         query = query.eq('user_id', '00000000-0000-0000-0000-000000000000'); // Force empty result
      }
    }

    const { data: authDatas, error: dbError } = await query;

    if (dbError || !authDatas || authDatas.length === 0) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let allTransformedEvents: any[] = [];

    // Process all calendars concurrently
    await Promise.all(authDatas.map(async (authData) => {
      let accessToken = authData.access_token;
      
      try {
        // Check if token is expired, if so, refresh it
        const expiryDate = new Date(authData.expiry_date);
        if (expiryDate <= new Date()) {
          if (!authData.refresh_token) {
              console.error(`Token expired and no refresh token available for ${authData.user_id}`);
              return;
          }
          
          const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
              client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
              refresh_token: authData.refresh_token,
              grant_type: "refresh_token",
            }),
          });

          if (!tokenResponse.ok) {
            console.error(`Failed to refresh token for ${authData.user_id}`);
            return;
          }

          const tokens = await tokenResponse.json();
          accessToken = tokens.access_token;

          await supabaseService.from('auth_google_agenda').update({
            access_token: accessToken,
            expiry_date: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          }).eq('id', authData.id);
        }

        const calendarParams = new URLSearchParams({
          timeMin: new Date(timeMin).toISOString(),
          timeMax: new Date(timeMax).toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime'
        });

        const eventsResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${calendarParams}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!eventsResponse.ok) {
           console.error(`Failed to fetch Google Calendar events for ${authData.user_id}`);
           return;
        }

        const eventsData = await eventsResponse.json();

        // Map events and attach dentista_id
        const userEvents = (eventsData.items || []).map((item: any) => {
          const start = new Date(item.start.dateTime || item.start.date);
          const end = new Date(item.end.dateTime || item.end.date);
          const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);

          return {
            id: `google_${item.id}`,
            is_google: true,
            dentista_id: authData.user_id, // Identifies who this event belongs to!
            data_hora: start.toISOString(),
            duracao_minutos: durationMins,
            tipo_procedimento: item.summary || 'Evento sem título',
            status: 'Agendada',
            paciente: null,
            observacoes: item.description || '',
            google_event_url: item.htmlLink
          };
        });

        allTransformedEvents.push(...userEvents);
      } catch (e) {
        console.error(`Error processing sync for ${authData.user_id}`, e);
      }
    }));

    // Sort by chronological order
    allTransformedEvents.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

    return new Response(JSON.stringify(allTransformedEvents), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Calendar Sync Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});
