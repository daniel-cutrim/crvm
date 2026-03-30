import { useState } from 'react';
import { useSetores } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, Trash2, Edit2, Network, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Setor } from '@/types';

export default function SetoresTab() {
  const { setores, loading, addSetor, updateSetor, deleteSetor } = useSetores();
  const { usuario } = useAuth();
  const [saving, setSaving] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '' });

  const resetForm = () => {
    setForm({ nome: '', descricao: '' });
    setEditingId(null);
  };

  const handleEdit = (setor: Setor) => {
    setEditingId(setor.id);
    setForm({ nome: setor.nome, descricao: setor.descricao || '' });
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('O nome do setor é obrigatório');
      return;
    }
    
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await updateSetor(editingId, { 
          nome: form.nome, 
          descricao: form.descricao 
        });
        if (error) throw error;
        toast.success('Setor atualizado com sucesso!');
      } else {
        const { error } = await addSetor({ 
          nome: form.nome, 
          descricao: form.descricao,
          clinica_id: usuario?.clinica_id 
        });
        if (error) throw error;
        toast.success('Setor criado com sucesso!');
      }
      resetForm();
    } catch {
      toast.error('Erro ao salvar o setor');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este setor? Esta ação não pode ser desfeita e pode impactar os funis e conversas.')) return;
    try {
      const { error } = await deleteSetor(id);
      if (error) throw error;
      toast.success('Setor excluído com sucesso');
    } catch {
      toast.error('Erro ao excluir setor, ele pode estar em uso');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingId ? 'Editar Setor' : 'Novo Setor'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Setor *</Label>
              <Input 
                id="nome" 
                value={form.nome} 
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} 
                placeholder="Ex: Vendas, Recepção, Financeiro" 
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
      
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Network className="h-5 w-5 text-primary" />
              Setores Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {setores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum setor cadastrado ainda.</p>
                <p className="text-sm">Os setores são essenciais para organizar os funis e atendimentos do WhatsApp.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {setores.map(setor => (
                  <div key={setor.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                    <div>
                      <h4 className="font-medium text-foreground">{setor.nome}</h4>
                      {setor.descricao && <p className="text-sm text-muted-foreground">{setor.descricao}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(setor)}>
                        <Edit2 className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(setor.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
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
  );
}
