import { useMemo, useState, useCallback, DragEvent } from 'react';
import { AlertTriangle, Clock, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Lead, FunilEtapa } from '@/types';

const formatBRL = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function getInitials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
];
function avatarColor(nome: string) {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const TAG_COLORS = ['#f97316', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#0ea5e9', '#1e293b'];
function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffffffff;
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length];
}

function diasNaEtapa(lead: Lead) {
  const desde = lead.etapa_entrou_at || lead.created_at;
  return Math.floor((Date.now() - new Date(desde).getTime()) / (1000 * 60 * 60 * 24));
}

interface CardProps {
  lead: Lead;
  dragging: boolean;
  colIdx: number;
  etapas: FunilEtapa[];
  onClick: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
  onMove: (etapa: FunilEtapa) => void;
}

function LeadCard({ lead, dragging, colIdx, etapas, onClick, onDragStart, onDragEnd, onMove }: CardProps) {
  const atrasado = lead.proxima_acao_data && isPast(parseISO(lead.proxima_acao_data));
  const semProprietario = !lead.proprietario_id;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'bg-card rounded-lg border border-border p-3 shadow-sm',
        'hover:shadow-md transition-all cursor-grab active:cursor-grabbing group select-none',
        dragging && 'opacity-40 scale-95',
      )}
    >
      {/* Nome + grip */}
      <div className="flex items-start gap-1.5 mb-1">
        <GripVertical size={12} className="text-muted-foreground/30 mt-0.5 flex-shrink-0 group-hover:text-muted-foreground transition-colors" />
        <p className="text-sm font-medium text-foreground leading-tight flex-1 min-w-0 truncate">
          {lead.nome}
        </p>
      </div>

      {/* Data criação + dias na etapa */}
      <div className="flex items-center gap-2 pl-5 mb-1">
        <p className="text-[11px] text-muted-foreground flex-1">
          {format(parseISO(lead.created_at), "d MMM", { locale: ptBR })}
        </p>
        <span className="text-[10px] font-medium text-primary bg-primary/10 px-1 py-0.5 rounded">
          {diasNaEtapa(lead)}d
        </span>
      </div>

      {/* Valor */}
      <p className="text-[11px] font-medium text-foreground pl-5 mb-2">
        {formatBRL(lead.valor)}
      </p>

      {/* Tags */}
      {(lead.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1 pl-5 mb-1.5">
          {(lead.tags || []).slice(0, 3).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium text-white"
              style={{ backgroundColor: tagColor(tag) }}
            >
              {tag}
            </span>
          ))}
          {(lead.tags || []).length > 3 && (
            <span className="text-[9px] text-muted-foreground">+{(lead.tags || []).length - 3}</span>
          )}
        </div>
      )}

      {/* Etiqueta + avatar */}
      <div className="flex items-end justify-between pl-5 gap-2">
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {lead.interesse && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary truncate max-w-[120px]">
              {lead.interesse}
            </span>
          )}
          {atrasado && (
            <span title="Atividade atrasada" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600">
              <Clock size={9} /> Atrasado
            </span>
          )}
        </div>

        {lead.proprietario ? (
          <div
            title={lead.proprietario.nome}
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white',
              avatarColor(lead.proprietario.nome),
            )}
          >
            {getInitials(lead.proprietario.nome)}
          </div>
        ) : semProprietario ? (
          <span title="Sem proprietário" className="flex-shrink-0">
            <AlertTriangle size={14} className="text-amber-500" />
          </span>
        ) : null}
      </div>

      {/* Move arrows */}
      <div className="flex justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {colIdx > 0 && (
          <button
            onClick={e => { e.stopPropagation(); onMove(etapas[colIdx - 1]); }}
            className="p-1 rounded hover:bg-muted transition-colors"
            title={`Mover para ${etapas[colIdx - 1].nome}`}
          >
            <ChevronLeft size={14} className="text-muted-foreground" />
          </button>
        )}
        <div className="flex-1" />
        {colIdx < etapas.length - 1 && (
          <button
            onClick={e => { e.stopPropagation(); onMove(etapas[colIdx + 1]); }}
            className="p-1 rounded hover:bg-muted transition-colors"
            title={`Mover para ${etapas[colIdx + 1].nome}`}
          >
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  leads: Lead[];
  etapas: FunilEtapa[];
  onLeadClick: (lead: Lead) => void;
  onMoveEtapa: (leadId: string, novaEtapa: FunilEtapa) => void;
}

export default function FunilBoard({ leads, etapas, onLeadClick, onMoveEtapa }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const columns = useMemo(() =>
    etapas.map(etapa => ({
      etapa,
      leads: leads.filter(l => l.etapa_id === etapa.id || (!l.etapa_id && l.etapa_funil === etapa.nome)),
      total: leads.filter(l => l.etapa_id === etapa.id || (!l.etapa_id && l.etapa_funil === etapa.nome))
        .reduce((s, l) => s + (l.valor || 0), 0),
    })),
    [leads, etapas]
  );

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, lead: Lead) => {
    setDraggingId(lead.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
  }, []);

  const handleDragEnd = useCallback((e: DragEvent<HTMLDivElement>) => {
    setDraggingId(null);
    setDropTarget(null);
    e.currentTarget.style.opacity = '1';
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, etapaId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(etapaId);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>, etapaId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setDropTarget(prev => prev === etapaId ? null : prev);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, etapa: FunilEtapa) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.etapa_id !== etapa.id) {
        onMoveEtapa(leadId, etapa);
      }
    }
    setDropTarget(null);
    setDraggingId(null);
  }, [leads, onMoveEtapa]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
      {columns.map(({ etapa, leads: colLeads, total }, colIdx) => (
        <div
          key={etapa.id}
          onDragOver={e => handleDragOver(e, etapa.id)}
          onDragLeave={e => handleDragLeave(e, etapa.id)}
          onDrop={e => handleDrop(e, etapa)}
          className={cn(
            'flex-shrink-0 w-[260px] rounded-xl border border-border bg-muted/20 flex flex-col transition-all duration-150',
            dropTarget === etapa.id && draggingId && 'ring-2 ring-primary/40 ring-offset-1 scale-[1.01] bg-primary/5',
          )}
        >
          {/* Column header */}
          <div className="px-3 pt-3 pb-2 border-b border-border/60">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: etapa.cor || '#6b7280' }}
                />
                <h3 className="text-xs font-semibold text-foreground">{etapa.nome}</h3>
              </div>
              <span className="text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {colLeads.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pl-4">{formatBRL(total)}</p>
          </div>

          {/* Cards */}
          <div
            className={cn(
              'p-2 space-y-2 flex-1 min-h-[160px] max-h-[calc(100vh-280px)] overflow-y-auto transition-colors duration-150',
              dropTarget === etapa.id && draggingId && 'bg-primary/5',
            )}
          >
            {colLeads.length === 0 && (
              <p className={cn(
                'text-xs text-center py-8 transition-opacity',
                dropTarget === etapa.id && draggingId
                  ? 'text-primary opacity-80 font-medium'
                  : 'text-muted-foreground opacity-50',
              )}>
                {dropTarget === etapa.id && draggingId ? 'Solte aqui' : 'Nenhum negócio'}
              </p>
            )}
            {colLeads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                dragging={draggingId === lead.id}
                colIdx={colIdx}
                etapas={etapas}
                onClick={() => onLeadClick(lead)}
                onDragStart={e => handleDragStart(e, lead)}
                onDragEnd={handleDragEnd}
                onMove={etapa => onMoveEtapa(lead.id, etapa)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
