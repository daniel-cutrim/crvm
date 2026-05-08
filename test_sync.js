const url = "https://wdtwysjfusehzmzlfkaj.supabase.co/functions/v1/sync-chat-media";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdHd5c2pmdXNlaHptemxma2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzA1NDAsImV4cCI6MjA5MDIwNjU0MH0.9NuppFbDLGUz205jUoJ-G051VrefEszBo5cYxaMPWe8";

fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${key}`
  }
}).then(async res => {
  console.log(`Status: ${res.status}`);
  const text = await res.text();
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch (e) {
    console.log(text);
  }
}).catch(e => console.error(e));
