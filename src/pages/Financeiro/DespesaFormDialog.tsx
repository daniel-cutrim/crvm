import { useState, useEffect } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { format } from 'date-fns';
import { X, Trash2 } from 'lucide-react';
import type { Despesa } from '@/types';

const CATEGORIAS = ['Aluguel', 'Materiais', 'Equipe', 'Marketing', 'Manutenção', 'Outros'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  despesa: Despesa | null;
}

export default function DespesaFormDialog({ open, onClose, onSave, onDelete, despesa }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    descricao: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    categoria: 'Outros',
    valor: '',
  });

  useEffect(() => {
    if (despesa) {
      setForm({
        descricao: despesa.descricao,
        data: despesa.data,
        categoria: despesa.categoria,
        valor: String(despesa.valor),
      });
    } else {
      setForm({ descricao: '', data: format(new Date(), 'yyyy-MM-dd'), categoria: 'Outros', valor: '' });
    }
  }, [despesa, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      descricao: form.descricao,
      data: form.data,
      categoria: form.categoria,
      valor: Number(form.valor),
    });
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto mx-4 border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{despesa ? 'Editar Despesa' : 'Nova Despesa'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Descrição *</label>
            <input type="text" value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              className="dental-input" placeholder="Ex: Compra de materiais" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Data *</label>
              <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} className="dental-input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Valor (R$) *</label>
              <input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                className="dental-input" placeholder="0,00" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Categoria</label>
            <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} className="dental-input">
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {despesa && (
              <button type="button" onClick={async () => { if (await confirmDialog({ description: 'Excluir despesa?' })) onDelete(despesa.id); }}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                <Trash2 size={14} /> Excluir
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-[0.97]">
              {saving ? 'Salvando...' : despesa ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
