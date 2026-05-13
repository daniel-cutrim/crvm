import { useState, useEffect } from 'react';
import { X, Mail, Phone, Building2, FileText, Calendar, Trash2, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Pessoa, Lead, LeadJornada } from '@/types';

const PLATAFORMA_COLORS: Record<string, string> = {
  Meta: 'bg-blue-100 text-blue-700',
  Google: 'bg-amber-100 text-amber-700',
  WhatsApp: 'bg-emerald-100 text-emerald-700',
  Orgânico: 'bg-violet-100 text-violet-700',
};

interface JornadaItem extends LeadJornada {
  lead_nome: string;
}

interface PessoaDetailProps {
  pessoa: Pessoa | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (pessoa: Pessoa) => void;
  leads: Lead[];
}

function getInitials(nome: string) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}

export default function PessoaDetail({ pessoa, onClose, onDelete, onEdit, leads }: PessoaDetailProps) {
  const [activeTab, setActiveTab] = useState<'negocios' | 'jornada'>('negocios');
  const [jornada, setJornada] = useState<JornadaItem[]>([]);
  const [loadingJornada, setLoadingJornada] = useState(false);

  const pessoaLeads = leads.filter(l => l.pessoa_id === pessoa?.id);

  useEffect(() => {
    if (!pessoa || activeTab !== 'jornada' || pessoaLeads.length === 0) {
      setJornada([]);
      return;
    }

    const leadIds = pessoaLeads.map(l => l.id);

    (async () => {
      setLoadingJornada(true);
      const { data } = await supabase
        .from('lead_jornada')
        .select('*')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: true });

      const items: JornadaItem[] = ((data as unknown as LeadJornada[] | null) || []).map(j => ({
        ...j,
        lead_nome: pessoaLeads.find(l => l.id === j.lead_id)?.nome || 'Negócio',
      }));

      setJornada(items);
      setLoadingJornada(false);
    })();
  }, [pessoa, activeTab, pessoaLeads.length]);

  const handleDelete = async () => {
    if (!pessoa) return;
    const confirmed = await confirmDialog({
      title: 'Excluir pessoa',
      description: `Deseja excluir "${pessoa.nome}" permanentemente? Esta ação não pode ser desfeita.`,
      variant: 'destructive',
    });
    if (confirmed) onDelete(pessoa.id);
  };

  if (!pessoa) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-lg h-full overflow-y-auto shadow-2xl border-l border-border flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-semibold text-base">
                  {getInitials(pessoa.nome)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">{pessoa.nome}</h2>
                {pessoa.organizacao && (
                  <p className="text-sm text-muted-foreground truncate">{pessoa.organizacao}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0 ml-2">
              <X size={18} />
            </button>
          </div>

          {/* Info */}
          <div className="space-y-2 text-sm">
            {pessoa.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail size={14} className="flex-shrink-0" />
                <span className="truncate">{pessoa.email}</span>
              </div>
            )}
            {pessoa.telefone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone size={14} className="flex-shrink-0" />
                <span>{pessoa.telefone}</span>
              </div>
            )}
            {pessoa.organizacao && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 size={14} className="flex-shrink-0" />
                <span className="truncate">{pessoa.organizacao}</span>
              </div>
            )}
            {pessoa.observacoes && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <FileText size={14} className="flex-shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">{pessoa.observacoes}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={14} className="flex-shrink-0" />
              <span className="text-xs">
                Criado em {format(parseISO(pessoa.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onEdit(pessoa)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 size={13} />
              Excluir
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setActiveTab('negocios')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'negocios'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Negócios
            {activeTab === 'negocios' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('jornada')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'jornada'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Jornada & Atribuições
            {activeTab === 'jornada' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Tab: Negócios */}
          {activeTab === 'negocios' && (
            <div className="space-y-2">
              {pessoaLeads.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground opacity-60">Nenhum negócio vinculado</p>
                </div>
              ) : (
                pessoaLeads.map(lead => {
                  const isGanho = lead.resultado === 'ganho';
                  const isPerdido = lead.resultado === 'perdido';
                  const isAberto = !lead.resultado;

                  return (
                    <div
                      key={lead.id}
                      className="p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{lead.nome}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{lead.etapa_funil}</p>
                          {lead.valor != null && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {lead.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          )}
                        </div>
                        <span
                          className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isGanho
                              ? 'bg-emerald-100 text-emerald-700'
                              : isPerdido
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isGanho ? 'Ganho' : isPerdido ? 'Perdido' : 'Aberto'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab: Jornada */}
          {activeTab === 'jornada' && (
            <div>
              {loadingJornada ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : jornada.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground opacity-60">
                    Nenhum ponto de contato registrado
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jornada.map(j => (
                    <div key={j.id} className="relative pl-5 border-l-2 border-blue-200">
                      <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                              PLATAFORMA_COLORS[j.plataforma] || 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {j.plataforma}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(parseISO(j.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium mb-0.5">
                        Negócio: {j.lead_nome}
                      </p>
                      {j.campaign_name && (
                        <p className="text-[11px] text-muted-foreground">
                          <strong>Campanha:</strong> {j.campaign_name}
                        </p>
                      )}
                      {j.ad_name && (
                        <p className="text-[11px] text-muted-foreground">
                          <strong>Anúncio:</strong> {j.ad_name}
                        </p>
                      )}
                      {(j.utm_source || j.utm_medium || j.utm_campaign) && (
                        <p className="text-[11px] text-muted-foreground">
                          <strong>UTM:</strong>{' '}
                          {[j.utm_source, j.utm_medium, j.utm_campaign].filter(Boolean).join(' / ')}
                        </p>
                      )}
                      {j.descricao && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{j.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
