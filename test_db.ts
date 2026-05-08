import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "https://wdtwysjfusehzmzlfkaj.supabase.co",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "" // We need the key to fetch
);

// wait I don't have the key here easily. I'll just use the MCP 
