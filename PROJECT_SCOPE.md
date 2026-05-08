# 🦷 CRM Odonto — Plataforma SaaS para Clínicas Odontológicas

## Visão Geral

O **CRM Odonto** é uma plataforma SaaS multi-tenant projetada para clínicas e consultórios odontológicos. O sistema centraliza a gestão de pacientes, leads, agenda, comunicação via WhatsApp, financeiro e marketing em uma única interface web.

A aplicação utiliza arquitetura multi-tenant onde cada clínica (`clinica_id`) opera com dados completamente isolados via Row Level Security (RLS) no banco de dados.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Front-end** | React 18 + TypeScript + Vite |
| **UI Components** | shadcn/ui + Radix UI + Tailwind CSS |
| **Back-end/BaaS** | Supabase (PostgreSQL + Auth + Edge Functions + Storage) |
| **WhatsApp API** | Uzapi (self-hosted) |
| **Agenda externa** | Google Calendar API (OAuth 2.0) |
| **Gráficos** | Recharts |

---

## Autenticação e Controle de Acesso

### Login
- **URL**: `/` (página raiz)
- **Método**: E-mail + Senha via Supabase Auth
- **Fluxo**: Formulário com campos de e-mail e senha. Possui opção de cadastro e recuperação de senha.
- **Credenciais de teste**: Não há credenciais fixas. O sistema requer um cadastro real via Supabase Auth.

### Papéis de Usuário (Roles)
O sistema possui três perfis com diferentes permissões de acesso:

| Papel | Acesso |
|---|---|
| **Gestor** | Todas as páginas e funcionalidades (admin total) |
| **Recepção** | Dashboard, Pacientes, Agenda, CRM, Chat, Tarefas |
| **Dentista** | Dashboard, Pacientes, Agenda, Planos de Tratamento, Tarefas |

---

## Navegação e Páginas

A aplicação é uma SPA (Single Page Application) que utiliza navegação interna via sidebar lateral. Não há rotas de URL tradicionais — a troca de páginas é feita por estado interno (`currentPage`).

### Menu Lateral (Sidebar)
O menu lateral à esquerda contém os seguintes itens de navegação:

| Item do Menu | Página | Ícone | Restrição |
|---|---|---|---|
| Dashboard | `dashboard` | LayoutDashboard | Todos |
| Pacientes | `pacientes` | Users | Todos |
| Agenda | `agenda` | Calendar | Todos |
| CRM | `crm` | Target | Gestor, Recepção |
| Planos | `planos` | FileText | Todos |
| Financeiro | `financeiro` | DollarSign | Gestor |
| Marketing | `marketing` | BarChart | Gestor |
| Chat WhatsApp | `chat` | MessageSquare | Gestor, Recepção |
| Tarefas | `tarefas` | CheckSquare | Todos |
| Configurações | `configuracoes` | Settings | Gestor |

---

## Módulos e Funcionalidades

### 1. Dashboard
- **Descrição**: Painel principal com métricas e indicadores da clínica.
- **Elementos visíveis**: Cards com totais (pacientes, consultas do dia, leads novos, receitas), gráficos de evolução e atalhos de navegação rápida.
- **Interações**: Clicar nos cards redireciona para o módulo correspondente.

### 2. Pacientes
- **Descrição**: Cadastro completo de pacientes com ficha clínica.
- **Funcionalidades**:
  - Listagem de pacientes em tabela com busca e filtros.
  - Formulário modal para criar/editar paciente (nome, telefone, whatsapp, e-mail, CPF, data de nascimento, endereço, observações).
  - Detalhamento do paciente com abas: Dados Pessoais, Histórico de Consultas, Odontograma (mapa dental interativo), Planos de Tratamento, Receitas.
  - **Odontograma**: Representação visual dos 32 dentes com possibilidade de registrar procedimentos por dente.

