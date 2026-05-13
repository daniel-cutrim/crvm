import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Filter, ChevronDown, User, SortAsc, LayoutGrid, List, X, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLeads, useFunis, useFunilEtapas, useUsuarios, usePessoas } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import FunilBoard from './FunilBoard';
import NegocioDetail from './NegocioDetail';
import NegocioFormDialog from './NegocioFormDialog';
import type { Lead, FunilEtapa } from '@/types';

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

type SortOption = 'criado_desc' | 'criado_asc' | 'valor_desc' | 'valor_asc' | 'nome_asc';
const SORT_LABELS: Record<SortOption, string> = {
  criado_desc: 'Negócio criado em Z→A',
  criado_asc: 'Negócio criado em A→Z',
  valor_desc: 'Valor decrescente',
  valor_asc: 'Valor crescente',
  nome_asc: 'Nome A→Z',
};

type FilterCampo = 'nome' | 'valor' | 'proprietario_id' | 'etapa_id' | 'resultado';
type FilterOp = 'contem' | 'igual' | 'maior' | 'menor' | 'eh';
interface ActiveFilter { campo: FilterCampo; operador: FilterOp; valor: string; }

const FILTER_OPTIONS: { campo: FilterCampo; label: string; operadores: { op: FilterOp; label: string }[] }[] = [
  { campo: 'nome', label: 'Nome', operadores: [{ op: 'contem', label: 'contém' }, { op: 'igual', label: 'igual a' }] },
  { campo: 'valor', label: 'Valor', operadores: [{ op: 'maior', label: 'maior que' }, { op: 'menor', label: 'menor que' }] },
  { campo: 'proprietario_id', label: 'Proprietário', operadores: [{ op: 'eh', label: 'é' }] },
  { campo: 'etapa_id', label: 'Etapa', operadores: [{ op: 'eh', label: 'é' }] },
  { campo: 'resultado', label: 'Resultado', operadores: [{ op: 'eh', label: 'é' }] },
];

function applyFilter(lead: Lead, f: ActiveFilter): boolean {
  const getRaw = () => {
    if (f.campo === 'nome') return lead.nome;
    if (f.campo === 'valor') return String(lead.valor ?? 0);
    if (f.campo === 'proprietario_id') return lead.proprietario_id ?? '';
    if (f.campo === 'etapa_id') return lead.etapa_id ?? '';
    if (f.campo === 'resultado') return lead.resultado ?? '';
    return '';
  };
  const raw = getRaw();
  if (f.operador === 'contem') return raw.toLowerCase().includes(f.valor.toLowerCase());
  if (f.operador === 'igual') return raw.toLowerCase() === f.valor.toLowerCase();
  if (f.operador === 'maior') return parseFloat(raw) > parseFloat(f.valor);
  if (f.operador === 'menor') return parseFloat(raw) < parseFloat(f.valor);
  if (f.operador === 'eh') return raw === f.valor;
  return true;
}

