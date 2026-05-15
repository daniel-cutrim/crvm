import { useState, useMemo } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, TrendingUp, TrendingDown, Target, Users, DollarSign, BarChart3, Trash2, AlertTriangle, CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, eachMonthOfInterval, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLeads } from '@/hooks/useData';
import { useMarketingInvestimentos, useMarketingMetas } from '@/hooks/useMarketing';
import InvestimentoFormDialog from './InvestimentoFormDialog';
import MetaFormDialog from './MetaFormDialog';
import { toast } from 'sonner';

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#10b981',
  '#ec4899',
  '#06b6d4',
  '#6b7280',
];

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MarketingPage() {
  const { leads } = useLeads();
  const { investimentos, loading, addInvestimento, deleteInvestimento } = useMarketingInvestimentos();
  const { metas, addMeta } = useMarketingMetas();

  const [investimentoDialog, setInvestimentoDialog] = useState(false);
  const [metaDialog, setMetaDialog] = useState(false);
  const [periodoMeses, setPeriodoMeses] = useState('6');
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const now = new Date();

  // Compute date range based on filter mode
  const { rangeStart, rangeEnd, monthsList } = useMemo(() => {
    let start: Date;
    let end: Date;

    if (periodoMeses === 'custom' && customRange) {
      start = startOfMonth(customRange.from);
      end = endOfMonth(customRange.to);
    } else {
      const meses = parseInt(periodoMeses) || 6;
      start = startOfMonth(subMonths(now, meses - 1));
      end = endOfMonth(now);
    }

    const months = eachMonthOfInterval({ start, end });
    return { rangeStart: start, rangeEnd: end, monthsList: months };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoMeses, customRange]);

  // Compute metrics per month
  const monthlyData = useMemo(() => {
    return monthsList.map(monthDate => {
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const label = format(monthDate, 'MMM/yy', { locale: ptBR });
      const monthKey = format(monthDate, 'yyyy-MM');

      const monthLeads = leads.filter(l => {
        const d = parseISO(l.created_at);
        return d >= start && d <= end;
      });

      const converted = monthLeads.filter(l => l.convertido_paciente_id);

      const ganhosMes = leads.filter(l => {
        if (l.resultado !== 'ganho' || !l.resultado_at) return false;
        const d = parseISO(l.resultado_at);
        return d >= start && d <= end;
      });
      const valorColetadoMes = ganhosMes.reduce((s, l) => s + Number(l.valor_coletado || 0), 0);
      const valorContratoMes = ganhosMes.reduce((s, l) => s + Number(l.valor_contrato || 0), 0);

      const monthInvestimentos = investimentos.filter(inv => inv.mes.startsWith(monthKey));
      const investimentoTotal = monthInvestimentos.reduce((sum, inv) => sum + Number(inv.valor_investido), 0);

      const roi = investimentoTotal > 0 ? ((valorColetadoMes - investimentoTotal) / investimentoTotal) * 100 : 0;
      const cac = converted.length > 0 ? investimentoTotal / converted.length : 0;
      const meta = metas.find(m => m.mes.startsWith(monthKey));

      return {
        label,
        monthKey,
        leads: monthLeads.length,
        conversoes: converted.length,
        taxaConversao: monthLeads.length > 0 ? (converted.length / monthLeads.length) * 100 : 0,
        valorColetado: valorColetadoMes,
        valorContrato: valorContratoMes,
        investimento: investimentoTotal,
        roi,
        cac,
        meta,
      };
    });
  }, [leads, investimentos, metas, monthsList]);

  // Current month data
  const currentMonth = monthlyData[monthlyData.length - 1];

  // Per-channel breakdown for current period
  const channelData = useMemo(() => {
    const channelMap: Record<string, { investimento: number; leads: number; conversoes: number; valorColetado: number }> = {};

    const start = rangeStart;
    const end = rangeEnd;

    // Aggregate investments by channel
    investimentos.forEach(inv => {
      const d = parseISO(inv.mes);
      if (d >= start && d <= end) {
        if (!channelMap[inv.canal]) channelMap[inv.canal] = { investimento: 0, leads: 0, conversoes: 0, valorColetado: 0 };
        channelMap[inv.canal].investimento += Number(inv.valor_investido);
      }
    });

    // Map leads by origin
    leads.forEach(l => {
      const d = parseISO(l.created_at);
      if (d >= start && d <= end && l.origem) {
        const canal = l.origem;
        if (!channelMap[canal]) channelMap[canal] = { investimento: 0, leads: 0, conversoes: 0, valorColetado: 0 };
        channelMap[canal].leads += 1;
        if (l.convertido_paciente_id) channelMap[canal].conversoes += 1;
        if (l.resultado === 'ganho') channelMap[canal].valorColetado += Number(l.valor_coletado || 0);
      }
    });

    return Object.entries(channelMap).map(([canal, data]) => ({
      canal,
      ...data,
      cac: data.conversoes > 0 ? data.investimento / data.conversoes : 0,
      roi: data.investimento > 0 ? ((data.valorColetado - data.investimento) / data.investimento) * 100 : 0,
      taxaConversao: data.leads > 0 ? (data.conversoes / data.leads) * 100 : 0,
    }));
  }, [leads, investimentos, rangeStart, rangeEnd]);

  // Totals
  const totals = useMemo(() => {
    const totalInvestimento = monthlyData.reduce((s, m) => s + m.investimento, 0);
    const totalColetado = monthlyData.reduce((s, m) => s + m.valorColetado, 0);
    const totalContrato = monthlyData.reduce((s, m) => s + m.valorContrato, 0);
    const totalLeads = monthlyData.reduce((s, m) => s + m.leads, 0);
    const totalConversoes = monthlyData.reduce((s, m) => s + m.conversoes, 0);
    const roi = totalInvestimento > 0 ? ((totalColetado - totalInvestimento) / totalInvestimento) * 100 : 0;
    const cac = totalConversoes > 0 ? totalInvestimento / totalConversoes : 0;
    return { totalInvestimento, totalColetado, totalContrato, totalLeads, totalConversoes, roi, cac };
  }, [monthlyData]);

  const handleDeleteInvestimento = async (id: string) => {
    if (!await confirmDialog({ description: 'Excluir este investimento?' })) return;
    const { error } = await deleteInvestimento(id);
    if (error) toast.error('Erro ao excluir');
    else toast.success('Investimento excluído');
  };

  // Pie chart data for channel distribution
  const pieData = channelData.map(c => ({ name: c.canal, value: c.investimento })).filter(c => c.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Marketing & ROI</h1>
          <p className="text-sm text-muted-foreground">Análise de performance e retorno dos canais de aquisição</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodoMeses} onValueChange={(v) => { setPeriodoMeses(v); if (v !== 'custom') setCustomRange(null); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
              <SelectItem value="custom">Período</SelectItem>
            </SelectContent>
          </Select>
          {periodoMeses === 'custom' && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-auto justify-start text-left font-normal text-xs", !customRange && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                  {customRange
                    ? `${format(customRange.from, 'dd/MM/yy')} — ${format(customRange.to, 'dd/MM/yy')}`
                    : 'Selecionar período'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customRange ? { from: customRange.from, to: customRange.to } : undefined}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setCustomRange({ from: range.from, to: range.to });
                      setCalendarOpen(false);
                    } else if (range?.from) {
                      setCustomRange({ from: range.from, to: range.from });
                    }
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}
          <Button variant="outline" onClick={() => setMetaDialog(true)}>
            <Target className="h-4 w-4 mr-1" /> Meta
          </Button>
          <Button onClick={() => setInvestimentoDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Investimento
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Investido
            </div>
            <p className="text-xl font-bold">{formatCurrency(totals.totalInvestimento)}</p>
            <p className="text-[10px] text-muted-foreground">
              {periodoMeses === 'custom' && customRange
                ? `${format(customRange.from, 'dd/MM/yy')} — ${format(customRange.to, 'dd/MM/yy')}`
                : `Últimos ${periodoMeses} meses`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Valor Coletado
            </div>
            <p className="text-xl font-bold">{formatCurrency(totals.totalColetado)}</p>
            <p className="text-[10px] text-muted-foreground">Negócios ganhos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              {totals.roi >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
              ROI
            </div>
            <p className={`text-xl font-bold ${totals.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totals.roi.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">Retorno sobre investimento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" /> CAC
            </div>
            <p className="text-xl font-bold">{formatCurrency(totals.cac)}</p>
            <p className="text-[10px] text-muted-foreground">Custo por aquisição</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" /> Leads
            </div>
            <p className="text-xl font-bold">{totals.totalLeads}</p>
            <p className="text-[10px] text-muted-foreground">{totals.totalConversoes} convertidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BarChart3 className="h-3.5 w-3.5" /> Conversão
            </div>
            <p className="text-xl font-bold">
              {totals.totalLeads > 0 ? ((totals.totalConversoes / totals.totalLeads) * 100).toFixed(1) : '0'}%
            </p>
            <p className="text-[10px] text-muted-foreground">Taxa geral</p>
          </CardContent>
        </Card>
      </div>

      {/* Goal progress for current month */}
      {currentMonth?.meta && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" /> Metas do Mês — {currentMonth.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Leads</span>
                  <span className="font-medium">{currentMonth.leads} / {currentMonth.meta.meta_leads}</span>
                </div>
                <Progress value={Math.min((currentMonth.leads / currentMonth.meta.meta_leads) * 100, 100)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Conversões</span>
                  <span className="font-medium">{currentMonth.conversoes} / {currentMonth.meta.meta_conversoes}</span>
                </div>
                <Progress value={Math.min((currentMonth.conversoes / currentMonth.meta.meta_conversoes) * 100, 100)} className="h-2" />
              </div>
              {currentMonth.meta.meta_roi && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">ROI</span>
                    <span className="font-medium">{currentMonth.roi.toFixed(1)}% / {currentMonth.meta.meta_roi}%</span>
                  </div>
                  <Progress value={Math.min((currentMonth.roi / Number(currentMonth.meta.meta_roi)) * 100, 100)} className="h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row 1: Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Investment vs Collected Value Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Investimento vs Valor Coletado (Tendência)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatCurrency(v), name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="investimento" name="Investimento" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="valorColetado" name="Valor Coletado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="valorContrato" name="Valor Contrato" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ROI line chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ROI Mensal (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(1)}%`, 'ROI']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="roi"
                    name="ROI"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Leads & Channel breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leads & Conversions trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leads vs Conversões (Tendência)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="conversoes" name="Conversões" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Investimento por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p>Nenhum investimento registrado</p>
                </div>
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Channel performance table */}
      {channelData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Canal</th>
                    <th className="pb-2 font-medium text-right">Investido</th>
                    <th className="pb-2 font-medium text-right">Leads</th>
                    <th className="pb-2 font-medium text-right">Conversões</th>
                    <th className="pb-2 font-medium text-right">Taxa Conv.</th>
                    <th className="pb-2 font-medium text-right">CAC</th>
                    <th className="pb-2 font-medium text-right">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {channelData.map(ch => (
                    <tr key={ch.canal} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">{ch.canal}</td>
                      <td className="py-2.5 text-right">{formatCurrency(ch.investimento)}</td>
                      <td className="py-2.5 text-right">{ch.leads}</td>
                      <td className="py-2.5 text-right">{ch.conversoes}</td>
                      <td className="py-2.5 text-right">{ch.taxaConversao.toFixed(1)}%</td>
                      <td className="py-2.5 text-right">{formatCurrency(ch.cac)}</td>
                      <td className="py-2.5 text-right">
                        <Badge variant={ch.roi >= 0 ? 'default' : 'destructive'} className="text-xs">
                          {ch.roi.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Histórico de Investimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {investimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum investimento registrado. Clique em "+ Investimento" para começar.
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {investimentos.map(inv => (
                <div key={inv.id} className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{inv.canal}</Badge>
                    <span className="text-sm font-medium">{formatCurrency(Number(inv.valor_investido))}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(inv.mes), 'MMM/yyyy', { locale: ptBR })}
                    </span>
                    {inv.observacao && <span className="text-xs text-muted-foreground">— {inv.observacao}</span>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => handleDeleteInvestimento(inv.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InvestimentoFormDialog
        open={investimentoDialog}
        onOpenChange={setInvestimentoDialog}
        onSave={addInvestimento}
      />
      <MetaFormDialog
        open={metaDialog}
        onOpenChange={setMetaDialog}
        onSave={addMeta}
      />
    </div>
  );
}