### 3. Agenda
- **Descrição**: Calendário profissional para gerenciamento de consultas.
- **Funcionalidades**:
  - Visualização semanal (Seg-Sáb) e diária.
  - Grid horário de 7h às 19h.
  - Navegação entre semanas (botões Voltar/Avançar e "Hoje").
  - Filtro por dentista (select dropdown).
  - Clique em slot vazio para agendar nova consulta (abre modal com campos: paciente, dentista, data, hora, duração, tipo de procedimento, status, sala, observações).
  - Clique em consulta existente para editar ou excluir.
  - Cards de consulta coloridos por status: Agendada (azul), Confirmada (verde), Compareceu (verde escuro), Faltou (vermelho), Cancelada (cinza).
  - Integração com Google Calendar: eventos externos aparecem em roxo/índigo com ícone de calendário (somente leitura).

### 4. CRM (Gestão de Leads)
- **Descrição**: Kanban board para gerenciamento do funil de vendas.
- **Funcionalidades**:
  - **Kanban Board**: Colunas representando as etapas do funil. Leads podem ser arrastados entre colunas.
  - **Funis dinâmicos**: O administrador pode criar múltiplos funis com nomes e etapas personalizadas (via Configurações > Funis).
  - Seletor de funil ativo no topo da página.
  - Painel de métricas acima do kanban mostrando totais por etapa.
  - Formulário modal para criar/editar leads (nome, telefone, e-mail, origem, interesse).
  - Sheet lateral de detalhamento do lead com histórico de jornada, timeline de interações e botão de conversão para Paciente.

### 5. Chat WhatsApp
- **Descrição**: Interface de chat em tempo real integrada com WhatsApp via Uzapi.
- **Funcionalidades**:
  - Lista de conversas na lateral esquerda, ordenadas por última mensagem.
  - Visualização de mensagens na área principal (balões de chat estilizados).
  - Envio de mensagens de texto e áudio.
  - Badge com contador de mensagens não lidas.
  - Vinculação automática de conversas com leads/pacientes do CRM.

### 6. Planos de Tratamento
- **Descrição**: Criação de planos de tratamento odontológico vinculados a pacientes.
- **Funcionalidades**:
  - Listagem de planos com filtros por status (Em Andamento, Concluído, Suspenso).
  - Detalhamento do plano com procedimentos, valores e acompanhamento.

### 7. Financeiro
- **Descrição**: Controle financeiro da clínica (restrito ao Gestor).
- **Funcionalidades**:
  - Aba de Receitas: registro de pagamentos de pacientes (com vínculo ao paciente, data, valor, forma de pagamento).
  - Aba de Despesas: registro de custos operacionais (fornecedor, categoria, valor, data, status).
  - Resumo financeiro com totais de receita, despesa e lucro líquido.
  - Gráficos de evolução financeira.

### 8. Marketing
- **Descrição**: Gestão de investimentos em marketing e tracking de campanhas (restrito ao Gestor).
- **Funcionalidades**:
  - Registro de investimentos em marketing (plataforma, valor, período, tipo).
  - Tracking de UTMs nos leads para atribuição de origem (Google Ads, Facebook, Instagram, etc.).
  - Métricas de ROI por canal.

### 9. Tarefas
- **Descrição**: Sistema de tarefas internas da equipe.
- **Funcionalidades**:
  - Criação de tarefas com título, descrição, responsável, prioridade (Baixa/Média/Alta/Urgente) e prazo.
  - Colunas Kanban: Pendente, Em Andamento, Concluída.
  - Filtros por responsável e prioridade.

### 10. Configurações
- **Descrição**: Painel administrativo da clínica (restrito ao Gestor).
- **Abas**:
  - **Clínica**: Dados da clínica (nome, CNPJ, telefone, endereço).
  - **Usuários**: Cadastro e gerenciamento de usuários da equipe (nome, e-mail, papel/perfil, setor vinculado, status ativo/inativo).
  - **Setores**: Criação de setores organizacionais (Ex: Ortodontia, Implantes, Clínica Geral) para isolamento de dados e instâncias WhatsApp.
  - **Funis**: Criação e edição de funis do CRM (nome do funil + etapas ordenáveis com nome e cor).
  - **Procedimentos**: Tabela de procedimentos com código, nome e valor padrão.
  - **Integrações**: 
    - WhatsApp (Uzapi): Gerenciamento de instâncias por setor. Botão para criar nova instância, exibição de QR Code para conexão, indicador de status (conectado/desconectado).
    - Google Calendar: Botão para conectar conta Google via OAuth.

