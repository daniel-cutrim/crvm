import { useState, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon, Users, TrendingUp, DollarSign, Clock, AlertCircle,
  UserPlus, FileText, ClipboardList, Settings, ArrowRight,
  CheckCircle2, XCircle, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useConsultas, useLeads, usePlanosTratamento, useReceitas, useDespesas, useTarefas, usePacientes } from '@/hooks/useData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
  const { receitas } = useReceitas();
  const { despesas } = useDespesas();
  const { tarefas } = useTarefas();
  const { pacientes } = usePacientes();

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const currentMonth = useMemo(() => format(today, 'yyyy-MM'), [today]);

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(today),
    to: today,
  });

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
    const faturamentoPeriodo = receitas
      .filter(r => isInPeriodo(r.data))
      .reduce((s, r) => s + Number(r.valor), 0);
    const recebidoPeriodo = receitas
      .filter(r => isInPeriodo(r.data) && r.status === 'Pago')
      .reduce((s, r) => s + Number(r.valor), 0);
    const despesasPeriodo = despesas
      .filter(d => isInPeriodo(d.data))
      .reduce((s, d) => s + Number(d.valor), 0);
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

    // ── Ticket Médio ──
    const receitasPagas = receitas.filter(r => isInPeriodo(r.data) && r.status === 'Pago');
    const ticketMedio = receitasPagas.length > 0
      ? receitasPagas.reduce((s, r) => s + Number(r.valor), 0) / receitasPagas.length
      : 0;

    // ── Taxa de Inadimplência ──
    const receitasPeriodo = receitas.filter(r => isInPeriodo(r.data));
    const totalReceitasPeriodo = receitasPeriodo.reduce((s, r) => s + Number(r.valor), 0);
    const emAbertoPeriodo = receitasPeriodo
      .filter(r => r.status === 'Em aberto' || r.status === 'Parcial')
      .reduce((s, r) => s + Number(r.valor), 0);
    const taxaInadimplencia = totalReceitasPeriodo > 0 ? Math.round((emAbertoPeriodo / totalReceitasPeriodo) * 100) : 0;

    return {
      consultasHoje: consultasHoje.length, compareceram, faltaram,
      leadsNovos, orcAprovados, faturamentoPeriodo, recebidoPeriodo, despesasPeriodo,
      lucro: faturamentoPeriodo - despesasPeriodo, tarefasAtrasadas, pacientesAtivos,
      taxaOcupacao, ticketMedio, taxaInadimplencia, emAbertoPeriodo,
    };
  }, [consultas, leads, planos, receitas, despesas, tarefas, pacientes, todayStr, isInPeriodo, today, periodoRange]);

  // ── Revenue chart (6 months) ──
  const revenueChart = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(today, 5 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const rec = receitas
        .filter(r => { const rd = parseISO(r.data); return isWithinInterval(rd, { start, end }); })
        .reduce((s, r) => s + Number(r.valor), 0);
      const desp = despesas
        .filter(dp => { const dd = parseISO(dp.data); return isWithinInterval(dd, { start, end }); })
        .reduce((s, dp) => s + Number(dp.valor), 0);
      return { mes: format(d, 'MMM', { locale: ptBR }), Receitas: rec, Despesas: desp };
    });
  }, [receitas, despesas, today]);

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
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Agendamentos Hoje', value: kpis.consultasHoje, sub: `${kpis.compareceram} compareceram · ${kpis.faltaram} faltaram`, icon: CalendarIcon, accent: 'bg-sky-50 text-sky-600' },
          { title: `Faturamento (${periodoLabel})`, value: formatCurrency(kpis.faturamentoPeriodo), sub: `Recebido: ${formatCurrency(kpis.recebidoPeriodo)}`, icon: DollarSign, accent: 'bg-teal-50 text-teal-600' },
          { title: `Lucro (${periodoLabel})`, value: formatCurrency(kpis.lucro), sub: `Despesas: ${formatCurrency(kpis.despesasPeriodo)}`, icon: TrendingUp, accent: kpis.lucro >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600' },
          { title: 'Clientes Ativos', value: kpis.pacientesAtivos, sub: `${kpis.leadsNovos} leads novos no período`, icon: Users, accent: 'bg-violet-50 text-violet-600' },
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

      {/* ── KPIs Avançados ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="relative">
              <svg className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="hsl(var(--border))" strokeWidth="6" fill="none" />
                <circle cx="32" cy="32" r="26" stroke="hsl(var(--primary))" strokeWidth="6" fill="none"
                  strokeDasharray={`${(kpis.taxaOcupacao / 100) * 163.4} 163.4`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{kpis.taxaOcupacao}%</span>
            </div>
            <div>
              <p className="text-sm font-medium">Taxa de Ocupação</p>
              <p className="text-xs text-muted-foreground">Agenda — {periodoLabel}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-sky-50">
              <DollarSign className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Ticket Médio</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(kpis.ticketMedio)}</p>
              <p className="text-xs text-muted-foreground">Receitas pagas — {periodoLabel}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="relative">
              <svg className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="hsl(var(--border))" strokeWidth="6" fill="none" />
                <circle cx="32" cy="32" r="26" stroke={kpis.taxaInadimplencia > 20 ? '#ef4444' : '#f59e0b'} strokeWidth="6" fill="none"
                  strokeDasharray={`${(kpis.taxaInadimplencia / 100) * 163.4} 163.4`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{kpis.taxaInadimplencia}%</span>
            </div>
            <div>
              <p className="text-sm font-medium">Inadimplência</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(kpis.emAbertoPeriodo)} em aberto</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Novo Paciente', icon: UserPlus, color: 'text-sky-600', page: 'pacientes' },
          { label: 'Nova Consulta', icon: CalendarIcon, color: 'text-teal-600', page: 'agenda' },
          { label: 'Novo Lead', icon: Activity, color: 'text-violet-600', page: 'crm' },
          { label: 'Nova Tarefa', icon: ClipboardList, color: 'text-amber-600', page: 'tarefas' },
        ].map((a, i) => (
          <Button key={i} variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 hover:bg-muted/60"
            onClick={() => onNavigate?.(a.page)}>
            <a.icon className={`h-5 w-5 ${a.color}`} />
            <span className="text-xs font-medium">{a.label}</span>
          </Button>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas vs Despesas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueChart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="Receitas" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads Funnel Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funil de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsByStage.length === 0 ? (
              <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">Sem leads</div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={leadsByStage} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                      {leadsByStage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
                  {leadsByStage.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {s.name.replace('Orçamento ', 'Orç. ')} ({s.value})
                    </div>
                  ))}
                </div>
              </div>
            )}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50">
              <FileText className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Propostas Aprovadas</p>
              <p className="text-2xl font-bold tabular-nums">{kpis.orcAprovados}</p>
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
