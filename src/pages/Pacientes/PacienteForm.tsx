import { useState, useEffect } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import type { Paciente, Usuario } from '@/types';
import { X } from 'lucide-react';
import { maskCPF, maskPhone, maskCEP } from '@/utils/masks';
import { isProfissional } from '@/utils/roles';
import { useClinicaConfig } from '@/hooks/useClinicaConfig';

interface PacienteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Paciente>) => void;
  onDelete?: (id: string) => void;
  paciente: Paciente | null;
  profissionais: Usuario[];
  isGestor?: boolean;
}

export default function PacienteForm({ isOpen, onClose, onSave, onDelete, paciente, profissionais, isGestor }: PacienteFormProps) {
  const { labelProfissional } = useClinicaConfig();
  function getInitialForm(p: Paciente | null) {
    return {
      nome: p?.nome || '', cpf: p?.cpf || '', data_nascimento: p?.data_nascimento || '',
      sexo: p?.sexo || '', telefone: p?.telefone || '', whatsapp: p?.whatsapp || '',
      email: p?.email || '', cep: p?.cep || '', rua: p?.rua || '', numero: p?.numero || '',
      complemento: p?.complemento || '', bairro: p?.bairro || '', cidade: p?.cidade || '',
      estado: p?.estado || '', informacoes_clinicas: p?.informacoes_clinicas || '',
      dentista_id: p?.dentista_id || '', status: p?.status || 'Ativo',
    };
  }

  const [form, setForm] = useState(() => getInitialForm(paciente));

  useEffect(() => {
    if (isOpen) {
      setForm(getInitialForm(paciente));
    }
  }, [isOpen, paciente]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      cpf: form.cpf || null, data_nascimento: form.data_nascimento || null,
      sexo: (form.sexo as Paciente['sexo']) || null, telefone: form.telefone || null,
      whatsapp: form.whatsapp || null, email: form.email || null,
      cep: form.cep || null, rua: form.rua || null, numero: form.numero || null,
      complemento: form.complemento || null, bairro: form.bairro || null,
      cidade: form.cidade || null, estado: form.estado || null,
      informacoes_clinicas: form.informacoes_clinicas || null,
      dentista_id: form.dentista_id || null,
      status: form.status as Paciente['status'],
    });
  };

  const profissionaisList = profissionais.filter(d => isProfissional(d.papel));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-card rounded-xl shadow-xl w-full max-w-2xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">{paciente ? 'Editar Paciente' : 'Novo Paciente'}</h3>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nome *</label>
                <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="dental-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">CPF</label>
                <input value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} className="dental-input" placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Telefone</label>
                <input value={form.telefone} onChange={e => setForm({...form, telefone: maskPhone(e.target.value)})} className="dental-input" placeholder="(21) 99999-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">WhatsApp</label>
                <input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: maskPhone(e.target.value)})} className="dental-input" placeholder="(21) 99999-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="dental-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Data de Nascimento</label>
                <input type="date" value={form.data_nascimento} onChange={e => setForm({...form, data_nascimento: e.target.value})} className="dental-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Sexo</label>
                <select value={form.sexo} onChange={e => setForm({...form, sexo: e.target.value})} className="dental-input">
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value as Paciente['status']})} className="dental-input">
                  <option value="Ativo">Ativo</option>
                  <option value="Em tratamento">Em tratamento</option>
                  <option value="Inadimplente">Inadimplente</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{labelProfissional} Responsável</label>
                <select value={form.dentista_id} onChange={e => setForm({...form, dentista_id: e.target.value})} className="dental-input">
                  <option value="">Nenhum</option>
                  {profissionaisList.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">CEP</label>
                <input value={form.cep} onChange={e => setForm({...form, cep: maskCEP(e.target.value)})} className="dental-input" placeholder="00000-000" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">Rua</label>
                <input value={form.rua} onChange={e => setForm({...form, rua: e.target.value})} className="dental-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Número</label>
                <input value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} className="dental-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Complemento</label>
                <input value={form.complemento} onChange={e => setForm({...form, complemento: e.target.value})} className="dental-input" placeholder="Apto, Bloco..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bairro</label>
                <input value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} className="dental-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Cidade</label>
                <input value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="dental-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Estado</label>
                <input value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} className="dental-input" placeholder="RJ" maxLength={2} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Informações Clínicas</label>
              <textarea rows={3} value={form.informacoes_clinicas} onChange={e => setForm({...form, informacoes_clinicas: e.target.value})} className="dental-input resize-none" />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              {paciente && isGestor && onDelete ? (
                <button type="button" onClick={async () => { if (await confirmDialog({ description: 'Tem certeza que deseja excluir este paciente?' })) onDelete(paciente.id); }}
                  className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                  Excluir Paciente
                </button>
              ) : <div />}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity active:scale-[0.97]">Salvar</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
