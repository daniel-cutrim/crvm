import { useState, useMemo } from 'react';
import { Plus, Search, Users, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { usePessoas, useLeads } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import type { Pessoa } from '@/types';
import PessoaDetail from './PessoaDetail';
import PessoaFormDialog from './PessoaFormDialog';
import { toast } from 'sonner';

type SortField = 'nome' | 'organizacao' | 'negocios_abertos' | 'negocios_fechados';
type SortDir = 'asc' | 'desc';

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown size={13} className="text-muted-foreground/40" />;
  return dir === 'asc'
    ? <ChevronUp size={13} className="text-primary" />
    : <ChevronDown size={13} className="text-primary" />;
}

export default function PessoasPage() {
  const { usuario } = useAuth();
  const { pessoas, loading, addPessoa, updatePessoa, deletePessoa } = usePessoas();
  const { leads } = useLeads();

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailPessoa, setDetailPessoa] = useState<Pessoa | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<Pessoa | null>(null);

  // Compute negócios por pessoa
  const pessoasComNegocios = useMemo(() => {
    return pessoas.map(p => {
      const pessoaLeads = leads.filter(l => l.pessoa_id === p.id);
      return {
        ...p,
        negocios_abertos: pessoaLeads.filter(l => l.resultado == null).length,
        negocios_fechados: pessoaLeads.filter(l => l.resultado === 'ganho' || l.resultado === 'perdido').length,
      };
    });
  }, [pessoas, leads]);

  const filtered = useMemo(() => {
    let result = pessoasComNegocios;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.telefone?.toLowerCase().includes(q) ||
        p.organizacao?.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';

      if (sortField === 'nome') {
        av = a.nome.toLowerCase();
        bv = b.nome.toLowerCase();
      } else if (sortField === 'organizacao') {
        av = (a.organizacao || '').toLowerCase();
        bv = (b.organizacao || '').toLowerCase();
      } else if (sortField === 'negocios_abertos') {
        av = a.negocios_abertos ?? 0;
        bv = b.negocios_abertos ?? 0;
      } else if (sortField === 'negocios_fechados') {
        av = a.negocios_fechados ?? 0;
        bv = b.negocios_fechados ?? 0;
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [pessoasComNegocios, search, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (editingPessoa) {
        const { error } = await updatePessoa(editingPessoa.id, data);
        if (error) throw error;
        toast.success('Pessoa atualizada com sucesso!');
        // Atualiza o detail se estiver aberto
        if (detailPessoa?.id === editingPessoa.id) {
          setDetailPessoa(prev => prev ? { ...prev, ...(data as Partial<Pessoa>) } : prev);
        }
      } else {
        const { error } = await addPessoa({ ...data, empresa_id: usuario?.empresa_id });
        if (error) throw error;
        toast.success('Pessoa cadastrada com sucesso!');
      }
      setFormOpen(false);
      setEditingPessoa(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar pessoa';
      toast.error(msg);
    }
  };

  const handleEdit = (pessoa: Pessoa) => {
    setEditingPessoa(pessoa);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deletePessoa(id);
    if (error) {
      toast.error('Erro ao excluir pessoa');
    } else {
      toast.success('Pessoa excluída');
      setDetailPessoa(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="dental-card p-0 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 border-b border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pessoas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gerencie contatos e vincule-os a negócios
          </p>
        </div>
        <button
          onClick={() => { setEditingPessoa(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground
            rounded-lg text-sm font-medium hover:opacity-90 transition-opacity active:scale-[0.97]"
        >
          <Plus size={16} />
          Pessoa
        </button>
      </div>

      {/* Search + counter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="dental-input pl-9 w-full"
            placeholder="Buscar pessoas..."
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users size={15} />
          <span>
            <strong className="text-foreground">{filtered.length}</strong>{' '}
            {filtered.length === 1 ? 'pessoa' : 'pessoas'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={36} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? 'Nenhuma pessoa encontrada para esta busca.' : 'Nenhuma pessoa cadastrada ainda.'}
            </p>
            {!search && (
              <button
                onClick={() => { setEditingPessoa(null); setFormOpen(true); }}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                  text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <Plus size={15} />
                Adicionar primeira pessoa
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('nome')}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                    >
                      Nome
                      <SortIcon field="nome" current={sortField} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('organizacao')}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                    >
                      Organização
                      <SortIcon field="organizacao" current={sortField} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    E-mail
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleSort('negocios_abertos')}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors mx-auto"
                    >
                      Abertos
                      <SortIcon field="negocios_abertos" current={sortField} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleSort('negocios_fechados')}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors mx-auto"
                    >
                      Fechados
                      <SortIcon field="negocios_fechados" current={sortField} dir={sortDir} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(pessoa => (
                  <tr
                    key={pessoa.id}
                    onClick={() => setDetailPessoa(pessoa)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="w-10 px-4 py-3" onClick={e => toggleSelect(pessoa.id, e)}>
                      <input
                        type="checkbox"
                        checked={selected.has(pessoa.id)}
                        onChange={() => {}}
                        className="rounded border-border cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary text-xs font-semibold">
                            {pessoa.nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{pessoa.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {pessoa.organizacao || <span className="opacity-30">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {pessoa.email || <span className="opacity-30">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {pessoa.telefone || <span className="opacity-30">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(pessoa.negocios_abertos ?? 0) > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          {pessoa.negocios_abertos}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(pessoa.negocios_fechados ?? 0) > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                          {pessoa.negocios_fechados}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <PessoaFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingPessoa(null); }}
        onSave={handleSave}
        pessoa={editingPessoa}
      />

      {/* Detail Sheet */}
      <PessoaDetail
        pessoa={detailPessoa}
        onClose={() => setDetailPessoa(null)}
        onDelete={handleDelete}
        onEdit={handleEdit}
        leads={leads}
      />
    </div>
  );
}
