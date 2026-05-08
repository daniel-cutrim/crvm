# 📡 Documentação da API — CRM Odonto SaaS

> **Base URL**: `https://{PROJECT_ID}.supabase.co/functions/v1`
>
> Todas as Edge Functions são acessíveis via esta URL base. Substitua `{PROJECT_ID}` pelo ID do seu projeto Supabase.

---

## Índice

1. [webhook-lead](#1-webhook-lead) — Captação de leads via landing pages
2. [webhook-uzapi](#2-webhook-uzapi) — Recebimento de mensagens WhatsApp (Uzapi)
3. [uzapi-manager](#3-uzapi-manager) — Gerenciamento de instâncias WhatsApp
4. [send-message](#4-send-message) — Envio de mensagens WhatsApp
5. [send-lead-followup](#5-send-lead-followup) — Follow-up automático de leads inativos
6. [send-appointment-reminders](#6-send-appointment-reminders) — Lembretes automáticos de consultas
7. [google-calendar-auth](#7-google-calendar-auth) — OAuth do Google Calendar
8. [google-calendar-sync](#8-google-calendar-sync) — Sincronização de eventos do Google Calendar

---

## 1. webhook-lead

Rota pública para captação de leads a partir de landing pages, formulários externos, RD Station, etc.

### Endpoint

```
POST /functions/v1/webhook-lead?clinica_id={UUID}
```

### Autenticação

| Header | Obrigatório | Descrição |
|---|---|---|
| `x-api-key` | ✅ | Chave configurada no secret `WEBHOOK_LEAD_API_KEY` |

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `clinica_id` | UUID | ⚠️ | ID da clínica. Pode ser enviado via query ou body |

### Request Body

```json
{
  "nome": "João Silva",
  "telefone": "(21) 99999-8888",
  "clinica_id": "uuid-da-clinica",
  "email": "joao@email.com",
  "origem": "Landing Page Implantes",
  "interesse": "Implante dentário",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "implantes-2025",
  "utm_term": "implante dentario rj",
  "utm_content": "banner-principal"
}
```

| Campo | Tipo | Obrigatório | Aliases aceitos |
|---|---|---|---|
| `nome` | string | ✅ | `name`, `full_name` |
| `telefone` | string | ✅ | `phone`, `whatsapp` |
| `clinica_id` | UUID | ✅ | via query ou body |
| `funil_id` | UUID | ✅ | `pipeline_id`, via query ou body |
| `etapa_id` | UUID | ✅ | `stage_id`, via query ou body |
| `email` | string | ❌ | — |
| `origem` | string | ❌ | `origin` |
| `interesse` | string | ❌ | `interest` |
| `utm_source` | string | ❌ | — |
| `utm_medium` | string | ❌ | — |
| `utm_campaign` | string | ❌ | — |
| `utm_term` | string | ❌ | — |
| `utm_content` | string | ❌ | — |

### Respostas

**201 — Lead criado com sucesso**
```json
{
  "status": "created",
  "lead_id": "uuid-do-lead",
  "conversa_id": "uuid-da-conversa"
}
```

**200 — Lead já existente (duplicado por telefone)**
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
  "error": "Campos obrigatórios: nome, telefone e clinica_id"
}
```

**401 — Chave de API inválida**
```json
{
  "error": "Unauthorized: invalid or missing x-api-key header"
}
```

### Comportamento
- Sanitiza todos os inputs contra XSS (remove HTML tags)
- Detecta leads duplicados pelos últimos 8 dígitos do telefone
- Se duplicado, atualiza UTMs e registra ponto na jornada (`lead_jornada`)
- Se novo, cria lead + conversa no chat + **dispara mensagem de boas-vindas via WhatsApp**
- Deriva a origem automaticamente a partir de `utm_source` (Google Ads, Facebook, Instagram, etc.)

### Exemplo cURL

```bash
curl -X POST \
  "https://wdtwysjfusehzmzlfkaj.supabase.co/functions/v1/webhook-lead?clinica_id=UUID_CLINICA" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE_API" \
  -d '{
    "nome": "Maria Oliveira",
    "telefone": "21999887766",
    "utm_source": "facebook",
    "utm_campaign": "clareamento-promo"
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

Nenhuma (chamado diretamente pela Uzapi). A autenticação é feita pela validação do `instanceName` na tabela `integracoes`.

### Request Body (enviado pela Uzapi)

```json
{
  "event": "messages.upsert",
  "instance": "inst_clinicaXYZ_setor1_1711234567890",
  "data": {
    "messages": [{
      "key": {
        "remoteJid": "5521999887766@s.whatsapp.net",
        "fromMe": false
      },
      "pushName": "João",
      "message": {
        "conversation": "Olá, gostaria de agendar uma avaliação"
      }
    }]
  }
}
```

### Respostas

**200 — Mensagem processada**
```json
{ "success": true }
```

**200 — Evento ignorado**
```json
{ "status": "ignored event" }
```

**404 — Instância não encontrada**
```json
{ "error": "Instance unmanaged" }
```

### Comportamento
- Identifica o `clinica_id` e `setor_id` pelo `instanceName` na tabela `integracoes`
- Cria lead automaticamente se telefone não encontrado
- Salva mensagem em `chat_conversas`
- Registra log em `system_logs`
- Ignora mensagens de status e broadcasts

---

## 3. uzapi-manager

Gerencia instâncias da Uzapi (criar, QR Code, status, logout). Apenas para admins autenticados.

### Endpoint

```
POST /functions/v1/uzapi-manager
```

### Autenticação

| Header | Obrigatório | Descrição |
|---|---|---|
| `Authorization` | ✅ | `Bearer {access_token}` — Token JWT do Supabase Auth |

### Ações disponíveis

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
    "clinica_id": "uuid",
    "setor_id": "uuid",
    "tipo": "uzapi",
    "credentials": {
      "instanceName": "inst_clinica_setor_17112345",
      "token": "inst_clinica_setor_17112345",
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
  "instanceName": "inst_clinica_setor_17112345"
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
  "instanceName": "inst_clinica_setor_17112345"
}
```

**Resposta 200:**
```json
{
  "success": true,
  "state": "open"  // ou "close", "connecting"
}
```

#### 3.4 Logout (desconectar)

```json
{
  "action": "logout",
  "instanceName": "inst_clinica_setor_17112345"
}
```

**Resposta 200:**
```json
{ "success": true }
```

### Secrets necessários (Supabase)

- `UZAPI_BASE_URL` — URL do servidor Uzapi
- `UZAPI_USERNAME` — Chave global da API

---

## 4. send-message

Envia mensagens de texto ou áudio via WhatsApp (Uzapi). Requer autenticação de usuário.

### Endpoint

```
POST /functions/v1/send-message
```

### Autenticação

| Header | Obrigatório | Descrição |
|---|---|---|
| `Authorization` | ✅ | `Bearer {access_token}` — Token JWT do Supabase Auth |

### Request Body

**Enviar texto:**
```json
{
  "phone": "5521999887766",
  "message": "Olá, sua consulta é amanhã às 14h!",
  "clinica_id": "uuid-da-clinica",
  "setor_id": "uuid-do-setor",
  "conversa_id": "uuid-conversa-existente",
  "type": "text"
}
```

**Enviar áudio:**
```json
{
  "phone": "5521999887766",
  "audio_url": "https://storage.supabase.co/audio/exemplo.ogg",
  "clinica_id": "uuid-da-clinica",
  "setor_id": "uuid-do-setor",
  "type": "audio"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `phone` | string | ✅ | Telefone do destinatário |
| `clinica_id` | UUID | ✅ | ID da clínica do remetente |
| `setor_id` | UUID | ❌ | Setor de onde enviar (para selecionar a instância correta) |
| `message` | string | ✅ (texto) | Mensagem de texto |
| `audio_url` | string | ✅ (áudio) | URL do áudio |
| `conversa_id` | UUID | ❌ | ID da conversa existente |
| `type` | string | ❌ | `"text"` (padrão) ou `"audio"` |

### Respostas

**200 — Mensagem enviada**
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
  "error": "Integração Uzapi não configurada ou inativa para esta clínica/setor"
}
```

**403 — Clinica mismatch (proteção IDOR)**
```json
{
  "error": "Forbidden: clinica_id mismatch"
}
```

---

## 5. send-lead-followup

Automação que envia follow-up para leads inativos há mais de 24h. Executada via CRON (Supabase Scheduler).

### Endpoint

```
POST /functions/v1/send-lead-followup
```

### Autenticação

Chamada via CRON interno do Supabase (usa `SUPABASE_SERVICE_ROLE_KEY`).

### Request Body

Nenhum body necessário — a função busca automaticamente leads elegíveis.

### Critérios de envio
- Última mensagem enviada há mais de 24h
- Lead está na etapa "Novo Lead" ou "Em Contato"
- Follow-up ainda não foi enviado para este lead
- Última mensagem é `from_me = true` (nós mandamos, ele não respondeu)

### Resposta 200

```json
{
  "status": "ok",
  "sent": 3,
  "skipped": 12
}
```

### Configuração CRON (Supabase Dashboard)

```sql
-- Executar diariamente às 10h (horário de Brasília)
SELECT cron.schedule('send-lead-followup', '0 13 * * *', $$
  SELECT net.http_post(
    url := 'https://{PROJECT_ID}.supabase.co/functions/v1/send-lead-followup',
    headers := '{"Authorization": "Bearer {SERVICE_ROLE_KEY}"}'::jsonb
  );
$$);
```

---

## 6. send-appointment-reminders

Envia lembretes automáticos de consulta via WhatsApp (1h antes e 24h antes). Executada via CRON.

### Endpoint

```
POST /functions/v1/send-appointment-reminders
```

### Autenticação

Chamada via CRON interno do Supabase.

### Request Body

Nenhum — busca consultas automaticamente.

### Janelas de lembrete
- **24h antes**: Consultas entre 23h55m e 24h05m à frente
- **1h antes**: Consultas entre 55min e 1h05min à frente

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
-- Executar a cada 15 minutos
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

### Endpoints

#### 7.1 Gerar URL de autorização

```
POST /functions/v1/google-calendar-auth
```

**Request Body:**
```json
{
  "user_id": "uuid-do-usuario-supabase",
  "clinica_id": "uuid-da-clinica"
}
```

**Resposta 200:**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=...&state=..."
}
```

O frontend redireciona o usuário para esta URL. Após autorizar, o Google redireciona de volta para a mesma Edge Function via GET.

#### 7.2 Callback do Google (automático)

```
GET /functions/v1/google-calendar-auth?code=XXX&state=YYY
```

Recebido automaticamente do Google. Troca o `code` por tokens e salva na tabela `auth_google_agenda`.

**Redirecionamento de sucesso:**
```
{FRONTEND_URL}/configuracoes?tab=integracoes&google_auth=success
```

**Redirecionamento de erro:**
```
{FRONTEND_URL}/configuracoes?tab=integracoes&error={mensagem}
```

### Secrets necessários (Supabase)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FRONTEND_URL`

---

## 8. google-calendar-sync

Busca eventos do Google Calendar para exibição unificada na agenda do CRM.

### Endpoint

```
POST /functions/v1/google-calendar-sync
```

### Autenticação

| Header | Obrigatório | Descrição |
|---|---|---|
| `Authorization` | ✅ | `Bearer {access_token}` — Token JWT do Supabase Auth |

### Request Body

```json
{
  "user_id": "uuid-do-usuario",
  "start_date": "2025-04-01T00:00:00Z",
  "end_date": "2025-04-07T23:59:59Z"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `user_id` | UUID | ✅ | ID do usuário que autorizou o Google |
| `start_date` | ISO 8601 | ✅ | Início do período |
| `end_date` | ISO 8601 | ✅ | Fim do período |

### Resposta 200

```json
{
  "events": [
    {
      "id": "google_event_id",
      "data_hora": "2025-04-03T14:00:00",
      "duracao_minutos": 60,
      "tipo_procedimento": "Reunião de equipe",
      "status": "Google",
      "dentista_id": "uuid-do-dentista",
      "is_google": true
    }
  ]
}
```

### Comportamento
- Busca tokens na tabela `auth_google_agenda`
- Se o `access_token` expirou, usa o `refresh_token` para renová-lo automaticamente
- Converte eventos do Google para o mesmo formato das consultas do CRM
- Marca todos com `is_google: true` para diferenciação visual

---

## 🔐 Resumo de Autenticação por Rota

| Rota | Tipo | Header |
|---|---|---|
| `webhook-lead` | API Key | `x-api-key: {chave}` |
| `webhook-uzapi` | Nenhuma | Validação por instanceName |
| `uzapi-manager` | JWT | `Authorization: Bearer {token}` |
| `send-message` | JWT | `Authorization: Bearer {token}` |
| `send-lead-followup` | CRON/Service | Service Role Key |
| `send-appointment-reminders` | CRON/Service | Service Role Key |
| `google-calendar-auth` | Nenhuma (POST → JWT implícito, GET → callback) | — |
| `google-calendar-sync` | JWT | `Authorization: Bearer {token}` |

---

## 🔑 Secrets do Supabase (Dashboard > Edge Functions > Secrets)

| Secret | Usado por | Descrição |
|---|---|---|
| `UZAPI_BASE_URL` | uzapi-manager, send-message, send-lead-followup, send-appointment-reminders | URL do servidor Uzapi |
| `UZAPI_USERNAME` | uzapi-manager, send-message, send-lead-followup, send-appointment-reminders | Chave global da Uzapi |
| `GOOGLE_CLIENT_ID` | google-calendar-auth | Client ID do Google Cloud |
| `GOOGLE_CLIENT_SECRET` | google-calendar-auth | Client Secret do Google Cloud |
| `FRONTEND_URL` | google-calendar-auth, uzapi-manager, send-message | URL do front-end para redirecionamentos |
| `WEBHOOK_LEAD_API_KEY` | webhook-lead | Chave de API para validar webhooks de landing pages |

---

## ⚡ Funções Legado Removidas

| Função | Motivo |
|---|---|
| `webhook-zapi` | Substituída por `webhook-uzapi` |
| `send-zapi-message` | Substituída por `send-message` (Uzapi) |
