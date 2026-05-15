import { useState } from 'react';
import { useFunis, useFunilEtapas, useProdutos } from '@/hooks/useData';
import { useLeadOrigens } from '@/hooks/useLeadOrigens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Save, Trash2, Edit2, ShoppingBag, Columns, Loader2, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Funil, FunilEtapa } from '@/types';

// ─── Funnel Stages Sub-component ───
function FunilDetalhes({ funilId }: { funilId: string }) {
  const { etapas, loading, addEtapa, updateEtapa, deleteEtapa } = useFunilEtapas(funilId);
  const { usuario } = useAuth();
  const [form, setForm] = useState({ nome: '', cor: '#1992c9' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    try {
      if (editingId) {
        const { error } = await updateEtapa(editingId, { nome: form.nome, cor: form.cor });
        if (error) throw error;
      } else {
        const { error } = await addEtapa({
          funil_id: funilId,
          nome: form.nome,
          cor: form.cor,
          ordem: etapas.length + 1,
          empresa_id: usuario?.empresa_id
        });
        if (error) throw error;
      }
      setForm({ nome: '', cor: '#1992c9' });
      setEditingId(null);
      toast.success('Etapa salva com sucesso');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar etapa');
    }
  };

  if (loading) return <div className="text-center p-4"><Loader2 className="animate-spin inline" /></div>;

  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      <h5 className="font-medium text-sm text-muted-foreground mb-2">Etapas do Funil</h5>

      <div className="flex flex-col gap-2">
        {etapas.map(etapa => (
          <div key={etapa.id} className="flex items-center gap-2 p-2 border rounded bg-background">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: etapa.cor }} />
            <span className="flex-1 text-sm font-medium">{etapa.ordem}. {etapa.nome}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
              setEditingId(etapa.id);
              setForm({ nome: etapa.nome, cor: etapa.cor });
            }}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteEtapa(etapa.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-end pt-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Nova Etapa</Label>
          <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Contato Feito" className="h-8 text-sm" />
        </div>
        <div className="w-16 space-y-1">
          <Label className="text-xs">Cor</Label>
          <Input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} className="h-8 w-full p-1" />
        </div>
        <Button onClick={handleSave} size="sm" className="h-8">
          {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
        {editingId && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => {
            setEditingId(null);
            setForm({ nome: '', cor: '#1992c9' });
          }}>X</Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Unified Tab ───
export default function SetoresFunisTab() {
  const { funis, loading: loadingFunis, addFunil, updateFunil, deleteFunil } = useFunis();
  const { origens, loading: loadingOrigens, addOrigem, updateOrigem, deleteOrigem } = useLeadOrigens();
  const { usuario } = useAuth();

  // Funis form
  const [funilForm, setFunilForm] = useState({ nome: '', descricao: '' });
  const [editingFunilId, setEditingFunilId] = useState<string | null>(null);
  const [expandedFunilId, setExpandedFunilId] = useState<string | null>(null);
  const [savingFunil, setSavingFunil] = useState(false);

  // Origens form
  const [novaOrigem, setNovaOrigem] = useState('');
  const [savingOrigem, setSavingOrigem] = useState(false);

  // Produtos
  const { produtos, addProduto, updateProduto, deleteProduto } = useProdutos();
  const [novoProduto, setNovoProduto] = useState('');
  const [savingProduto, setSavingProduto] = useState(false);
  const [editandoProduto, setEditandoProduto] = useState<string | null>(null);
  const [editNomeProduto, setEditNomeProduto] = useState('');

  const handleAddProduto = async () => {
    if (!novoProduto.trim()) { toast.error('Informe o nome do produto'); return; }
    setSavingProduto(true);
    const { error } = await addProduto({ nome: novoProduto.trim(), empresa_id: usuario?.empresa_id, ativo: true });
    if (error) toast.error('Erro ao adicionar produto');
    else { toast.success('Produto adicionado!'); setNovoProduto(''); }
    setSavingProduto(false);
  };

  const handleUpdateProduto = async (id: string) => {
    if (!editNomeProduto.trim()) return;
    const { error } = await updateProduto(id, { nome: editNomeProduto.trim() });
    if (error) toast.error('Erro ao atualizar produto');
    else { toast.success('Produto atualizado!'); setEditandoProduto(null); }
  };

  // ── Funis handlers ──
  const resetFunilForm = () => { setFunilForm({ nome: '', descricao: '' }); setEditingFunilId(null); };

  const handleSaveFunil = async () => {
    if (!funilForm.nome.trim()) { toast.error('Nome do funil é obrigatório'); return; }
    setSavingFunil(true);
    try {
      if (editingFunilId) {
        const { error } = await updateFunil(editingFunilId, { nome: funilForm.nome, descricao: funilForm.descricao });
        if (error) throw error;
        toast.success('Funil atualizado!');
      } else {
        const { error } = await addFunil({ nome: funilForm.nome, descricao: funilForm.descricao, empresa_id: usuario?.empresa_id });
        if (error) throw error;
        toast.success('Funil criado!');
      }
      resetFunilForm();
    } catch { toast.error('Erro ao salvar funil'); }
    setSavingFunil(false);
  };

  const handleDeleteFunil = async (id: string) => {
    if (!window.confirm('Excluir este funil?')) return;
    try {
      const { error } = await deleteFunil(id);
      if (error) throw error;
      toast.success('Funil excluído');
    } catch { toast.error('Erro ao excluir funil'); }
  };

  // ── Origens handlers ──
  const handleAddOrigem = async () => {
    if (!novaOrigem.trim()) { toast.error('Informe o nome da origem'); return; }
    setSavingOrigem(true);
    const { error } = await addOrigem(novaOrigem.trim());
    if (error) toast.error('Erro ao adicionar origem');
    else { toast.success('Origem adicionada!'); setNovaOrigem(''); }
    setSavingOrigem(false);
  };

  const isLoading = loadingFunis || loadingOrigens;
  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* ═══════════════════ FUNIS DE VENDAS ═══════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Columns className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Funis de Vendas</h3>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">{editingFunilId ? 'Editar Funil' : 'Novo Funil'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nome *</Label>
                <Input value={funilForm.nome} onChange={e => setFunilForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Novos Pacientes" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Descrição</Label>
                <Input value={funilForm.descricao} onChange={e => setFunilForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSaveFunil} disabled={savingFunil} className="flex-1">
                  {savingFunil ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingFunilId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editingFunilId ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingFunilId && <Button variant="outline" onClick={resetFunilForm}>Cancelar</Button>}
              </div>
            </CardContent>
          </Card>
          <div className="xl:col-span-2">
            <Card>
              <CardContent className="p-4">
                {funis.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Columns className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhum funil cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {funis.map(funil => (
                      <div key={funil.id} className="p-4 border rounded-lg shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="cursor-pointer flex-1" onClick={() => setExpandedFunilId(expandedFunilId === funil.id ? null : funil.id)}>
                            <h4 className="font-medium text-sm hover:text-primary transition-colors flex items-center gap-2">
                              <Columns className="h-4 w-4 opacity-50" />
                              {funil.nome}
                            </h4>
                            {funil.descricao && <p className="text-xs text-muted-foreground mt-0.5 ml-6">{funil.descricao}</p>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button variant="secondary" size="sm" className="text-xs" onClick={() => setExpandedFunilId(expandedFunilId === funil.id ? null : funil.id)}>
                              Etapas
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                              setEditingFunilId(funil.id);
                              setFunilForm({ nome: funil.nome, descricao: funil.descricao || '' });
                              if (expandedFunilId === funil.id) setExpandedFunilId(null);
                            }}>
                              <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDeleteFunil(funil.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        {expandedFunilId === funil.id && <FunilDetalhes funilId={funil.id} />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* ═══════════════════ ORIGENS DE LEAD ═══════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Globe2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Origens de Lead</h3>
          <span className="text-xs text-muted-foreground ml-2">Gerencie de onde seus leads chegam</span>
        </div>
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Add new */}
            <div className="flex gap-2">
              <Input
                value={novaOrigem}
                onChange={e => setNovaOrigem(e.target.value)}
                placeholder="Nova origem (ex: TikTok, Evento)"
                className="flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAddOrigem(); }}
              />
              <Button onClick={handleAddOrigem} disabled={savingOrigem}>
                {savingOrigem ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar
              </Button>
            </div>

            {/* List */}
            {origens.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Globe2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma origem cadastrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {origens.map(origem => (
                  <div
                    key={origem.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      origem.ativo ? 'hover:bg-accent/5' : 'opacity-50 bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span className={`text-sm font-medium ${!origem.ativo ? 'line-through' : ''}`}>{origem.nome}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{origem.ativo ? 'Ativa' : 'Inativa'}</span>
                        <Switch
                          checked={origem.ativo}
                          onCheckedChange={(checked) => updateOrigem(origem.id, { ativo: checked })}
                          className="scale-75"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={async () => {
                          if (!window.confirm(`Excluir a origem "${origem.nome}"?`)) return;
                          const { error } = await deleteOrigem(origem.id);
                          if (error) toast.error('Erro ao excluir');
                          else toast.success('Origem excluída');
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <hr className="border-border" />

      {/* ═══════════════════ PRODUTOS DE INTERESSE ═══════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Produtos de Interesse</h3>
          <span className="text-xs text-muted-foreground ml-2">Usados ao marcar negócios como ganho</span>
        </div>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex gap-2">
              <Input
                value={novoProduto}
                onChange={e => setNovoProduto(e.target.value)}
                placeholder="Ex: Implante, Clareamento, Ortodontia"
                className="flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAddProduto(); }}
              />
              <Button onClick={handleAddProduto} disabled={savingProduto}>
                {savingProduto ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar
              </Button>
            </div>
            {produtos.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum produto cadastrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {produtos.map(produto => (
                  <div key={produto.id} className={`flex items-center gap-2 justify-between p-3 border rounded-lg transition-colors ${produto.ativo ? 'hover:bg-accent/5' : 'opacity-50 bg-muted/30'}`}>
                    {editandoProduto === produto.id ? (
                      <div className="flex gap-2 flex-1 mr-2">
                        <Input
                          value={editNomeProduto}
                          onChange={e => setEditNomeProduto(e.target.value)}
                          className="h-7 text-sm flex-1"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleUpdateProduto(produto.id); }}
                        />
                        <Button size="sm" className="h-7" onClick={() => handleUpdateProduto(produto.id)}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditandoProduto(null)}>X</Button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium flex-1">{produto.nome}</span>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={produto.ativo}
                        onCheckedChange={(checked) => updateProduto(produto.id, { ativo: checked })}
                        className="scale-75"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setEditandoProduto(produto.id);
                        setEditNomeProduto(produto.nome);
                      }}>
                        <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={async () => {
                        if (!window.confirm(`Excluir "${produto.nome}"?`)) return;
                        const { error } = await deleteProduto(produto.id);
                        if (error) toast.error('Erro ao excluir'); else toast.success('Produto excluído');
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
