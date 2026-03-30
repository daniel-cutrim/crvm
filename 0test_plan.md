# 🧪 Plano de Testes Completo — CRM Odonto SaaS

> **Objetivo:** Validar integralmente o produto para que esteja pronto para comercialização.
> **Produto:** CRM odontológico multi-tenant (SaaS) com WhatsApp, Agenda, Financeiro, Chat, Marketing e mais.

---

## 📋 Escopo do Produto Analisado

O CRM Odonto é uma plataforma SaaS multi-tenant composta por **10 módulos principais**, **8 Edge Functions** no backend (Supabase), **~22 tabelas** no banco de dados com RLS multi-tenant, e integrações externas com **Evolution API (WhatsApp)** e **Google Calendar**.

### Módulos do Frontend
| # | Módulo | Página Principal | Papéis com Acesso |
|---|--------|-----------------|-------------------|
| 1 | Dashboard | `Dashboard.tsx` | Todos |
| 2 | Pacientes | `Pacientes/` (lista, detalhe, form, odontograma, prontuário, documentos) | Todos |
| 3 | Agenda | `Agenda/` (calendário + eventos Google) | Todos |
| 4 | CRM / Leads | `CRM/` (Kanban, métricas, detalhe, form, histórico, jornada) | Gestor, Recepção |
| 5 | Planos de Tratamento | `PlanosTratamento/` (itens, aprovação, pagamento) | Todos |
| 6 | Financeiro | `Financeiro/` (receitas, despesas, despesas recorrentes, gráficos) | Gestor |
| 7 | Marketing | `Marketing/` (investimentos, metas, analytics) | Gestor |
| 8 | Chat / WhatsApp | `Chat/` (conversas, mensagens, áudio, tempo real) | Gestor, Recepção |
| 9 | Tarefas | `Tarefas/` (CRUD, atribuição, status) | Todos |
| 10 | Configurações | `Configuracoes/` (clínica, setores, funis, procedimentos, usuários, integrações, WhatsApp) | Gestor |

### Backend (Edge Functions)
| # | Função | Tipo |
|---|--------|------|
| 1 | `webhook-lead` | API Key — Captação de leads |
| 2 | `webhook-evolution` | Webhook — Recebimento WhatsApp |
| 3 | `evolution-api-manager` | JWT — Gerenciamento instâncias |
| 4 | `send-message` | JWT — Envio WhatsApp |
| 5 | `send-lead-followup` | CRON — Follow-up automático |
| 6 | `send-appointment-reminders` | CRON — Lembretes de consulta |
| 7 | `google-calendar-auth` | OAuth — Autenticação Google |
| 8 | `google-calendar-sync` | JWT — Sincronização agenda |

### Infraestrutura Crítica
- **Multi-Tenancy** via `clinica_id` em todas as tabelas com RLS
- **3 papéis de usuário:** Gestor, Dentista, Recepção
- **Realtime** para leads, chat_conversas e chat_mensagens
- **Storage** buckets: `paciente-documentos`, `chat-audio`

---

## 🏗️ Estrutura do Plano de Testes

O plano está organizado em **8 categorias** com prioridade de execução:

```
P0 — SEGURANÇA & AUTENTICAÇÃO (Blocker)
P1 — ISOLAMENTO MULTI-TENANT (Blocker)
P2 — CRUD & REGRAS DE NEGÓCIO (Core)
P3 — INTEGRAÇÕES EXTERNAS (Core)
P4 — INTERFACE & USABILIDADE (UX)
P5 — PERFORMANCE & ESCALABILIDADE
P6 — EDGE CASES & RESILIÊNCIA
P7 — CONFORMIDADE & GO-TO-MARKET
```

---

## P0 — 🔐 SEGURANÇA & AUTENTICAÇÃO

> [!CAUTION]
> **Blocker para comercialização.** Falhas aqui significam vazamento de dados entre clínicas.

### P0.1 — Autenticação (Supabase Auth)

