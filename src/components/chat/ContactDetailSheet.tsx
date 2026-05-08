import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, Globe, Tag, Calendar, ExternalLink, User, Target } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadInfo {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  interesse: string | null;
  etapa_funil: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  created_at: string;
}

interface PacienteInfo {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  status: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string | null;
  pacienteId: string | null;
  contactName: string;
  contactPhone: string;
}

export default function ContactDetailSheet({ open, onClose, leadId, pacienteId, contactName, contactPhone }: Props) {
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [paciente, setPaciente] = useState<PacienteInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setLead(null);
    setPaciente(null);

    const promises: Promise<void>[] = [];

    if (leadId) {
      promises.push(
        supabase.from('leads')
          .select('id, nome, telefone, email, origem, interesse, etapa_funil, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at')
          .eq('id', leadId)
          .single()
          .then(({ data }) => { if (data) setLead(data as LeadInfo); })
      );
    }

    if (pacienteId) {
      promises.push(
        supabase.from('pacientes')
          .select('id, nome, telefone, email, status, created_at')
          .eq('id', pacienteId)
          .single()
          .then(({ data }) => { if (data) setPaciente(data as PacienteInfo); })
      );
    }

    Promise.all(promises).finally(() => setLoading(false));
  }, [open, leadId, pacienteId]);

  const hasUtms = lead && (lead.utm_source || lead.utm_medium || lead.utm_campaign || lead.utm_term || lead.utm_content);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-[360px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User size={18} />
            Detalhes do Contato
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5 mt-4">
            {/* Info básica */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{lead?.nome || paciente?.nome || contactName}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={14} className="shrink-0" />
                  <span>{lead?.telefone || paciente?.telefone || contactPhone}</span>
                </div>
                {(lead?.email || paciente?.email) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail size={14} className="shrink-0" />
                    <span>{lead?.email || paciente?.email}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Lead info */}
            {lead && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do Lead</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Etapa</p>
                    <Badge variant="outline" className="text-xs">{lead.etapa_funil}</Badge>
                  </div>
                  {lead.origem && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">Origem</p>
                      <div className="flex items-center gap-1 text-sm">
                        <Globe size={12} />
                        {lead.origem}
                      </div>
                    </div>
                  )}
                  {lead.interesse && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-[11px] text-muted-foreground">Interesse</p>
                      <div className="flex items-center gap-1 text-sm">
                        <Target size={12} />
                        {lead.interesse}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Criado em</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar size={12} />
                      {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>

                {/* UTMs */}
                {hasUtms && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <ExternalLink size={12} />
                        Parâmetros UTM
                      </h4>
                      <div className="space-y-1.5">
                        {[
                          { label: 'Source', value: lead.utm_source },
                          { label: 'Medium', value: lead.utm_medium },
                          { label: 'Campaign', value: lead.utm_campaign },
                          { label: 'Term', value: lead.utm_term },
                          { label: 'Content', value: lead.utm_content },
                        ].filter(u => u.value).map(u => (
                          <div key={u.label} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground text-xs">{u.label}</span>
                            <Badge variant="secondary" className="text-[11px] font-mono max-w-[200px] truncate">
                              {u.value}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Paciente info */}
            {paciente && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do Paciente</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Status</p>
                    <Badge variant="outline" className="text-xs">{paciente.status}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Cadastro</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar size={12} />
                      {format(new Date(paciente.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sem vínculo */}
            {!lead && !paciente && (
              <div className="text-center py-6 text-muted-foreground">
                <User size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Contato sem vínculo com lead ou paciente</p>
                <p className="text-xs mt-1">Telefone: {contactPhone}</p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
