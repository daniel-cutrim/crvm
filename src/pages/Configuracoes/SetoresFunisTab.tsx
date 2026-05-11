import { useState } from 'react';
import { useSetores, useFunis, useFunilEtapas } from '@/hooks/useData';
import { useLeadOrigens } from '@/hooks/useLeadOrigens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Save, Trash2, Edit2, Network, Columns, Loader2, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Setor, Funil, FunilEtapa } from '@/types';

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
          clinica_id: usuario?.clinica_id
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
  const { setores, loading: loadingSetores, addSetor, updateSetor, deleteSetor } = useSetores();
  const { funis, loading: loadingFunis, addFunil, updateFunil, deleteFunil } = useFunis();
  const { origens, loading: loadingOrigens, addOrigem, updateOrigem, deleteOrigem } = useLeadOrigens();
  const { usuario } = useAuth();

  // Setores form
  const [setorForm, setSetorForm] = useState({ nome: '', descricao: '' });
  const [editingSetorId, setEditingSetorId] = useState<string | null>(null);
  const [savingSetor, setSavingSetor] = useState(false);

  // Funis form
  const [funilForm, setFunilForm] = useState({ nome: '', descricao: '' });
  const [editingFunilId, setEditingFunilId] = useState<string | null>(null);
  const [expandedFunilId, setExpandedFunilId] = useState<string | null>(null);
  const [savingFunil, setSavingFunil] = useState(false);

  // Origens form
  const [novaOrigem, setNovaOrigem] = useState('');
  const [savingOrigem, setSavingOrigem] = useState(false);

  // ── Setores handlers ──
  const resetSetorForm = () => { setSetorForm({ nome: '', descricao: '' }); setEditingSetorId(null); };

  const handleSaveSetor = async () => {
    if (!setorForm.nome.trim()) { toast.error('Nome do setor é obrigatório'); return; }
    setSavingSetor(true);
    try {
      if (editingSetorId) {
        const { error } = await updateSetor(editingSetorId, { nome: setorForm.nome, descricao: setorForm.descricao });
        if (error) throw error;
        toast.success('Setor atualizado!');
      } else {
        const { error } = await addSetor({ nome: setorForm.nome, descricao: setorForm.descricao, clinica_id: usuario?.clinica_id });
        if (error) throw error;
        toast.success('Setor criado!');
      }
      resetSetorForm();
    } catch { toast.error('Erro ao salvar setor'); }
    setSavingSetor(false);
  };

  const handleDeleteSetor = async (id: string) => {
    if (!window.confirm('Excluir este setor? Pode impactar funis e conversas.')) return;
    try {
      const { error } = await deleteSetor(id);
      if (error) throw error;
      toast.success('Setor excluído');
    } catch { toast.error('Erro ao excluir setor'); }
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
        const { error } = await addFunil({ nome: funilForm.nome, descricao: funilForm.descricao, clinica_id: usuario?.clinica_id });
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

  const isLoading = loadingSetores || loadingFunis || loadingOrigens;
  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* ═══════════════════ SETORES ═══════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Network className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Setores</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">{editingSetorId ? 'Editar Setor' : 'Novo Setor'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nome *</Label>
                <Input value={setorForm.nome} onChange={e => setSetorForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Vendas, Recepção" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Descrição</Label>
                <Input value={setorForm.descricao} onChange={e => setSetorForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSaveSetor} disabled={savingSetor} className="flex-1">
                  {savingSetor ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingSetorId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editingSetorId ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingSetorId && <Button variant="outline" onClick={resetSetorForm}>Cancelar</Button>}
              </div>
            </CardContent>
          </Card>
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-4">
                {setores.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Network className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhum setor cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {setores.map(setor => (
                      <div key={setor.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors">
                        <div>
                          <h4 className="font-medium text-sm">{setor.nome}</h4>
                          {setor.descricao && <p className="text-xs text-muted-foreground">{setor.descricao}</p>}
                        </div>
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditingSetorId(setor.id); setSetorForm({ nome: setor.nome, descricao: setor.descricao || '' }); }}>
                            <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDeleteSetor(setor.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
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
    </div>
  );
}