| # | Caso de Teste | Tipo | Como Testar | Resultado Esperado |
|---|--------------|------|------------|-------------------|
| P0.1.1 | Login com credenciais válidas | Manual/E2E | Inserir e-mail e senha válidos na tela de login | Redirecionar para Dashboard, `usuario` carregado com `clinica_id` |
| P0.1.2 | Login com credenciais inválidas | Manual/E2E | Inserir e-mail inexistente ou senha errada | Exibir mensagem de erro clara, não revelar se e-mail existe |
| P0.1.3 | Login de usuário inativo (`ativo = false`) | Manual | Desativar usuário no DB, tentar login | Login falha ou acesso bloqueado no frontend |
| P0.1.4 | Sessão expirada | Manual | Esperar token expirar / invalidar manualmente | Redirecionar para login, limpar estado local |
| P0.1.5 | Logout completo | E2E | Clicar em "Sair" | Sessão destruída, não conseguir acessar rotas protegidas |
| P0.1.6 | Primeiro usuário vira Gestor | Unitário/Manual | Criar primeiro usuário via signup | Trigger `handle_new_user` define `papel = 'Gestor'` |
| P0.1.7 | Segundo+ usuário vira Recepção | Unitário/Manual | Criar novo usuário quando já existem outros | `papel = 'Recepção'` por padrão |
| P0.1.8 | Reset de senha | E2E | Acessar `/reset-password` e seguir fluxo | E-mail enviado, nova senha funcional |
| P0.1.9 | Signup com nome e papel nos metadados | Unitário | Enviar `nome` e `papel` como user_metadata | Trigger cria registro em `usuarios` com dados corretos |

### P0.2 — Controle de Acesso por Papel (RBAC)

| # | Caso de Teste | Tipo | Como Testar | Resultado Esperado |
|---|--------------|------|------------|-------------------|
| P0.2.1 | Dentista NÃO acessa CRM | E2E | Logar como Dentista, navegar para CRM | Redireciona para Dashboard |
| P0.2.2 | Dentista NÃO acessa Financeiro | E2E | Logar como Dentista, navegar para Financeiro | Redireciona para Dashboard |
| P0.2.3 | Dentista NÃO acessa Marketing | E2E | Navegar para Marketing como Dentista | Redireciona para Dashboard |
| P0.2.4 | Dentista NÃO acessa Chat | E2E | Navegar para Chat como Dentista | Redireciona para Dashboard |
| P0.2.5 | Dentista NÃO acessa Configurações | E2E | Navegar para Configurações como Dentista | Redireciona para Dashboard |
| P0.2.6 | Recepção acessa CRM | E2E | Logar como Recepção, ir ao CRM | Kanban visível com leads |
| P0.2.7 | Recepção NÃO acessa Financeiro | E2E | Logar como Recepção, navegar para Financeiro | Redireciona para Dashboard |
| P0.2.8 | Recepção NÃO acessa Marketing | E2E | Navegar para Marketing como Recepção | Redireciona para Dashboard |
| P0.2.9 | Gestor acessa TUDO | E2E | Logar como Gestor, navegar todos os módulos | Todos acessíveis sem restrição |
| P0.2.10 | Menu lateral reflete permissões | E2E | Verificar DentalLayout para cada papel | Itens de menu filtrados por papel |

### P0.3 — RLS (Row Level Security) no Banco

| # | Caso de Teste | Tipo | Como Testar | Resultado Esperado |
|---|--------------|------|------------|-------------------|
| P0.3.1 | Recepção NÃO deleta pacientes | SQL/API | Tentar DELETE via API como Recepção | Erro 403 / RLS bloqueio |
| P0.3.2 | Recepção NÃO deleta leads | SQL/API | Tentar DELETE via API como Recepção | Bloqueio |
| P0.3.3 | Dentista NÃO vê receitas/despesas | SQL/API | SELECT em `receitas` como Dentista | Retornar vazio (RLS) |
| P0.3.4 | Dentista só atualiza pacientes atribuídos | SQL/API | UPDATE em paciente de outro dentista | Bloqueio |
| P0.3.5 | Plano de tratamento: dentista só edita os próprios | SQL/API | Tentar UPDATE em plano de outro | Bloqueio |

### P0.4 — Segurança das Edge Functions

