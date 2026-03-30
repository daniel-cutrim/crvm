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
    const { timeMin, timeMax } = await req.json();

    if (!timeMin || !timeMax) {
      throw new Error("timeMin and timeMax are required");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing auth header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // 1. Authenticate user making the request
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // 2. We use Service Role to read auth_google_agenda bypassing RLS that might restrict if doing advanced queries
    // Or we could rely on RLS since the user is querying their own tokens. 
    // Let's rely on RLS: the user can only fetch their own token.
    const { data: authData, error: dbError } = await supabaseClient
      .from('auth_google_agenda')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (dbError || !authData) {
      // User hasn't connected Google Calendar yet. Return empty array gracefully.
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let accessToken = authData.access_token;
    
    // Check if token is expired, if so, refresh it
    const expiryDate = new Date(authData.expiry_date);
    if (expiryDate <= new Date()) {
       if (!authData.refresh_token) {
          throw new Error("Token expired and no refresh token available");
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

      const tokens = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error("Failed to refresh token");

      accessToken = tokens.access_token;

      // Ensure we update using service role or standard client
      await supabaseClient.from('auth_google_agenda').update({
        access_token: accessToken,
        expiry_date: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      }).eq('user_id', user.id);
    }

    // 3. Fetch Events from Google
    const calendarParams = new URLSearchParams({
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime'
    });

    const eventsResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${calendarParams}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!eventsResponse.ok) throw new Error("Failed to fetch Google Calendar events");

    const eventsData = await eventsResponse.json();

    // Map Google format to our standard Agenda Event format
    const transformedEvents = (eventsData.items || []).map((item: any) => {
      // Find duration in minutes
      const start = new Date(item.start.dateTime || item.start.date);
      const end = new Date(item.end.dateTime || item.end.date);
      const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);

      return {
        id: `google_${item.id}`,
        is_google: true,
        data_hora: start.toISOString(),
        duracao_minutos: durationMins,
        tipo_procedimento: item.summary || 'Evento sem título',
        status: 'Agendada',
        paciente: null,
        observacoes: item.description || '',
        google_event_url: item.htmlLink
      };
    });

    return new Response(JSON.stringify(transformedEvents), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Calendar Sync Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});