export default function FunilPage({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const { leads, loading: loadingLeads, addLead, updateLead, deleteLead } = useLeads();
  const { funis, loading: loadingFunis, addFunil, updateFunil, deleteFunil } = useFunis();
  const { usuarios } = useUsuarios();
  const { pessoas } = usePessoas();
  const { usuario } = useAuth();

  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null);
  useEffect(() => {
    if (!loadingFunis && funis.length > 0 && !selectedFunilId) {
      setSelectedFunilId(funis[0].id);
    }
  }, [funis, loadingFunis, selectedFunilId]);

  const { etapas, loading: loadingEtapas } = useFunilEtapas(selectedFunilId);
  const loading = loadingLeads || loadingFunis || loadingEtapas;

  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('criado_desc');
  const [proprietarioFilter, setProprietarioFilter] = useState<string>('todos');
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [filterDraft, setFilterDraft] = useState<Partial<ActiveFilter>>({ campo: 'nome', operador: 'contem' });
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [newPipelineNome, setNewPipelineNome] = useState('');
  const [creatingPipeline, setCreatingPipeline] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const selectedFunil = funis.find(f => f.id === selectedFunilId);

  const filteredLeads = useMemo(() => {
    let result = leads.filter(l => l.funil_id === selectedFunilId);

    // Filtro proprietário
    if (proprietarioFilter !== 'todos') {
      result = result.filter(l => l.proprietario_id === proprietarioFilter);
    }

    // Filtros avançados
    for (const f of filters) {
      result = result.filter(l => applyFilter(l, f));
    }

    // Ordenação
    result = [...result].sort((a, b) => {
      if (sortBy === 'criado_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'criado_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'valor_desc') return (b.valor ?? 0) - (a.valor ?? 0);
      if (sortBy === 'valor_asc') return (a.valor ?? 0) - (b.valor ?? 0);
      if (sortBy === 'nome_asc') return a.nome.localeCompare(b.nome);
      return 0;
    });

    return result;
  }, [leads, selectedFunilId, proprietarioFilter, filters, sortBy]);

  const totalValor = useMemo(() =>
    filteredLeads.reduce((s, l) => s + (l.valor ?? 0), 0),
    [filteredLeads]
  );

  // Ao mover etapa — atualiza e registra histórico
  const handleMoveEtapa = async (leadId: string, novaEtapa: FunilEtapa) => {
    await updateLead(leadId, { etapa_funil: novaEtapa.nome, etapa_id: novaEtapa.id });
  };

  const handleCreateNegocio = async (data: Record<string, unknown>) => {
    try {
      const { error } = await addLead({
        ...data,
        clinica_id: usuario?.clinica_id,
        funil_id: selectedFunilId,
      });
      if (error) throw error;
      toast.success('Negócio criado com sucesso!');
      setFormOpen(false);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Erro ao criar negócio');
    }
  };

  const handleDeleteLead = async (id: string) => {
    await deleteLead(id);
    setDetailLead(null);
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineNome.trim()) return;
    setCreatingPipeline(true);
    const { data, error } = await addFunil({
      nome: newPipelineNome.trim(),
      clinica_id: usuario?.clinica_id,
    });
    setCreatingPipeline(false);
    if (!error && data) {
      setSelectedFunilId(data.id);
      setNewPipelineNome('');
      toast.success('Pipeline criado!');
    } else {
      toast.error('Erro ao criar pipeline');
    }
  };

  const handleRename = async () => {
    if (!renamingId || !renameValue.trim()) return;
    await updateFunil(renamingId, { nome: renameValue.trim() });
    setRenamingId(null);
    toast.success('Pipeline renomeado');
  };

  const handleDeleteFunil = async (id: string) => {
    await deleteFunil(id);
    if (selectedFunilId === id) setSelectedFunilId(funis.find(f => f.id !== id)?.id || null);
    toast.success('Pipeline excluído');
  };

  const addFilter = () => {
    if (!filterDraft.campo || !filterDraft.operador || !filterDraft.valor?.trim()) return;
    setFilters(prev => [...prev, filterDraft as ActiveFilter]);
    setFilterDraft({ campo: 'nome', operador: 'contem', valor: '' });
    setFilterPopoverOpen(false);
  };

  const removeFilter = (idx: number) => {
    setFilters(prev => prev.filter((_, i) => i !== idx));
  };

  // Sincroniza detailLead com mudanças de leads (updates em tempo real)
  useEffect(() => {
    if (detailLead) {
      const updated = leads.find(l => l.id === detailLead.id);
      if (updated) setDetailLead(updated);
    }
  }, [leads]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-4 p-1">
        <div className="h-10 bg-muted animate-pulse rounded-lg w-64" />
        <div className="flex gap-3 overflow-x-auto">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-[260px] h-80 bg-muted/30 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Seletor de funil */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1.5 font-semibold min-w-[160px] justify-between">
              <span className="truncate">{selectedFunil?.nome || 'Selecionar pipeline'}</span>
              <ChevronDown size={14} className="flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            {funis.map(f => (
              <DropdownMenuItem
                key={f.id}
                className={f.id === selectedFunilId ? 'bg-primary/10 font-medium' : ''}
                onClick={() => setSelectedFunilId(f.id)}
              >
                {renamingId === f.id ? (
                  <input
                    autoFocus
                    className="dental-input w-full text-sm"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onBlur={handleRename}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
                  />
                ) : f.nome}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {/* Novo pipeline */}
            <div className="px-2 py-1.5">
              <div className="flex gap-1">
                <input
                  className="dental-input flex-1 text-xs h-7"
                  placeholder="Nome do pipeline..."
                  value={newPipelineNome}
                  onChange={e => setNewPipelineNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreatePipeline()}
                  onClick={e => e.stopPropagation()}
                />
                <Button size="sm" className="h-7 px-2 text-xs" disabled={creatingPipeline} onClick={handleCreatePipeline}>
                  <Plus size={12} />
                </Button>
              </div>
            </div>
            {selectedFunil && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setRenamingId(selectedFunil.id); setRenameValue(selectedFunil.nome); }}>
                  Renomear pipeline
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onNavigate?.('configuracoes')}
                >
                  Editar etapas
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDeleteFunil(selectedFunil.id)}
                >
                  Excluir pipeline
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Contagens */}
        <span className="text-sm text-muted-foreground">
          {filteredLeads.length} negócio{filteredLeads.length !== 1 ? 's' : ''}
        </span>
        <span className="text-sm font-medium text-foreground">
          {formatBRL(totalValor)}
        </span>

        <div className="flex-1" />

        {/* Filtros avançados */}
        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Filter size={13} />
              Filtros
              {filters.length > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                  {filters.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="end">
            <p className="text-xs font-semibold text-foreground mb-3">Adicionar filtro</p>
            <div className="space-y-2">
              <select
                className="dental-input w-full text-xs"
                value={filterDraft.campo}
                onChange={e => {
                  const campo = e.target.value as FilterCampo;
                  const ops = FILTER_OPTIONS.find(o => o.campo === campo)?.operadores || [];
                  setFilterDraft({ campo, operador: ops[0]?.op, valor: '' });
                }}
              >
                {FILTER_OPTIONS.map(o => <option key={o.campo} value={o.campo}>{o.label}</option>)}
              </select>
              <select
                className="dental-input w-full text-xs"
                value={filterDraft.operador}
                onChange={e => setFilterDraft(prev => ({ ...prev, operador: e.target.value as FilterOp }))}
              >
                {(FILTER_OPTIONS.find(o => o.campo === filterDraft.campo)?.operadores || []).map(op => (
                  <option key={op.op} value={op.op}>{op.label}</option>
                ))}
              </select>
              {filterDraft.campo === 'proprietario_id' ? (
                <select
                  className="dental-input w-full text-xs"
                  value={filterDraft.valor || ''}
                  onChange={e => setFilterDraft(prev => ({ ...prev, valor: e.target.value }))}
                >
                  <option value="">Selecionar...</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              ) : filterDraft.campo === 'etapa_id' ? (
                <select
                  className="dental-input w-full text-xs"
                  value={filterDraft.valor || ''}
                  onChange={e => setFilterDraft(prev => ({ ...prev, valor: e.target.value }))}
                >
                  <option value="">Selecionar...</option>
                  {etapas.map(et => <option key={et.id} value={et.id}>{et.nome}</option>)}
                </select>
              ) : filterDraft.campo === 'resultado' ? (
                <select
                  className="dental-input w-full text-xs"
                  value={filterDraft.valor || ''}
                  onChange={e => setFilterDraft(prev => ({ ...prev, valor: e.target.value }))}
                >
                  <option value="">Selecionar...</option>
                  <option value="ganho">Ganho</option>
                  <option value="perdido">Perdido</option>
                </select>
              ) : (
                <input
                  className="dental-input w-full text-xs"
                  placeholder="Valor..."
                  value={filterDraft.valor || ''}
                  onChange={e => setFilterDraft(prev => ({ ...prev, valor: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addFilter()}
                />
              )}
              <Button size="sm" className="w-full text-xs" onClick={addFilter}>
                Adicionar filtro
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Proprietário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <User size={13} />
              {proprietarioFilter === 'todos' ? 'Proprietário' : usuarios.find(u => u.id === proprietarioFilter)?.nome || 'Proprietário'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setProprietarioFilter('todos')}>Todos</DropdownMenuItem>
            <DropdownMenuSeparator />
            {usuarios.map(u => (
              <DropdownMenuItem key={u.id} onClick={() => setProprietarioFilter(u.id)}>
                {u.nome}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ordenação */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <SortAsc size={13} />
              {SORT_LABELS[sortBy].split(' ').slice(0, 2).join(' ')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([k, v]) => (
              <DropdownMenuItem
                key={k}
                className={sortBy === k ? 'bg-primary/10 font-medium' : ''}
                onClick={() => setSortBy(k)}
              >
                {v}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Novo negócio */}
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          disabled={funis.length === 0 || etapas.length === 0}
          onClick={() => setFormOpen(true)}
        >
          <Plus size={13} /> Negócio
        </Button>
      </div>

      {/* Chips de filtros ativos */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
          {filters.map((f, idx) => {
            const campoLabel = FILTER_OPTIONS.find(o => o.campo === f.campo)?.label || f.campo;
            const opLabel = FILTER_OPTIONS.find(o => o.campo === f.campo)?.operadores.find(op => op.op === f.operador)?.label || f.operador;
            let valLabel = f.valor;
            if (f.campo === 'proprietario_id') valLabel = usuarios.find(u => u.id === f.valor)?.nome || f.valor;
            if (f.campo === 'etapa_id') valLabel = etapas.find(e => e.id === f.valor)?.nome || f.valor;
            return (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {campoLabel} {opLabel} &quot;{valLabel}&quot;
                <button onClick={() => removeFilter(idx)} className="hover:text-destructive">
                  <X size={11} />
                </button>
              </span>
            );
          })}
          <button
            onClick={() => setFilters([])}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Board */}
      {funis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 border rounded-xl bg-card">
          <AlertTriangle size={40} className="text-amber-500" />
          <p className="text-muted-foreground">Nenhum pipeline criado ainda.</p>
          <Button variant="outline" onClick={() => onNavigate?.('configuracoes')}>
            Criar um pipeline
          </Button>
        </div>
      ) : etapas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 border rounded-xl bg-card">
          <p className="text-muted-foreground">O pipeline selecionado não possui etapas.</p>
          <Button variant="outline" onClick={() => onNavigate?.('configuracoes')}>
            Adicionar etapas
          </Button>
        </div>
      ) : (
        <FunilBoard
          leads={filteredLeads}
          etapas={etapas}
          onLeadClick={setDetailLead}
          onMoveEtapa={handleMoveEtapa}
        />
      )}

      {/* Formulário novo negócio */}
      <NegocioFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleCreateNegocio}
        etapas={etapas}
        pessoas={pessoas}
        usuarios={usuarios}
        funilId={selectedFunilId}
      />

      {/* Detalhe do negócio */}
      {detailLead && (
        <NegocioDetail
          lead={detailLead}
          etapas={etapas}
          funilNome={selectedFunil?.nome || ''}
          onClose={() => setDetailLead(null)}
          onUpdateLead={updateLead}
          onDelete={handleDeleteLead}
        />
      )}
    </div>
  );
}
