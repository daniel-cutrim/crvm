// @ts-nocheck - This file runs in Deno runtime (Supabase Edge Functions), not Node.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendUzapiTextMessage, formatPhone } from "../_shared/uzapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const in1h = new Date(now.getTime() + 65 * 60 * 1000);
    const in1hBack = new Date(now.getTime() + 55 * 60 * 1000);
    const in24h = new Date(now.getTime() + 24.1 * 60 * 60 * 1000);
    const in24hBack = new Date(now.getTime() + 23.9 * 60 * 60 * 1000);

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

      if (consultaTime >= in1hBack && consultaTime <= in1h) {
        reminderType = "reminder_1h";
      } else if (consultaTime >= in24hBack && consultaTime <= in24h) {
        reminderType = "reminder_24h";
      }

      if (!reminderType) {
        skipped++;
        continue;
      }

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

      const uzapiPhone = formatPhone(phone);

      // Find UZAPI instance for this clinica
      const { data: integracao } = await supabase
        .from("integracoes")
        .select("credentials")
        .eq("clinica_id", consulta.clinica_id)
        .eq("tipo", "uzapi")
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (!integracao || !integracao.credentials) {
        console.warn(`No active UZAPI instance for clinica ${consulta.clinica_id}, skipping reminder`);
        skipped++;
        continue;
      }

      const creds = integracao.credentials as { phoneNumberId?: string; token?: string };
      if (!creds.phoneNumberId || !creds.token) {
        skipped++;
        continue;
      }

      const dateObj = new Date(consulta.data_hora);
      const dateStr = dateObj.toLocaleDateString("pt-BR");
      const timeStr = dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      const dentistaNome = (consulta.dentista as any)?.nome || "nosso dentista";

      const timeLabel = reminderType === "reminder_1h" ? "em 1 hora" : "amanhã";
      const message = `Olá, ${contactName}! 😊\n\nLembramos que sua consulta está marcada para *${timeLabel}*:\n\n📅 *Data:* ${dateStr}\n⏰ *Horário:* ${timeStr}\n👨‍⚕️ *Dentista:* ${dentistaNome}\n🦷 *Procedimento:* ${consulta.tipo_procedimento}\n\nPodemos confirmar sua presença? Responda *SIM* para confirmar ou *NÃO* para remarcar.`;

      const apiData = await sendUzapiTextMessage(creds as { phoneNumberId: string; token: string }, uzapiPhone, message, 2, 5);
      console.log(`Reminder sent to ${contactName}:`, JSON.stringify(apiData));

      const messageId = apiData?.messages?.[0]?.id || apiData?.messageId || null;

      await supabase.from("automacao_mensagens").insert({
        tipo: reminderType,
        referencia_id: consulta.id,
        phone: uzapiPhone,
      });

      const { data: conversa } = await supabase
        .from("chat_conversas")
        .select("id")
        .eq("phone", uzapiPhone)
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

      await supabase.from("system_logs").insert({
        clinica_id: consulta.clinica_id,
        level: "info",
        action: "send_appointment_reminder_uzapi",
        details: { phone: uzapiPhone, reminderType, consultaId: consulta.id, phoneNumberId: creds.phoneNumberId }
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