| # | Caso de Teste | Tipo | Como Testar | Resultado Esperado |
|---|--------------|------|------------|-------------------|
| P0.4.1 | `webhook-lead` sem API Key | cURL/API | POST sem header `x-api-key` | 401 Unauthorized |
| P0.4.2 | `webhook-lead` com API Key errada | cURL/API | API Key inválida | 401 Unauthorized |
| P0.4.3 | `send-message` sem JWT | cURL/API | POST sem Authorization header | 401 |
| P0.4.4 | `send-message` com clinica_id de outra clínica (IDOR) | cURL/API | Enviar `clinica_id` pertencente a outra clínica | 403 Forbidden: clinica_id mismatch |
| P0.4.5 | `evolution-api-manager` sem JWT | cURL/API | Chamar sem token | 401 |
| P0.4.6 | `webhook-lead` sanitiza XSS | cURL/API | Enviar `<script>alert(1)</script>` no campo `nome` | Tag HTML removida |
| P0.4.7 | `webhook-evolution` com instância desconhecida | cURL/API | Enviar evento com `instance` inexistente | 404 "Instance unmanaged" |

---

## P1 — 🏢 ISOLAMENTO MULTI-TENANT

> [!CAUTION]
> **Absolutamente crítico para SaaS.** Um tenant JAMAIS pode ver dados de outro.

| # | Caso de Teste | Tipo | Como Testar | Resultado Esperado |
|---|--------------|------|------------|-------------------|
| P1.1 | Clínica A NÃO vê pacientes de Clínica B | SQL/E2E | Logar na Clínica A, verificar se pacientes de B são invisíveis | Zero resultados de outra clínica |
| P1.2 | Clínica A NÃO vê leads de Clínica B | SQL/E2E | Listar leads da Clínica A | Só leads com `clinica_id` da A |
| P1.3 | Clínica A NÃO vê consultas de Clínica B | SQL/E2E | Acessar Agenda da Clínica A | Apenas consultas da A |
| P1.4 | Clínica A NÃO vê receitas de Clínica B | SQL/E2E | Financeiro isolado | Apenas receitas da A |
| P1.5 | Clínica A NÃO vê despesas de Clínica B | SQL/E2E | Financeiro isolado | Apenas despesas da A |
| P1.6 | Clínica A NÃO vê conversas de Clínica B | SQL/E2E | Chat isolado | Apenas chats da A |
| P1.7 | Clínica A NÃO vê planos de Clínica B | SQL/E2E | Planos de tratamento isolados | Isolamento completo |
| P1.8 | Clínica A NÃO vê tarefas de Clínica B | SQL/E2E | Verificar lista de tarefas | Isolamento |
| P1.9 | `get_user_clinica_id()` retorna o correto | SQL | `SELECT public.get_user_clinica_id()` | UUID da clínica do usuário logado |
| P1.10 | INSERT em tabela sem `clinica_id` correto | SQL/API | Tentar inserir registro com `clinica_id` de outra clínica | RLS bloqueia |
| P1.11 | Dados de marketing isolados | SQL/E2E | Marketing investimentos e metas | Isolamento por clínica |
| P1.12 | Integrações isoladas por clínica | SQL/E2E | Tabela `integracoes` | Cada clínica só vê suas próprias |
| P1.13 | Prontuário isolado | SQL/E2E | Entradas de prontuário | Isolamento completo |
| P1.14 | Odontograma isolado | SQL/E2E | Entradas de odontograma | Isolamento completo |
| P1.15 | Documentos isolados | SQL/E2E | Documentos de paciente | Isolamento completo |
| P1.16 | White-label: cor e logo por clínica | E2E | Cada clínica vê suas cores/logo | `cor_primaria`, `cor_secundaria`, `logo_url` da sua clínica |

---

## P2 — 📦 CRUD & REGRAS DE NEGÓCIO

### P2.1 — Dashboard

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P2.1.1 | Métricas de hoje (pacientes, consultas, pendências) | E2E | Números corretos baseados nos dados reais |
| P2.1.2 | Consultas do dia listadas corretamente | E2E | Só consultas de hoje, ordenadas por horário |
| P2.1.3 | Navegação por atalhos do dashboard | E2E | `onNavigate` leva à página correta |
| P2.1.4 | Dashboard vazio (clínica nova, sem dados) | E2E | Exibir estados vazios amigáveis, sem erro |

