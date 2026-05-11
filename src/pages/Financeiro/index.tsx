import { useState, useMemo } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, Plus, ChevronLeft, ChevronRight,
  Download, ChevronDown, Filter, X, RefreshCw, Trash2, Pencil, Power,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useReceitas, useDespesas, usePacientes, useDespesasRecorrentes } from '@/hooks/useData';
import { toast } from 'sonner';
import ReceitaFormDialog from './ReceitaFormDialog';
import DespesaFormDialog from './DespesaFormDialog';
import type { Receita, Despesa } from '@/types';
import { exportToCSV, exportToPDF } from '@/utils/export';

const MESES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CATEGORIA_COLORS: Record<string, string> = {
  Aluguel: '#3b82f6',
  Materiais: '#f59e0b',
  Equipe: '#10b981',
  Marketing: '#8b5cf6',
  Manutenção: '#ef4444',
  Outros: '#6b7280',
};

type Tab = 'resumo' | 'receitas' | 'despesas' | 'recorrentes';

export default function FinanceiroPage() {
  const { receitas, loading: loadR, addReceita, updateReceita, deleteReceita } = useReceitas();
  const { despesas, loading: loadD, addDespesa, updateDespesa, deleteDespesa } = useDespesas();
  const { pacientes } = usePacientes();
  const { recorrentes, loading: loadRec, addRecorrente, updateRecorrente, deleteRecorrente } = useDespesasRecorrentes();

  const [tab, setTab] = useState<Tab>('resumo');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [receitaDialogOpen, setReceitaDialogOpen] = useState(false);
  const [despesaDialogOpen, setDespesaDialogOpen] = useState(false);
  const [editingReceita, setEditingReceita] = useState<Receita | null>(null);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);

  // Advanced filters
  const [receitaStatusFilter, setReceitaStatusFilter] = useState('');
  const [receitaFormaFilter, setReceitaFormaFilter] = useState('');
  const [despesaCategoriaFilter, setDespesaCategoriaFilter] = useState('');
  const [showReceitaFilters, setShowReceitaFilters] = useState(false);
  const [showDespesaFilters, setShowDespesaFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState<'receitas' | 'despesas' | null>(null);

  // Recorrentes state
  const [recorrenteFormOpen, setRecorrenteFormOpen] = useState(false);
  const [editingRecorrente, setEditingRecorrente] = useState<Record<string, unknown> | null>(null);
  const [recorrenteForm, setRecorrenteForm] = useState({ descricao: '', categoria: 'Outros', valor: '', dia_vencimento: '1', categoriaCustom: '' });
  const [savingRecorrente, setSavingRecorrente] = useState(false);
  const [generatingMonth, setGeneratingMonth] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  const monthReceitas = useMemo(() =>
    receitas.filter(r => {
      const d = parseISO(r.data);
      return d >= monthStart && d <= monthEnd;
    }), [receitas, monthStart, monthEnd]);

  const monthDespesas = useMemo(() => {
    const realDespesas = despesas.filter(d => {
      const dt = parseISO(d.data);
      return dt >= monthStart && dt <= monthEnd;
    });

    // Merge active recurring expenses that haven't been generated yet
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const virtualRecorrentes: Despesa[] = recorrentes
      .filter((r: Record<string, unknown>) => r.ativo)
      .filter((r: Record<string, unknown>) => {
        const dia = Math.min(r.dia_vencimento, new Date(year, month + 1, 0).getDate());
        const data = format(new Date(year, month, dia), 'yyyy-MM-dd');
        return !realDespesas.some(d => d.descricao === r.descricao && d.data === data && Number(d.valor) === Number(r.valor));
      })
      .map((r: Record<string, unknown>) => {
        const dia = Math.min(r.dia_vencimento, new Date(year, month + 1, 0).getDate());
        const data = format(new Date(year, month, dia), 'yyyy-MM-dd');
        return {
          id: `recorrente-${r.id}`,
          data,
          descricao: `${r.descricao} (recorrente)`,
          categoria: r.categoria,
          valor: r.valor,
          created_at: r.created_at,
        } as Despesa;
      });

    return [...realDespesas, ...virtualRecorrentes];
  }, [despesas, monthStart, monthEnd, recorrentes, currentMonth]);

  // Filtered lists
  const filteredReceitas = useMemo(() =>
    monthReceitas.filter(r => {
      const matchStatus = !receitaStatusFilter || r.status === receitaStatusFilter;
      const matchForma = !receitaFormaFilter || r.forma_pagamento === receitaFormaFilter;
      return matchStatus && matchForma;
    }), [monthReceitas, receitaStatusFilter, receitaFormaFilter]);

  const filteredDespesas = useMemo(() =>
    monthDespesas.filter(d => {
      return !despesaCategoriaFilter || d.categoria === despesaCategoriaFilter;
    }), [monthDespesas, despesaCategoriaFilter]);

  const totalReceitas = monthReceitas.reduce((s, r) => s + Number(r.valor), 0);
  const totalDespesas = monthDespesas.reduce((s, d) => s + Number(d.valor), 0);
  const lucro = totalReceitas - totalDespesas;
  const receitasPagas = monthReceitas.filter(r => r.status === 'Pago').reduce((s, r) => s + Number(r.valor), 0);

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(currentMonth, 5 - i);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const rec = receitas
        .filter(r => { const d = parseISO(r.data); return d >= mStart && d <= mEnd; })
        .reduce((s, r) => s + Number(r.valor), 0);
      const desp = despesas
        .filter(d => { const dt = parseISO(d.data); return dt >= mStart && dt <= mEnd; })
        .reduce((s, d) => s + Number(d.valor), 0);
      return { mes: MESES_LABEL[m.getMonth()], receitas: rec, despesas: desp };
    });
  }, [receitas, despesas, currentMonth]);

  const despesasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    monthDespesas.forEach(d => {
      map[d.categoria] = (map[d.categoria] || 0) + Number(d.valor);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthDespesas]);

  const receitasPorForma = useMemo(() => {
    const map: Record<string, number> = {};
    monthReceitas.forEach(r => {
      map[r.forma_pagamento] = (map[r.forma_pagamento] || 0) + Number(r.valor);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([forma, valor]) => ({ forma, valor }));
  }, [monthReceitas]);

  const handleSaveReceita = async (data: Record<string, unknown>) => {
    if (editingReceita) await updateReceita(editingReceita.id, data);
    else await addReceita(data);
    setReceitaDialogOpen(false);
    setEditingReceita(null);
  };

  const handleSaveDespesa = async (data: Record<string, unknown>) => {
    if (editingDespesa) await updateDespesa(editingDespesa.id, data);
    else await addDespesa(data);
    setDespesaDialogOpen(false);
    setEditingDespesa(null);
  };

  const handleDeleteReceita = async (id: string) => {
    await deleteReceita(id);
    setReceitaDialogOpen(false);
    setEditingReceita(null);
  };

  const handleDeleteDespesa = async (id: string) => {
    await deleteDespesa(id);
    setDespesaDialogOpen(false);
    setEditingDespesa(null);
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Recorrentes handlers ──
  const openNewRecorrente = () => {
    setEditingRecorrente(null);
    setRecorrenteForm({ descricao: '', categoria: 'Outros', valor: '', dia_vencimento: '1', categoriaCustom: '' });
    setRecorrenteFormOpen(true);
  };

  const CATEGORIAS_PADRAO = ['Aluguel', 'Materiais', 'Equipe', 'Marketing', 'Manutenção', 'Outros'];

  const openEditRecorrente = (r: Record<string, unknown>) => {
    setEditingRecorrente(r);
    const isCustom = !CATEGORIAS_PADRAO.includes(r.categoria);
    setRecorrenteForm({
      descricao: r.descricao,
      categoria: isCustom ? '__custom__' : r.categoria,
      valor: String(r.valor),
      dia_vencimento: String(r.dia_vencimento),
      categoriaCustom: isCustom ? r.categoria : '',
    });
    setRecorrenteFormOpen(true);
  };

  const handleSaveRecorrente = async () => {
    if (!recorrenteForm.descricao || !recorrenteForm.valor) { toast.error('Preencha descrição e valor'); return; }
    const finalCategoria = recorrenteForm.categoria === '__custom__'
      ? (recorrenteForm.categoriaCustom.trim() || 'Outros')
      : recorrenteForm.categoria;
    setSavingRecorrente(true);
    const payload = {
      descricao: recorrenteForm.descricao,
      categoria: finalCategoria,
      valor: parseFloat(recorrenteForm.valor),
      dia_vencimento: parseInt(recorrenteForm.dia_vencimento) || 1,
    };
    if (editingRecorrente) {
      const { error } = await updateRecorrente(editingRecorrente.id, payload);
      if (error) toast.error('Erro ao atualizar'); else toast.success('Atualizado');
    } else {
      const { error } = await addRecorrente(payload);
      if (error) toast.error('Erro ao criar'); else toast.success('Despesa recorrente criada');
    }
    setRecorrenteFormOpen(false);
    setSavingRecorrente(false);
  };

  const handleDeleteRecorrente = async (id: string) => {
    if (!await confirmDialog({ description: 'Excluir despesa recorrente?' })) return;
    const { error } = await deleteRecorrente(id);
    if (error) toast.error('Erro'); else toast.success('Removida');
  };

  const handleToggleRecorrente = async (r: Record<string, unknown>) => {
    await updateRecorrente(r.id, { ativo: !r.ativo });
    toast.success(r.ativo ? 'Desativada' : 'Ativada');
  };

  const handleGenerateMonth = async () => {
    const ativas = recorrentes.filter((r: Record<string, unknown>) => r.ativo);
    if (ativas.length === 0) { toast.error('Nenhuma despesa recorrente ativa'); return; }
    setGeneratingMonth(true);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    let count = 0;
    for (const r of ativas) {
      const dia = Math.min(r.dia_vencimento, new Date(year, month + 1, 0).getDate());
      const data = format(new Date(year, month, dia), 'yyyy-MM-dd');
      // Check if already generated
      const exists = despesas.some(d => d.descricao === r.descricao && d.data === data && Number(d.valor) === Number(r.valor));
      if (!exists) {
        await addDespesa({ descricao: r.descricao, categoria: r.categoria, valor: r.valor, data });
        count++;
      }
    }
    if (count > 0) toast.success(`${count} despesa${count > 1 ? 's' : ''} gerada${count > 1 ? 's' : ''}`);
    else toast.info('Despesas deste mês já foram geradas');
    setGeneratingMonth(false);
  };

  const receitaExportColumns = [
    { header: 'Data', accessor: (r: Receita) => format(parseISO(r.data), 'dd/MM/yyyy') },
    { header: 'Cliente', accessor: (r: Receita) => r.paciente?.nome || '' },
    { header: 'Procedimento', accessor: (r: Receita) => r.procedimento || '' },
    { header: 'Forma Pagamento', accessor: (r: Receita) => r.forma_pagamento },
    { header: 'Valor', accessor: (r: Receita) => fmt(Number(r.valor)) },
    { header: 'Status', accessor: (r: Receita) => r.status },
  ];

  const despesaExportColumns = [
    { header: 'Data', accessor: (d: Despesa) => format(parseISO(d.data), 'dd/MM/yyyy') },
    { header: 'Descrição', accessor: (d: Despesa) => d.descricao },
    { header: 'Categoria', accessor: (d: Despesa) => d.categoria },
    { header: 'Valor', accessor: (d: Despesa) => fmt(Number(d.valor)) },
  ];

  const handleExport = (type: 'receitas' | 'despesas', format: 'csv' | 'pdf') => {
    const label = `${type === 'receitas' ? 'Receitas' : 'Despesas'}_${monthLabel.replace(/\s+/g, '_')}`;
    if (type === 'receitas') {
      if (format === 'csv') exportToCSV(label, receitaExportColumns, filteredReceitas);
      else exportToPDF(label, receitaExportColumns, filteredReceitas);
    } else {
      if (format === 'csv') exportToCSV(label, despesaExportColumns, filteredDespesas);
      else exportToPDF(label, despesaExportColumns, filteredDespesas);
    }
    setShowExportMenu(null);
  };

  const receitaActiveFilters = [receitaStatusFilter, receitaFormaFilter].filter(Boolean).length;
  const despesaActiveFilters = despesaCategoriaFilter ? 1 : 0;

  if (loadR || loadD) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="dental-stat h-20 animate-pulse bg-muted/30" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-0.5 capitalize">{monthLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingReceita(null); setReceitaDialogOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium
              hover:bg-emerald-700 transition-colors active:scale-[0.97]"
          >
            <Plus size={16} /> Receita
          </button>
          <button
            onClick={() => { setEditingDespesa(null); setDespesaDialogOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium
              hover:bg-red-700 transition-colors active:scale-[0.97]"
          >
            <Plus size={16} /> Despesa
          </button>
        </div>
      </div>

      {/* Month Nav + Stats */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => setCurrentMonth(p => subMonths(p, 1))} className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-95">
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-primary"
        >
          Mês atual
        </button>
        <button onClick={() => setCurrentMonth(p => addMonths(p, 1))} className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-95">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="text-base font-semibold text-foreground">{fmt(totalReceitas)}</p>
          </div>
        </div>
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingDown size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="text-base font-semibold text-foreground">{fmt(totalDespesas)}</p>
          </div>
        </div>
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lucro</p>
            <p className={`text-base font-semibold ${lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(lucro)}
            </p>
          </div>
        </div>
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <BarChart3 size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Recebido</p>
            <p className="text-base font-semibold text-foreground">{fmt(receitasPagas)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        {([['resumo', 'Resumo'], ['receitas', 'Receitas'], ['despesas', 'Despesas'], ['recorrentes', 'Recorrentes']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'resumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="dental-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Receitas vs Despesas (últimos 6 meses)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="receitas" fill="hsl(162, 63%, 41%)" radius={[4, 4, 0, 0]} name="Receitas" />
                <Bar dataKey="despesas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="dental-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Despesas por Categoria</h3>
            {despesasPorCategoria.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-16">Nenhuma despesa neste mês</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={despesasPorCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                      {despesasPorCategoria.map(e => (
                        <Cell key={e.name} fill={CATEGORIA_COLORS[e.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {despesasPorCategoria.map(e => (
                    <div key={e.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORIA_COLORS[e.name] || '#6b7280' }} />
                      <span className="text-foreground">{e.name}</span>
                      <span className="text-muted-foreground ml-auto">{fmt(e.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="dental-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Receitas por Forma de Pagamento</h3>
            {receitasPorForma.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma receita neste mês</p>
            ) : (
              <div className="space-y-3">
                {receitasPorForma.map(({ forma, valor }) => (
                  <div key={forma}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{forma}</span>
                      <span className="text-muted-foreground">{fmt(valor)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${totalReceitas > 0 ? (valor / totalReceitas) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="dental-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Contas em Aberto</h3>
            {monthReceitas.filter(r => r.status !== 'Pago').length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conta em aberto</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {monthReceitas.filter(r => r.status !== 'Pago').map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{r.paciente?.nome || 'Cliente'}</p>
                      <p className="text-muted-foreground">{r.procedimento || 'Sem procedimento'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{fmt(Number(r.valor))}</p>
                      <span className={`dental-badge text-[10px] ${r.status === 'Parcial' ? 'dental-badge-warning' : 'dental-badge-danger'}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'receitas' && (
        <div className="dental-card overflow-hidden">
          {/* Filters + Export bar */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setShowReceitaFilters(!showReceitaFilters)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  showReceitaFilters || receitaActiveFilters > 0
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                <Filter size={14} /> Filtros
                {receitaActiveFilters > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {receitaActiveFilters}
                  </span>
                )}
              </button>
              {receitaActiveFilters > 0 && (
                <button onClick={() => { setReceitaStatusFilter(''); setReceitaFormaFilter(''); }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                  <X size={14} />
                </button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredReceitas.length} registro{filteredReceitas.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(showExportMenu === 'receitas' ? null : 'receitas')}
                className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground"
              >
                <Download size={14} /> Exportar <ChevronDown size={12} />
              </button>
              {showExportMenu === 'receitas' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(null)} />
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[140px]">
                    <button onClick={() => handleExport('receitas', 'csv')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors rounded-t-lg text-foreground">CSV</button>
                    <button onClick={() => handleExport('receitas', 'pdf')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors rounded-b-lg text-foreground">PDF</button>
                  </div>
                </>
              )}
            </div>
          </div>

          {showReceitaFilters && (
            <div className="p-4 border-b border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <select value={receitaStatusFilter} onChange={e => setReceitaStatusFilter(e.target.value)} className="dental-input w-full">
                  <option value="">Todos</option>
                  <option value="Pago">Pago</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Em aberto">Em aberto</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de Pagamento</label>
                <select value={receitaFormaFilter} onChange={e => setReceitaFormaFilter(e.target.value)} className="dental-input w-full">
                  <option value="">Todas</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="PIX">PIX</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Convênio">Convênio</option>
                </select>
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Data</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Cliente</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Procedimento</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pagamento</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Valor</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filteredReceitas.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-xs">Nenhuma receita encontrada</td></tr>
              )}
              {filteredReceitas.map(r => (
                <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-xs">{format(parseISO(r.data), 'dd/MM/yy')}</td>
                  <td className="p-3 text-xs font-medium">{r.paciente?.nome || '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.procedimento || '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.forma_pagamento}</td>
                  <td className="p-3 text-xs font-semibold text-right">{fmt(Number(r.valor))}</td>
                  <td className="p-3 text-center">
                    <span className={`dental-badge text-[10px] ${
                      r.status === 'Pago' ? 'dental-badge-success' : r.status === 'Parcial' ? 'dental-badge-warning' : 'dental-badge-danger'
                    }`}>{r.status}</span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => { setEditingReceita(r); setReceitaDialogOpen(true); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'despesas' && (
        <div className="dental-card overflow-hidden">
          {/* Filters + Export bar */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setShowDespesaFilters(!showDespesaFilters)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  showDespesaFilters || despesaActiveFilters > 0
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                <Filter size={14} /> Filtros
                {despesaActiveFilters > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {despesaActiveFilters}
                  </span>
                )}
              </button>
              {despesaActiveFilters > 0 && (
                <button onClick={() => setDespesaCategoriaFilter('')}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                  <X size={14} />
                </button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredDespesas.length} registro{filteredDespesas.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(showExportMenu === 'despesas' ? null : 'despesas')}
                className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground"
              >
                <Download size={14} /> Exportar <ChevronDown size={12} />
              </button>
              {showExportMenu === 'despesas' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(null)} />
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[140px]">
                    <button onClick={() => handleExport('despesas', 'csv')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors rounded-t-lg text-foreground">CSV</button>
                    <button onClick={() => handleExport('despesas', 'pdf')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors rounded-b-lg text-foreground">PDF</button>
                  </div>
                </>
              )}
            </div>
          </div>

          {showDespesaFilters && (
            <div className="p-4 border-b border-border">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria</label>
                <select value={despesaCategoriaFilter} onChange={e => setDespesaCategoriaFilter(e.target.value)} className="dental-input w-full sm:w-48">
                  <option value="">Todas</option>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Materiais">Materiais</option>
                  <option value="Equipe">Equipe</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Data</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Descrição</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Categoria</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Valor</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filteredDespesas.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-xs">Nenhuma despesa encontrada</td></tr>
              )}
              {filteredDespesas.map(d => (
                <tr key={d.id} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-xs">{format(parseISO(d.data), 'dd/MM/yy')}</td>
                  <td className="p-3 text-xs font-medium">{d.descricao}</td>
                  <td className="p-3">
                    <span className="dental-badge dental-badge-default text-[10px]">{d.categoria}</span>
                  </td>
                  <td className="p-3 text-xs font-semibold text-right text-red-600">{fmt(Number(d.valor))}</td>
                  <td className="p-3">
                    <button
                      onClick={() => { setEditingDespesa(d); setDespesaDialogOpen(true); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'recorrentes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Despesas que se repetem todo mês. Gere automaticamente para o mês selecionado.</p>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateMonth}
                disabled={generatingMonth}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground disabled:opacity-50"
              >
                <RefreshCw size={14} className={generatingMonth ? 'animate-spin' : ''} />
                Gerar para {format(currentMonth, 'MMM/yy', { locale: ptBR })}
              </button>
              <button
                onClick={openNewRecorrente}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus size={14} /> Nova Recorrente
              </button>
            </div>
          </div>

          <div className="dental-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Descrição</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Categoria</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground">Dia Venc.</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Valor</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {recorrentes.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">Nenhuma despesa recorrente cadastrada</td></tr>
                )}
                {recorrentes.map((r: Record<string, unknown>) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-xs font-medium">{r.descricao}</td>
                    <td className="p-3">
                      <span className="dental-badge dental-badge-default text-[10px]">{r.categoria}</span>
                    </td>
                    <td className="p-3 text-xs text-center text-muted-foreground">Dia {r.dia_vencimento}</td>
                    <td className="p-3 text-xs font-semibold text-right">{fmt(Number(r.valor))}</td>
                    <td className="p-3 text-center">
                      <span className={`dental-badge text-[10px] ${r.ativo ? 'dental-badge-success' : 'dental-badge-danger'}`}>
                        {r.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handleToggleRecorrente(r)} className="p-1.5 rounded hover:bg-muted transition-colors" title={r.ativo ? 'Desativar' : 'Ativar'}>
                          <Power size={13} className={r.ativo ? 'text-emerald-600' : 'text-muted-foreground'} />
                        </button>
                        <button onClick={() => openEditRecorrente(r)} className="p-1.5 rounded hover:bg-muted transition-colors">
                          <Pencil size={13} className="text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDeleteRecorrente(r.id)} className="p-1.5 rounded hover:bg-muted transition-colors">
                          <Trash2 size={13} className="text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recorrente form dialog */}
          {recorrenteFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRecorrenteFormOpen(false)} />
              <div className="relative bg-card rounded-xl shadow-xl w-full max-w-md mx-4 border border-border">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">{editingRecorrente ? 'Editar' : 'Nova'} Despesa Recorrente</h2>
                  <button onClick={() => setRecorrenteFormOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Descrição *</label>
                    <input type="text" value={recorrenteForm.descricao} onChange={e => setRecorrenteForm(p => ({ ...p, descricao: e.target.value }))}
                      className="dental-input" placeholder="Ex: Aluguel da sala" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Categoria</label>
                      <select value={recorrenteForm.categoria} onChange={e => setRecorrenteForm(p => ({ ...p, categoria: e.target.value, categoriaCustom: e.target.value === '__custom__' ? p.categoriaCustom : '' }))} className="dental-input">
                        {CATEGORIAS_PADRAO.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__custom__">+ Nova categoria</option>
                      </select>
                      {recorrenteForm.categoria === '__custom__' && (
                        <input type="text" value={recorrenteForm.categoriaCustom} onChange={e => setRecorrenteForm(p => ({ ...p, categoriaCustom: e.target.value }))}
                          className="dental-input mt-2" placeholder="Nome da categoria" autoFocus />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Valor (R$) *</label>
                      <input type="number" step="0.01" min="0" value={recorrenteForm.valor} onChange={e => setRecorrenteForm(p => ({ ...p, valor: e.target.value }))}
                        className="dental-input" placeholder="0,00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Dia do Vencimento</label>
                    <input type="number" min="1" max="31" value={recorrenteForm.dia_vencimento} onChange={e => setRecorrenteForm(p => ({ ...p, dia_vencimento: e.target.value }))}
                      className="dental-input" placeholder="1" />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setRecorrenteFormOpen(false)} className="px-4 py-2.5 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors">Cancelar</button>
                    <button onClick={handleSaveRecorrente} disabled={savingRecorrente}
                      className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                      {savingRecorrente ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <ReceitaFormDialog
        open={receitaDialogOpen}
        onClose={() => { setReceitaDialogOpen(false); setEditingReceita(null); }}
        onSave={handleSaveReceita}
        onDelete={handleDeleteReceita}
        receita={editingReceita}
        pacientes={pacientes}
      />
      <DespesaFormDialog
        open={despesaDialogOpen}
        onClose={() => { setDespesaDialogOpen(false); setEditingDespesa(null); }}
        onSave={handleSaveDespesa}
        onDelete={handleDeleteDespesa}
        despesa={editingDespesa}
      />
    </div>
  );
}
