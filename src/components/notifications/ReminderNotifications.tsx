import { useState, useMemo } from 'react';
import { format, parseISO, differenceInHours, differenceInMinutes, isPast, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, MessageCircle, Clock, AlertTriangle, X, CheckSquare, CalendarClock, Sparkles, ListChecks } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Consulta, Tarefa } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface ReminderNotificationsProps {
  consultas: Consulta[];
  tarefas: Tarefa[];
}

interface Reminder {
  consulta: Consulta;
  type: '24h' | '1h';
  hoursUntil: number;
  minutesUntil: number;
}

interface TaskNotification {
  tarefa: Tarefa;
  type: 'overdue' | 'today' | 'upcoming';
}

function cleanPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/\D/g, '');
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = cleanPhone(phone);
  if (!clean) return '';
  const fullNumber = clean.startsWith('55') ? clean : `55${clean}`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

function buildReminderMessage(consulta: Consulta, type: '24h' | '1h', clinicaNome: string): string {
  const dataHora = parseISO(consulta.data_hora);
  const dataFormatada = format(dataHora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const procedimento = consulta.tipo_procedimento;
  const dentista = consulta.dentista?.nome || 'seu dentista';

  if (type === '24h') {
    return `Olá${consulta.paciente?.nome ? `, ${consulta.paciente.nome.split(' ')[0]}` : ''}! 😊\n\nLembramos que você tem uma consulta agendada para *amanhã*:\n\n📅 ${dataFormatada}\n🦷 ${procedimento}\n👨‍⚕️ Dr(a). ${dentista}\n\nPor favor, confirme sua presença respondendo esta mensagem.\n\n${clinicaNome}`;
  }
  return `Olá${consulta.paciente?.nome ? `, ${consulta.paciente.nome.split(' ')[0]}` : ''}! ⏰\n\nSua consulta é *daqui a 1 hora*:\n\n📅 ${dataFormatada}\n🦷 ${procedimento}\n👨‍⚕️ Dr(a). ${dentista}\n\nEstamos te esperando! 😄\n\n${clinicaNome}`;
}

export default function ReminderNotifications({ consultas, tarefas }: ReminderNotificationsProps) {
  const { usuario } = useAuth();
  const clinicaNome = usuario?.clinica?.nome || 'MedROI';
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'consultas' | 'tarefas'>('consultas');

  const reminders = useMemo<Reminder[]>(() => {
    const now = new Date();
    const result: Reminder[] = [];

    consultas.forEach(c => {
      if (c.status === 'Cancelada' || c.status === 'Faltou' || c.status === 'Compareceu') return;
      const dataHora = parseISO(c.data_hora);
      if (isPast(dataHora)) return;

      const hoursUntil = differenceInHours(dataHora, now);
      const minutesUntil = differenceInMinutes(dataHora, now);

      const phone = c.paciente?.whatsapp || c.paciente?.telefone || c.lead?.telefone;
      if (!phone) return;

      if (hoursUntil <= 26 && hoursUntil > 2) {
        result.push({ consulta: c, type: '24h', hoursUntil, minutesUntil });
      }
      if (hoursUntil <= 2 && minutesUntil > 0) {
        result.push({ consulta: c, type: '1h', hoursUntil, minutesUntil });
      }
    });

    return result
      .filter(r => !dismissed.has(`consulta-${r.consulta.id}-${r.type}`))
      .sort((a, b) => a.minutesUntil - b.minutesUntil);
  }, [consultas, dismissed]);

  const taskNotifications = useMemo<TaskNotification[]>(() => {
    const today = startOfDay(new Date());
    const result: TaskNotification[] = [];

    tarefas.forEach(t => {
      if (t.status === 'Concluída') return;
      const vencimento = parseISO(t.data_vencimento);

      if (isBefore(vencimento, today)) {
        result.push({ tarefa: t, type: 'overdue' });
      } else if (isToday(vencimento)) {
        result.push({ tarefa: t, type: 'today' });
      }
    });

    return result
      .filter(n => !dismissed.has(`tarefa-${n.tarefa.id}`))
      .sort((a, b) => {
        const order = { overdue: 0, today: 1, upcoming: 2 };
        return order[a.type] - order[b.type];
      });
  }, [tarefas, dismissed]);

  const handleDismiss = (key: string) => {
    setDismissed(prev => new Set(prev).add(key));
  };

  const totalCount = reminders.length + taskNotifications.length;

  // Auto-select tab with notifications
  const defaultTab = taskNotifications.length > 0 ? 'tarefas' : 'consultas';

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setActiveTab(defaultTab); }}>
      <PopoverTrigger asChild>
        <button className="relative p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200 group">
          <Bell size={19} className="group-hover:scale-110 transition-transform duration-200" />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full shadow-sm shadow-destructive/30">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-30" />
              <span className="relative">{totalCount}</span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0 rounded-2xl shadow-xl border-border/50 overflow-hidden" sideOffset={8}>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles size={15} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
              <p className="text-[11px] text-muted-foreground">
                {totalCount > 0 ? `${totalCount} pendente${totalCount > 1 ? 's' : ''}` : 'Tudo em dia!'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-2 bg-muted/30">
          <button
            onClick={() => setActiveTab('consultas')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-200 ${
              activeTab === 'consultas'
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            }`}
          >
            <CalendarClock size={13} />
            Consultas
            {reminders.length > 0 && (
              <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold ${
                activeTab === 'consultas' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {reminders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tarefas')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-200 ${
              activeTab === 'tarefas'
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            }`}
          >
            <ListChecks size={13} />
            Tarefas
            {taskNotifications.length > 0 && (
              <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold ${
                activeTab === 'tarefas' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
              }`}>
                {taskNotifications.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[420px]">
          {activeTab === 'consultas' && (
            <>
              {reminders.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
                    <CalendarClock size={24} className="text-primary/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Nenhum lembrete pendente</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px] mx-auto">
                    Lembretes aparecem automaticamente 24h e 1h antes das consultas
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {reminders.map(({ consulta, type, hoursUntil, minutesUntil }) => {
                    const phone = consulta.paciente?.whatsapp || consulta.paciente?.telefone || consulta.lead?.telefone;
                    const message = buildReminderMessage(consulta, type, clinicaNome);
                    const whatsappUrl = buildWhatsAppUrl(phone!, message);
                    const dataHora = parseISO(consulta.data_hora);
                    const isUrgent = type === '1h';

                    return (
                      <div
                        key={`${consulta.id}-${type}`}
                        className={`group relative rounded-xl p-3.5 transition-all duration-200 hover:shadow-sm ${
                          isUrgent
                            ? 'bg-amber-50/80 border border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30'
                            : 'bg-card border border-border/40 hover:border-primary/20'
                        }`}
                      >
                        <button
                          onClick={() => handleDismiss(`consulta-${consulta.id}-${type}`)}
                          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={13} />
                        </button>

                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isUrgent
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                              : 'bg-primary/8 text-primary'
                          }`}>
                            {isUrgent ? <AlertTriangle size={16} /> : <Clock size={16} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase ${
                                isUrgent
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                  : 'bg-primary/8 text-primary'
                              }`}>
                                {type === '1h' ? '⏰ Em breve' : '📅 Amanhã'}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60">
                                {hoursUntil > 0 ? `${hoursUntil}h${minutesUntil % 60 > 0 ? `${minutesUntil % 60}m` : ''}` : `${minutesUntil}min`}
                              </span>
                            </div>

                            <p className="text-sm font-semibold text-foreground truncate">
                              {consulta.paciente?.nome || consulta.lead?.nome || 'Paciente'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {format(dataHora, "dd/MM 'às' HH:mm", { locale: ptBR })} · {consulta.tipo_procedimento}
                            </p>

                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
                                bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all duration-200
                                dark:bg-emerald-500/15 dark:text-emerald-400"
                              onClick={() => handleDismiss(`consulta-${consulta.id}-${type}`)}
                            >
                              <MessageCircle size={12} />
                              Enviar lembrete
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'tarefas' && (
            <>
              {taskNotifications.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/5 flex items-center justify-center mx-auto mb-3">
                    <CheckSquare size={24} className="text-emerald-500/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa pendente</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px] mx-auto">
                    Tarefas vencidas e do dia aparecem aqui automaticamente
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {taskNotifications.map(({ tarefa, type }) => {
                    const isOverdue = type === 'overdue';
                    const vencimento = parseISO(tarefa.data_vencimento);

                    return (
                      <div
                        key={tarefa.id}
                        className={`group relative rounded-xl p-3.5 transition-all duration-200 hover:shadow-sm ${
                          isOverdue
                            ? 'bg-red-50/80 border border-red-200/50 dark:bg-red-950/20 dark:border-red-800/30'
                            : 'bg-card border border-border/40 hover:border-amber-300/40'
                        }`}
                      >
                        <button
                          onClick={() => handleDismiss(`tarefa-${tarefa.id}`)}
                          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={13} />
                        </button>

                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isOverdue
                              ? 'bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400'
                              : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                          }`}>
                            {isOverdue ? <AlertTriangle size={16} /> : <CheckSquare size={16} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase ${
                                isOverdue
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                              }`}>
                                {isOverdue ? '🔴 Vencida' : '🟡 Hoje'}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50">
                                {tarefa.status}
                              </Badge>
                            </div>

                            <p className="text-sm font-semibold text-foreground mt-1 line-clamp-2 leading-snug">
                              {tarefa.descricao}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                              <span className="text-[11px] text-muted-foreground">
                                📅 {format(vencimento, "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              {tarefa.responsavel && (
                                <span className="text-[11px] text-muted-foreground">
                                  👤 {tarefa.responsavel.nome}
                                </span>
                              )}
                              {tarefa.paciente && (
                                <span className="text-[11px] text-primary font-medium">
                                  🦷 {tarefa.paciente.nome}
                                </span>
                              )}
                              {tarefa.lead && (
                                <span className="text-[11px] text-primary font-medium">
                                  🎯 {tarefa.lead.nome}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
