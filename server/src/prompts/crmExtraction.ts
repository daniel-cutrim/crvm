export const CRM_EXTRACTION_PROMPT = `Analise a conversa e extraia as informações do lead no formato JSON abaixo.
Use null para campos não identificados. NUNCA invente informações.
Retorne APENAS o JSON, sem texto adicional.

{
  "crm_nome": "string ou null",
  "crm_telefone": "string ou null",
  "crm_etapa_funil": "string ou null — ex: prospecção, qualificação, proposta, negociação, fechado",
  "crm_interesse": "string ou null — o que o lead quer/precisa",
  "crm_problemas_identificados": "string ou null — dores e problemas mencionados",
  "crm_urgencia": "string ou null — ex: imediata, 30 dias, sem urgência",
  "crm_preferencia_modalidade": "string ou null — ex: online, presencial, híbrido",
  "crm_objecoes": "string ou null — objeções levantadas pelo lead",
  "crm_preferencia_horario": "string ou null — horários ou períodos mencionados",
  "crm_resumo_geral": "string ou null — resumo objetivo da conversa em 2-3 frases"
}`;
