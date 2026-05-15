import { useState, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon, Users, TrendingUp, Clock, AlertCircle,
  ClipboardList, CheckCircle2, XCircle, Trophy, Target, ChevronDown, DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useConsultas, useLeads, usePlanosTratamento, useTarefas, usePacientes, useFunis } from '@/hooks/useData';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, startOfQuarter, startOfYear, endOfYear, endOfQuarter, isWithinInterval, isToday, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

const COLORS = ['#0d9488', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

type Periodo = 'mes' | 'trimestre' | 'ano' | 'custom';
const PERIODO_LABELS: Record<Periodo, string> = { mes: 'Mês', trimestre: 'Trimestre', ano: 'Ano', custom: 'Personalizado' };

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { consultas } = useConsultas();
  const { leads } = useLeads();
  const { planos } = usePlanosTratamento();
  const { tarefas } = useTarefas();
  const atividades = tarefas;
  const { pacientes } = usePacientes();
  const { funis } = useFunis();

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const currentMonth = useMemo(() => format(today, 'yyyy-MM'), [today]);

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(today),
    to: today,
  });
  const [selectedFunilIds, setSelectedFunilIds] = useState<string[]>([]);

  // Date range based on selected period
  const periodoRange = useMemo(() => {
    if (periodo === 'custom' && dateRange?.from) {
      return { start: dateRange.from, end: dateRange.to || dateRange.from };
    }
    const end = today;
    let start: Date;
    if (periodo === 'mes') {
      start = startOfMonth(today);
    } else if (periodo === 'trimestre') {
      start = startOfQuarter(today);
    } else {
      start = startOfYear(today);
    }
    return { start, end };
  }, [periodo, today, dateRange]);

  const handlePeriodoChange = (p: Periodo) => {
    setPeriodo(p);
    if (p === 'mes') setDateRange({ from: startOfMonth(today), to: today });
    else if (p === 'trimestre') setDateRange({ from: startOfQuarter(today), to: today });
    else if (p === 'ano') setDateRange({ from: startOfYear(today), to: today });
  };

  const isInPeriodo = useCallback((dateStr: string) => {
    const d = parseISO(dateStr);
    return isWithinInterval(d, periodoRange);
  }, [periodoRange]);

  const periodoLabel = periodo === 'custom' && dateRange?.from
    ? `${format(dateRange.from, 'dd/MM')}${dateRange.to ? ` - ${format(dateRange.to, 'dd/MM')}` : ''}`
    : PERIODO_LABELS[periodo];

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const consultasHoje = consultas.filter(c => c.data_hora.split('T')[0] === todayStr);
    const compareceram = consultasHoje.filter(c => c.status === 'Compareceu').length;
    const faltaram = consultasHoje.filter(c => c.status === 'Faltou').length;
    const leadsNovos = leads.filter(l => l.created_at && isInPeriodo(l.created_at)).length;
    const orcAprovados = planos.filter(p => p.status === 'Aprovado').length;
    const tarefasAtrasadas = tarefas.filter(
      t => t.status !== 'Concluída' && new Date(t.data_vencimento) < today && !isToday(parseISO(t.data_vencimento))
    ).length;
    const pacientesAtivos = pacientes.filter(p => p.status === 'Ativo' || p.status === 'Em tratamento').length;

    // ── Taxa de Ocupação da Agenda ──
    const consultasPeriodo = consultas.filter(c => isInPeriodo(c.data_hora) && c.status !== 'Cancelada');
    const diffDays = Math.max(1, Math.ceil((periodoRange.end.getTime() - periodoRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const diasUteisPeriodo = Math.round(diffDays * (22 / 30));
    const horasDisponiveis = diasUteisPeriodo * 8;
    const horasOcupadas = consultasPeriodo.reduce((s, c) => s + (c.duracao_minutos || 30) / 60, 0);
    const taxaOcupacao = horasDisponiveis > 0 ? Math.min(Math.round((horasOcupadas / horasDisponiveis) * 100), 100) : 0;

    return {
      consultasHoje: consultasHoje.length, compareceram, faltaram,
      leadsNovos, orcAprovados, tarefasAtrasadas, pacientesAtivos, taxaOcupacao,
    };
  }, [consultas, leads, planos, tarefas, pacientes, todayStr, isInPeriodo, today, periodoRange]);

  // ── Leads by stage (dynamic from actual data) ──
  const leadsByStage = useMemo(() => {
    const stageMap = new Map<string, number>();
    leads.forEach(l => {
      const stage = l.etapa_funil || 'Sem etapa';
      stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
    });
    return Array.from(stageMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  // ── Leads by origin (for new chart) ──
  const leadsByOrigin = useMemo(() => {
    const originMap = new Map<string, number>();
    leads.filter(l => isInPeriodo(l.created_at)).forEach(l => {
      const origin = l.origem || 'Sem origem';
      originMap.set(origin, (originMap.get(origin) || 0) + 1);
    });
    return Array.from(originMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [leads, isInPeriodo]);

  const valoresChart = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(today, 5 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const ganhosMes = leads.filter(l => {
        if (l.resultado !== 'ganho' || !l.resultado_at) return false;
        const rd = parseISO(l.resultado_at);
        return isWithinInterval(rd, { start, end });
      });
      return {
        mes: format(d, 'MMM', { locale: ptBR }),
        'Valor Coletado': ganhosMes.reduce((s, l) => s + Number(l.valor_coletado || 0), 0),
        'Valor Contrato': ganhosMes.reduce((s, l) => s + Number(l.valor_contrato || 0), 0),
      };
    });
  }, [leads, today]);

  // ── CRM: leads filtrados por funil ──
  const leadsFiltrados = useMemo(() => {
    if (selectedFunilIds.length === 0) return leads;
    return leads.filter(l => l.funil_id && selectedFunilIds.includes(l.funil_id));
  }, [leads, selectedFunilIds]);

  const crmKpis = useMemo(() => {
    const abertos = leadsFiltrados.filter(l => !l.resultado);
    const ganhos = leadsFiltrados.filter(l => l.resultado === 'ganho');
    const perdidos = leadsFiltrados.filter(l => l.resultado === 'perdido');
    const negociosAbertos = abertos.length;
    const valorFunil = abertos.reduce((s, l) => s + Number(l.valor || 0), 0);
    const totalEncerrados = ganhos.length + perdidos.length;
    const taxaConversaoCrm = totalEncerrados > 0
      ? ((ganhos.length / totalEncerrados) * 100).toFixed(1)
      : '0.0';
    const receitaGerada = ganhos.reduce((s, l) => s + Number(l.valor || 0), 0);
    const ticketMedioCrm = ganhos.length > 0 ? receitaGerada / ganhos.length : 0;
    const ganhosComData = ganhos.filter(l => l.resultado_at);
    const tempoParaFechar = ganhosComData.length > 0
      ? Math.round(
          ganhosComData.reduce((s, l) => {
            const dias = Math.floor(
              (new Date(l.resultado_at!).getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            return s + dias;
          }, 0) / ganhosComData.length
        )
      : 0;
    return { negociosAbertos, valorFunil, taxaConversaoCrm, receitaGerada, ticketMedioCrm, tempoParaFechar, ganhos, perdidos, abertos };
  }, [leadsFiltrados]);

  const periodKpis = useMemo(() => {
    const ganhosNoPeriodo = leadsFiltrados.filter(l =>
      l.resultado === 'ganho' && l.resultado_at && isInPeriodo(l.resultado_at)
    );
    return {
      ganhosNoPeriodo,
      totalColetado: ganhosNoPeriodo.reduce((s, l) => s + Number(l.valor_coletado || 0), 0),
      totalContrato: ganhosNoPeriodo.reduce((s, l) => s + Number(l.valor_contrato || 0), 0),
    };
  }, [leadsFiltrados, isInPeriodo]);

  // ── CRM: funil chart ──
  const funilChart = useMemo(() => {
    const etapaMap = new Map<string, number>();
    leadsFiltrados.filter(l => !l.resultado).forEach(l => {
      const etapa = l.etapa_funil || 'Sem etapa';
      etapaMap.set(etapa, (etapaMap.get(etapa) || 0) + 1);
    });
    return Array.from(etapaMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leadsFiltrados]);

  // ── CRM: atividades por tipo ──
  const atividadesChart = useMemo(() => {
    const tipos = ['follow_up', 'ligacao', 'reuniao', 'email', 'outros'] as const;
    const TIPO_LABEL: Record<string, string> = {
      follow_up: 'Follow-up', ligacao: 'Ligações', reuniao: 'Reuniões', email: 'Emails', outros: 'Outros',
    };
    return tipos.map(tipo => {
      const doTipo = atividades.filter(t => (t.tipo || 'outros') === tipo);
      return {
        name: TIPO_LABEL[tipo],
        Concluídas: doTipo.filter(t => t.status === 'Concluída').length,
        Pendentes: doTipo.filter(t => t.status === 'Pendente' && new Date(t.data_vencimento) >= new Date()).length,
        Atrasadas: doTipo.filter(t => t.status !== 'Concluída' && new Date(t.data_vencimento) < new Date()).length,
      };
    }).filter(d => d.Concluídas + d.Pendentes + d.Atrasadas > 0);
  }, [atividades]);

  // ── CRM: motivos de perda ──
  const motivosChart = useMemo(() => {
    const map = new Map<string, number>();
    leadsFiltrados.filter(l => l.resultado === 'perdido' && l.motivo_perda).forEach(l => {
      const motivo = l.motivo_perda!;
      map.set(motivo, (map.get(motivo) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leadsFiltrados]);

  // ── Conversion rate ──
  const taxaConversao = useMemo(() => {
    const total = leads.length;
    const convertidos = leads.filter(l => l.convertido_paciente_id).length;
    return total > 0 ? Math.round((convertidos / total) * 100) : 0;
  }, [leads]);

  // ── Today's appointments ──
  const consultasHojeList = useMemo(() => {
    return consultas
      .filter(c => c.data_hora.split('T')[0] === todayStr && c.status !== 'Cancelada')
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  }, [consultas, todayStr]);

  // ── Upcoming appointments ──
  const proximasConsultas = useMemo(() => {
    const now = new Date();
    return consultas
      .filter(c => new Date(c.data_hora) > now && c.status !== 'Cancelada')
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
      .slice(0, 5);
  }, [consultas]);

  // ── Pending tasks ──
  const tarefasPendentes = useMemo(() => {
    return tarefas
      .filter(t => t.status !== 'Concluída')
      .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
      .slice(0, 5);
  }, [tarefas]);

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const statusIcon = (s: string) => {
    if (s === 'Confirmada') return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    if (s === 'Compareceu') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (s === 'Faltou') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Visão geral — {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['mes', 'trimestre', 'ano'] as Periodo[]).map(p => (
              <Button
                key={p}
                variant={periodo === p ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-7 px-3"
                onClick={() => handlePeriodoChange(p)}
              >
                {PERIODO_LABELS[p]}
              </Button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={periodo === 'custom' ? 'default' : 'outline'}
                size="sm"
                className={cn("text-xs h-7 px-3 gap-1.5", !dateRange?.from && "text-muted-foreground")}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {periodo === 'custom' && dateRange?.from
                  ? `${format(dateRange.from, 'dd/MM/yy')}${dateRange.to ? ` – ${format(dateRange.to, 'dd/MM/yy')}` : ''}`
                  : 'Período'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  if (range?.from) setPeriodo('custom');
                }}
                numberOfMonths={2}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Filtro de Funil */}
          {funis.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-7 px-3 gap-1.5">
                  <ChevronDown className="h-3.5 w-3.5" />
                  {selectedFunilIds.length === 0
                    ? 'Todos os funis'
                    : selectedFunilIds.length === 1
                      ? funis.find(f => f.id === selectedFunilIds[0])?.nome ?? 'Funil'
                      : `${selectedFunilIds.length} funis`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Funil</p>
                {funis.map(f => (
                  <label key={f.id} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedFunilIds.includes(f.id)}
                      onCheckedChange={(checked) => {
                        setSelectedFunilIds(prev =>
                          checked ? [...prev, f.id] : prev.filter(id => id !== f.id)
                        );
                      }}
                    />
                    <span className="text-xs">{f.nome}</span>
                  </label>
                ))}
                {selectedFunilIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-7 mt-1"
                    onClick={() => setSelectedFunilIds([])}
                  >
                    Limpar filtro
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Agendamentos Hoje', value: kpis.consultasHoje, sub: `${kpis.compareceram} compareceram · ${kpis.faltaram} faltaram`, icon: CalendarIcon, accent: 'bg-sky-50 text-sky-600' },
          { title: `Valor Coletado (${periodoLabel})`, value: formatCurrency(periodKpis.totalColetado), sub: `${periodKpis.ganhosNoPeriodo.length} negócio(s) ganho(s)`, icon: TrendingUp, accent: 'bg-teal-50 text-teal-600' },
          { title: `Valor Contrato (${periodoLabel})`, value: formatCurrency(periodKpis.totalContrato), sub: 'Total de contratos fechados', icon: Trophy, accent: 'bg-emerald-50 text-emerald-600' },
        ].map((s, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{s.title}</p>
                  <p className="text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.sub}</p>
                </div>
                <div className={`p-2 rounded-lg ${s.accent}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Seção CRM: Funil de Vendas ── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Funil de Vendas</h2>

        {/* 6 KPI cards do CRM */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Negócios em Aberto', value: crmKpis.negociosAbertos, sub: 'Leads sem resultado', icon: Users, accent: 'bg-sky-50 text-sky-600' },
            { title: 'Valor do Funil', value: formatCurrency(crmKpis.valorFunil), sub: 'Total em aberto', icon: DollarSign, accent: 'bg-amber-50 text-amber-600' },
            { title: 'Taxa de Conversão', value: `${crmKpis.taxaConversaoCrm}%`, sub: `${crmKpis.ganhos.length} ganhos · ${crmKpis.perdidos.length} perdidos`, icon: TrendingUp, accent: 'bg-emerald-50 text-emerald-600' },
            { title: 'Receita Gerada', value: formatCurrency(crmKpis.receitaGerada), sub: 'Leads ganhos', icon: Trophy, accent: 'bg-teal-50 text-teal-600' },
            { title: 'Ticket Médio', value: formatCurrency(crmKpis.ticketMedioCrm), sub: 'Por negócio ganho', icon: Target, accent: 'bg-violet-50 text-violet-600' },
            { title: 'Tempo para Fechar', value: `${crmKpis.tempoParaFechar} dias`, sub: 'Média até ganho', icon: Clock, accent: 'bg-orange-50 text-orange-600' },
          ].map((s, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{s.title}</p>
                    <p className="text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.sub}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${s.accent}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gráficos row 1: Funil por Etapa + Status de Oportunidades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Funil por Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              {funilChart.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Sem dados suficientes</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funilChart} layout="vertical" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" name="Leads" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status de Oportunidades</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const statusData = [
                  { name: 'Em aberto', value: crmKpis.abertos.length, fill: '#3b82f6' },
                  { name: 'Ganhos', value: crmKpis.ganhos.length, fill: '#10b981' },
                  { name: 'Perdidos', value: crmKpis.perdidos.length, fill: '#ef4444' },
                ].filter(d => d.value > 0);
                const total = statusData.reduce((s, d) => s + d.value, 0);
                if (statusData.length === 0) {
                  return <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Sem dados suficientes</div>;
                }
                return (
                  <div className="relative flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={statusData} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                          {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-2xl font-bold tabular-nums">{total}</p>
                        <p className="text-[10px] text-muted-foreground">total</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                      {statusData.map(d => (
                        <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                          {d.name} ({d.value})
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Gráficos row 2: Atividades por Tipo + Motivos de Perda */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Atividades por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              {atividadesChart.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Sem dados suficientes</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={atividadesChart} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Concluídas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Pendentes" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Atrasadas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Motivos de Perda</CardTitle>
            </CardHeader>
            <CardContent>
              {motivosChart.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Sem dados suficientes</div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={motivosChart}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        strokeWidth={0}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {motivosChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                    {motivosChart.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {d.name} ({d.value})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Valores Chart ── */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Valor Coletado vs Valor Contrato (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={valoresChart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Valor Coletado" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Valor Contrato" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Origin Chart Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Origin */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leads por Origem (período)</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsByOrigin.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Sem dados de origem</div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={leadsByOrigin} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                      {leadsByOrigin.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                  {leadsByOrigin.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {s.name} ({s.value})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultado GANHO/PERDIDO */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resultados de Leads (período)</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const filteredLeads = leads.filter(l => isInPeriodo(l.created_at));
              const ganhos = filteredLeads.filter(l => l.resultado === 'ganho').length;
              const perdidos = filteredLeads.filter(l => l.resultado === 'perdido').length;
              const emAberto = filteredLeads.filter(l => !l.resultado).length;
              const resultData = [
                { name: 'Ganhos', value: ganhos },
                { name: 'Perdidos', value: perdidos },
                { name: 'Em aberto', value: emAberto },
              ].filter(d => d.value > 0);
              const resColors = ['#22c55e', '#ef4444', '#a3a3a3'];
              if (resultData.length === 0) {
                return <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Sem dados</div>;
              }
              return (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={resultData} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                        {resultData.map((_, i) => <Cell key={i} fill={resColors[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                    {resultData.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: resColors[i] }} />
                        {s.name} ({s.value})
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* ── Conversion & Alerts Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="relative">
              <svg className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="hsl(var(--border))" strokeWidth="6" fill="none" />
                <circle cx="32" cy="32" r="26" stroke="hsl(var(--primary))" strokeWidth="6" fill="none"
                  strokeDasharray={`${(taxaConversao / 100) * 163.4} 163.4`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{taxaConversao}%</span>
            </div>
            <div>
              <p className="text-sm font-medium">Taxa de Conversão</p>
              <p className="text-xs text-muted-foreground">{leads.filter(l => l.convertido_paciente_id).length} de {leads.length} leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${kpis.tarefasAtrasadas > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <AlertCircle className={`h-6 w-6 ${kpis.tarefasAtrasadas > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
            <div>
              <p className="text-sm font-medium">Tarefas Atrasadas</p>
              <p className={`text-2xl font-bold tabular-nums ${kpis.tarefasAtrasadas > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                {kpis.tarefasAtrasadas}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Today's Schedule + Upcoming ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Agenda de Hoje ({consultasHojeList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {consultasHojeList.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <CalendarIcon className="mx-auto mb-2 opacity-30 h-8 w-8" />
                <p className="text-sm">Nenhum agendamento hoje</p>
              </div>
            ) : (
              <ul className="divide-y">
                {consultasHojeList.map(c => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    {statusIcon(c.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.paciente?.nome || c.lead?.nome || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">{c.tipo_procedimento}{c.sala ? ` · Sala ${c.sala}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium tabular-nums">{formatTime(c.data_hora)}</p>
                      <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pending tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Tarefas Pendentes ({tarefasPendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tarefasPendentes.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 opacity-30 h-8 w-8" />
                <p className="text-sm">Tudo em dia!</p>
              </div>
            ) : (
              <ul className="divide-y">
                {tarefasPendentes.map(t => {
                  const overdue = new Date(t.data_vencimento) < today && !isToday(parseISO(t.data_vencimento));
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${overdue ? 'bg-destructive' : t.status === 'Em andamento' ? 'bg-blue-500' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(t.data_vencimento), 'dd/MM')}
                          {t.responsavel && ` · ${t.responsavel.nome}`}
                        </p>
                      </div>
                      <Badge variant={overdue ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                        {overdue ? 'Atrasada' : t.status}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
