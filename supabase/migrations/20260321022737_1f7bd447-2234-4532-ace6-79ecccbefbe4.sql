
-- F&F Odonto - Sistema de Gestão de Clínica Odontológica (Consolidado)

-- Tabela da Clínica
CREATE TABLE IF NOT EXISTS clinica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT 'F&F Odonto',
  cnpj text,
  endereco text,
  telefone text,
  email text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clinica ENABLE ROW LEVEL SECURITY;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id),
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  papel text NOT NULL CHECK (papel IN ('Recepção', 'Dentista', 'Gestor')),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON usuarios(auth_user_id);
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Tabela de Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text,
  data_nascimento date,
  sexo text CHECK (sexo IN ('Masculino', 'Feminino', 'Outro')),
  telefone text,
  whatsapp text,
  email text,
  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  informacoes_clinicas text,
  dentista_id uuid REFERENCES usuarios(id),
  status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Em tratamento', 'Inadimplente', 'Inativo')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

-- Tabela de Procedimentos Padrão
CREATE TABLE IF NOT EXISTS procedimentos_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  valor_base decimal(10,2) NOT NULL DEFAULT 0,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE procedimentos_padrao ENABLE ROW LEVEL SECURITY;

-- Tabela de Leads (CRM)
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  email text,
  origem text CHECK (origem IN ('Instagram', 'Google Ads', 'Indicação', 'Site', 'Facebook', 'Outro')),
  interesse text,
  etapa_funil text NOT NULL DEFAULT 'Novo Lead' CHECK (etapa_funil IN ('Novo Lead', 'Em Contato', 'Avaliação marcada', 'Orçamento aprovado', 'Orçamento perdido')),
  proxima_acao_data date,
  proxima_acao_tipo text,
  convertido_paciente_id uuid REFERENCES pacientes(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Tabela de Consultas
CREATE TABLE IF NOT EXISTS consultas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES pacientes(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  dentista_id uuid NOT NULL REFERENCES usuarios(id),
  data_hora timestamptz NOT NULL,
  duracao_minutos integer NOT NULL DEFAULT 30,
  tipo_procedimento text NOT NULL,
  status text NOT NULL DEFAULT 'Agendada' CHECK (status IN ('Agendada', 'Confirmada', 'Compareceu', 'Faltou', 'Cancelada')),
  sala text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT consultas_paciente_or_lead_check CHECK (
    (paciente_id IS NOT NULL AND lead_id IS NULL) OR 
    (paciente_id IS NULL AND lead_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_consultas_lead_id ON consultas(lead_id);
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

-- Tabela de Histórico de Leads
CREATE TABLE IF NOT EXISTS leads_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo_contato text NOT NULL CHECK (tipo_contato IN ('Ligação', 'WhatsApp', 'E-mail', 'Visita', 'Outro')),
  descricao text NOT NULL,
  usuario_id uuid REFERENCES usuarios(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE leads_historico ENABLE ROW LEVEL SECURITY;

-- Tabela de Planos de Tratamento
CREATE TABLE IF NOT EXISTS planos_tratamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  dentista_id uuid NOT NULL REFERENCES usuarios(id),
  status text NOT NULL DEFAULT 'Em avaliação' CHECK (status IN ('Em avaliação', 'Apresentado', 'Aprovado', 'Reprovado', 'Em andamento', 'Concluído')),
  valor_total decimal(10,2) NOT NULL DEFAULT 0,
  entrada_sugerida decimal(10,2),
  numero_parcelas integer,
  observacoes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE planos_tratamento ENABLE ROW LEVEL SECURITY;

-- Tabela de Itens do Plano de Tratamento
CREATE TABLE IF NOT EXISTS planos_tratamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES planos_tratamento(id) ON DELETE CASCADE,
  procedimento_nome text NOT NULL,
  dente_regiao text,
  quantidade integer NOT NULL DEFAULT 1,
  quantidade_aprovada integer NOT NULL DEFAULT 0,
  valor_unitario decimal(10,2) NOT NULL DEFAULT 0,
  aprovado boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT planos_tratamento_itens_quantidade_aprovada_check CHECK (quantidade_aprovada >= 0 AND quantidade_aprovada <= quantidade)
);
CREATE INDEX IF NOT EXISTS idx_planos_tratamento_itens_aprovado ON planos_tratamento_itens(plano_id, aprovado);
ALTER TABLE planos_tratamento_itens ENABLE ROW LEVEL SECURITY;

-- Tabela de Receitas
CREATE TABLE IF NOT EXISTS receitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  plano_id uuid REFERENCES planos_tratamento(id),
  procedimento text,
  data date NOT NULL,
  forma_pagamento text NOT NULL CHECK (forma_pagamento IN ('Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Boleto', 'Convênio')),
  valor decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'Em aberto' CHECK (status IN ('Pago', 'Parcial', 'Em aberto')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;

-- Tabela de Despesas
CREATE TABLE IF NOT EXISTS despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('Aluguel', 'Materiais', 'Equipe', 'Marketing', 'Manutenção', 'Outros')),
  descricao text NOT NULL,
  valor decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

-- Tabela de Tarefas
CREATE TABLE IF NOT EXISTS tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  paciente_id uuid REFERENCES pacientes(id),
  lead_id uuid REFERENCES leads(id),
  responsavel_id uuid REFERENCES usuarios(id),
  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em andamento', 'Concluída')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- Tabela de Configurações de Notificação
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  ativo boolean DEFAULT true,
  email_destino text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Tabela de Documentos de Pacientes
CREATE TABLE IF NOT EXISTS paciente_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  tipo_documento text NOT NULL CHECK (tipo_documento IN ('Exame', 'Atestado', 'Laudo', 'Contrato', 'Receita', 'Foto', 'Outro')),
  tipo_mime text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  storage_path text NOT NULL UNIQUE,
  descricao text,
  usuario_upload_id uuid REFERENCES usuarios(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paciente_documentos_paciente_id ON paciente_documentos(paciente_id);
ALTER TABLE paciente_documentos ENABLE ROW LEVEL SECURITY;

-- FUNÇÕES DE UTILIDADE

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT papel FROM usuarios WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_gestor()
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM usuarios 
    WHERE auth_user_id = auth.uid() AND papel = 'Gestor' AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_dentista()
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM usuarios 
    WHERE auth_user_id = auth.uid() AND papel = 'Dentista' AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_id()
RETURNS uuid AS $$
  SELECT id FROM usuarios WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- TRIGGER PARA CRIAR PERFIL APÓS SIGNUP

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO usuarios (auth_user_id, nome, email, papel, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE 
      WHEN (SELECT COUNT(*) FROM usuarios) = 0 THEN 'Gestor'
      ELSE COALESCE(NEW.raw_user_meta_data->>'papel', 'Recepção')
    END,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS POLICIES

-- CLINICA
CREATE POLICY "Todos podem ler clínica" ON clinica FOR SELECT TO authenticated USING (true);
CREATE POLICY "Apenas gestores podem atualizar clínica" ON clinica FOR UPDATE TO authenticated USING (is_gestor()) WITH CHECK (is_gestor());
CREATE POLICY "Gestores podem inserir dados da clínica" ON clinica FOR INSERT TO authenticated WITH CHECK (is_gestor());

-- USUARIOS
CREATE POLICY "Usuários autenticados podem ver usuários" ON usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Podem inserir usuários" ON usuarios FOR INSERT TO authenticated WITH CHECK (is_gestor() OR NOT EXISTS(SELECT 1 FROM usuarios));
CREATE POLICY "Apenas gestores podem atualizar usuários" ON usuarios FOR UPDATE TO authenticated USING (is_gestor()) WITH CHECK (is_gestor());
CREATE POLICY "Apenas gestores podem deletar usuários" ON usuarios FOR DELETE TO authenticated USING (is_gestor());

-- PACIENTES
CREATE POLICY "Usuários podem ver pacientes" ON pacientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestores e Recepção podem cadastrar pacientes" ON pacientes FOR INSERT TO authenticated WITH CHECK (is_gestor() OR get_user_role() = 'Recepção');
CREATE POLICY "Gestores e dentistas podem atualizar pacientes" ON pacientes FOR UPDATE TO authenticated USING (is_gestor() OR (is_dentista() AND dentista_id = get_user_id())) WITH CHECK (is_gestor() OR (is_dentista() AND dentista_id = get_user_id()));
CREATE POLICY "Apenas gestores podem deletar pacientes" ON pacientes FOR DELETE TO authenticated USING (is_gestor());

-- PROCEDIMENTOS
CREATE POLICY "Todos podem ver procedimentos" ON procedimentos_padrao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestores podem inserir procedimentos" ON procedimentos_padrao FOR INSERT TO authenticated WITH CHECK (is_gestor());
CREATE POLICY "Gestores podem atualizar procedimentos" ON procedimentos_padrao FOR UPDATE TO authenticated USING (is_gestor()) WITH CHECK (is_gestor());
CREATE POLICY "Gestores podem deletar procedimentos" ON procedimentos_padrao FOR DELETE TO authenticated USING (is_gestor());

-- CONSULTAS
CREATE POLICY "Usuários podem ver consultas" ON consultas FOR SELECT TO authenticated USING (is_gestor() OR dentista_id = get_user_id() OR get_user_role() = 'Recepção');
CREATE POLICY "Gestores e Recepção podem agendar consultas" ON consultas FOR INSERT TO authenticated WITH CHECK (is_gestor() OR get_user_role() = 'Recepção');
CREATE POLICY "Podem atualizar consultas" ON consultas FOR UPDATE TO authenticated USING (is_gestor() OR dentista_id = get_user_id() OR get_user_role() = 'Recepção') WITH CHECK (is_gestor() OR dentista_id = get_user_id() OR get_user_role() = 'Recepção');
CREATE POLICY "Apenas gestores podem deletar consultas" ON consultas FOR DELETE TO authenticated USING (is_gestor());

-- LEADS
CREATE POLICY "Gestores e Recepção podem ver leads" ON leads FOR SELECT TO authenticated USING (is_gestor() OR get_user_role() = 'Recepção');
CREATE POLICY "Gestores e Recepção podem criar leads" ON leads FOR INSERT TO authenticated WITH CHECK (is_gestor() OR get_user_role() = 'Recepção');
CREATE POLICY "Gestores e Recepção podem atualizar leads" ON leads FOR UPDATE TO authenticated USING (is_gestor() OR get_user_role() = 'Recepção') WITH CHECK (is_gestor() OR get_user_role() = 'Recepção');
CREATE POLICY "Apenas gestores podem deletar leads" ON leads FOR DELETE TO authenticated USING (is_gestor());

-- LEADS HISTORICO
CREATE POLICY "Podem ver histórico" ON leads_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Podem inserir histórico" ON leads_historico FOR INSERT TO authenticated WITH CHECK (true);

-- PLANOS DE TRATAMENTO
CREATE POLICY "Podem ver planos" ON planos_tratamento FOR SELECT TO authenticated USING (is_gestor() OR dentista_id = get_user_id() OR get_user_role() = 'Recepção');
CREATE POLICY "Dentistas e gestores podem criar planos" ON planos_tratamento FOR INSERT TO authenticated WITH CHECK (is_gestor() OR is_dentista());
CREATE POLICY "Dentistas e gestores podem atualizar planos" ON planos_tratamento FOR UPDATE TO authenticated USING (is_gestor() OR dentista_id = get_user_id()) WITH CHECK (is_gestor() OR dentista_id = get_user_id());
CREATE POLICY "Apenas gestores podem deletar planos" ON planos_tratamento FOR DELETE TO authenticated USING (is_gestor());

-- PLANOS ITENS
CREATE POLICY "Podem ver itens de planos" ON planos_tratamento_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Podem inserir itens" ON planos_tratamento_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Podem atualizar itens" ON planos_tratamento_itens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Podem deletar itens" ON planos_tratamento_itens FOR DELETE TO authenticated USING (true);

-- RECEITAS
CREATE POLICY "Gestores veem receitas" ON receitas FOR SELECT TO authenticated USING (is_gestor());
CREATE POLICY "Gestores criam receitas" ON receitas FOR INSERT TO authenticated WITH CHECK (is_gestor());
CREATE POLICY "Gestores atualizam receitas" ON receitas FOR UPDATE TO authenticated USING (is_gestor()) WITH CHECK (is_gestor());
CREATE POLICY "Gestores deletam receitas" ON receitas FOR DELETE TO authenticated USING (is_gestor());

-- DESPESAS
CREATE POLICY "Gestores veem despesas" ON despesas FOR SELECT TO authenticated USING (is_gestor());
CREATE POLICY "Gestores criam despesas" ON despesas FOR INSERT TO authenticated WITH CHECK (is_gestor());
CREATE POLICY "Gestores atualizam despesas" ON despesas FOR UPDATE TO authenticated USING (is_gestor()) WITH CHECK (is_gestor());
CREATE POLICY "Gestores deletam despesas" ON despesas FOR DELETE TO authenticated USING (is_gestor());

-- TAREFAS
CREATE POLICY "Podem ver tarefas" ON tarefas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Podem criar tarefas" ON tarefas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Podem atualizar tarefas" ON tarefas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Podem deletar tarefas" ON tarefas FOR DELETE TO authenticated USING (true);

-- NOTIFICATION SETTINGS
CREATE POLICY "Gestores veem notificações" ON notification_settings FOR SELECT TO authenticated USING (is_gestor());
CREATE POLICY "Gestores atualizam notificações" ON notification_settings FOR UPDATE TO authenticated USING (is_gestor()) WITH CHECK (is_gestor());
CREATE POLICY "Gestores criam notificações" ON notification_settings FOR INSERT TO authenticated WITH CHECK (is_gestor());

-- PACIENTE DOCUMENTOS
CREATE POLICY "Podem ver documentos" ON paciente_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Podem fazer upload" ON paciente_documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Podem atualizar documentos" ON paciente_documentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Podem deletar documentos" ON paciente_documentos FOR DELETE TO authenticated USING (true);

-- Storage bucket para documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'paciente-documentos',
  'paciente-documentos',
  false,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Upload de arquivos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'paciente-documentos');
CREATE POLICY "Visualizar arquivos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'paciente-documentos');
CREATE POLICY "Deletar arquivos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'paciente-documentos');

-- Inserir configuração padrão de notificações
INSERT INTO notification_settings (tipo, ativo, email_destino) VALUES ('novo_lead', true, null);

-- Inserir dados da clínica padrão
INSERT INTO clinica (nome) VALUES ('F&F Odonto');
