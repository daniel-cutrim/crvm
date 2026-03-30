import { useState } from 'react';
import { Filter, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';

const ETAPAS_FUNIL = [
  { value: 'Novo Lead', color: 'bg-blue-500/15 text-blue-700 border-blue-300' },
  { value: 'Em Contato', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-300' },
  { value: 'Avaliação marcada', color: 'bg-purple-500/15 text-purple-700 border-purple-300' },
  { value: 'Orçamento aprovado', color: 'bg-green-500/15 text-green-700 border-green-300' },
  { value: 'Orçamento perdido', color: 'bg-red-500/15 text-red-700 border-red-300' },
];

export interface ChatFilters {
  etapas: string[];
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
}

interface Props {
  filters: ChatFilters;
  onChange: (filters: ChatFilters) => void;
}

export const EMPTY_FILTERS: ChatFilters = { etapas: [], dataInicio: undefined, dataFim: undefined };

export default function ChatFilterBar({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = filters.etapas.length + (filters.dataInicio ? 1 : 0) + (filters.dataFim ? 1 : 0);

  function toggleEtapa(etapa: string) {
    const next = filters.etapas.includes(etapa)
      ? filters.etapas.filter(e => e !== etapa)
      : [...filters.etapas, etapa];
    onChange({ ...filters, etapas: next });
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
                {ETAPAS_FUNIL.map(e => (
                  <button
                    key={e.value}
                    onClick={() => toggleEtapa(e.value)}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                      filters.etapas.includes(e.value)
                        ? e.color + ' ring-1 ring-offset-1 ring-primary/30'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    {e.value}
                  </button>
                ))}
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
