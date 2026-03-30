import { useState, useEffect } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { format } from 'date-fns';
import { X, Trash2 } from 'lucide-react';
import type { Receita, Paciente } from '@/types';

const FORMAS = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Boleto', 'Convênio'];
const STATUS_LIST = ['Pago', 'Parcial', 'Em aberto'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  receita: Receita | null;
  pacientes: Paciente[];
}

export default function ReceitaFormDialog({ open, onClose, onSave, onDelete, receita, pacientes }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    paciente_id: '',
    procedimento: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    forma_pagamento: 'PIX',
    valor: '',
    status: 'Em aberto',
  });

  useEffect(() => {
    if (receita) {
      setForm({
        paciente_id: receita.paciente_id,
        procedimento: receita.procedimento || '',
        data: receita.data,
        forma_pagamento: receita.forma_pagamento,
        valor: String(receita.valor),
        status: receita.status,
      });
    } else {
      setForm({
        paciente_id: '', procedimento: '', data: format(new Date(), 'yyyy-MM-dd'),
        forma_pagamento: 'PIX', valor: '', status: 'Em aberto',
      });
    }
  }, [receita, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      paciente_id: form.paciente_id,
      procedimento: form.procedimento || null,
      data: form.data,
      forma_pagamento: form.forma_pagamento,
      valor: Number(form.valor),
      status: form.status,
    });
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto mx-4 border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{receita ? 'Editar Receita' : 'Nova Receita'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Paciente *</label>
            <select value={form.paciente_id} onChange={e => setForm(p => ({ ...p, paciente_id: e.target.value }))} className="dental-input" required>
              <option value="">Selecione</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Procedimento</label>
            <input type="text" value={form.procedimento} onChange={e => setForm(p => ({ ...p, procedimento: e.target.value }))}
              className="dental-input" placeholder="Ex: Limpeza" />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Forma de Pagamento</label>
              <select value={form.forma_pagamento} onChange={e => setForm(p => ({ ...p, forma_pagamento: e.target.value }))} className="dental-input">
                {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="dental-input">
                {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {receita && (
              <button type="button" onClick={async () => { if (await confirmDialog({ description: 'Excluir receita?' })) onDelete(receita.id); }}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                <Trash2 size={14} /> Excluir
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-[0.97]">
              {saving ? 'Salvando...' : receita ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
