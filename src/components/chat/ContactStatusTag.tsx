import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ChevronDown, Trophy, XCircle } from 'lucide-react';
import type { FunilEtapa } from '@/types';

const MOTIVOS_PERDA = [
  'Achou caro',
  'Está sem dinheiro',
  'Sem tempo',
  'Vai se planejar',
  'Adiou',
  'Descrença em si',
  'Descrença no método',
  'Foi para concorrente',
  'Não respondeu mais',
  'Desistiu',
  'Outro',
];

// Fallback stages when no dynamic funnel is configured
const ETAPAS_FALLBACK = [
  { id: 'fallback-1', nome: 'Novo Lead', cor: '#3b82f6', ordem: 1 },
  { id: 'fallback-2', nome: 'Em Contato', cor: '#eab308', ordem: 2 },
  { id: 'fallback-3', nome: 'Avaliação marcada', cor: '#8b5cf6', ordem: 3 },
  { id: 'fallback-4', nome: 'Orçamento aprovado', cor: '#22c55e', ordem: 4 },
  { id: 'fallback-5', nome: 'Orçamento perdido', cor: '#ef4444', ordem: 5 },
];

const PACIENTE_STATUS = [
  { value: 'Ativo', color: 'bg-green-500/15 text-green-700 border-green-300' },
  { value: 'Em tratamento', color: 'bg-blue-500/15 text-blue-700 border-blue-300' },
  { value: 'Inadimplente', color: 'bg-red-500/15 text-red-700 border-red-300' },
  { value: 'Inativo', color: 'bg-muted text-muted-foreground border-border' },
];

interface Props {
  leadId: string | null;
  pacienteId: string | null;
}

