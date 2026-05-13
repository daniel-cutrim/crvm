import { useState, useMemo } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useTarefas, useUsuarios, useLeads, usePessoas } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Clock, AlertTriangle, ListChecks, Filter,
  Loader2, Trash2, Calendar, User, Pencil,
  Phone, Video, Mail, RefreshCw, MoreHorizontal, Activity,
} from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { Tarefa } from '@/types';

// ─── Configuração de tipos de atividade ──────────────────────────────────────

const TIPO_ATIVIDADE = {
  follow_up: { label: 'Follow-up', icon: RefreshCw, color: 'text-purple-600 bg-purple-100' },
  ligacao:   { label: 'Ligação',   icon: Phone,       color: 'text-blue-600 bg-blue-100' },
  reuniao:   { label: 'Reunião',   icon: Video,       color: 'text-amber-600 bg-amber-100' },
  email:     { label: 'E-mail',    icon: Mail,        color: 'text-emerald-600 bg-emerald-100' },
  outros:    { label: 'Outros',    icon: MoreHorizontal, color: 'text-gray-600 bg-gray-100' },
} as const;

type TipoKey = keyof typeof TIPO_ATIVIDADE;

const STATUS_OPTIONS = ['Pendente', 'Em andamento', 'Concluída'] as const;

// ─── Helpers visuais ─────────────────────────────────────────────────────────

function isAtrasada(t: Tarefa): boolean {
  if (t.status === 'Concluída') return false;
  const d = parseISO(t.data_vencimento);
  return isPast(d) && !isToday(d);
}

function StatusBadge({ tarefa }: { tarefa: Tarefa }) {
  if (isAtrasada(tarefa)) {
    return (
      <Badge variant="outline" className="text-xs shrink-0 bg-red-100 text-red-700 border-red-200">
        Atrasada
      </Badge>
    );
  }
  const map: Record<string, string> = {
    'Concluída':    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Pendente':     'bg-gray-100 text-gray-600 border-gray-200',
    'Em andamento': 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <Badge variant="outline" className={`text-xs shrink-0 ${map[tarefa.status] ?? map['Pendente']}`}>
      {tarefa.status}
    </Badge>
  );
}

