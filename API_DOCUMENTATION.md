# 📡 API Documentation — CRM SaaS

> **Base URL**: `https://{PROJECT_ID}.supabase.co/functions/v1`
>
> Substitua `{PROJECT_ID}` pelo ID do seu projeto Supabase.

---

## Índice

1. [webhook-lead](#1-webhook-lead) — Captação de leads via landing pages / formulários
2. [webhook-uzapi](#2-webhook-uzapi) — Recebimento de mensagens WhatsApp (Uzapi)
3. [uzapi-manager](#3-uzapi-manager) — Gerenciamento de instâncias WhatsApp por tenant
4. [send-message](#4-send-message) — Envio de mensagens WhatsApp
5. [send-lead-followup](#5-send-lead-followup) — Follow-up automático de leads inativos
6. [send-appointment-reminders](#6-send-appointment-reminders) — Lembretes automáticos de compromissos
7. [google-calendar-auth](#7-google-calendar-auth) — OAuth do Google Calendar
8. [google-calendar-sync](#8-google-calendar-sync) — Sincronização de eventos do Google Calendar
9. [Configuração Multi-Tenant WhatsApp](#9-configuração-multi-tenant--whatsapp-por-tenant)

---

## 1. webhook-lead

Endpoint público para captação de leads a partir de landing pages, formulários externos, RD Station, etc.

### Endpoint

```
POST /functions/v1/webhook-lead?empresa_id={UUID}
```

### Autenticação

| Header | Obrigatório | Descrição |
|---|---|---|
| `x-api-key` | ✅ | Chave configurada no secret `WEBHOOK_LEAD_API_KEY` |

### Query Parameters

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `empresa_id` | UUID | ID da empresa. Pode ser enviado via query string ou no body |
| `funil_id` | UUID | ID do funil de destino. Pode ser enviado via query string ou no body |
| `etapa_id` | UUID | ID da etapa inicial. Pode ser enviado via query string ou no body |

### Request Body

```json
{
  "nome": "João Silva",
  "telefone": "(21) 99999-8888",
  "empresa_id": "uuid-da-empresa",
  "funil_id": "uuid-do-funil",
  "etapa_id": "uuid-da-etapa",
  "email": "joao@email.com",
  "origem": "Landing Page",
  "interesse": "Consultoria comercial",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "campanha-q2-2026",
  "utm_term": "crm vendas",
  "utm_content": "banner-principal",
  "custom_fields": {
    "bairro": "Centro",
    "segmento": "Varejo",
    "tamanho_empresa": "10-50 funcionários"
  }
}
```

### Campos

| Campo | Tipo | Obrigatório | Aliases aceitos | Descrição |
|---|---|---|---|---|
| `nome` | string | ✅ | `name`, `full_name` | Nome completo do lead |
| `telefone` | string | ✅ | `phone`, `whatsapp` | Telefone em qualquer formato |
| `empresa_id` | UUID | ✅ | via query ou body | ID do tenant |
| `funil_id` | UUID | ✅ | `pipeline_id`, via query ou body | Funil de destino |
| `etapa_id` | UUID | ✅ | `stage_id`, via query ou body | Etapa inicial |
| `email` | string | ❌ | — | E-mail do lead |
| `origem` | string | ❌ | `origin` | Origem descritiva (texto livre) |
| `interesse` | string | ❌ | `interest` | Produto ou serviço de interesse |
| `utm_source` | string | ❌ | — | Fonte do tráfego (ex: `google`, `facebook`) |
| `utm_medium` | string | ❌ | — | Mídia (ex: `cpc`, `organic`, `email`) |
| `utm_campaign` | string | ❌ | — | Nome da campanha |
| `utm_term` | string | ❌ | — | Palavra-chave |
| `utm_content` | string | ❌ | — | Variação do criativo/anúncio |
| `custom_fields` | object | ❌ | `metadata` | Campos personalizados livres por cliente (ver abaixo) |

### Campos Personalizados (`custom_fields`)

Aceita qualquer objeto JSON plano (chave → valor string). Os valores são armazenados na coluna `metadata` (JSONB) do lead, permitindo campos específicos de cada empresa sem alterar o schema.

**Regras:**
- Apenas chaves alfanuméricas com underscores (`a-z`, `A-Z`, `0-9`, `_`) — máx. 50 chars
- Valores sanitizados (HTML removido) e truncados em 500 chars
- Sem objetos aninhados — apenas `chave: string`
- Em leads duplicados, os campos são mergeados (não sobrescrevem campos existentes)

**Exemplos:**

```json
// Empresa de software B2B:
"custom_fields": {
  "segmento": "SaaS",
  "numero_funcionarios": "50-200",
  "cargo": "Head de Vendas"
}

// Empresa de educação:
"custom_fields": {
  "curso_interesse": "MBA Executivo",
  "turno": "Noturno",
  "cidade": "São Paulo"
}
```

### Respostas

**201 — Lead criado**
```json
{
  "status": "created",
  "lead_id": "uuid-do-lead",
  "conversa_id": "uuid-da-conversa"
}
```

**200 — Lead duplicado (por telefone)**
```json
{
  "status": "duplicate",
  "lead_id": "uuid-do-lead-existente",
  "message": "Lead já existe, Tracking Rastreamento Inserido."
}
```

**400 — Campos obrigatórios faltando**
```json
{
  "error": "Campos obrigatórios: nome, telefone e empresa_id"
}
```

**401 — Chave de API inválida**
```json
{
  "error": "Unauthorized: invalid or missing x-api-key header"
}
```

### Comportamento
- Sanitiza todos os inputs contra XSS
- Detecta leads duplicados pelos últimos 8 dígitos do telefone
- Se duplicado: atualiza UTMs + registra checkpoint em `lead_jornada`
- Se novo: cria lead + conversa no chat + dispara mensagem de boas-vindas via WhatsApp
- Deriva `origem` automaticamente a partir de `utm_source` quando `origem` não é fornecida

### Exemplo cURL

```bash
curl -X POST \
  "https://{PROJECT_ID}.supabase.co/functions/v1/webhook-lead?empresa_id=UUID_EMPRESA" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE_API" \
  -d '{
    "nome": "Maria Souza",
    "telefone": "21999887766",
    "funil_id": "uuid-do-funil",
    "etapa_id": "uuid-da-etapa",
    "utm_source": "facebook",
    "utm_campaign": "campanha-q2"
  }'
```

---

## 2. webhook-uzapi

Webhook que recebe mensagens do WhatsApp via Uzapi. Registrado automaticamente ao criar uma instância.

### Endpoint

```
POST /functions/v1/webhook-uzapi
```

### Autenticação

Nenhuma — chamado diretamente pela Uzapi. A autenticação é feita validando o `instanceName` na tabela `integracoes`.

### Request Body (enviado pela Uzapi)

```json
{
  "event": "messages.upsert",
  "instance": "inst_empresa123_setor1_1711234567890",
  "data": {
    "messages": [{
      "key": {
        "remoteJid": "5521999887766@s.whatsapp.net",
        "fromMe": false
      },
      "pushName": "João",
      "message": {
        "conversation": "Olá, quero saber mais sobre os planos"
      }
    }]
  }
}
```

### Respostas

| Status | Body | Descrição |
|---|---|---|
| 200 | `{ "success": true }` | Mensagem processada |
| 200 | `{ "status": "ignored event" }` | Evento ignorado (status, broadcast, etc.) |
| 404 | `{ "error": "Instance unmanaged" }` | `instanceName` não encontrado |

### Comportamento
- Identifica `empresa_id` e `setor_id` pelo `instanceName` na tabela `integracoes`
- Cria lead automaticamente se o telefone não existir
- Salva mensagem em `chat_mensagens` vinculada à conversa correta
- Registra log em `system_logs`

---

## 3. uzapi-manager

Gerencia instâncias da Uzapi (criar, QR Code, verificar status, logout). Requer autenticação de usuário.

### Endpoint

```
POST /functions/v1/uzapi-manager
```

### Autenticação

| Header | Valor |
|---|---|
| `Authorization` | `Bearer {access_token}` — Token JWT do Supabase Auth |

### Ações

#### 3.1 Criar instância

```json
{
  "action": "create_instance",
  "setorId": "uuid-do-setor"
}
```

**Resposta 200:**
```json
{
  "success": true,
  "instance": {
    "id": "uuid",
    "empresa_id": "uuid",
    "setor_id": "uuid",
    "tipo": "uzapi",
    "credentials": {
      "instanceName": "inst_empresa_setor_17112345",
      "token": "inst_empresa_setor_17112345",
      "hash": "abc123"
    }
  },
  "qrcode": {
    "base64": "data:image/png;base64,..."
  }
}
```

#### 3.2 Obter QR Code

```json
{
  "action": "get_qr_code",
  "instanceName": "inst_empresa_setor_17112345"
}
```

**Resposta 200:**
```json
{
  "success": true,
  "base64": "data:image/png;base64,..."
}
```

#### 3.3 Verificar conexão

```json
{
  "action": "check_connection",
  "instanceName": "inst_empresa_setor_17112345"
}
```

**Resposta 200:**
```json
{
  "success": true,
  "state": "open"
}
```

> Estados possíveis: `"open"` (conectado), `"close"` (desconectado), `"connecting"`

#### 3.4 Logout

```json
{
  "action": "logout",
  "instanceName": "inst_empresa_setor_17112345"
}
```

**Resposta 200:**
```json
{ "success": true }
```

### Secrets necessários

| Secret | Descrição |
|---|---|
| `UZAPI_BASE_URL` | URL do servidor Uzapi |
| `UZAPI_USERNAME` | Chave global da API Uzapi |

---

## 4. send-message

Envia mensagens de texto ou áudio via WhatsApp (Uzapi). Requer autenticação.

### Endpoint

```
POST /functions/v1/send-message
```

### Autenticação

| Header | Valor |
|---|---|
| `Authorization` | `Bearer {access_token}` |

### Request Body

**Texto:**
```json
{
  "phone": "5521999887766",
  "message": "Olá! Sua reunião é amanhã às 14h.",
  "empresa_id": "uuid-da-empresa",
  "setor_id": "uuid-do-setor",
  "conversa_id": "uuid-conversa-existente",
  "type": "text"
}
```

**Áudio:**
```json
{
  "phone": "5521999887766",
  "audio_url": "https://storage.supabase.co/audio/exemplo.ogg",
  "empresa_id": "uuid-da-empresa",
  "setor_id": "uuid-do-setor",
  "type": "audio"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `phone` | string | ✅ | Telefone do destinatário (formato E.164 recomendado) |
| `empresa_id` | UUID | ✅ | ID da empresa remetente |
| `setor_id` | UUID | ❌ | Setor (para selecionar a instância correta quando há múltiplas) |
| `message` | string | ✅ (texto) | Corpo da mensagem de texto |
| `audio_url` | string | ✅ (áudio) | URL pública do arquivo de áudio |
| `conversa_id` | UUID | ❌ | ID de conversa existente |
| `type` | string | ❌ | `"text"` (padrão) ou `"audio"` |

### Respostas

**200 — Enviada**
```json
{
  "status": "sent",
  "messageId": "BAE5XXXX",
  "conversa_id": "uuid-da-conversa"
}
```

**400 — Integração não configurada**
```json
{
  "error": "Integração Uzapi não configurada ou inativa para esta empresa/setor"
}
```

**403 — Empresa mismatch**
```json
{
  "error": "Forbidden: empresa_id mismatch"
}
```

---

## 5. send-lead-followup

Automação que envia follow-up para leads inativos há mais de 24h. Executada via CRON.

### Endpoint

```
POST /functions/v1/send-lead-followup
```

### Autenticação

Chamada via CRON interno (usa `SUPABASE_SERVICE_ROLE_KEY`). Sem body necessário.

### Critérios de envio
- Última mensagem há mais de 24h
- Lead na etapa "Novo Lead" ou "Em Contato"
- Follow-up ainda não enviado para este lead
- Última mensagem é `from_me = true` (enviada por nós, sem resposta)

### Resposta 200

```json
{
  "status": "ok",
  "sent": 3,
  "skipped": 12
}
```

### Configuração CRON

```sql
SELECT cron.schedule('send-lead-followup', '0 13 * * *', $$
  SELECT net.http_post(
    url := 'https://{PROJECT_ID}.supabase.co/functions/v1/send-lead-followup',
    headers := '{"Authorization": "Bearer {SERVICE_ROLE_KEY}"}'::jsonb
  );
$$);
```

---

## 6. send-appointment-reminders

Envia lembretes automáticos de compromissos via WhatsApp (1h antes e 24h antes). Executada via CRON.

### Endpoint

```
POST /functions/v1/send-appointment-reminders
```

### Autenticação

Chamada via CRON interno. Sem body necessário.

### Janelas de lembrete

| Janela | Critério |
|---|---|
| 24h antes | Compromisso entre 23h55m e 24h05m à frente |
| 1h antes | Compromisso entre 55min e 1h05min à frente |

### Resposta 200

```json
{
  "status": "ok",
  "sent": 5,
  "skipped": 2
}
```

### Configuração CRON

```sql
SELECT cron.schedule('send-appointment-reminders', '*/15 * * * *', $$
  SELECT net.http_post(
    url := 'https://{PROJECT_ID}.supabase.co/functions/v1/send-appointment-reminders',
    headers := '{"Authorization": "Bearer {SERVICE_ROLE_KEY}"}'::jsonb
  );
$$);
```

---

## 7. google-calendar-auth

Gerencia o fluxo OAuth 2.0 do Google Calendar.

### Endpoint

```
POST /functions/v1/google-calendar-auth   — gera URL de autorização
GET  /functions/v1/google-calendar-auth   — callback automático do Google
```

#### 7.1 Gerar URL de autorização (POST)

**Request Body:**
```json
{
  "user_id": "uuid-do-usuario-supabase",
  "empresa_id": "uuid-da-empresa"
}
```

**Resposta 200:**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

O frontend redireciona o usuário para esta URL. Após autorizar, o Google chama automaticamente o GET abaixo.

#### 7.2 Callback do Google (GET — automático)

```
GET /functions/v1/google-calendar-auth?code=XXX&state=YYY
```

Troca o `code` por tokens e salva em `auth_google_agenda`. Redireciona de volta para o frontend.

**Sucesso:** `{FRONTEND_URL}/configuracoes?tab=integracoes&google_auth=success`

**Erro:** `{FRONTEND_URL}/configuracoes?tab=integracoes&error={mensagem}`

### Secrets necessários

| Secret | Descrição |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID do Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google Cloud |
| `FRONTEND_URL` | URL do frontend para redirecionamentos |

---

## 8. google-calendar-sync

Busca eventos do Google Calendar para exibição unificada na agenda do CRM.

### Endpoint

```
POST /functions/v1/google-calendar-sync
```

### Autenticação

| Header | Valor |
|---|---|
| `Authorization` | `Bearer {access_token}` |

### Request Body

```json
{
  "timeMin": "2026-05-01T00:00:00Z",
  "timeMax": "2026-05-31T23:59:59Z",
  "filter_dentista_id": "uuid-do-usuario"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `timeMin` | ISO 8601 | ✅ | Início do período |
| `timeMax` | ISO 8601 | ✅ | Fim do período |
| `filter_dentista_id` | UUID | ❌ | Filtra eventos de um usuário específico |

### Resposta 200

```json
[
  {
    "id": "google_abc123",
    "is_google": true,
    "dentista_id": "uuid-do-usuario",
    "data_hora": "2026-05-03T14:00:00.000Z",
    "duracao_minutos": 60,
    "tipo_procedimento": "Reunião de equipe",
    "status": "Agendada",
    "observacoes": "Descrição do evento",
    "google_event_url": "https://calendar.google.com/..."
  }
]
```

### Comportamento
- Renova `access_token` automaticamente via `refresh_token` se expirado
- Retorna array vazio `[]` se nenhuma integração Google ativa for encontrada
- Eventos marcados com `is_google: true` para diferenciação visual no frontend

---

## 9. Configuração Multi-Tenant — WhatsApp por Tenant

Cada empresa (tenant / `empresa_id`) precisa de suas próprias credenciais Uzapi para WhatsApp isolado.

### Estrutura da tabela `integracoes`

```sql
CREATE TABLE public.integracoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id),
  tipo       text NOT NULL,            -- 'uzapi'
  credentials jsonb NOT NULL,          -- credenciais da instância
  ativo      boolean DEFAULT true,
  setor_id   uuid REFERENCES public.setores(id)  -- opcional: sub-isolamento por setor
);
```

### Estrutura das credenciais

```json
{
  "phoneNumberId": "PHONE_NUMBER_ID_DA_INSTANCIA",
  "token":         "TOKEN_JWT_DA_INSTANCIA"
}
```

### Como registrar credenciais manualmente para uma nova empresa

Execute no Supabase SQL Editor:

```sql
INSERT INTO public.integracoes (empresa_id, tipo, credentials, ativo)
VALUES (
  'UUID_DA_EMPRESA',
  'uzapi',
  '{"phoneNumberId": "SEU_PHONE_ID", "token": "SEU_TOKEN"}',
  true
);
```

**Consultar empresas cadastradas:**
```sql
SELECT id, nome FROM public.empresa ORDER BY created_at DESC;
```

**Verificar integrações ativas:**
```sql
SELECT i.id, e.nome AS empresa, i.tipo, i.credentials, i.ativo
FROM public.integracoes i
JOIN public.empresa e ON e.id = i.empresa_id
WHERE i.tipo = 'uzapi';
```

**Desativar sem deletar:**
```sql
UPDATE public.integracoes SET ativo = false
WHERE empresa_id = 'UUID_DA_EMPRESA' AND tipo = 'uzapi';
```

---

## 🔐 Resumo de Autenticação por Rota

| Rota | Tipo | Header |
|---|---|---|
| `webhook-lead` | API Key | `x-api-key: {chave}` |
| `webhook-uzapi` | Nenhuma | Validação por `instanceName` |
| `uzapi-manager` | JWT | `Authorization: Bearer {token}` |
| `send-message` | JWT | `Authorization: Bearer {token}` |
| `send-lead-followup` | CRON / Service Role | `Authorization: Bearer {service_key}` |
| `send-appointment-reminders` | CRON / Service Role | `Authorization: Bearer {service_key}` |
| `google-calendar-auth` POST | Nenhuma (pré-auth) | — |
| `google-calendar-auth` GET | Nenhuma (callback Google) | — |
| `google-calendar-sync` | JWT | `Authorization: Bearer {token}` |

---

## 🔑 Secrets do Supabase

| Secret | Usado por | Descrição |
|---|---|---|
| `UZAPI_BASE_URL` | uzapi-manager, send-message, send-lead-followup, send-appointment-reminders | URL do servidor Uzapi |
| `UZAPI_USERNAME` | uzapi-manager, send-message, send-lead-followup, send-appointment-reminders | Chave global da Uzapi |
| `GOOGLE_CLIENT_ID` | google-calendar-auth | Client ID do Google Cloud |
| `GOOGLE_CLIENT_SECRET` | google-calendar-auth | Client Secret do Google Cloud |
| `FRONTEND_URL` | google-calendar-auth, uzapi-manager, send-message | URL do frontend |
| `WEBHOOK_LEAD_API_KEY` | webhook-lead | Chave de API para webhooks externos |

---

## ⚡ Funções Legado Removidas

| Função | Substituída por |
|---|---|
| `webhook-zapi` | `webhook-uzapi` |
| `send-zapi-message` | `send-message` |
