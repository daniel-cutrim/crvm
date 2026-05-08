import { useState, useEffect, useCallback } from 'react';
import { Bot, Save, Loader2, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_SERVER_API_KEY || '';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;
  return headers;
}

const DEFAULT_PROMPT = `Você é uma supervisora de vendas experiente em clínicas odontológicas. Analise o histórico da conversa entre um atendente e um lead, e oriente o próximo passo do atendente de forma direta e objetiva.

Regras:
- Seja direta. Máximo 3 frases.
- Sugira a próxima pergunta ou ação específica.
- Baseie-se no contexto real da conversa.
- Use o Script de Vendas como referência para guiar o atendente.
- Responda em português brasileiro.`;

interface SupervisorConfig {
  system_prompt: string;
  sales_script: string;
  enabled: boolean;
}

export default function SupervisoraTab() {
  const [config, setConfig] = useState<SupervisorConfig>({
    system_prompt: DEFAULT_PROMPT,
    sales_script: '',
    enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinicaId, setClinicaId] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      // Get clinica_id from current user
      const { data: userData } = await supabase.rpc('get_user_clinica_id');
      if (!userData) return;
      setClinicaId(userData);

      const res = await fetch(`${SERVER_URL}/api/supervisor-config/${userData}`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig({
          system_prompt: data.system_prompt || DEFAULT_PROMPT,
          sales_script: data.sales_script || '',
          enabled: data.enabled ?? true,
        });
      }
    } catch (err) {
      console.error('Failed to fetch supervisor config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!clinicaId) return;
    setSaving(true);

    try {
      const res = await fetch(`${SERVER_URL}/api/supervisor-config/${clinicaId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(config),
      });

      if (res.ok) {
        toast.success('Configuração salva com sucesso!');
      } else {
        const err = await res.json();
        toast.error(`Erro ao salvar: ${err.error}`);
      }
    } catch {
      toast.error('Erro de conexão com o servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig((prev) => ({ ...prev, system_prompt: DEFAULT_PROMPT }));
    toast.info('Prompt restaurado para o padrão');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Supervisora de Vendas IA
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure o comportamento e o script de vendas da IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="supervisor-enabled" className="text-sm text-muted-foreground">
            {config.enabled ? 'Ativada' : 'Desativada'}
          </Label>
          <Switch
            id="supervisor-enabled"
            checked={config.enabled}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({ ...prev, enabled: checked }))
            }
          />
        </div>
      </div>

      {/* Sales Script */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            📋 Script de Vendas
          </CardTitle>
          <CardDescription>
            Cole aqui o playbook/script que seus vendedores devem seguir.
            A IA usará isso como referência para orientar o atendente em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.sales_script}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, sales_script: e.target.value }))
            }
            placeholder={`Exemplo:

ETAPA 1 - ACOLHIMENTO
- Cumprimentar o lead pelo nome
- Perguntar como pode ajudar
- Demonstrar empatia com a dor/problema

ETAPA 2 - QUALIFICAÇÃO
- Perguntar há quanto tempo tem o problema
- Identificar urgência
- Perguntar sobre disponibilidade de horários

ETAPA 3 - APRESENTAÇÃO
- Explicar o procedimento de forma simples
- Mencionar diferenciais da clínica
- Apresentar valores e formas de pagamento

ETAPA 4 - FECHAMENTO
- Sugerir agendamento de avaliação
- Criar senso de urgência (vagas limitadas)
- Confirmar data, horário e endereço`}
            className="min-h-[300px] font-mono text-sm leading-relaxed"
          />
          <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Dica: inclua etapas do funil, perguntas-chave, objeções comuns e técnicas de fechamento.
              Quanto mais detalhado, melhor a orientação da IA.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🤖 Prompt do Sistema
            <span className="text-xs font-normal text-muted-foreground">(avançado)</span>
          </CardTitle>
          <CardDescription>
            Define o comportamento e personalidade da IA supervisora.
            O Script de Vendas é automaticamente anexado a este prompt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.system_prompt}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, system_prompt: e.target.value }))
            }
            className="min-h-[200px] font-mono text-sm leading-relaxed"
          />
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5"
            >
              <RotateCcw size={14} />
              Restaurar padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2 pb-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 min-w-[160px]"
          size="lg"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Salvando...' : 'Salvar configuração'}
        </Button>
      </div>
    </div>
  );
}
