import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  // The redirect URI must be this exact edge function URL
  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-auth`;

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: "Google OAuth credentials not configured" }), { status: 500, headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // We use Service Role because callback comes from Google (unauthenticated)
  );

  const url = new URL(req.url);
  
  try {
    // 1. Generate Auth URL (Frontend calls this)
    if (req.method === "POST") {
      const { user_id, clinica_id } = await req.json();
      
      if (!user_id || !clinica_id) throw new Error("Missing user_id or clinica_id");

      // Pass user_id and clinica_id in the state so we know who authorized it upon redirect
      const state = btoa(JSON.stringify({ user_id, clinica_id }));

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=https://www.googleapis.com/auth/calendar.events` +
        `&access_type=offline` +
        `&prompt=consent` + // Force prompt to ensure we get a refresh token
        `&state=${state}`;

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Handle Google Callback (GET method)
    if (req.method === "GET") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
         // User rejected or other error. Redirect back to app with error
         const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
         return Response.redirect(`${frontendUrl}/configuracoes?tab=integracoes&error=${error}`, 302);
      }

      if (!code || !state) {
        return new Response("Missing code or state in callback", { status: 400 });
      }

      const { user_id, clinica_id } = JSON.parse(atob(state));

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokens.error_description || "Failed to exchange tokens");
      }

      // Save tokens in auth_google_agenda table
      const { error: dbError } = await supabaseClient
        .from('auth_google_agenda')
        .upsert({
          user_id: user_id,
          clinica_id: clinica_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token, // Might be undefined if not first time. Handle appropriately.
          expiry_date: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        }, { onConflict: 'user_id' });

      if (dbError) throw dbError;

      const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
      return Response.redirect(`${frontendUrl}/configuracoes?tab=integracoes&google_auth=success`, 302);
    }

    return new Response("Method not allowed", { status: 405 });

  } catch (error: any) {
    console.error("Calendar Auth Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
