import { useState, useEffect } from 'react';
import { Filter, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Fallback stages
const ETAPAS_FALLBACK = [
  { nome: 'Novo Lead', cor: '#3b82f6' },
  { nome: 'Em Contato', cor: '#eab308' },
  { nome: 'Avaliação marcada', cor: '#8b5cf6' },
  { nome: 'Orçamento aprovado', cor: '#22c55e' },
  { nome: 'Orçamento perdido', cor: '#ef4444' },
];

export interface ChatFilters {
  etapas: string[];
  resultado: string[];
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
}

interface Props {
  filters: ChatFilters;
  onChange: (filters: ChatFilters) => void;
}

export const EMPTY_FILTERS: ChatFilters = { etapas: [], resultado: [], dataInicio: undefined, dataFim: undefined };

export default function ChatFilterBar({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { usuario } = useAuth();
  const [dynamicEtapas, setDynamicEtapas] = useState<{ nome: string; cor: string }[]>(ETAPAS_FALLBACK);

  const activeCount = filters.etapas.length + filters.resultado.length + (filters.dataInicio ? 1 : 0) + (filters.dataFim ? 1 : 0);

  // Load dynamic stages from all funnels
  useEffect(() => {
    async function loadEtapas() {
      const { data: funis } = await supabase
        .from('funis')
        .select('id')
        .eq('empresa_id', usuario?.empresa_id);

      if (!funis || funis.length === 0) {
        setDynamicEtapas(ETAPAS_FALLBACK);
        return;
      }

      const funilIds = funis.map(f => f.id);
      const { data: etapas } = await supabase
        .from('funil_etapas')
        .select('nome, cor')
        .in('funil_id', funilIds)
        .order('ordem', { ascending: true });

      if (etapas && etapas.length > 0) {
        // Deduplicate by nome
        const unique = new Map<string, { nome: string; cor: string }>();
        etapas.forEach(e => {
          if (!unique.has(e.nome)) {
            unique.set(e.nome, { nome: e.nome, cor: e.cor || '#6b7280' });
          }
        });
        setDynamicEtapas(Array.from(unique.values()));
      } else {
        setDynamicEtapas(ETAPAS_FALLBACK);
      }
    }

    if (usuario?.empresa_id) loadEtapas();
  }, [usuario?.empresa_id]);

  function toggleEtapa(etapa: string) {
    const next = filters.etapas.includes(etapa)
      ? filters.etapas.filter(e => e !== etapa)
      : [...filters.etapas, etapa];
    onChange({ ...filters, etapas: next });
  }

  function toggleResultado(result: string) {
    const next = filters.resultado.includes(result)
      ? filters.resultado.filter(r => r !== result)
      : [...filters.resultado, result];
    onChange({ ...filters, resultado: next });
  }

  function clearAll() {
    onChange(EMPTY_FILTERS);
  }

  return (
    <div className="px-3 pb-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-between">
            <span className="flex items-center gap-1.5">
              <Filter size={14} />
              Filtros
            </span>
            {activeCount > 0 && (
              <Badge variant="default" className="text-[10px] h-4 min-w-4 px-1">{activeCount}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3">
            {/* Etapa do funil */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Etapa do Funil</p>
              <div className="flex flex-wrap gap-1.5">
                {dynamicEtapas.map(e => (
                  <button
                    key={e.nome}
                    onClick={() => toggleEtapa(e.nome)}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                      filters.etapas.includes(e.nome)
                        ? 'ring-1 ring-offset-1 ring-primary/30'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                    )}
                    style={filters.etapas.includes(e.nome) ? {
                      backgroundColor: `${e.cor}20`,
                      color: e.cor,
                      borderColor: `${e.cor}50`,
                    } : undefined}
                  >
                    {e.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Resultado */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Resultado</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => toggleResultado('ganho')}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                    filters.resultado.includes('ganho')
                      ? 'bg-emerald-500/15 text-emerald-700 border-emerald-300 ring-1 ring-offset-1 ring-primary/30'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  🏆 Ganho
                </button>
                <button
                  onClick={() => toggleResultado('perdido')}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                    filters.resultado.includes('perdido')
                      ? 'bg-red-500/15 text-red-700 border-red-300 ring-1 ring-offset-1 ring-primary/30'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  ❌ Perdido
                </button>
              </div>
            </div>

            {/* Data de entrada */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Data de Entrada do Lead</p>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('flex-1 h-8 text-[11px] justify-start', !filters.dataInicio && 'text-muted-foreground')}>
                      <CalendarIcon size={12} className="mr-1" />
                      {filters.dataInicio ? format(filters.dataInicio, 'dd/MM/yy') : 'De'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dataInicio}
                      onSelect={(d) => onChange({ ...filters, dataInicio: d })}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('flex-1 h-8 text-[11px] justify-start', !filters.dataFim && 'text-muted-foreground')}>
                      <CalendarIcon size={12} className="mr-1" />
                      {filters.dataFim ? format(filters.dataFim, 'dd/MM/yy') : 'Até'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dataFim}
                      onSelect={(d) => onChange({ ...filters, dataFim: d })}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground" onClick={clearAll}>
                <X size={12} className="mr-1" /> Limpar filtros
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