---

## Estrutura de API (Edge Functions)

O sistema possui 8 Edge Functions ativas no Supabase:

| Endpoint | Método | Descrição |
|---|---|---|
| `/functions/v1/webhook-lead` | POST | Captação de leads via landing pages externas |
| `/functions/v1/webhook-uzapi` | POST | Recepção de mensagens WhatsApp (Uzapi) |
| `/functions/v1/uzapi-manager` | POST | Gerenciamento de instâncias WhatsApp (criar, QR, status, logout) |
| `/functions/v1/send-message` | POST | Envio de mensagens WhatsApp (texto/áudio) |
| `/functions/v1/send-lead-followup` | POST | Automação de follow-up de leads inativos (24h) |
| `/functions/v1/send-appointment-reminders` | POST | Lembrete automático de consultas (1h e 24h antes) |
| `/functions/v1/google-calendar-auth` | POST/GET | Fluxo OAuth do Google Calendar |
| `/functions/v1/google-calendar-sync` | POST | Sincronização de eventos do Google Calendar |

> Documentação detalhada de cada endpoint disponível em `API_DOCUMENTATION.md`.

---

## Banco de Dados (Principais Tabelas)

| Tabela | Descrição |
|---|---|
| `clinicas` | Dados da clínica (tenant principal) |
| `usuarios` | Usuários do sistema vinculados à clínica |
| `setores` | Setores organizacionais da clínica |
| `usuario_setores` | Vínculo N:N entre usuários e setores |
| `pacientes` | Cadastro de pacientes |
| `consultas` | Agendamentos de consultas |
| `leads` | Contatos/potenciais pacientes do CRM |
| `lead_jornada` | Timeline de interações do lead |
| `funis` | Funis personalizados do CRM |
| `funil_etapas` | Etapas de cada funil |
| `planos_tratamento` | Planos de tratamento vinculados a pacientes |
| `receitas` | Registros financeiros de entrada |
| `despesas` | Registros financeiros de saída |
| `chat_conversas` | Conversas do WhatsApp |
| `chat_mensagens` | Mensagens individuais do chat |
| `integracoes` | Configurações de integrações externas (Uzapi por setor) |
| `tarefas` | Tarefas internas da equipe |
| `system_logs` | Logs de auditoria e rastreamento |
| `automacao_mensagens` | Controle de mensagens automáticas enviadas |
| `auth_google_agenda` | Tokens OAuth do Google Calendar |

---

## Variáveis de Ambiente

### Front-end (.env.local)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxx
FRONTEND_URL=http://localhost:5173
```

### Secrets do Supabase (Edge Functions)
```
UZAPI_BASE_URL=http://ip:8080
UZAPI_USERNAME=chave
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
WEBHOOK_LEAD_API_KEY=chave-para-landing-pages
```

---

## Como Rodar

```bash
# Instalar dependências
npm install

# Iniciar dev server (porta 5173)
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

---

## Fluxos Críticos para Teste

1. **Login → Dashboard**: Autenticar e verificar se o dashboard carrega com métricas.
2. **Cadastro de Paciente**: Criar novo paciente via formulário e verificar na listagem.
3. **Agendamento de Consulta**: Clicar em slot vazio na agenda, preencher modal e salvar.
4. **CRM Kanban**: Criar um lead, arrastar entre colunas do funil.
5. **Chat WhatsApp**: Abrir conversa, digitar e enviar mensagem.
6. **Configurações > Funis**: Criar um novo funil com etapas personalizadas.
7. **Configurações > Setores**: Criar um setor e associar a um usuário.
8. **Configurações > Integrações**: Visualizar painel de WhatsApp e Google Calendar.
9. **Financeiro**: Criar receita e despesa, verificar resumo.
10. **Tarefas**: Criar tarefa e mover entre colunas.