### P2.2 — Pacientes (CRUD Completo)

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P2.2.1 | Criar paciente com campos obrigatórios | E2E | Paciente salvo, `codigo_paciente` auto-gerado (LPAD 5 dígitos) |
| P2.2.2 | Criar paciente com TODOS os campos | E2E | Todos os campos persistidos (CPF, endereço, etc.) |
| P2.2.3 | Editar paciente | E2E | Campos atualizados no DB e na UI |
| P2.2.4 | Deletar paciente (cascata) | E2E | Paciente + consultas + planos + receitas + prontuário + documentos removidos |
| P2.2.5 | Buscar paciente por nome | E2E | Filtro funcional na lista |
| P2.2.6 | Detalhe do paciente: aba Prontuário | E2E | Entradas de prontuário listadas por data |
| P2.2.7 | Detalhe: adicionar entrada de prontuário | E2E | Tipos: Evolução, Anamnese, Exame, etc. Salva corretamente |
| P2.2.8 | Detalhe: aba Odontograma | E2E | Visualização dos dentes, legendas de status |
| P2.2.9 | Odontograma: marcar dente com status | E2E | Selecionar dente → escolher face → definir status → salvar |
| P2.2.10 | Detalhe: aba Documentos | E2E | Upload de PDF/imagem → storage bucket |
| P2.2.11 | Documentos: download funcional | E2E | Download do arquivo via storage |
| P2.2.12 | Documentos: deletar arquivo | E2E | Remove do bucket e da tabela |
| P2.2.13 | Status do paciente (Ativo, Em tratamento, Inadimplente, Inativo) | E2E | Mudança reflete visualmente |
| P2.2.14 | Código do paciente sequencial único | Unitário | `LPAD(nextval(), 5, '0')` gera '00001', '00002'... |
| P2.2.15 | Atribuir dentista responsável | E2E | Dropdown de dentistas, salva `dentista_id` |

### P2.3 — Agenda (Consultas)

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P2.3.1 | Criar consulta para paciente | E2E | Preencher formulário, salvar, evento aparece na grade |
| P2.3.2 | Criar consulta para lead (avaliação) | E2E | Escolher lead ao invés de paciente |
| P2.3.3 | Constraint: paciente OU lead (nunca ambos) | Unitário/SQL | Check constraint valida XOR |
| P2.3.4 | Editar horário/dentista/procedimento | E2E | Atualização funcional |
| P2.3.5 | Mudar status (Agendada → Confirmada → Compareceu/Faltou/Cancelada) | E2E | Transições válidas |
| P2.3.6 | Filtrar por dentista | E2E | Só consultas do dentista selecionado |
| P2.3.7 | Navegação por semana/dia | E2E | Datas avançam/retrocedem |
| P2.3.8 | Eventos do Google Calendar visíveis | E2E | Se autenticado no Google, eventos aparecem mesclados |
| P2.3.9 | Diferenciação visual Google vs. Supabase | E2E | Tag `is_google: true` renderizada diferente |
| P2.3.10 | Consulta com campo sala | E2E | Sala salva e exibida |

### P2.4 — CRM / Leads (Kanban)

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P2.4.1 | Criar lead manualmente | E2E | Lead aparece na coluna "Novo Lead" |
| P2.4.2 | Mover lead entre etapas do funil (drag-and-drop) | E2E | Atualiza `etapa_funil` no DB |
| P2.4.3 | Abrir detalhes do lead (sheet lateral) | E2E | Todos os dados exibidos (telefone, e-mail, origem, UTMs) |
| P2.4.4 | Adicionar histórico de contato | E2E | Tipo (Ligação, WhatsApp, E-mail, Visita) + descrição salvos |
| P2.4.5 | Ver jornada do lead (`lead_jornada`) | E2E | Timeline de pontos de contato |
| P2.4.6 | Filtrar leads por etapa | E2E | Kanban filtra corretamente |
| P2.4.7 | Converter lead em paciente | E2E | `convertido_paciente_id` preenchido, paciente criado |
| P2.4.8 | Métricas do CRM (painel lateral) | E2E | Total por etapa, taxa de conversão, leads hoje |
| P2.4.9 | Lead duplicado por telefone (via webhook) | API | Retorna `status: duplicate`, UTM atualizado |
| P2.4.10 | Lead via webhook com todos os UTMs | API | `utm_source/medium/campaign/term/content` salvos |
| P2.4.11 | Realtime: novo lead aparece automaticamente | E2E | Canal Realtime atualiza lista sem refresh |
| P2.4.12 | Definir próxima ação (data + tipo) | E2E | Data e tipo de ação salvos |