function TipoBadge({ tipo }: { tipo: TipoKey | null | undefined }) {
  const cfg = tipo ? TIPO_ATIVIDADE[tipo] : null;
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function AtividadesPage() {
  const { tarefas, loading, addTarefa, updateTarefa, deleteTarefa } = useTarefas();
  const { usuarios } = useUsuarios();
  const { leads } = useLeads();
  const { pessoas } = usePessoas();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    tipo: '' as TipoKey | '',
    descricao: '',
    data_vencimento: format(new Date(), 'yyyy-MM-dd'),
    responsavel_id: '',
    lead_id: '',
    pessoa_id: '',
    status: 'Pendente' as string,
  });

  // ── Abrir dialog ────────────────────────────────────────────────────────────

  const openNew = () => {
    setEditing(null);
    setForm({
      tipo: '',
      descricao: '',
      data_vencimento: format(new Date(), 'yyyy-MM-dd'),
      responsavel_id: '',
      lead_id: '',
      pessoa_id: '',
      status: 'Pendente',
    });
    setOpen(true);
  };

  const openEdit = (t: Tarefa) => {
    setEditing(t);
    setForm({
      tipo: (t.tipo as TipoKey) || '',
      descricao: t.descricao,
      data_vencimento: t.data_vencimento,
      responsavel_id: t.responsavel_id || '',
      lead_id: t.lead_id || '',
      pessoa_id: t.pessoa_id || '',
      status: t.status,
    });
    setOpen(true);
  };

  // ── Salvar ──────────────────────────────────────────────────────────────────

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
      tipo: form.tipo || null,
      descricao: form.descricao.trim(),
      data_vencimento: form.data_vencimento,
      responsavel_id: form.responsavel_id || null,
      lead_id: form.lead_id || null,
      pessoa_id: form.pessoa_id || null,
      paciente_id: null,
      status: form.status,
    };
    try {
      if (editing) {
        const { error } = await updateTarefa(editing.id, payload);
        if (error) throw error;
        toast.success('Atividade atualizada');
      } else {
        const { error } = await addTarefa(payload);
        if (error) throw error;
        toast.success('Atividade criada');
      }
      setOpen(false);
    } catch {
      toast.error('Erro ao salvar atividade');
    }
    setSaving(false);
  };

  // ── Excluir ─────────────────────────────────────────────────────────────────

  const handleDelete = async (t: Tarefa) => {
    if (!await confirmDialog({ description: `Excluir atividade "${t.descricao}"?` })) return;
    const { error } = await deleteTarefa(t.id);
    if (error) toast.error('Erro ao excluir');
    else toast.success('Atividade excluída');
  };

  // ── Filtros e métricas ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return tarefas.filter(t => {
      if (filterStatus !== 'all') {
        if (filterStatus === 'Atrasada') {
          if (!isAtrasada(t)) return false;
        } else {
          if (t.status !== filterStatus) return false;
        }
      }
      if (filterTipo !== 'all' && t.tipo !== filterTipo) return false;
      if (filterResponsavel !== 'all' && t.responsavel_id !== filterResponsavel) return false;
      if (search && !t.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tarefas, filterStatus, filterTipo, filterResponsavel, search]);

  const counts = useMemo(() => ({
    total:     tarefas.length,
    pendentes: tarefas.filter(t => t.status === 'Pendente').length,
    concluidas: tarefas.filter(t => t.status === 'Concluída').length,
    atrasadas: tarefas.filter(t => isAtrasada(t)).length,
  }), [tarefas]);

  // ── Render ──────────────────────────────────────────────────────────────────

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
          <h1 className="text-2xl font-bold text-foreground">Atividades</h1>
          <p className="text-muted-foreground text-sm">Gerencie follow-ups, ligações, reuniões e e-mails</p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Atividade
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: counts.total,     icon: ListChecks,    color: 'text-foreground' },
          { label: 'Pendentes',  value: counts.pendentes, icon: Clock,         color: 'text-amber-600' },
          { label: 'Concluídas', value: counts.concluidas, icon: Activity,     color: 'text-emerald-600' },
          { label: 'Atrasadas',  value: counts.atrasadas, icon: AlertTriangle, color: 'text-destructive' },
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

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar atividades..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtro por tipo */}
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(Object.entries(TIPO_ATIVIDADE) as [TipoKey, typeof TIPO_ATIVIDADE[TipoKey]][]).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por responsável */}
        <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Filtro por status */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            <SelectItem value="Atrasada">Atrasada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} atividade{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma atividade encontrada</p>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(t => {
                const atrasada = isAtrasada(t);
                return (
                  <li
                    key={t.id}
                    className={`flex items-start gap-3 px-4 py-4 hover:bg-muted/30 transition-colors group ${atrasada ? 'border-l-2 border-red-400' : ''}`}
                  >
                    {/* Ícone do tipo */}
                    <div className="pt-0.5 shrink-0">
                      {t.tipo && TIPO_ATIVIDADE[t.tipo as TipoKey] ? (
                        (() => {
                          const cfg = TIPO_ATIVIDADE[t.tipo as TipoKey];
                          const Icon = cfg.icon;
                          return (
                            <span className={`flex items-center justify-center h-8 w-8 rounded-full ${cfg.color}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                          );
                        })()
                      ) : (
                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-400">
                          <Activity className="h-4 w-4" />
                        </span>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Linha 1: tipo badge + descrição */}
                      <div className="flex items-center flex-wrap gap-2">
                        <TipoBadge tipo={t.tipo} />
                        <p className={`text-sm font-medium ${t.status === 'Concluída' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {t.descricao}
                        </p>
                      </div>

                      {/* Linha 2: metadados */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(t.data_vencimento), 'dd/MM/yyyy')}
                        </span>
                        {t.responsavel && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {t.responsavel.nome}
                          </span>
                        )}
                        {t.lead && (
                          <Badge variant="outline" className="text-xs">
                            Lead: {t.lead.nome}
                          </Badge>
                        )}
                        {t.pessoa && (
                          <Badge variant="outline" className="text-xs">
                            Contato: {t.pessoa.nome}
                          </Badge>
                        )}
                        {isToday(parseISO(t.data_vencimento)) && t.status !== 'Concluída' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                            Hoje
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <StatusBadge tarefa={t} />

                    {/* Ações */}
                    <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(t)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Dialog criação / edição */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
            <DialogDescription>Preencha os dados da atividade</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo de Atividade</Label>
              <Select value={form.tipo || 'none'} onValueChange={v => setForm(f => ({ ...f, tipo: v === 'none' ? '' : v as TipoKey }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem tipo</SelectItem>
                  {(Object.entries(TIPO_ATIVIDADE) as [TipoKey, typeof TIPO_ATIVIDADE[TipoKey]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
                placeholder="Descreva a atividade..."
              />
            </div>

            {/* Data + Status */}
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

            {/* Responsável */}
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={form.responsavel_id || 'none'}
                onValueChange={v => setForm(f => ({ ...f, responsavel_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Lead + Pessoa */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead (opcional)</Label>
                <Select
                  value={form.lead_id || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, lead_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contato (opcional)</Label>
                <Select
                  value={form.pessoa_id || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, pessoa_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
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
