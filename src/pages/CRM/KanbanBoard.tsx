import { useMemo, useState, useCallback, DragEvent } from 'react';
import { Phone, Mail, Calendar, ChevronRight, ChevronLeft, GripVertical, MessageSquare } from 'lucide-react';
import { formatWhatsAppLink } from '@/utils/masks';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const ETAPA_CONFIG: Record<string, { color: string; bg: string; border: string; dropHighlight: string }> = {
  'Novo Lead': { color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200', dropHighlight: 'ring-sky-400' },
  'Em Contato': { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dropHighlight: 'ring-amber-400' },
  'Avaliação marcada': { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', dropHighlight: 'ring-violet-400' },
  'Orçamento aprovado': { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dropHighlight: 'ring-emerald-400' },
  'Orçamento perdido': { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dropHighlight: 'ring-red-400' },
};

const ORIGEM_EMOJI: Record<string, string> = {
  'Instagram': '📸',
  'Google Ads': '🔍',
  'Indicação': '🤝',
  'Site': '🌐',
  'Facebook': '📘',
  'Outro': '📋',
};

interface Props {
  leads: Lead[];
  etapas: string[];
  onLeadClick: (lead: Lead) => void;
  onMoveEtapa: (leadId: string, novaEtapa: string) => void;
}

export default function KanbanBoard({ leads, etapas, onLeadClick, onMoveEtapa }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const { usuario } = useAuth();
  const clinicaNome = usuario?.clinica?.nome || 'MedROI';

  const columns = useMemo(() => {
    return etapas.map(etapa => ({
      etapa,
      leads: leads.filter(l => l.etapa_funil === etapa),
      config: ETAPA_CONFIG[etapa] || ETAPA_CONFIG['Novo Lead'],
    }));
  }, [leads, etapas]);

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, lead: Lead) => {
    setDraggingId(lead.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
    // Make the drag image slightly transparent
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback((e: DragEvent<HTMLDivElement>) => {
    setDraggingId(null);
    setDropTarget(null);
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, etapa: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(etapa);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>, etapa: string) => {
    // Only clear if we're leaving the column entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX < rect.left || clientX > rect.right ||
      clientY < rect.top || clientY > rect.bottom
    ) {
      setDropTarget(prev => prev === etapa ? null : prev);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, etapa: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      // Only move if dropping in a different column
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.etapa_funil !== etapa) {
        onMoveEtapa(leadId, etapa);
      }
    }
    setDropTarget(null);
    setDraggingId(null);
  }, [leads, onMoveEtapa]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
      {columns.map(({ etapa, leads: colLeads, config }, colIdx) => (
        <div
          key={etapa}
          onDragOver={e => handleDragOver(e, etapa)}
          onDragLeave={e => handleDragLeave(e, etapa)}
          onDrop={e => handleDrop(e, etapa)}
          className={cn(
            'flex-shrink-0 w-[240px] rounded-xl border flex flex-col transition-all duration-200',
            config.border,
            `${config.bg}/30`,
            dropTarget === etapa && draggingId && 'ring-2 ring-offset-1 scale-[1.01]',
            dropTarget === etapa && draggingId && config.dropHighlight,
          )}
        >
          {/* Column Header */}
          <div className={`p-3 border-b ${config.border}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                {etapa}
              </h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                {colLeads.length}
              </span>
            </div>
          </div>

          {/* Cards */}
          <div className={cn(
            'p-2 space-y-2 flex-1 min-h-[200px] max-h-[500px] overflow-y-auto transition-colors duration-200',
            dropTarget === etapa && draggingId && `${config.bg}/50`,
          )}>
            {colLeads.length === 0 && (
              <p className={cn(
                'text-xs text-center py-8 transition-opacity',
                dropTarget === etapa && draggingId
                  ? `${config.color} opacity-80 font-medium`
                  : 'text-muted-foreground opacity-60',
              )}>
                {dropTarget === etapa && draggingId ? 'Solte aqui' : 'Nenhum lead'}
              </p>
            )}
            {colLeads.map(lead => (
              <div
                key={lead.id}
                draggable
                onDragStart={e => handleDragStart(e, lead)}
                onDragEnd={handleDragEnd}
                onClick={() => onLeadClick(lead)}
                className={cn(
                  'w-full text-left bg-card rounded-lg border border-border p-3 shadow-sm',
                  'hover:shadow-md transition-all cursor-grab active:cursor-grabbing group',
                  draggingId === lead.id && 'opacity-50 scale-95',
                )}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <GripVertical size={12} className="text-muted-foreground/40 flex-shrink-0 group-hover:text-muted-foreground transition-colors" />
                    <p className="text-sm font-medium text-foreground leading-tight truncate">
                      {lead.nome}
                    </p>
                  </div>
                  {lead.origem && (
                    <span className="text-xs flex-shrink-0" title={lead.origem}>
                      {ORIGEM_EMOJI[lead.origem] || '📋'}
                    </span>
                  )}
                </div>

                {lead.interesse && (
                  <p className="text-[11px] text-muted-foreground truncate mb-2 pl-5">
                    {lead.interesse}
                  </p>
                )}

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pl-5">
                  {lead.telefone && (
                    <span className="inline-flex items-center gap-0.5">
                      <Phone size={10} />
                      {lead.telefone}
                    </span>
                  )}
                  {lead.telefone && (
                    <a
                      href={formatWhatsAppLink(lead.telefone, `Olá ${lead.nome}, tudo bem? Aqui é da ${clinicaNome}! 😊`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <MessageSquare size={10} /> WhatsApp
                    </a>
                  )}
                </div>

                {lead.proxima_acao_data && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-primary font-medium pl-5">
                    <Calendar size={10} />
                    {format(parseISO(lead.proxima_acao_data), "dd/MM", { locale: ptBR })}
                    {lead.proxima_acao_tipo && ` · ${lead.proxima_acao_tipo}`}
                  </div>
                )}

                {lead.convertido_paciente_id && (
                  <div className="mt-2 dental-badge-success text-[10px] ml-5">
                    ✓ Convertido
                  </div>
                )}

                {/* Move arrows */}
                <div className="flex justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity pl-5">
                  {colIdx > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); onMoveEtapa(lead.id, etapas[colIdx - 1]); }}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title={`Mover para ${etapas[colIdx - 1]}`}
                    >
                      <ChevronLeft size={14} className="text-muted-foreground" />
                    </button>
                  )}
                  <div className="flex-1" />
                  {colIdx < etapas.length - 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); onMoveEtapa(lead.id, etapas[colIdx + 1]); }}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title={`Mover para ${etapas[colIdx + 1]}`}
                    >
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