### P2.5 — Planos de Tratamento

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P2.5.1 | Criar plano para paciente | E2E | Plano associado, status "Em avaliação" |
| P2.5.2 | Adicionar itens ao plano (procedimento, dente, valor) | E2E | Itens listados, valor total calculado |
| P2.5.3 | Aprovar/reprovar itens individualmente | E2E | `aprovado` e `quantidade_aprovada` atualizados |
| P2.5.4 | Constraint: `quantidade_aprovada <= quantidade` | SQL | Violação gera erro |
| P2.5.5 | Mudar status do plano (Em avaliação → Apresentado → Aprovado → ...) | E2E | Todas transições válidas |
| P2.5.6 | Deletar item do plano | E2E | Item removido, valor total recalculado |
| P2.5.7 | Forma de pagamento no plano | E2E | PIX, Cartão Crédito, Débito, Dinheiro, Boleto |
| P2.5.8 | Deletar plano (cascata de itens) | E2E | Plano + itens removidos |

### P2.6 — Financeiro

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P2.6.1 | Criar receita vinculada a paciente | E2E | Receita salva, paciente visível |
| P2.6.2 | Criar receita vinculada a plano | E2E | `plano_id` preenchido |
| P2.6.3 | Criar despesa com categoria | E2E | Categorias: Aluguel, Materiais, Equipe, Marketing, Manutenção, Outros |
| P2.6.4 | Criar despesa recorrente | E2E | `dia_vencimento`, `ativo` funcional |
| P2.6.5 | Ativar/desativar despesa recorrente | E2E | Toggle funcional |
| P2.6.6 | Gráficos de receita vs despesa | E2E | Recharts renderiza corretamente |
| P2.6.7 | Filtrar por período | E2E | Dados filtrados por mês/período |
| P2.6.8 | Status da receita (Pago, Parcial, Em aberto) | E2E | Indicadores visuais corretos |
| P2.6.9 | Formas de pagamento cobrindo todas as opções | E2E | Dinheiro, Cartão Crédito/Débito, PIX, Boleto, Convênio |
| P2.6.10 | Deletar receita/despesa | E2E | Remoção com confirmação |

### P2.7 — Marketing

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P2.7.1 | Criar investimento mensal por canal | E2E | Canal + mês + valor salvos |
| P2.7.2 | Criar meta mensal (leads, conversões, ROI) | E2E | Metas salvas |
| P2.7.3 | Gráficos de performance | E2E | Renderização correta |
| P2.7.4 | Deletar investimento | E2E | Remoção funcional |

### P2.8 — Chat / WhatsApp

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P2.8.1 | Lista de conversas carrega | E2E | Conversas ordenadas por `ultima_mensagem_at` |
| P2.8.2 | Selecionar conversa exibe mensagens | E2E | Histórico de mensagens renderizado |
| P2.8.3 | Enviar mensagem de texto | E2E | Mensagem salva no DB + enviada via Evolution API |
| P2.8.4 | Enviar áudio (recorder) | E2E | Upload para `chat-audio` bucket + envio |
| P2.8.5 | Receber mensagem em tempo real (Realtime) | E2E | Nova mensagem aparece sem refresh |
| P2.8.6 | Contador de não lidas (`nao_lidas`) | E2E | Badge atualiza ao receber mensagem |
| P2.8.7 | Filtrar conversas (barra de busca/filtro) | E2E | FilterBar funcional |
| P2.8.8 | Status de contato (tag) | E2E | `ContactStatusTag` renderiza corretamente |
| P2.8.9 | Deletar conversa | E2E | Conversa + mensagens removidas |

### P2.9 — Tarefas

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P2.9.1 | Criar tarefa com descrição e data | E2E | Tarefa salva |
| P2.9.2 | Atribuir responsável | E2E | Dropdown de usuários funcional |
| P2.9.3 | Vincular tarefa a paciente ou lead | E2E | Vínculo salvo e visível |
| P2.9.4 | Mudar status (Pendente → Em andamento → Concluída) | E2E | Transição funcional |
| P2.9.5 | Filtrar tarefas por status | E2E | Filtro funcional |
| P2.9.6 | Deletar tarefa | E2E | Remoção com confirmação |

