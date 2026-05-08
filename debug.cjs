const fs = require('fs');

// Read .env manually
const envPath = '.env.local';
let env = {}; const strip = s => s.replace(/^"|"$/g, "");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      env[key.trim()] = values.join('=').trim();
    }
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

async function checkDebug() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/_webhook_debug?select=decision,parsed,error_msg&order=created_at.desc&limit=3`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await res.json();
    console.log("=== WEBHOOK DEBUG ===");
    console.log(JSON.stringify(data, null, 2));

    const msgRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_mensagens?select=id,message_id,media_url,tipo,from_me&order=created_at.desc&limit=3`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const msgData = await msgRes.json();
    console.log("=== LATEST MESSAGES ===");
    console.log(JSON.stringify(msgData, null, 2));

  } catch (err) {
    console.error("Error", err);
  }
}
checkDebug();
