import { useState } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { X, Edit2, Trash2, UserPlus, Phone, Mail, Clock, MessageSquare, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLeadHistorico, useLeadJornada } from '@/hooks/useData';
import type { Lead } from '@/types';
import { formatWhatsAppLink } from '@/utils/masks';
import { useAuth } from '@/contexts/AuthContext';

const TIPOS_CONTATO = ['Ligação', 'WhatsApp', 'E-mail', 'Visita', 'Outro'] as const;

const ETAPA_BADGE: Record<string, string> = {
  'Novo Lead': 'dental-badge-info',
  'Em Contato': 'dental-badge-warning',
  'Avaliação marcada': 'bg-violet-50 text-violet-700',
  'Orçamento aprovado': 'dental-badge-success',
  'Orçamento perdido': 'dental-badge-danger',
};

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onUpdateLead: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  usuario: { id: string; nome: string } | null;
}

export default function LeadDetailSheet({ lead, onClose, onEdit, onConvert, onDelete, onUpdateLead, usuario }: Props) {
  const { usuario: authUser } = useAuth();
  const clinicaNome = authUser?.empresa?.nome || 'MedROI';
  const { historico, addHistorico } = useLeadHistorico(lead?.id || null);
  const { jornada } = useLeadJornada(lead?.id || null);
  const [tipoContato, setTipoContato] = useState<string>('WhatsApp');
  const [descricao, setDescricao] = useState('');
  const [sending, setSending] = useState(false);

  const handleAddHistorico = async () => {
    if (!lead || !descricao.trim()) return;
    setSending(true);
    await addHistorico({
      lead_id: lead.id,
      tipo_contato: tipoContato,
      descricao: descricao.trim(),
      usuario_id: usuario?.id || null,
    });
    setDescricao('');
    setSending(false);
  };

  const handleDelete = async () => {
    if (!lead || !await confirmDialog({ description: 'Deseja excluir este lead permanentemente?' })) return;
    onDelete(lead.id);
  };

  const handleConvert = async () => {
    if (!lead || !await confirmDialog({ title: 'Converter lead', description: `Converter "${lead.nome}" em paciente?`, variant: 'default' })) return;
    onConvert(lead);
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md h-full overflow-y-auto shadow-2xl border-l border-border flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{lead.nome}</h2>
              <span className={`dental-badge mt-1 ${ETAPA_BADGE[lead.etapa_funil] || 'dental-badge-default'}`}>
                {lead.etapa_funil}
              </span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Contact Info */}
          <div className="space-y-1.5 text-sm">
            {lead.telefone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone size={14} /> {lead.telefone}
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail size={14} /> {lead.email}
              </div>
            )}
            {lead.interesse && (
              <p className="text-muted-foreground text-xs mt-2">
                <strong>Interesse:</strong> {lead.interesse}
              </p>
            )}
            {lead.origem && (
              <p className="text-muted-foreground text-xs">
                <strong>Origem:</strong> {lead.origem}
              </p>
            )}
            {/* UTM Parameters */}
            {(lead.utm_source || lead.utm_medium || lead.utm_campaign || lead.utm_term || lead.utm_content) && (
              <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">UTM Tracking</p>
                {lead.utm_source && (
                  <p className="text-xs text-muted-foreground"><strong>Source:</strong> {lead.utm_source}</p>
                )}
                {lead.utm_medium && (
                  <p className="text-xs text-muted-foreground"><strong>Medium:</strong> {lead.utm_medium}</p>
                )}
                {lead.utm_campaign && (
                  <p className="text-xs text-muted-foreground"><strong>Campaign:</strong> {lead.utm_campaign}</p>
                )}
                {lead.utm_term && (
                  <p className="text-xs text-muted-foreground"><strong>Term:</strong> {lead.utm_term}</p>
                )}
                {lead.utm_content && (
                  <p className="text-xs text-muted-foreground"><strong>Content:</strong> {lead.utm_content}</p>
                )}
              </div>
            )}
            {lead.proxima_acao_data && (
              <div className="flex items-center gap-2 text-primary text-xs font-medium mt-2">
                <Clock size={12} />
                Próxima ação: {format(parseISO(lead.proxima_acao_data), "dd/MM/yyyy", { locale: ptBR })}
                {lead.proxima_acao_tipo && ` — ${lead.proxima_acao_tipo}`}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {lead.telefone && (
              <a
                href={formatWhatsAppLink(lead.telefone, `Olá ${lead.nome}, tudo bem? Aqui é da ${clinicaNome}! 😊`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                  bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <MessageSquare size={12} /> WhatsApp
              </a>
            )}
            <button
              onClick={() => onEdit(lead)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <Edit2 size={12} /> Editar
            </button>
            {!lead.convertido_paciente_id && (
              <button
                onClick={handleConvert}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                  bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <UserPlus size={12} /> Converter
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {lead.convertido_paciente_id && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              ✓ Lead convertido em paciente
            </div>
          )}
        </div>

        {/* Jornada Multi-touch (Tracking) */}
        {jornada && jornada.length > 0 && (
          <div className="px-5 pt-4 pb-2 border-b border-border bg-slate-50/50">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-blue-500" />
              Jornada de Rastreamento (Tracking)
            </h3>
            <div className="space-y-3 pb-2">
              {jornada.map(j => (
                <div key={j.id} className="relative pl-4 border-l-2 border-blue-200">
                  <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-blue-500" />
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground uppercase tracking-wider">{j.plataforma}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(j.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {j.campaign_name && <p className="text-[10px] text-muted-foreground"><strong>Campanha:</strong> {j.campaign_name}</p>}
                  {j.ad_name && <p className="text-[10px] text-muted-foreground"><strong>Anúncio:</strong> {j.ad_name}</p>}
                  {j.utm_campaign && <p className="text-[10px] text-muted-foreground"><strong>UTM:</strong> {j.utm_source} / {j.utm_medium} / {j.utm_campaign}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de Contatos */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 pt-4 pb-2 flex-shrink-0">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare size={14} />
              Histórico de Contatos
            </h3>
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
            {historico.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8 opacity-60">
                Nenhum registro de contato
              </p>
            )}
            {historico.map(h => (
              <div key={h.id} className="relative pl-4 border-l-2 border-border">
                <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-primary" />
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="dental-badge dental-badge-default text-[10px]">{h.tipo_contato}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(h.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{h.descricao}</p>
                {h.usuario && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">por {h.usuario.nome}</p>
                )}
              </div>
            ))}
          </div>

          {/* Add Contato */}
          <div className="p-4 border-t border-border flex-shrink-0 bg-muted/20">
            <div className="flex gap-2 mb-2">
              {TIPOS_CONTATO.map(t => (
                <button
                  key={t}
                  onClick={() => setTipoContato(t)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    tipoContato === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                className="dental-input flex-1 text-xs"
                placeholder="Descreva o contato..."
                onKeyDown={e => e.key === 'Enter' && handleAddHistorico()}
              />
              <button
                onClick={handleAddHistorico}
                disabled={!descricao.trim() || sending}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90
                  disabled:opacity-50 transition-opacity active:scale-95"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