### P2.10 — Configurações

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P2.10.1 | Editar dados da clínica (nome, CNPJ, endereço, etc.) | E2E | Dados salvos na tabela `clinica` |
| P2.10.2 | Criar setor | E2E | Setor salvo em `setores` |
| P2.10.3 | Editar/Deletar setor | E2E | CRUD completo |
| P2.10.4 | Criar funil personalizado | E2E | Funil salvo com nome e descrição |
| P2.10.5 | Adicionar etapas ao funil (nome, ordem, cor) | E2E | Etapas ordenadas salvas em `funil_etapas` |
| P2.10.6 | Reordenar etapas | E2E | `ordem` atualizado |
| P2.10.7 | Cadastrar procedimento padrão (nome + valor base) | E2E | Procedimento salvo |
| P2.10.8 | Ativar/desativar procedimento | E2E | Toggle funcional |
| P2.10.9 | CRUD de usuários (convidar, editar papel, desativar) | E2E | Funcional para gestor |
| P2.10.10 | Configurar integrações (Evolution API) | E2E | Credenciais salvas |
| P2.10.11 | WhatsApp Manager: criar instância | E2E | Instância criada via `evolution-api-manager` |
| P2.10.12 | WhatsApp Manager: QR Code | E2E | QR Code exibido para escanear |
| P2.10.13 | WhatsApp Manager: verificar conexão | E2E | Estado `open`/`close`/`connecting` exibido |
| P2.10.14 | WhatsApp Manager: logout | E2E | Instância desconectada |
| P2.10.15 | Configurações de notificações | E2E | Toggle ativo/inativo funcional |

---

## P3 — 🔌 INTEGRAÇÕES EXTERNAS

### P3.1 — Evolution API (WhatsApp)

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P3.1.1 | Criar instância WhatsApp por setor | API/E2E | Instância criada, `instanceName` salvo em `integracoes` |
| P3.1.2 | Receber mensagem via webhook | cURL | Lead criado (se novo) + mensagem salva em `chat_mensagens` |
| P3.1.3 | Enviar texto via `send-message` | API/E2E | Mensagem enviada via Evolution, salva no chat |
| P3.1.4 | Enviar áudio via `send-message` | API/E2E | Áudio enviado, salvo com `tipo = 'audio'` |
| P3.1.5 | Resolução dinâmica de instância por setor | API | `setor_id` → busca instância correta na tabela `integracoes` |
| P3.1.6 | Webhook ignora broadcasts e status events | cURL | Retorna `{ "status": "ignored event" }` |
| P3.1.7 | Follow-up automático (CRON) | API | Leads inativos >24h recebem mensagem |
| P3.1.8 | Lembrete de consulta 24h antes | API | Consulta amanhã → mensagem enviada |
| P3.1.9 | Lembrete de consulta 1h antes | API | Consulta em 1h → mensagem enviada |
| P3.1.10 | Follow-up não duplica | API | Se já enviou follow-up, não envia novamente |
| P3.1.11 | Mensagem de boas-vindas ao novo lead (webhook) | API | Após criar lead via `webhook-lead`, WhatsApp enviado |

### P3.2 — Google Calendar

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P3.2.1 | Gerar URL de autorização OAuth | API | URL válida do Google retornada |
| P3.2.2 | Callback do Google troca code por tokens | API | `auth_google_agenda` populado |
| P3.2.3 | Sincronizar eventos de um período | API | Eventos mapeados para formato `AgendaEvent` |
| P3.2.4 | Renovação automática de access_token | API | Refresh token usado quando access_token expira |
| P3.2.5 | Eventos Google marcados com `is_google: true` | E2E | Diferenciados visualmente na agenda |
| P3.2.6 | Redirect correto após OAuth (sucesso/erro) | E2E | Redireciona para `/configuracoes?tab=integracoes&google_auth=success` |

---

## P4 — 🎨 INTERFACE & USABILIDADE

### P4.1 — Navegação & Layout

| # | Caso de Teste | Resultado Esperado |
|---|--------------|-------------------|
| P4.1.1 | Sidebar contrai/expande | Animação suave, ícones visíveis |
| P4.1.2 | Navegação entre todos os módulos | Sem erro, sem flash |
| P4.1.3 | Busca global (`GlobalSearch`) | Encontra pacientes, leads e consultas |
| P4.1.4 | Notificações (`ReminderNotifications`) | Badge com contagem, lista de lembretes |
| P4.1.5 | Responsividade mobile | Layout se adapta em telas < 768px |
| P4.1.6 | Loading state em todas as páginas | Spinner durante carregamento |
| P4.1.7 | Toasts de sucesso/erro em todas as ações CRUD | Feedback visual consistente |
| P4.1.8 | Confirm dialog antes de deletar | Diálogo de confirmação em todas as exclusões |
| P4.1.9 | 404 — Página não encontrada | `/rota-inexistente` exibe NotFound |

