import { useState } from 'react';
import { useFunis, useFunilEtapas } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, Trash2, Edit2, Columns, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Funil, FunilEtapa } from '@/types';

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
      console.error('[FunisTab] Erro ao salvar etapa:', err);
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


export default function FunisTab() {
  const { funis, loading, addFunil, updateFunil, deleteFunil } = useFunis();
  const { usuario } = useAuth();
  const [saving, setSaving] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const resetForm = () => {
    setForm({ nome: '', descricao: '' });
    setEditingId(null);
  };

  const handleEdit = (funil: Funil) => {
    setEditingId(funil.id);
    setForm({ nome: funil.nome, descricao: funil.descricao || '' });
    if(expandedId === funil.id) setExpandedId(null);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('O nome do funil é obrigatório');
      return;
    }
    
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await updateFunil(editingId, { 
          nome: form.nome, 
          descricao: form.descricao 
        });
        if (error) throw error;
        toast.success('Funil atualizado com sucesso!');
      } else {
        const { error } = await addFunil({ 
          nome: form.nome, 
          descricao: form.descricao,
          clinica_id: usuario?.clinica_id 
        });
        if (error) throw error;
        toast.success('Funil criado com sucesso!');
      }
      resetForm();
    } catch {
      toast.error('Erro ao salvar o funil');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este funil? Ele precisa estar vazio e sem leads vinculados.')) return;
    try {
      const { error } = await deleteFunil(id);
      if (error) throw error;
      toast.success('Funil excluído com sucesso');
    } catch {
      toast.error('Erro ao excluir funil, ele pode estar em uso');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingId ? 'Editar Funil' : 'Novo Funil'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Funil *</Label>
              <Input 
                id="nome" 
                value={form.nome} 
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} 
                placeholder="Ex: Novos Pacientes, Retenção" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input 
                id="descricao" 
                value={form.descricao} 
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} 
                placeholder="Opcional" 
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : editingId ? (
                  <Save className="h-4 w-4 mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm} disabled={saving}>
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Columns className="h-5 w-5 text-primary" />
              Funis de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funis.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Columns className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum funil cadastrado.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {funis.map(funil => (
                  <div key={funil.id} className="p-4 border rounded-lg bg-card shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="cursor-pointer flex-1" onClick={() => setExpandedId(expandedId === funil.id ? null : funil.id)}>
                        <h4 className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
                          <Columns className="h-4 w-4 opacity-50" />
                          {funil.nome}
                        </h4>
                        {funil.descricao && <p className="text-sm text-muted-foreground mt-1 ml-6">{funil.descricao}</p>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setExpandedId(expandedId === funil.id ? null : funil.id)}>
                          Etapas
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleEdit(funil)}>
                          <Edit2 className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDelete(funil.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    {expandedId === funil.id && (
                      <FunilDetalhes funilId={funil.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
