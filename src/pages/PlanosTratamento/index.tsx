import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { usePlanosTratamento, usePlanoItens, useUsuarios, usePacientes, useProcedimentosPadrao, useReceitas } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Plus, Search, Loader2, Trash2, Eye, Pencil, FileText,
  DollarSign, CheckCircle2, Clock, ShoppingCart,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { PlanoTratamento, PlanoTratamentoItem } from '@/types';

const STATUS_OPTIONS = ['Em avaliação', 'Apresentado', 'Aprovado', 'Reprovado', 'Em andamento', 'Concluído'] as const;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    'Em avaliação': 'bg-amber-50 text-amber-700 border-amber-200',
    'Apresentado': 'bg-blue-50 text-blue-700 border-blue-200',
    'Aprovado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Reprovado': 'bg-red-50 text-red-700 border-red-200',
    'Em andamento': 'bg-sky-50 text-sky-700 border-sky-200',
    'Concluído': 'bg-teal-50 text-teal-700 border-teal-200',
  };
  return map[s] || '';
};

export default function PlanosTratamentoPage() {
  const { usuario } = useAuth();
  const { planos, loading, addPlano, updatePlano, deletePlano } = usePlanosTratamento();
  const { usuarios } = useUsuarios();
  const { pacientes } = usePacientes();
  const { procedimentos } = useProcedimentosPadrao();
  const { addReceita } = useReceitas();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlanoTratamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailPlano, setDetailPlano] = useState<PlanoTratamento | null>(null);

  const [form, setForm] = useState({
    paciente_id: '',
    dentista_id: '',
    status: 'Em avaliação' as string,
    observacoes: '',
    entrada_sugerida: '',
    numero_parcelas: '',
    forma_pagamento: '' as string,
  });

  const dentistas = usuarios.filter(u => u.papel === 'Dentista' || u.papel === 'Gestor' || u.papel === 'Gestor/Dentista');

  const filtered = useMemo(() => {
    return planos.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return p.paciente?.nome?.toLowerCase().includes(s) || p.dentista?.nome?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [planos, search, statusFilter]);

  const counts = useMemo(() => ({
    total: planos.length,
    avaliacao: planos.filter(p => p.status === 'Em avaliação').length,
    aprovados: planos.filter(p => p.status === 'Aprovado' || p.status === 'Em andamento').length,
    valorTotal: planos.filter(p => ['Aprovado', 'Em andamento', 'Concluído'].includes(p.status))
      .reduce((s, p) => s + Number(p.valor_total), 0),
  }), [planos]);

  const openNew = () => {
    setEditing(null);
    setForm({ paciente_id: '', dentista_id: usuario?.id || '', status: 'Em avaliação', observacoes: '', entrada_sugerida: '', numero_parcelas: '', forma_pagamento: '' });
    setFormOpen(true);
  };

  const openEdit = (p: PlanoTratamento) => {
    setEditing(p);
    setForm({
      paciente_id: p.paciente_id,
      dentista_id: p.dentista_id,
      status: p.status,
      observacoes: p.observacoes || '',
      entrada_sugerida: p.entrada_sugerida ? String(p.entrada_sugerida) : '',
      numero_parcelas: p.numero_parcelas ? String(p.numero_parcelas) : '',
      forma_pagamento: p.forma_pagamento || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.paciente_id || !form.dentista_id) { toast.error('Paciente e dentista são obrigatórios'); return; }
    setSaving(true);
    const payload = {
      clinica_id: usuario?.clinica_id,
      paciente_id: form.paciente_id,
      dentista_id: form.dentista_id,
      status: form.status,
      observacoes: form.observacoes || null,
      entrada_sugerida: form.entrada_sugerida ? parseFloat(form.entrada_sugerida) : null,
      numero_parcelas: form.numero_parcelas ? parseInt(form.numero_parcelas) : null,
      forma_pagamento: form.forma_pagamento || null,
    };
    try {
      if (editing) {
        const { error } = await updatePlano(editing.id, payload);
        if (error) throw error;
        toast.success('Plano atualizado');
      } else {
        const { data, error } = await addPlano(payload);
        if (error) throw error;
        toast.success('Plano criado');
        // Auto-open detail for new plans so user can add items immediately
        if (data) setDetailPlano(data);
      }
      setFormOpen(false);
    } catch { toast.error('Erro ao salvar'); }
    setSaving(false);
  };

  const handleDelete = async (p: PlanoTratamento) => {
    if (!await confirmDialog({ description: `Excluir plano de ${p.paciente?.nome}?` })) return;
    const { error } = await deletePlano(p.id);
    if (error) toast.error('Erro ao excluir');
    else { toast.success('Plano excluído'); if (detailPlano?.id === p.id) setDetailPlano(null); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planos de Tratamento</h1>
          <p className="text-muted-foreground text-sm">Gerencie orçamentos e planos dos pacientes</p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Novo Plano</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, icon: FileText, color: 'text-foreground' },
          { label: 'Em Avaliação', value: counts.avaliacao, icon: Clock, color: 'text-amber-600' },
          { label: 'Aprovados', value: counts.aprovados, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Valor Aprovado', value: formatCurrency(counts.valorTotal), icon: DollarSign, color: 'text-teal-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por paciente ou dentista..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Dentista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum plano encontrado</TableCell></TableRow>
              ) : filtered.map(p => {
                const entrada = Number(p.entrada_sugerida) || 0;
                const total = Number(p.valor_total);
                const restante = Math.max(0, total - entrada);
                const parcelas = p.numero_parcelas || 0;
                const valorParcela = parcelas > 0 ? restante / parcelas : 0;

                return (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetailPlano(p)}>
                  <TableCell className="font-medium">{p.paciente?.nome || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.dentista?.nome || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColor(p.status)}>{p.status}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(total)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="space-y-0.5">
                      {entrada > 0 && <div>Entrada: {formatCurrency(entrada)}</div>}
                      {parcelas > 0 && <div>{parcelas}x de {formatCurrency(valorParcela)}</div>}
                      {p.forma_pagamento && <div className="text-xs">{p.forma_pagamento}</div>}
                      {!entrada && !parcelas && !p.forma_pagamento && '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(parseISO(p.created_at), 'dd/MM/yy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailPlano(p)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      {detailPlano && (
        <PlanoDetailSheet
          plano={detailPlano}
          procedimentosPadrao={procedimentos}
          onClose={() => setDetailPlano(null)}
          onStatusChange={async (status) => {
            await updatePlano(detailPlano.id, { status });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setDetailPlano({ ...detailPlano, status: status as any });
            toast.success(`Status alterado para ${status}`);
            // Auto-generate receipt when approved
            if (status === 'Aprovado' && detailPlano.status !== 'Aprovado') {
              const total = Number(detailPlano.valor_total);
              if (total > 0) {
                const { error } = await addReceita({
                  clinica_id: usuario?.clinica_id,
                  paciente_id: detailPlano.paciente_id,
                  plano_id: detailPlano.id,
                  procedimento: `Plano de Tratamento - ${detailPlano.paciente?.nome || ''}`,
                  data: format(new Date(), 'yyyy-MM-dd'),
                  forma_pagamento: detailPlano.forma_pagamento || 'PIX',
                  valor: total,
                  status: 'Em aberto',
                });
                if (!error) toast.success('Receita gerada automaticamente no financeiro');
                else toast.error('Erro ao gerar receita automática');
              }
            }
          }}
          onUpdateTotal={async (total) => {
            await updatePlano(detailPlano.id, { valor_total: total });
            setDetailPlano({ ...detailPlano, valor_total: total });
          }}
          onUpdatePayment={async (updates) => {
            await updatePlano(detailPlano.id, updates);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setDetailPlano({ ...detailPlano, ...updates } as any);
            toast.success('Pagamento atualizado');
          }}
        />
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Plano' : 'Novo Plano de Tratamento'}</DialogTitle>
            <DialogDescription>Preencha os dados do plano de tratamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select value={form.paciente_id} onValueChange={v => setForm(f => ({ ...f, paciente_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {pacientes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dentista *</Label>
              <Select value={form.dentista_id} onValueChange={v => setForm(f => ({ ...f, dentista_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {dentistas.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} placeholder="Informações adicionais sobre o plano..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Salvar' : 'Criar e Adicionar Serviços'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Detail Sheet with inline item adding ──
function PlanoDetailSheet({ plano, procedimentosPadrao, onClose, onStatusChange, onUpdateTotal, onUpdatePayment }: {
  plano: PlanoTratamento;
  procedimentosPadrao: any[];
  onClose: () => void;
  onStatusChange: (status: string) => Promise<void>;
  onUpdateTotal: (total: number) => Promise<void>;
  onUpdatePayment: (updates: Partial<PlanoTratamento>) => Promise<void>;
}) {
  const { usuario } = useAuth();
  const { itens, loading, addItem, updateItem, deleteItem } = usePlanoItens(plano.id);
  const [saving, setSaving] = useState(false);
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customItem, setCustomItem] = useState({ procedimento_nome: '', dente_regiao: '', quantidade: '1', valor_unitario: '' });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState({ quantidade: '', valor_unitario: '', dente_regiao: '' });

  // Payment editing with auto-save
  const [paymentForm, setPaymentForm] = useState({
    entrada_sugerida: plano.entrada_sugerida ? String(plano.entrada_sugerida) : '',
    numero_parcelas: plano.numero_parcelas ? String(plano.numero_parcelas) : '',
    forma_pagamento: plano.forma_pagamento || '',
  });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(JSON.stringify(paymentForm));

  const autoSavePayment = useCallback((form: typeof paymentForm) => {
    const key = JSON.stringify(form);
    if (key === lastSavedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      lastSavedRef.current = key;
      await onUpdatePayment({
        entrada_sugerida: form.entrada_sugerida ? parseFloat(form.entrada_sugerida) : null,
        numero_parcelas: form.numero_parcelas ? parseInt(form.numero_parcelas) : null,
        forma_pagamento: form.forma_pagamento || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }, 800);
  }, [onUpdatePayment]);

  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  const updatePaymentField = (field: string, value: string) => {
    setPaymentForm(f => {
      const next = { ...f, [field]: value };
      autoSavePayment(next);
      return next;
    });
  };

  const valorTotal = itens.reduce((s, i) => s + i.quantidade * Number(i.valor_unitario), 0);
  const entrada = parseFloat(paymentForm.entrada_sugerida) || 0;
  const restante = Math.max(0, valorTotal - entrada);

  const PARCELA_OPTIONS = [1, 2, 3, 6, 10, 12];

  const activeProcedures = procedimentosPadrao.filter((p: any) => p.ativo);

  const recalcTotal = async (newItens: PlanoTratamentoItem[]) => {
    const total = newItens.reduce((s, i) => s + i.quantidade * Number(i.valor_unitario), 0);
    await onUpdateTotal(total);
  };

  const handleQuickAdd = async (proc: any) => {
    setSaving(true);
    const { data: newItem, error } = await addItem({
      plano_id: plano.id,
      clinica_id: usuario?.clinica_id,
      procedimento_nome: proc.nome,
      dente_regiao: null,
      quantidade: 1,
      valor_unitario: proc.valor_base,
    });
    if (error) toast.error('Erro ao adicionar');
    else if (newItem) {
      await recalcTotal([...itens, newItem]);
    }
    setSaving(false);
  };

  // Custom item
  const handleAddCustom = async () => {
    if (!customItem.procedimento_nome.trim()) { toast.error('Nome do procedimento é obrigatório'); return; }
    setSaving(true);
    const { data: newItem, error } = await addItem({
      plano_id: plano.id,
      clinica_id: usuario?.clinica_id,
      procedimento_nome: customItem.procedimento_nome.trim(),
      dente_regiao: customItem.dente_regiao.trim() || null,
      quantidade: parseInt(customItem.quantidade) || 1,
      valor_unitario: parseFloat(customItem.valor_unitario) || 0,
    });
    if (error) toast.error('Erro ao adicionar');
    else if (newItem) {
      await recalcTotal([...itens, newItem]);
      setCustomItem({ procedimento_nome: '', dente_regiao: '', quantidade: '1', valor_unitario: '' });
      setShowCustomItem(false);
    }
    setSaving(false);
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await deleteItem(id);
    if (error) toast.error('Erro ao remover');
    else {
      const remaining = itens.filter(i => i.id !== id);
      await recalcTotal(remaining);
    }
  };

  const startEditItem = (item: PlanoTratamentoItem) => {
    setEditingItemId(item.id);
    setEditItemForm({
      quantidade: String(item.quantidade),
      valor_unitario: String(item.valor_unitario),
      dente_regiao: item.dente_regiao || '',
    });
  };

  const handleSaveItem = async (item: PlanoTratamentoItem) => {
    const qty = parseInt(editItemForm.quantidade) || 1;
    const val = parseFloat(editItemForm.valor_unitario) || 0;
    setSaving(true);
    const { data, error } = await updateItem(item.id, {
      quantidade: qty,
      valor_unitario: val,
      dente_regiao: editItemForm.dente_regiao.trim() || null,
    });
    if (error) toast.error('Erro ao atualizar');
    else if (data) {
      const updated = itens.map(i => i.id === item.id ? data : i);
      await recalcTotal(updated);
      setEditingItemId(null);
    }
    setSaving(false);
  };

  // no longer needed — auto-save handles it

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Plano de Tratamento
            <Badge variant="outline" className={`text-xs ${statusColor(plano.status)}`}>{plano.status}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Patient info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{plano.paciente?.nome}</p>
              <p className="text-xs text-muted-foreground">Dr(a). {plano.dentista?.nome} · {format(parseISO(plano.created_at), 'dd/MM/yyyy')}</p>
            </div>
            <Select value={plano.status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {plano.observacoes && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{plano.observacoes}</p>
          )}

          {/* ─── QUICK ADD SECTION ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4" /> Adicionar Serviços
              </h4>
            </div>

            {/* Procedure catalog — quick add buttons */}
            {activeProcedures.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {activeProcedures.map((proc: any) => (
                  <button
                    key={proc.id}
                    disabled={saving}
                    onClick={() => handleQuickAdd(proc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-sm hover:bg-accent hover:border-primary/30 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3 text-primary" />
                    <span>{proc.nome}</span>
                    <span className="text-xs text-muted-foreground ml-1">{formatCurrency(proc.valor_base)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Toggle for custom item */}
            {!showCustomItem ? (
              <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setShowCustomItem(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Procedimento personalizado
              </Button>
            ) : (
              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <Input
                  placeholder="Nome do procedimento"
                  value={customItem.procedimento_nome}
                  onChange={e => setCustomItem(f => ({ ...f, procedimento_nome: e.target.value }))}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Dente/Região"
                    value={customItem.dente_regiao}
                    onChange={e => setCustomItem(f => ({ ...f, dente_regiao: e.target.value }))}
                  />
                  <Input
                    type="number" min="1" placeholder="Qtd"
                    value={customItem.quantidade}
                    onChange={e => setCustomItem(f => ({ ...f, quantidade: e.target.value }))}
                  />
                  <Input
                    type="number" step="0.01" min="0" placeholder="Valor (R$)"
                    value={customItem.valor_unitario}
                    onChange={e => setCustomItem(f => ({ ...f, valor_unitario: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddCustom} disabled={saving} className="flex-1">
                    {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Adicionar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowCustomItem(false); setCustomItem({ procedimento_nome: '', dente_regiao: '', quantidade: '1', valor_unitario: '' }); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ─── ITEMS LIST ─── */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Procedimentos do Plano</h4>

            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : itens.length === 0 ? (
              <div className="text-center py-8 border rounded-lg border-dashed">
                <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum procedimento adicionado</p>
                <p className="text-xs text-muted-foreground mt-1">Clique nos serviços acima para adicionar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {itens.map(item => {
                  const isEditing = editingItemId === item.id;
                  
                  if (isEditing) {
                    return (
                      <div key={item.id} className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2">
                        <p className="text-sm font-medium">{item.procedimento_nome}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Dente/Região</Label>
                            <Input
                              className="h-8 text-sm"
                              placeholder="Ex: 18"
                              value={editItemForm.dente_regiao}
                              onChange={e => setEditItemForm(f => ({ ...f, dente_regiao: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Quantidade</Label>
                            <Input
                              type="number" min="1"
                              className="h-8 text-sm"
                              value={editItemForm.quantidade}
                              onChange={e => setEditItemForm(f => ({ ...f, quantidade: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Valor Unit. (R$)</Label>
                            <Input
                              type="number" step="0.01" min="0"
                              className="h-8 text-sm"
                              value={editItemForm.valor_unitario}
                              onChange={e => setEditItemForm(f => ({ ...f, valor_unitario: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingItemId(null)}>Cancelar</Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveItem(item)} disabled={saving}>
                            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card group cursor-pointer hover:border-primary/20 transition-colors" onClick={() => startEditItem(item)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.procedimento_nome}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          {item.dente_regiao && <span>Dente: {item.dente_regiao}</span>}
                          <span>{item.quantidade}x {formatCurrency(Number(item.valor_unitario))}</span>
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
                      </div>
                      <p className="text-sm font-semibold tabular-nums shrink-0">
                        {formatCurrency(item.quantidade * Number(item.valor_unitario))}
                      </p>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}

                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t mt-3">
                  <span className="font-semibold">Total do Plano</span>
                  <span className="text-xl font-bold tabular-nums text-primary">{formatCurrency(valorTotal)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ─── PAYMENT SECTION ─── */}
          {itens.length > 0 && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" /> Condições de Pagamento
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Forma de Pagamento</Label>
                  <Select value={paymentForm.forma_pagamento} onValueChange={v => updatePaymentField('forma_pagamento', v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                      <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Entrada (R$)</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    className="h-9"
                    placeholder="0,00"
                    value={paymentForm.entrada_sugerida}
                    onChange={e => updatePaymentField('entrada_sugerida', e.target.value)}
                  />
                </div>
              </div>

              {/* ─── INSTALLMENT SIMULATOR ─── */}
              <div className="space-y-2">
                <Label className="text-xs">Simulação de Parcelas</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PARCELA_OPTIONS.map(n => {
                    const val = n === 1 ? restante : restante / n;
                    const isSelected = paymentForm.numero_parcelas === String(n);
                    return (
                      <button
                        key={n}
                        onClick={() => updatePaymentField('numero_parcelas', String(n))}
                        className={`rounded-lg border p-2.5 text-center transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                            : 'border-border bg-card hover:border-primary/30 hover:bg-accent'
                        }`}
                      >
                        <p className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                          {n === 1 ? 'À vista' : `${n}x`}
                        </p>
                        <p className={`text-sm font-bold tabular-nums mt-0.5 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {formatCurrency(val)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment summary */}
              {(entrada > 0 || paymentForm.numero_parcelas) && (
                <div className="bg-card rounded-lg p-3 space-y-1.5 border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumo</p>
                  <div className="flex justify-between text-sm">
                    <span>Total</span>
                    <span className="font-medium">{formatCurrency(valorTotal)}</span>
                  </div>
                  {entrada > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Entrada</span>
                      <span className="font-medium text-emerald-600">- {formatCurrency(entrada)}</span>
                    </div>
                  )}
                  {paymentForm.numero_parcelas && (
                    <div className="flex justify-between text-sm font-semibold pt-1.5 border-t">
                      <span>{paymentForm.numero_parcelas === '1' ? 'À vista' : `${paymentForm.numero_parcelas}x de`}</span>
                      <span className="text-primary">
                        {formatCurrency(restante / (parseInt(paymentForm.numero_parcelas) || 1))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">Salvo automaticamente</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