### P4.2 — Formulários

| # | Caso de Teste | Resultado Esperado |
|---|--------------|-------------------|
| P4.2.1 | Validação de campos obrigatórios (todos os forms) | Mensagem de erro no campo, submit bloqueado |
| P4.2.2 | Máscara de telefone | Formatação automática `(XX) XXXXX-XXXX` |
| P4.2.3 | Máscara de CPF | Formatação `XXX.XXX.XXX-XX` |
| P4.2.4 | Máscara de CEP | Formatação `XXXXX-XXX` |
| P4.2.5 | DatePicker funcional em consultas e tarefas | Calendário abre, data salva corretamente |
| P4.2.6 | Selects com lista completa de opções | Todos os enums renderizados (status, formas de pagamento, etc.) |
| P4.2.7 | Form de lead aceita aliases (`name`, `phone`, `whatsapp`) | Webhook processa campos equivalentes |

### P4.3 — Exportação

| # | Caso de Teste | Resultado Esperado |
|---|--------------|-------------------|
| P4.3.1 | Exportar lista de pacientes (CSV/Excel) | Arquivo gerado e baixado com dados corretos |
| P4.3.2 | Exportar financeiro | Relatório exportado |

---

## P5 — ⚡ PERFORMANCE & ESCALABILIDADE

| # | Caso de Teste | Tipo | Resultado Esperado |
|---|--------------|------|--------------------|
| P5.1 | Dashboard < 2s para carregar | Performance | Métricas renderizadas em tempo aceitável |
| P5.2 | Lista de 500+ pacientes | Performance | Sem travamento, paginação ou scroll virtual |
| P5.3 | Chat com 1000+ mensagens por conversa | Performance | Scroll suave, mensagens carregam sob demanda |
| P5.4 | Kanban com 200+ leads | Performance | Colunas renderizam sem lag |
| P5.5 | Logger não bloqueia a UI (batch de 10, flush a cada 5s) | Unitário | Fila assíncrona funcional |
| P5.6 | Realtime não causa memory leaks | Manual | Channels são removidos no cleanup (useEffect return) |
| P5.7 | Query performace com índices | SQL | `idx_chat_mensagens_conversa`, `idx_consultas_lead_id`, etc. |
| P5.8 | Bundle size do Vite (build) | CI | `npm run build` sem erros, bundle < 2MB |

---

## P6 — 🧱 EDGE CASES & RESILIÊNCIA

| # | Caso de Teste | Resultado Esperado |
|---|--------------|-------------------|
| P6.1 | Clínica recém-criada (zero dados) — todos os módulos | Nenhum crash, estados vazios exibidos |
| P6.2 | Lead com telefone duplicado (últimos 8 dígitos) | Detecta duplicidade, atualiza UTMs |
| P6.3 | Consulta sem paciente e sem lead (violação constraint) | Bloqueio no DB |
| P6.4 | Upload de arquivo > 50MB | Bloqueio no bucket (file_size_limit: 52428800) |
| P6.5 | Upload de tipo MIME não permitido (e.g. .exe) | Bucket rejeita |
| P6.6 | Desconexão de internet durante envio de mensagem | Erro tratado, toast de falha, retry possível |
| P6.7 | Evolution API offline | Edge function retorna erro claro, UI mostra integração offline |
| P6.8 | Google Calendar não autenticado (agenda) | Agenda funciona normalmente, sem eventos Google |
| P6.9 | Deletar paciente que tem conversa no chat | `ON DELETE SET NULL` em `chat_conversas.paciente_id` |
| P6.10 | Deletar lead que tem consulta | `ON DELETE CASCADE` em `consultas.lead_id` |
| P6.11 | Clínica sem instância WhatsApp configurada | Mensagem de erro clara: "Integração não configurada" |
| P6.12 | Concurrent edits no mesmo lead (Realtime) | Última versão ganha, UI atualiza via Postgres Changes |
| P6.13 | Token JWT expirado durante operação | Refresh automático do Supabase ou redirect para login |

---

## P7 — 📋 CONFORMIDADE & GO-TO-MARKET

### P7.1 — LGPD & Privacidade

