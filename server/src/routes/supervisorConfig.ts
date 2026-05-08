import { Router, Request, Response } from 'express';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

const router = Router();

/** Middleware: validate API key */
function validateApiKey(req: Request, res: Response, next: () => void): void {
  if (config.apiKey && req.headers['x-api-key'] !== config.apiKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(validateApiKey);

/** GET /api/supervisor-config/:clinicaId */
router.get('/:clinicaId', async (req: Request, res: Response): Promise<void> => {
  const { clinicaId } = req.params;

  const { data, error } = await supabase
    .from('supervisor_config')
    .select('*')
    .eq('clinica_id', clinicaId)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // If no config exists, return defaults
  if (!data) {
    res.json({
      clinica_id: clinicaId,
      system_prompt: `Você é uma supervisora de vendas experiente em clínicas odontológicas. Analise o histórico da conversa entre um atendente e um lead, e oriente o próximo passo do atendente de forma direta e objetiva.

Regras:
- Seja direta. Máximo 3 frases.
- Sugira a próxima pergunta ou ação específica.
- Baseie-se no contexto real da conversa.
- Use o Script de Vendas como referência para guiar o atendente.
- Responda em português brasileiro.`,
      sales_script: '',
      enabled: true,
      is_default: true,
    });
    return;
  }

  res.json(data);
});

/** PUT /api/supervisor-config/:clinicaId */
router.put('/:clinicaId', async (req: Request, res: Response): Promise<void> => {
  const { clinicaId } = req.params;
  const { system_prompt, sales_script, enabled } = req.body;

  if (typeof system_prompt !== 'string' || typeof sales_script !== 'string') {
    res.status(400).json({ error: 'system_prompt and sales_script are required strings' });
    return;
  }

  // Upsert: insert or update
  const { data, error } = await supabase
    .from('supervisor_config')
    .upsert(
      {
        clinica_id: clinicaId,
        system_prompt,
        sales_script,
        enabled: enabled ?? true,
      },
      { onConflict: 'clinica_id' }
    )
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

export default router;