export default function ContactStatusTag({ leadId, pacienteId }: Props) {
  const [etapa, setEtapa] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [funilId, setFunilId] = useState<string | null>(null);
  const [pacienteStatus, setPacienteStatus] = useState<string | null>(null);
  const [etapas, setEtapas] = useState<{ id: string; nome: string; cor: string; ordem: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Loss reason dialog
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [savingLoss, setSavingLoss] = useState(false);

  // Fetch lead data
  useEffect(() => {
    if (leadId) {
      supabase.from('leads')
        .select('etapa_funil, funil_id, resultado')
        .eq('id', leadId)
        .single()
        .then(({ data }) => {
          if (data) {
            setEtapa(data.etapa_funil);
            setFunilId(data.funil_id || null);
            setResultado(data.resultado || null);
          }
        });
    } else {
      setEtapa(null);
      setFunilId(null);
      setResultado(null);
    }
    if (pacienteId) {
      supabase.from('pacientes').select('status').eq('id', pacienteId).single()
        .then(({ data }) => { if (data) setPacienteStatus(data.status); });
    } else {
      setPacienteStatus(null);
    }
  }, [leadId, pacienteId]);

  // Load dynamic funnel stages
  const loadEtapas = useCallback(async () => {
    if (funilId) {
      const { data } = await supabase
        .from('funil_etapas')
        .select('*')
        .eq('funil_id', funilId)
        .order('ordem', { ascending: true });
      if (data && data.length > 0) {
        setEtapas(data.map(e => ({
          id: e.id,
          nome: e.nome,
          cor: e.cor || '#6b7280',
          ordem: e.ordem,
        })));
        return;
      }
    }
    setEtapas(ETAPAS_FALLBACK);
  }, [funilId]);

  useEffect(() => { loadEtapas(); }, [loadEtapas]);

  async function updateLeadEtapa(newEtapa: string) {
    if (!leadId) return;
    setLoading(true);
    const { error } = await supabase.from('leads')
      .update({ etapa_funil: newEtapa } as Record<string, unknown>)
      .eq('id', leadId);
    if (error) {
      toast.error('Erro ao atualizar etapa');
    } else {
      setEtapa(newEtapa);
      setResultado(null);
      toast.success(`Etapa alterada para "${newEtapa}"`);
    }
    setLoading(false);
    setOpen(false);
  }

  async function handleGanho() {
    if (!leadId) return;
    setLoading(true);
    const { error } = await supabase.from('leads')
      .update({
        resultado: 'ganho',
        resultado_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', leadId);
    if (error) {
      toast.error('Erro ao registrar ganho');
    } else {
      setResultado('ganho');
      toast.success('🏆 Lead marcado como GANHO!');
    }
    setLoading(false);
    setOpen(false);
  }

  function handlePerdidoClick() {
    setOpen(false);
    setMotivoPerda('');
    setMotivoOutro('');
    setLossDialogOpen(true);
  }

  async function handleConfirmPerda() {
    const finalMotivo = motivoPerda === 'Outro' ? motivoOutro.trim() : motivoPerda;
    if (!finalMotivo) {
      toast.error('Selecione o motivo da perda');
      return;
    }
    if (!leadId) return;
    setSavingLoss(true);
    const { error } = await supabase.from('leads')
      .update({
        resultado: 'perdido',
        motivo_perda: finalMotivo,
        resultado_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', leadId);
    if (error) {
      toast.error('Erro ao registrar perda');
    } else {
      setResultado('perdido');
      toast.success('Lead marcado como PERDIDO');
    }
    setSavingLoss(false);
    setLossDialogOpen(false);
  }

  async function updatePacienteStatus(newStatus: string) {
    if (!pacienteId) return;
    setLoading(true);
    const { error } = await supabase.from('pacientes').update({ status: newStatus }).eq('id', pacienteId);
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      setPacienteStatus(newStatus);
      toast.success(`Status alterado para "${newStatus}"`);
    }
    setLoading(false);
    setOpen(false);
  }

  // Lead tag with dynamic stages + GANHO/PERDIDO
  if (leadId && etapa) {
    const currentEtapa = etapas.find(e => e.nome === etapa);
    const bgColor = resultado === 'ganho'
      ? '#22c55e'
      : resultado === 'perdido'
      ? '#ef4444'
      : (currentEtapa?.cor || '#6b7280');

    const label = resultado === 'ganho'
      ? '🏆 GANHO'
      : resultado === 'perdido'
      ? '❌ PERDIDO'
      : etapa;

    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold cursor-pointer transition-colors hover:opacity-80"
              style={{
                backgroundColor: `${bgColor}20`,
                color: bgColor,
                borderColor: `${bgColor}50`,
              }}
              disabled={loading}
            >
              {label}
              <ChevronDown size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1" align="end">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">Etapa do Funil</p>
            {etapas.map(e => (
              <button
                key={e.id}
                onClick={() => updateLeadEtapa(e.nome)}
                className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors ${
                  etapa === e.nome && !resultado ? 'font-bold' : ''
                }`}
                disabled={loading}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: e.cor }}
                />
                {e.nome}
              </button>
            ))}

            <div className="border-t my-1" />
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">Resultado</p>
            <button
              onClick={handleGanho}
              className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-emerald-600 flex items-center gap-1.5 ${
                resultado === 'ganho' ? 'font-bold bg-emerald-50 dark:bg-emerald-950/20' : ''
              }`}
              disabled={loading}
            >
              <Trophy size={12} /> GANHO
            </button>
            <button
              onClick={handlePerdidoClick}
              className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-red-600 flex items-center gap-1.5 ${
                resultado === 'perdido' ? 'font-bold bg-red-50 dark:bg-red-950/20' : ''
              }`}
              disabled={loading}
            >
              <XCircle size={12} /> PERDIDO
            </button>
          </PopoverContent>
        </Popover>

        {/* Loss reason dialog */}
        <Dialog open={lossDialogOpen} onOpenChange={setLossDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Motivo da Perda</DialogTitle>
              <DialogDescription>
                Selecione o motivo pelo qual este lead foi perdido.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {MOTIVOS_PERDA.map(motivo => (
                <button
                  key={motivo}
                  onClick={() => setMotivoPerda(motivo)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg border transition-colors ${
                    motivoPerda === motivo
                      ? 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-medium'
                      : 'border-border hover:bg-muted/50 text-foreground'
                  }`}
                >
                  {motivo}
                </button>
              ))}
              {motivoPerda === 'Outro' && (
                <Textarea
                  placeholder="Descreva o motivo..."
                  value={motivoOutro}
                  onChange={e => setMotivoOutro(e.target.value)}
                  className="mt-2 min-h-[80px]"
                  autoFocus
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLossDialogOpen(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={handleConfirmPerda}
                disabled={savingLoss || !motivoPerda || (motivoPerda === 'Outro' && !motivoOutro.trim())}
              >
                {savingLoss ? 'Salvando...' : 'Confirmar Perda'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Paciente tag
  if (pacienteId && pacienteStatus) {
    const current = PACIENTE_STATUS.find(s => s.value === pacienteStatus);
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold cursor-pointer transition-colors hover:opacity-80 ${current?.color || 'bg-muted text-muted-foreground border-border'}`}
            disabled={loading}
          >
            Paciente: {pacienteStatus}
            <ChevronDown size={12} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="end">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Status do Paciente</p>
          {PACIENTE_STATUS.map(s => (
            <button
              key={s.value}
              onClick={() => updatePacienteStatus(s.value)}
              className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors ${pacienteStatus === s.value ? 'font-bold' : ''}`}
              disabled={loading}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${s.color.split(' ')[0].replace('/15', '')}`} />
              {s.value}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  // No lead or patient linked
  return (
    <Badge variant="outline" className="text-[11px] text-muted-foreground">
      Sem vínculo
    </Badge>
  );
}
