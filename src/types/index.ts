export interface Usuario {
  id: string;
  auth_user_id?: string;
  nome: string;
  email: string;
  papel: 'Recepção' | 'Profissional' | 'Gestor' | 'Gestor/Profissional';
  especialidade?: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Integracao {
  id: string;
  clinica_id: string;
  setor_id?: string | null;
  tipo: string;
  credentials: Record<string, unknown>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paciente {
  id: string;
  codigo_paciente: string | null;
  nome: string;
  cpf: string | null;
  data_nascimento: string | null;
  sexo: 'Masculino' | 'Feminino' | 'Outro' | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  informacoes_clinicas: string | null;
  dentista_id: string | null;
  status: 'Ativo' | 'Em tratamento' | 'Inadimplente' | 'Inativo';
  created_at: string;
  dentista?: Usuario;
}

export interface Consulta {
  id: string;
  paciente_id: string | null;
  lead_id: string | null;
  dentista_id: string;
  data_hora: string;
  duracao_minutos: number;
  tipo_procedimento: string;
  status: 'Agendada' | 'Confirmada' | 'Compareceu' | 'Faltou' | 'Cancelada';
  sala: string | null;
  observacoes: string | null;
  google_event_id: string | null;
  created_at: string;
  paciente?: Paciente;
  lead?: Lead;
  dentista?: Usuario;
}

export interface Lead {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: 'Instagram' | 'Google Ads' | 'Indicação' | 'Site' | 'Facebook' | 'WhatsApp' | 'Outro' | null;
  interesse: string | null;
  etapa_funil: 'Novo Lead' | 'Em Contato' | 'Avaliação marcada' | 'Orçamento aprovado' | 'Orçamento perdido';
  proxima_acao_data: string | null;
  proxima_acao_tipo: string | null;
  convertido_paciente_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  clinica_id?: string | null;
  setor_id?: string | null;
  funil_id?: string | null;
  etapa_id?: string | null;
  created_at: string;
}

export interface LeadHistorico {
  id: string;
  lead_id: string;
  tipo_contato: 'Ligação' | 'WhatsApp' | 'E-mail' | 'Visita' | 'Outro';
  descricao: string;
  usuario_id: string | null;
  created_at: string;
  usuario?: Usuario;
}

export interface LeadJornada {
  id: string;
  lead_id: string;
  clinica_id: string;
  plataforma: 'Meta' | 'Google' | 'WhatsApp' | 'Orgânico';
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ad_id: string | null;
  ad_name: string | null;
  campaign_name: string | null;
  descricao: string | null;
  created_at: string;
}

export interface PlanoTratamento {
  id: string;
  paciente_id: string;
  dentista_id: string;
  status: 'Em avaliação' | 'Apresentado' | 'Aprovado' | 'Reprovado' | 'Em andamento' | 'Concluído';
  valor_total: number;
  entrada_sugerida: number | null;
  numero_parcelas: number | null;
  forma_pagamento: 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Boleto' | null;
  observacoes: string | null;
  created_at: string;
  paciente?: Paciente;
  dentista?: Usuario;
  itens?: PlanoTratamentoItem[];
}

export interface PlanoTratamentoItem {
  id: string;
  plano_id: string;
  procedimento_nome: string;
  dente_regiao: string | null;
  quantidade: number;
  quantidade_aprovada: number;
  valor_unitario: number;
  aprovado: boolean;
  created_at: string;
}

export interface ProcedimentoPadrao {
  id: string;
  nome: string;
  valor_base: number;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Receita {
  id: string;
  paciente_id: string;
  plano_id: string | null;
  procedimento: string | null;
  data: string;
  forma_pagamento: 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'PIX' | 'Boleto' | 'Convênio';
  valor: number;
  status: 'Pago' | 'Parcial' | 'Em aberto';
  created_at: string;
  paciente?: Paciente;
}

export interface Despesa {
  id: string;
  data: string;
  categoria: 'Aluguel' | 'Materiais' | 'Equipe' | 'Marketing' | 'Manutenção' | 'Outros';
  descricao: string;
  valor: number;
  created_at: string;
}

export interface DespesaRecorrente {
  id: string;
  descricao: string;
  categoria: 'Aluguel' | 'Materiais' | 'Equipe' | 'Marketing' | 'Manutenção' | 'Outros';
  valor: number;
  dia_vencimento: number;
  ativo: boolean;
  created_at: string;
}

export interface Tarefa {
  id: string;
  descricao: string;
  paciente_id: string | null;
  lead_id: string | null;
  responsavel_id: string | null;
  data_vencimento: string;
  status: 'Pendente' | 'Em andamento' | 'Concluída';
  created_at: string;
  paciente?: Paciente;
  lead?: Lead;
  responsavel?: Usuario;
}

export interface Clinica {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  dominio: string | null;
  tipo_especialidade: string | null;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  tipo: string;
  ativo: boolean;
  email_destino: string | null;
  created_at: string;
  updated_at: string;
}

export interface PacienteDocumento {
  id: string;
  paciente_id: string;
  nome_arquivo: string;
  tipo_documento: 'Exame' | 'Atestado' | 'Laudo' | 'Contrato' | 'Receita' | 'Foto' | 'Outro';
  tipo_mime: string;
  tamanho_bytes: number;
  storage_path: string;
  descricao: string | null;
  usuario_upload_id: string | null;
  created_at: string;
}

export interface ProntuarioEntrada {
  id: string;
  paciente_id: string;
  tipo: 'Evolução' | 'Anamnese' | 'Exame' | 'Procedimento' | 'Prescrição' | 'Observação';
  titulo: string;
  descricao: string | null;
  data_registro: string;
  dentista_id: string | null;
  created_at: string;
  dentista?: Usuario;
}

export interface Setor {
  id: string;
  clinica_id: string;
  nome: string;
  descricao: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Funil {
  id: string;
  clinica_id: string;
  nome: string;
  descricao: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface FunilEtapa {
  id: string;
  funil_id: string;
  nome: string;
  ordem: number;
  cor: string;
  criado_em: string;
}
