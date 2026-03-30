import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';

const ETAPAS_FUNIL = [
  { value: 'Novo Lead', color: 'bg-blue-500/15 text-blue-700 border-blue-300' },
  { value: 'Em Contato', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-300' },
  { value: 'Avaliação marcada', color: 'bg-purple-500/15 text-purple-700 border-purple-300' },
  { value: 'Orçamento aprovado', color: 'bg-green-500/15 text-green-700 border-green-300' },
  { value: 'Orçamento perdido', color: 'bg-red-500/15 text-red-700 border-red-300' },
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
  const [pacienteStatus, setPacienteStatus] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (leadId) {
      supabase.from('leads').select('etapa_funil').eq('id', leadId).single()
        .then(({ data }) => { if (data) setEtapa(data.etapa_funil); });
    } else {
      setEtapa(null);
    }
    if (pacienteId) {
      supabase.from('pacientes').select('status').eq('id', pacienteId).single()
        .then(({ data }) => { if (data) setPacienteStatus(data.status); });
    } else {
      setPacienteStatus(null);
    }
  }, [leadId, pacienteId]);

  async function updateLeadEtapa(newEtapa: string) {
    if (!leadId) return;
    setLoading(true);
    const { error } = await supabase.from('leads').update({ etapa_funil: newEtapa }).eq('id', leadId);
    if (error) {
      toast.error('Erro ao atualizar etapa');
    } else {
      setEtapa(newEtapa);
      toast.success(`Etapa alterada para "${newEtapa}"`);
    }
    setLoading(false);
    setOpen(false);
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

  // Lead tag
  if (leadId && etapa) {
    const current = ETAPAS_FUNIL.find(e => e.value === etapa);
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold cursor-pointer transition-colors hover:opacity-80 ${current?.color || 'bg-muted text-muted-foreground border-border'}`}
            disabled={loading}
          >
            {etapa}
            <ChevronDown size={12} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="end">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Etapa do Funil</p>
          {ETAPAS_FUNIL.map(e => (
            <button
              key={e.value}
              onClick={() => updateLeadEtapa(e.value)}
              className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors ${etapa === e.value ? 'font-bold' : ''}`}
              disabled={loading}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${e.color.split(' ')[0].replace('/15', '')}`} />
              {e.value}
            </button>
          ))}
        </PopoverContent>
      </Popover>
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
