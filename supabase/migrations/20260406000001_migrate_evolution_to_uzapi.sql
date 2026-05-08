-- Migration: Evolution API → UZAPI
-- Date: 2026-04-06
-- Description: Migra integrações de WhatsApp da Evolution API para UZAPI
-- Token é POR INSTÂNCIA (armazenado em credentials.token)

-- Step 1: Update tipo from 'evolution_api' to 'uzapi'
UPDATE integracoes
SET tipo = 'uzapi'
WHERE tipo = 'evolution_api';

-- Step 2: Migrate credentials structure
-- Old: { "instanceName": "inst_xxx", "token": "inst_xxx", "hash": "xxx" }
-- New: { "phoneNumberId": "156056374228000", "token": "<jwt_da_instancia>" }
-- IMPORTANT: Replace the token below with the actual instance token from UZAPI dashboard
UPDATE integracoes
SET credentials = jsonb_build_object(
  'phoneNumberId', '156056374228000',
  'token', '<SUBSTITUIR_PELO_TOKEN_DA_INSTANCIA>'
)
WHERE tipo = 'uzapi'
  AND ativo = true;

-- Step 3: Log the migration
INSERT INTO system_logs (level, action, details)
VALUES (
  'info',
  'migration_evolution_to_uzapi',
  '{"description": "Migrated WhatsApp integrations from Evolution API to UZAPI", "date": "2026-04-06"}'::jsonb
);
