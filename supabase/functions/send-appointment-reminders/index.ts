// @ts-nocheck - This file runs in Deno runtime (Supabase Edge Functions), not Node.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEvolutionMessage(apiUrl: string, apiKey: string, instanceName: string, phone: string, message: string) {
  const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": apiKey },
    body: JSON.stringify({
      number: phone,
      textMessage: { text: message },
    }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const API_URL = Deno.env.get("EVOLUTION_API_URL");
    const GLOBAL_KEY = Deno.env.get("EVOLUTION_GLOBAL_KEY");

    if (!API_URL || !GLOBAL_KEY) {
      return new Response(JSON.stringify({ error: "Evolution API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const in1h = new Date(now.getTime() + 65 * 60 * 1000); // 1h05 ahead
    const in1hBack = new Date(now.getTime() + 55 * 60 * 1000); // 55min ahead
    const in24h = new Date(now.getTime() + 24.1 * 60 * 60 * 1000);
    const in24hBack = new Date(now.getTime() + 23.9 * 60 * 60 * 1000);

    // Fetch upcoming appointments (1h and 24h windows)
    const { data: consultas } = await supabase
      .from("consultas")
      .select("id, data_hora, tipo_procedimento, status, paciente_id, lead_id, clinica_id, dentista:usuarios!consultas_dentista_id_fkey(nome)")
      .in("status", ["Agendada", "Confirmada"])
      .gte("data_hora", in1hBack.toISOString())
      .lte("data_hora", in24h.toISOString());

    if (!consultas || consultas.length === 0) {
      return new Response(JSON.stringify({ status: "no_appointments" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let skipped = 0;

    for (const consulta of consultas) {
      const consultaTime = new Date(consulta.data_hora);
      let reminderType: string | null = null;

      // Check if it's a 1h reminder
      if (consultaTime >= in1hBack && consultaTime <= in1h) {
        reminderType = "reminder_1h";
      }
      // Check if it's a 24h reminder
      else if (consultaTime >= in24hBack && consultaTime <= in24h) {
        reminderType = "reminder_24h";
      }

      if (!reminderType) {
        skipped++;
        continue;
      }

      // Check if already sent
      const { data: existing } = await supabase
        .from("automacao_mensagens")
        .select("id")
        .eq("tipo", reminderType)
        .eq("referencia_id", consulta.id)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Get phone from patient or lead
      let phone: string | null = null;
      let contactName = "";

      if (consulta.paciente_id) {
        const { data: paciente } = await supabase
          .from("pacientes")
          .select("nome, whatsapp, telefone")
          .eq("id", consulta.paciente_id)
          .single();
        if (paciente) {
          phone = paciente.whatsapp || paciente.telefone;
          contactName = paciente.nome;
        }
      } else if (consulta.lead_id) {
        const { data: lead } = await supabase
          .from("leads")
          .select("nome, telefone")
          .eq("id", consulta.lead_id)
          .single();
        if (lead) {
          phone = lead.telefone;
          contactName = lead.nome;
        }
      }

      if (!phone) {
        skipped++;
        continue;
      }

      const digits = phone.replace(/\D/g, "");
      const evoPhone = digits.startsWith("55") ? digits : `55${digits}`;

      // Find Evolution API instance for this clinica
      const { data: integracao } = await supabase
        .from("integracoes")
        .select("credentials")
        .eq("clinica_id", consulta.clinica_id)
        .eq("tipo", "evolution_api")
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (!integracao || !integracao.credentials) {
        console.warn(`No active Evolution instance for clinica ${consulta.clinica_id}, skipping reminder`);
        skipped++;
        continue;
      }

      const creds = integracao.credentials as { instanceName?: string };
      if (!creds.instanceName) {
        skipped++;
        continue;
      }

      const dateObj = new Date(consulta.data_hora);
      const dateStr = dateObj.toLocaleDateString("pt-BR");
      const timeStr = dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      const dentistaNome = (consulta.dentista as any)?.nome || "nosso dentista";

      const timeLabel = reminderType === "reminder_1h" ? "em 1 hora" : "amanhã";
      const message = `Olá, ${contactName}! 😊\n\nLembramos que sua consulta está marcada para *${timeLabel}*:\n\n📅 *Data:* ${dateStr}\n⏰ *Horário:* ${timeStr}\n👨‍⚕️ *Dentista:* ${dentistaNome}\n🦷 *Procedimento:* ${consulta.tipo_procedimento}\n\nPodemos confirmar sua presença? Responda *SIM* para confirmar ou *NÃO* para remarcar.`;

      const evoData = await sendEvolutionMessage(API_URL, GLOBAL_KEY, creds.instanceName, evoPhone, message);
      console.log(`Reminder sent to ${contactName}:`, JSON.stringify(evoData));

      const messageId = evoData?.key?.id || evoData?.messageId || null;

      // Track sent reminder
      await supabase.from("automacao_mensagens").insert({
        tipo: reminderType,
        referencia_id: consulta.id,
        phone: evoPhone,
      });

      // Save as chat message
      const { data: conversa } = await supabase
        .from("chat_conversas")
        .select("id")
        .eq("phone", evoPhone)
        .maybeSingle();

      if (conversa) {
        await supabase.from("chat_mensagens").insert({
          conversa_id: conversa.id,
          message_id: messageId,
          from_me: true,
          tipo: "text",
          conteudo: message,
          status: "sent",
        });

        await supabase.from("chat_conversas").update({
          ultima_mensagem: `[Lembrete automático] ${timeLabel}`,
          ultima_mensagem_at: new Date().toISOString(),
        }).eq("id", conversa.id);
      }

      // Log
      await supabase.from("system_logs").insert({
        clinica_id: consulta.clinica_id,
        level: "info",
        action: "send_appointment_reminder_evolution",
        details: { phone: evoPhone, reminderType, consultaId: consulta.id, instanceName: creds.instanceName }
      });

      sent++;
    }

    return new Response(
      JSON.stringify({ status: "ok", sent, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
