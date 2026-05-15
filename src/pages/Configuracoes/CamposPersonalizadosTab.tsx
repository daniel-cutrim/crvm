import { useState } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  MoreHorizontal,
  GripVertical,
  Loader2,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';
import { useCamposCategorias, useFunis } from '@/hooks/useData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { CampoCategoria, CampoPersonalizado } from '@/types';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPO_ICONS: Record<CampoPersonalizado['tipo'], string> = {
  texto: 'T',
  numero: '#',
  data: '📅',
  lista: '☰',
  booleano: '✓',
  moeda: 'R$',
};

const TIPO_LABELS: Record<CampoPersonalizado['tipo'], string> = {
  texto: 'Texto',
  numero: 'Número',
  data: 'Data',
  lista: 'Lista',
  booleano: 'Sim/Não',
  moeda: 'Moeda',
};

// ─── Tipos internos dos forms ─────────────────────────────────────────────────

interface CategoriaFormState {
  nome: string;
  funis_ids: string[];
}

interface CampoFormState {
  categoria_id: string;
  nome: string;
  tipo: CampoPersonalizado['tipo'];
  opcoes_lista: string;
  obrigatorio: boolean;
}

const emptyCategoriaForm = (): CategoriaFormState => ({ nome: '', funis_ids: [] });
const emptyCampoForm = (): CampoFormState => ({
  categoria_id: '',
  nome: '',
  tipo: 'texto',
  opcoes_lista: '',
  obrigatorio: false,
});

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CamposPersonalizadosTab() {
  const { usuario } = useAuth();
  const { categorias, loading, addCategoria, updateCategoria, deleteCategoria, fetchCategorias } =
    useCamposCategorias();
  const { funis } = useFunis();

  // accordion
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // campos ocultos localmente (toggle de visibilidade)
  const [hiddenCampos, setHiddenCampos] = useState<Set<string>>(new Set());

  // dialog categoria
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CampoCategoria | null>(null);
  const [catForm, setCatForm] = useState<CategoriaFormState>(emptyCategoriaForm());
  const [savingCat, setSavingCat] = useState(false);

  // dialog campo
  const [campoDialogOpen, setCampoDialogOpen] = useState(false);
  const [editingCampo, setEditingCampo] = useState<CampoPersonalizado | null>(null);
  const [campoForm, setCampoForm] = useState<CampoFormState>(emptyCampoForm());
  const [savingCampo, setSavingCampo] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleHidden = (id: string) => {
    setHiddenCampos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFunil = (funilId: string) => {
    setCatForm(prev => ({
      ...prev,
      funis_ids: prev.funis_ids.includes(funilId)
        ? prev.funis_ids.filter(id => id !== funilId)
        : [...prev.funis_ids, funilId],
    }));
  };

  // ── Categoria handlers ────────────────────────────────────────────────────────

  const openNewCat = () => {
    setEditingCat(null);
    setCatForm(emptyCategoriaForm());
    setCatDialogOpen(true);
  };

  const openEditCat = (cat: CampoCategoria) => {
    setEditingCat(cat);
    setCatForm({ nome: cat.nome, funis_ids: cat.funis_ids ?? [] });
    setCatDialogOpen(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.nome.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }
    setSavingCat(true);
    try {
      if (editingCat) {
        const { error } = await updateCategoria(editingCat.id, {
          nome: catForm.nome.trim(),
          funis_ids: catForm.funis_ids,
        });
        if (error) throw error;
        toast.success('Categoria atualizada!');
      } else {
        const { error } = await addCategoria({
          nome: catForm.nome.trim(),
          funis_ids: catForm.funis_ids,
          ordem: categorias.length + 1,
          empresa_id: usuario?.empresa_id,
        });
        if (error) throw error;
        toast.success('Categoria criada!');
      }
      setCatDialogOpen(false);
    } catch {
      toast.error('Erro ao salvar categoria');
    }
    setSavingCat(false);
  };

  const handleDeleteCat = async (cat: CampoCategoria) => {
    const confirmed = await confirmDialog({
      description: `Excluir a categoria "${cat.nome}" e todos os seus campos?`,
    });
    if (!confirmed) return;
    try {
      const { error } = await deleteCategoria(cat.id);
      if (error) throw error;
      toast.success('Categoria excluída');
    } catch {
      toast.error('Erro ao excluir categoria');
    }
  };

  // ── Campo handlers ────────────────────────────────────────────────────────────

  const openNewCampo = (categoriaId?: string) => {
    setEditingCampo(null);
    setCampoForm({ ...emptyCampoForm(), categoria_id: categoriaId ?? '' });
    setCampoDialogOpen(true);
  };

  const openEditCampo = (campo: CampoPersonalizado) => {
    setEditingCampo(campo);
    setCampoForm({
      categoria_id: campo.categoria_id,
      nome: campo.nome,
      tipo: campo.tipo,
      opcoes_lista: campo.opcoes_lista?.join('\n') ?? '',
      obrigatorio: campo.obrigatorio,
    });
    setCampoDialogOpen(true);
  };

  const handleSaveCampo = async () => {
    if (!campoForm.categoria_id) {
      toast.error('Selecione uma categoria');
      return;
    }
    if (!campoForm.nome.trim()) {
      toast.error('Nome do campo é obrigatório');
      return;
    }

    const opcoes =
      campoForm.tipo === 'lista'
        ? campoForm.opcoes_lista
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean)
        : null;

    setSavingCampo(true);
    try {
      if (editingCampo) {
        const { error } = await (
          await import('@/integrations/supabase/client')
        ).supabase
          .from('campos_personalizados')
          .update({
            categoria_id: campoForm.categoria_id,
            nome: campoForm.nome.trim(),
            tipo: campoForm.tipo,
            opcoes_lista: opcoes,
            obrigatorio: campoForm.obrigatorio,
          })
          .eq('id', editingCampo.id);
        if (error) throw error;
        toast.success('Campo atualizado!');
      } else {
        // Calcula a próxima ordem dentro da categoria
        const catAtual = categorias.find(c => c.id === campoForm.categoria_id);
        const ordemAtual = (catAtual?.campos?.length ?? 0) + 1;

        const { error } = await (
          await import('@/integrations/supabase/client')
        ).supabase.from('campos_personalizados').insert({
          categoria_id: campoForm.categoria_id,
          nome: campoForm.nome.trim(),
          tipo: campoForm.tipo,
          opcoes_lista: opcoes,
          obrigatorio: campoForm.obrigatorio,
          ordem: ordemAtual,
        });
        if (error) throw error;
        toast.success('Campo criado!');
      }
      setCampoDialogOpen(false);
      fetchCategorias();
    } catch {
      toast.error('Erro ao salvar campo');
    }
    setSavingCampo(false);
  };

  const handleDeleteCampo = async (campo: CampoPersonalizado) => {
    const confirmed = await confirmDialog({
      description: `Excluir o campo "${campo.nome}"?`,
    });
    if (!confirmed) return;
    try {
      const { error } = await (
        await import('@/integrations/supabase/client')
      ).supabase.from('campos_personalizados').delete().eq('id', campo.id);
      if (error) throw error;
      toast.success('Campo excluído');
      fetchCategorias();
    } catch {
      toast.error('Erro ao excluir campo');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Campos Personalizados
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crie campos adicionais para armazenar informações específicas nos leads
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={openNewCat}>
            Nova Categoria
          </Button>
          <Button size="sm" onClick={() => openNewCampo()}>
            <Plus className="h-4 w-4 mr-1" /> Novo Campo
          </Button>
        </div>
      </div>

      {/* Lista de categorias */}
      {categorias.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <SlidersHorizontal className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhuma categoria criada ainda.</p>
          <p className="text-xs mt-1">Clique em "Nova Categoria" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categorias.map(cat => {
            const isExpanded = expandedIds.has(cat.id);
            const campos = cat.campos ?? [];
            return (
              <div key={cat.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Header da categoria */}
                <div
                  className="flex items-center gap-2 p-3 hover:bg-muted/30 cursor-pointer select-none"
                  onClick={() => toggleExpand(cat.id)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium text-sm flex-1">{cat.nome}</span>
                  <Badge variant="secondary" className="text-xs">
                    {campos.length} {campos.length === 1 ? 'campo' : 'campos'}
                  </Badge>

                  {/* Menu ... */}
                  {cat.is_sistema ? (
                    <span title="Categoria do sistema — não editável" className="flex items-center justify-center h-7 w-7">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </span>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            openEditCat(cat);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-2" />
                          Editar categoria
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            openNewCampo(cat.id);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-2" />
                          Novo campo aqui
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500 focus:text-red-500"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteCat(cat);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Excluir categoria
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Campos expandidos */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {campos.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Nenhum campo nesta categoria.{' '}
                        <button
                          className="underline hover:text-foreground"
                          onClick={() => openNewCampo(cat.id)}
                        >
                          Adicionar campo
                        </button>
                      </div>
                    ) : (
                      campos.map(campo => {
                        const isHidden = hiddenCampos.has(campo.id);
                        return (
                          <div
                            key={campo.id}
                            className={`flex items-center justify-between p-3 border-b border-border last:border-0 transition-opacity ${
                              isHidden ? 'opacity-40' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                              <span className="w-6 h-6 flex items-center justify-center rounded bg-muted text-xs font-mono font-bold shrink-0">
                                {TIPO_ICONS[campo.tipo]}
                              </span>
                              <span className="text-sm font-medium truncate">{campo.nome}</span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {TIPO_LABELS[campo.tipo]}
                              </Badge>
                              {campo.obrigatorio && (
                                <Badge variant="destructive" className="text-xs shrink-0">
                                  Obrigatório
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {campo.is_sistema ? (
                                <span title="Campo do sistema — não editável" className="flex items-center justify-center h-7 w-7">
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                                </span>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title={isHidden ? 'Mostrar' : 'Ocultar'}
                                    onClick={() => toggleHidden(campo.id)}
                                  >
                                    {isHidden ? (
                                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => openEditCampo(campo)}
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleDeleteCampo(campo)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialog Nova/Editar Categoria ─────────────────────────────────────── */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Nome da categoria <span className="text-red-500">*</span>
              </Label>
              <Input
                value={catForm.nome}
                onChange={e => setCatForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Informações Clínicas"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Em quais funis esta categoria aparece?</Label>
              {funis.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum funil cadastrado.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {funis.map(funil => (
                    <div key={funil.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`funil-${funil.id}`}
                        checked={catForm.funis_ids.includes(funil.id)}
                        onCheckedChange={() => toggleFunil(funil.id)}
                      />
                      <label
                        htmlFor={`funil-${funil.id}`}
                        className="text-sm cursor-pointer select-none"
                      >
                        {funil.nome}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCat} disabled={savingCat}>
              {savingCat && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Novo/Editar Campo ──────────────────────────────────────────── */}
      <Dialog open={campoDialogOpen} onOpenChange={setCampoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCampo ? 'Editar Campo' : 'Novo Campo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Categoria */}
            <div className="space-y-1.5">
              <Label>
                Categoria <span className="text-red-500">*</span>
              </Label>
              <Select
                value={campoForm.categoria_id}
                onValueChange={v => setCampoForm(f => ({ ...f, categoria_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label>
                Nome do campo <span className="text-red-500">*</span>
              </Label>
              <Input
                value={campoForm.nome}
                onChange={e => setCampoForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Convênio, Alergias"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={campoForm.tipo}
                onValueChange={v =>
                  setCampoForm(f => ({ ...f, tipo: v as CampoPersonalizado['tipo'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_LABELS) as CampoPersonalizado['tipo'][]).map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs">{TIPO_ICONS[tipo]}</span>
                        {TIPO_LABELS[tipo]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Opções da lista */}
            {campoForm.tipo === 'lista' && (
              <div className="space-y-1.5">
                <Label>
                  Opções{' '}
                  <span className="text-xs text-muted-foreground">(uma por linha)</span>
                </Label>
                <textarea
                  className="w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                  value={campoForm.opcoes_lista}
                  onChange={e => setCampoForm(f => ({ ...f, opcoes_lista: e.target.value }))}
                  placeholder={`Opção 1\nOpção 2\nOpção 3`}
                />
              </div>
            )}

            {/* Obrigatório */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="campo-obrigatorio"
                checked={campoForm.obrigatorio}
                onCheckedChange={v =>
                  setCampoForm(f => ({ ...f, obrigatorio: Boolean(v) }))
                }
              />
              <label htmlFor="campo-obrigatorio" className="text-sm cursor-pointer select-none">
                Campo obrigatório
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCampoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCampo} disabled={savingCampo}>
              {savingCampo && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
