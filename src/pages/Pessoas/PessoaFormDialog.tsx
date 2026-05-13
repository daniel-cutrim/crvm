import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Pessoa } from '@/types';
import { maskPhone } from '@/utils/masks';

interface PessoaFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  pessoa?: Pessoa | null;
}

export default function PessoaFormDialog({ open, onClose, onSave, pessoa }: PessoaFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    organizacao: '',
    observacoes: '',
  });

  useEffect(() => {
    if (pessoa) {
      setForm({
        nome: pessoa.nome,
        email: pessoa.email || '',
        telefone: pessoa.telefone || '',
        organizacao: pessoa.organizacao || '',
        observacoes: pessoa.observacoes || '',
      });
    } else {
      setForm({ nome: '', email: '', telefone: '', organizacao: '', observacoes: '' });
    }
  }, [pessoa, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      nome: form.nome,
      email: form.email || null,
      telefone: form.telefone || null,
      organizacao: form.organizacao || null,
      observacoes: form.observacoes || null,
    });
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4 border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {pessoa ? 'Editar Pessoa' : 'Nova Pessoa'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              className="dental-input"
              placeholder="Nome completo"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="dental-input"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Telefone</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={e => setForm(p => ({ ...p, telefone: maskPhone(e.target.value) }))}
                className="dental-input"
                placeholder="(21) 99999-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Organização</label>
            <input
              type="text"
              value={form.organizacao}
              onChange={e => setForm(p => ({ ...p, organizacao: e.target.value }))}
              className="dental-input"
              placeholder="Empresa ou clínica"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
              className="dental-input resize-none"
              placeholder="Notas adicionais..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg
                hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-[0.97]"
            >
              {saving ? 'Salvando...' : pessoa ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
