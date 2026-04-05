const { createClient } = require("@supabase/supabase-js");

const supabase = createClient("https://wdtwysjfusehzmzlfkaj.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdHd5c2pmdXNlaHptemxma2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzA1NDAsImV4cCI6MjA5MDIwNjU0MH0.9NuppFbDLGUz205jUoJ-G051VrefEszBo5cYxaMPWe8");

const body = {
    "phone": "559984041462",
    "message": "aaa",
    "conversa_id": "74d898ee-d7e0-4855-b6df-54171cb1823a",
    "type": "text",
    "clinica_id": "c5630e0c-eb6d-41a2-abb2-66a292be602a",
    "setor_id": "49c866d1-9a36-4425-b5c0-2f96777b30a5"
};

supabase.functions.invoke("send-message", { body })
  .then(({data, error}) => {
    console.log("Response:", JSON.stringify(data, null, 2));
    if (error) console.error("Error:", error);
    process.exit(0);
  });
