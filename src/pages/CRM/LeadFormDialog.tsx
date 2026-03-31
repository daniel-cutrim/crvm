import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Lead } from '@/types';
import { maskPhone } from '@/utils/masks';

const ORIGENS = ['Instagram', 'Google Ads', 'Indicação', 'Site', 'Facebook', 'Outro'];
const ETAPAS = ['Novo Lead', 'Em Contato', 'Avaliação marcada', 'Orçamento aprovado', 'Orçamento perdido'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  lead: Lead | null;
  etapas: string[];
}

export default function LeadFormDialog({ open, onClose, onSave, lead, etapas = [] }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    origem: '',
    interesse: '',
    etapa_funil: etapas.length > 0 ? etapas[0] : 'Novo Lead',
    proxima_acao_data: '',
    proxima_acao_tipo: '',
  });

  useEffect(() => {
    if (lead) {
      setForm({
        nome: lead.nome,
        telefone: lead.telefone || '',
        email: lead.email || '',
        origem: lead.origem || '',
        interesse: lead.interesse || '',
        etapa_funil: lead.etapa_funil,
        proxima_acao_data: lead.proxima_acao_data || '',
        proxima_acao_tipo: lead.proxima_acao_tipo || '',
      });
    } else {
      setForm({
        nome: '', telefone: '', email: '', origem: '', interesse: '',
        etapa_funil: etapas.length > 0 ? etapas[0] : 'Novo Lead', proxima_acao_data: '', proxima_acao_tipo: '',
      });
    }
  }, [lead, open, etapas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      nome: form.nome,
      telefone: form.telefone || null,
      email: form.email || null,
      origem: form.origem || null,
      interesse: form.interesse || null,
      etapa_funil: form.etapa_funil,
      proxima_acao_data: form.proxima_acao_data || null,
      proxima_acao_tipo: form.proxima_acao_tipo || null,
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
            {lead ? 'Editar Lead' : 'Novo Lead'}
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
              placeholder="Nome do lead"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Origem</label>
              <select
                value={form.origem}
                onChange={e => setForm(p => ({ ...p, origem: e.target.value }))}
                className="dental-input"
              >
                <option value="">Selecionar</option>
                {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Etapa</label>
              <select
                value={form.etapa_funil}
                onChange={e => setForm(p => ({ ...p, etapa_funil: e.target.value }))}
                className="dental-input"
              >
                {etapas.map(et => <option key={et} value={et}>{et}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Interesse</label>
            <input
              type="text"
              value={form.interesse}
              onChange={e => setForm(p => ({ ...p, interesse: e.target.value }))}
              className="dental-input"
              placeholder="Ex: Implante, Clareamento, Ortodontia"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Próxima ação - data</label>
              <input
                type="date"
                value={form.proxima_acao_data}
                onChange={e => setForm(p => ({ ...p, proxima_acao_data: e.target.value }))}
                className="dental-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Tipo da ação</label>
              <input
                type="text"
                value={form.proxima_acao_tipo}
                onChange={e => setForm(p => ({ ...p, proxima_acao_tipo: e.target.value }))}
                className="dental-input"
                placeholder="Ex: Ligar, WhatsApp"
              />
            </div>
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
              {saving ? 'Salvando...' : lead ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
