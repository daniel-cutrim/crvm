# Deploy: V-Odonto Z-API Server — Hetzner

## Pré-requisitos

- Servidor Ubuntu 22.04+ na Hetzner (Cloud ou Dedicated)
- Acesso SSH (`ssh root@SEU_IP`)
- Domínio apontando para o IP (ex: `api.seudominio.com`)
- Conta DeepSeek com API key
- Instância Z-API configurada

---

## Passo 1 — Preparar o servidor

```bash
# Conectar ao servidor
ssh root@SEU_IP

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar versão
node -v   # v20.x
npm -v    # 10.x

# Instalar PM2 (gerenciador de processos)
npm install -g pm2

# Instalar Nginx (reverse proxy + SSL)
apt install -y nginx certbot python3-certbot-nginx

# Criar diretório da aplicação
mkdir -p /opt/v-odonto-server
```

---

## Passo 2 — Enviar os arquivos

**Do seu PC local** (PowerShell):

```powershell
# Buildar localmente
cd c:\Users\danie\OneDrive\Documentos\app-crm-odonto2\v-odonto\server
npm run build

# Enviar para o servidor via SCP
# Envia: dist/, package.json, package-lock.json
scp -r dist/ root@SEU_IP:/opt/v-odonto-server/
scp package.json package-lock.json root@SEU_IP:/opt/v-odonto-server/
```

Alternativa com Git (recomendado para CI/CD):

```bash
# No servidor
cd /opt/v-odonto-server
git clone https://seu-repo.git .
cd server
npm install --omit=dev
npm run build
```

---

## Passo 3 — Configurar variáveis de ambiente

**No servidor:**

```bash
nano /opt/v-odonto-server/.env
```

Cole o conteúdo (ajuste os valores):

```env
# --- SUPABASE ---
SUPABASE_URL=https://wdtwysjfusehzmzlfkaj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY

# --- DEEPSEEK ---
DEEPSEEK_API_KEY=SUA_DEEPSEEK_KEY
DEEPSEEK_MODEL=deepseek-chat

# --- Z-API ---
ZAPI_INSTANCE_ID=SUA_INSTANCE_ID
ZAPI_TOKEN=SEU_TOKEN
ZAPI_CLIENT_TOKEN=SEU_CLIENT_TOKEN

# --- SERVER ---
PORT=3001
NODE_ENV=production

# --- CORS ---
CORS_ORIGINS=https://app-medroi.vercel.app,https://seudominio.com

# --- API KEY ---
# Gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_KEY=GERE_UMA_CHAVE_AQUI

# --- CLINICA ---
DEFAULT_CLINICA_ID=7f90b8c2-9fb5-4d49-9f8d-ce05500fbd57
```

```bash
# Proteger o arquivo
chmod 600 /opt/v-odonto-server/.env
```

---

## Passo 4 — Instalar dependências e testar

```bash
cd /opt/v-odonto-server
npm install --omit=dev

# Testar manualmente primeiro
node dist/index.js
# Deve mostrar: [server] Z-API Server running on port 3001
# Ctrl+C para parar
```

---

## Passo 5 — Configurar PM2

```bash
cd /opt/v-odonto-server

# Iniciar com PM2
pm2 start dist/index.js --name v-odonto-zapi --env production

# Verificar se está rodando
pm2 status
pm2 logs v-odonto-zapi --lines 20

# Salvar para auto-restart após reboot
pm2 save
pm2 startup
# ↑ Copie e execute o comando que o PM2 mostrar
```

Comandos úteis PM2:

```bash
pm2 restart v-odonto-zapi    # Reiniciar
pm2 stop v-odonto-zapi       # Parar
pm2 logs v-odonto-zapi       # Ver logs em tempo real
pm2 monit                    # Dashboard de monitoramento
```

---

## Passo 6 — Configurar Nginx + SSL

```bash
nano /etc/nginx/sites-available/v-odonto-api
```

Cole:

```nginx
server {
    listen 80;
    server_name api.seudominio.com;  # ← TROCAR pelo seu domínio

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout para webhooks (DeepSeek pode demorar)
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
}
```

```bash
# Ativar o site
ln -s /etc/nginx/sites-available/v-odonto-api /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Recarregar
systemctl reload nginx

# Instalar SSL (Let's Encrypt) — PRECISA do domínio apontando para o IP
certbot --nginx -d api.seudominio.com
# Siga as instruções, escolha "redirect HTTP to HTTPS"
```

---

## Passo 7 — Configurar Z-API

No painel da Z-API (https://painel.z-api.io):

1. Vá em **Instâncias** → sua instância → **Webhooks**
2. Configure o webhook URL:
   ```
   https://api.seudominio.com/api/webhooks/zapi
   ```
3. Selecione os eventos: **ReceivedCallback** (pelo menos)
4. Salve

---

## Passo 8 — Atualizar o Frontend

No arquivo `.env.local` do frontend (ou variáveis na Vercel):

```env
VITE_SERVER_URL=https://api.seudominio.com
VITE_SERVER_API_KEY=MESMA_CHAVE_DO_API_KEY_DO_SERVER
```

Se estiver na Vercel, adicione essas variáveis em:
**Settings → Environment Variables**

---

## Passo 9 — Configurar Firewall

```bash
# Permitir SSH, HTTP, HTTPS
ufw allow 22
ufw allow 80
ufw allow 443

# Bloquear acesso direto à porta 3001 (apenas via Nginx)
ufw deny 3001

# Ativar
ufw enable
ufw status
```

---

## Passo 10 — Verificação final

```bash
# 1. Testar health check
curl https://api.seudominio.com/health
# Deve retornar: {"status":"ok","timestamp":"...","version":"1.0.0"}

# 2. Ver logs
pm2 logs v-odonto-zapi --lines 50

# 3. Testar webhook simulado
curl -X POST https://api.seudominio.com/api/webhooks/zapi \
  -H "Content-Type: application/json" \
  -H "Client-Token: SEU_CLIENT_TOKEN" \
  -d '{"type":"ReceivedCallback","isGroup":false,"fromMe":false,"phone":"5511999887766","messageId":"deploy_test_001","instanceId":"test","momment":1234567890,"senderName":"Teste Deploy","text":{"message":"Teste de deploy"}}'
# Deve retornar: {"status":"received"}

# 4. Verificar se a mensagem apareceu no Supabase
# Abra o dashboard do Supabase e confira chat_mensagens
```

---

## Atualizações futuras

```bash
# Do seu PC, após fazer mudanças:
cd server
npm run build
scp -r dist/ root@SEU_IP:/opt/v-odonto-server/

# No servidor:
ssh root@SEU_IP
pm2 restart v-odonto-zapi
pm2 logs v-odonto-zapi --lines 10
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `502 Bad Gateway` | PM2 não está rodando: `pm2 restart v-odonto-zapi` |
| `CORS error` no frontend | Adicionar domínio em `CORS_ORIGINS` no `.env` e `pm2 restart` |
| Webhook retorna 401 | `Client-Token` header incorreto — verificar Z-API painel |
| Supervisor não gera guidance | Verificar `DEEPSEEK_API_KEY` + `pm2 logs` para erros |
| Server não inicia | `DEFAULT_CLINICA_ID` ou `SUPABASE_SERVICE_ROLE_KEY` vazio |
| SSL não funciona | Domínio não aponta para o IP: `dig api.seudominio.com` |
