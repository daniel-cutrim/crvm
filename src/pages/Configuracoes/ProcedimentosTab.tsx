import { useState } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useProcedimentosPadrao } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Stethoscope, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProcedimentoPadrao } from '@/types';

export default function ProcedimentosTab() {
  const { procedimentos, loading, addProcedimento, updateProcedimento, deleteProcedimento } = useProcedimentosPadrao();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcedimentoPadrao | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', valor_base: '', descricao: '' });

  const openNew = () => {
    setEditing(null);
    setForm({ nome: '', valor_base: '', descricao: '' });
    setOpen(true);
  };

  const openEdit = (p: ProcedimentoPadrao) => {
    setEditing(p);
    setForm({ nome: p.nome, valor_base: String(p.valor_base), descricao: p.descricao || '' });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    const payload = { nome: form.nome, valor_base: parseFloat(form.valor_base) || 0, descricao: form.descricao || null };
    try {
      if (editing) {
        const { error } = await updateProcedimento(editing.id, payload);
        if (error) throw error;
        toast.success('Procedimento atualizado');
      } else {
        const { error } = await addProcedimento(payload);
        if (error) throw error;
        toast.success('Procedimento criado');
      }
      setOpen(false);
    } catch {
      toast.error('Erro ao salvar procedimento');
    }
    setSaving(false);
  };

  const handleDelete = async (p: ProcedimentoPadrao) => {
    if (!await confirmDialog({ description: `Excluir "${p.nome}"?` })) return;
    const { error } = await deleteProcedimento(p.id);
    if (error) toast.error('Erro ao excluir');
    else toast.success('Procedimento excluído');
  };

  const toggleAtivo = async (p: ProcedimentoPadrao) => {
    const { error } = await updateProcedimento(p.id, { ativo: !p.ativo });
    if (error) toast.error('Erro ao atualizar');
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Stethoscope className="h-5 w-5 text-primary" />
            Procedimentos ({procedimentos.length})
          </CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Procedimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor Base</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {procedimentos.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{p.descricao || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(p.valor_base)}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleAtivo(p)} className="cursor-pointer">
                      <Badge variant={p.ativo ? 'default' : 'secondary'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {procedimentos.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum procedimento cadastrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Limpeza dental" />
            </div>
            <div className="space-y-2">
              <Label>Valor Base (R$)</Label>
              <Input type="number" step="0.01" min="0" value={form.valor_base} onChange={e => setForm(f => ({ ...f, valor_base: e.target.value }))} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} placeholder="Descrição do procedimento..." />
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
    </>
  );
}
