import { useState, useMemo } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useTarefas, useUsuarios, usePacientes, useLeads } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckSquare, Plus, Clock, AlertTriangle, ListChecks, Filter,
  Loader2, Trash2, Calendar, User, Pencil,
} from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Tarefa } from '@/types';

const STATUS_OPTIONS = ['Pendente', 'Em andamento', 'Concluída'] as const;

export default function TarefasPage() {
  const { tarefas, loading, addTarefa, updateTarefa, deleteTarefa } = useTarefas();
  const { usuarios } = useUsuarios();
  const { pacientes } = usePacientes();
  const { leads } = useLeads();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    descricao: '',
    data_vencimento: format(new Date(), 'yyyy-MM-dd'),
    responsavel_id: '',
    paciente_id: '',
    lead_id: '',
    status: 'Pendente' as string,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      descricao: '',
      data_vencimento: format(new Date(), 'yyyy-MM-dd'),
      responsavel_id: '',
      paciente_id: '',
      lead_id: '',
      status: 'Pendente',
    });
    setOpen(true);
  };

  const openEdit = (t: Tarefa) => {
    setEditing(t);
    setForm({
      descricao: t.descricao,
      data_vencimento: t.data_vencimento,
      responsavel_id: t.responsavel_id || '',
      paciente_id: t.paciente_id || '',
      lead_id: t.lead_id || '',
      status: t.status,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    if (!form.data_vencimento) {
      toast.error('Data de vencimento é obrigatória');
      return;
    }
    setSaving(true);
    const payload = {
      descricao: form.descricao.trim(),
      data_vencimento: form.data_vencimento,
      responsavel_id: form.responsavel_id || null,
      paciente_id: form.paciente_id || null,
      lead_id: form.lead_id || null,
      status: form.status,
    };
    try {
      if (editing) {
        const { error } = await updateTarefa(editing.id, payload);
        if (error) throw error;
        toast.success('Tarefa atualizada');
      } else {
        const { error } = await addTarefa(payload);
        if (error) throw error;
        toast.success('Tarefa criada');
      }
      setOpen(false);
    } catch {
      toast.error('Erro ao salvar tarefa');
    }
    setSaving(false);
  };

  const handleToggleConcluida = async (t: Tarefa) => {
    const newStatus = t.status === 'Concluída' ? 'Pendente' : 'Concluída';
    const { error } = await updateTarefa(t.id, { status: newStatus });
    if (error) toast.error('Erro ao atualizar');
    else toast.success(newStatus === 'Concluída' ? 'Tarefa concluída!' : 'Tarefa reaberta');
  };

  const handleDelete = async (t: Tarefa) => {
    if (!await confirmDialog({ description: `Excluir tarefa "${t.descricao}"?` })) return;
    const { error } = await deleteTarefa(t.id);
    if (error) toast.error('Erro ao excluir');
    else toast.success('Tarefa excluída');
  };

  const filtered = useMemo(() => {
    return tarefas.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterResponsavel !== 'all' && t.responsavel_id !== filterResponsavel) return false;
      if (search && !t.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tarefas, filterStatus, filterResponsavel, search]);

  const counts = useMemo(() => ({
    total: tarefas.length,
    pendentes: tarefas.filter(t => t.status === 'Pendente').length,
    andamento: tarefas.filter(t => t.status === 'Em andamento').length,
    concluidas: tarefas.filter(t => t.status === 'Concluída').length,
    atrasadas: tarefas.filter(t => t.status !== 'Concluída' && isPast(parseISO(t.data_vencimento)) && !isToday(parseISO(t.data_vencimento))).length,
  }), [tarefas]);

  const getDateBadge = (t: Tarefa) => {
    if (t.status === 'Concluída') return null;
    const d = parseISO(t.data_vencimento);
    if (isToday(d)) return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Hoje</Badge>;
    if (isPast(d)) return <Badge variant="destructive" className="text-xs">Atrasada</Badge>;
    return null;
  };

  const statusColor = (s: string) => {
    if (s === 'Pendente') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'Em andamento') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas & Follow-ups</h1>
          <p className="text-muted-foreground text-sm">Gerencie atividades e acompanhamentos</p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: counts.total, icon: ListChecks, color: 'text-foreground' },
          { label: 'Pendentes', value: counts.pendentes, icon: Clock, color: 'text-amber-600' },
          { label: 'Em andamento', value: counts.andamento, icon: CheckSquare, color: 'text-blue-600' },
          { label: 'Concluídas', value: counts.concluidas, icon: CheckSquare, color: 'text-emerald-600' },
          { label: 'Atrasadas', value: counts.atrasadas, icon: AlertTriangle, color: 'text-destructive' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} tarefa{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma tarefa encontrada</p>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(t => (
                <li key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
                  <div className="pt-0.5">
                    <Checkbox
                      checked={t.status === 'Concluída'}
                      onCheckedChange={() => handleToggleConcluida(t)}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${t.status === 'Concluída' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {t.descricao}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(t.data_vencimento), "dd/MM/yyyy")}
                      </span>
                      {t.responsavel && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {t.responsavel.nome}
                        </span>
                      )}
                      {t.paciente && (
                        <Badge variant="outline" className="text-xs">
                          Cliente: {t.paciente.nome}
                        </Badge>
                      )}
                      {t.lead && (
                        <Badge variant="outline" className="text-xs">
                          Lead: {t.lead.nome}
                        </Badge>
                      )}
                      {getDateBadge(t)}
                    </div>
                  </div>

                  <Badge variant="outline" className={`text-xs shrink-0 ${statusColor(t.status)}`}>
                    {t.status}
                  </Badge>

                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(t)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            <DialogDescription>Preencha os dados da tarefa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
                placeholder="Descreva a tarefa..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={form.data_vencimento}
                  onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={form.responsavel_id || 'none'} onValueChange={v => setForm(f => ({ ...f, responsavel_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente (opcional)</Label>
                <Select value={form.paciente_id || 'none'} onValueChange={v => setForm(f => ({ ...f, paciente_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {pacientes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lead (opcional)</Label>
                <Select value={form.lead_id || 'none'} onValueChange={v => setForm(f => ({ ...f, lead_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