| # | Verificação | Status Esperado |
|---|------------|-----------------|
| P7.1.1 | Dados sensíveis (CPF, telefone) protegidos no banco | ✅ RLS ativa em todas as tabelas |
| P7.1.2 | Logs (`system_logs`) não expõem dados PII desnecessários | Verificar campos logados |
| P7.1.3 | Bucket de documentos é **privado** (`public: false`) | ✅ `paciente-documentos` privado |
| P7.1.4 | Bucket de áudio é **público** (`public: true`) | ⚠️ Revisar necessidade — pode expor comunicações |
| P7.1.5 | Possibilidade de excluir dados de paciente (direito ao esquecimento) | ✅ CASCADE funcional |
| P7.1.6 | Consentimento para comunicação WhatsApp | ❓ Verificar se há opt-in |

### P7.2 — Onboarding de Nova Clínica

| # | Caso de Teste | Resultado Esperado |
|---|--------------|-------------------|
| P7.2.1 | Signup do primeiro usuário → vira Gestor | Trigger funcional |
| P7.2.2 | Gestor configura dados da clínica | Tab Clínica funcional |
| P7.2.3 | Gestor cria setores | Setores criados |
| P7.2.4 | Gestor configura funis personalizados | Funis + etapas criados |
| P7.2.5 | Gestor configura integração WhatsApp | Instância Evolution criada + QR code |
| P7.2.6 | Gestor convida Dentistas e Recepção | Signup com papel definido |
| P7.2.7 | Fluxo completo: lead entra → agendamento → consulta → plano → pagamento | Teste end-to-end da jornada completa |

### P7.3 — Funcionalidades Legado

| # | Verificação | Status Esperado |
|---|------------|-----------------|
| P7.3.1 | Funções Z-API (`webhook-zapi`, `send-zapi-message`) estão desativadas | ✅ Documentação confirma remoção |
| P7.3.2 | Não há referências a Z-API no frontend | Verificar imports |
| P7.3.3 | `.env.example` limpo de variáveis legado | ✅ Comentadas como legado |

---

## 🔧 Estratégia de Execução Recomendada

### Fase 1: Testes de Segurança & Isolamento (P0 + P1)
**Duração estimada:** 2–3 dias
- Executar testes de RLS diretamente no SQL Editor do Supabase com 2 clínicas de teste
- Testar todas as Edge Functions via cURL com payloads válidos e inválidos
- Criar 2 ambientes de clínica completos para testar isolamento

### Fase 2: Testes Funcionais de CRUD (P2)
**Duração estimada:** 5–7 dias
- Testar cada módulo sequencialmente
- Usar Playwright para E2E automatizados nos fluxos críticos
- Prioridade: Pacientes → Agenda → CRM → Financeiro → Chat

### Fase 3: Integrações Externas (P3)
**Duração estimada:** 2–3 dias
- Testar Evolution API com instância de homologação
- Testar Google Calendar OAuth com conta de teste
- Testar CRONs manualmente invocando as funções

### Fase 4: UX, Performance e Edge Cases (P4 + P5 + P6)
**Duração estimada:** 2–3 dias
- Testes manuais de responsividade
- Lighthouse para performance
- Testes de edge cases documentados

### Fase 5: Conformidade e Go-to-Market (P7)
**Duração estimada:** 1–2 dias
- Checklist LGPD
- Teste de onboarding completo (clínica do zero)
- Teste end-to-end da jornada do cliente

---

## 📊 Resumo Numérico

| Categoria | Casos de Teste |
|-----------|---------------|
| P0 — Segurança & Autenticação | 25 |
| P1 — Isolamento Multi-Tenant | 16 |
| P2 — CRUD & Regras de Negócio | ~90 |
| P3 — Integrações Externas | 17 |
| P4 — Interface & Usabilidade | 18 |
| P5 — Performance | 8 |
| P6 — Edge Cases | 13 |
| P7 — Conformidade & Launch | 12 |
| **TOTAL** | **~199 casos de teste** |

> [!IMPORTANT]
> **Recomendação:** Comece SEMPRE pelo P0 e P1 (segurança e multi-tenancy). São bloqueantes para o lançamento SaaS. Uma falha nesses testes significa que dados de uma clínica podem vazar para outra.

> [!WARNING]
> **Alerta identificado na análise:** O bucket `chat-audio` está configurado como `public: true`. Isso significa que qualquer pessoa com a URL pode acessar os áudios. Para um produto comercial de saúde, isso pode ser um risco LGPD/privacidade. Considere torná-lo privado.
