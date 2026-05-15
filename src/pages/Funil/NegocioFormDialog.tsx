import { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { maskPhone } from '@/utils/masks';
import type { FunilEtapa, Pessoa, Usuario } from '@/types';
import { useLeadOrigens } from '@/hooks/useLeadOrigens';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  etapas: FunilEtapa[];
  pessoas: Pessoa[];
  usuarios: Usuario[];
  funilId: string | null;
  onAddPessoa: (data: Record<string, unknown>) => Promise<{ data: Pessoa | null; error: unknown }>;
}

export default function NegocioFormDialog({ open, onClose, onSave, etapas, pessoas, usuarios, funilId, onAddPessoa }: Props) {
  const { origensAtivas } = useLeadOrigens();
  const [nome, setNome] = useState('');
  const [pessoaId, setPessoaId] = useState('');
  const [proprietarioId, setProprietarioId] = useState('');
  const [valor, setValor] = useState('');
  const [etapaId, setEtapaId] = useState('');
  const [dataFechamento, setDataFechamento] = useState('');
  const [origem, setOrigem] = useState('');
  const [pessoaSearch, setPessoaSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Inline nova pessoa
  const [showNovaPessoa, setShowNovaPessoa] = useState(false);
  const [novaPessoa, setNovaPessoa] = useState({ nome: '', email: '', telefone: '' });
  const [savingPessoa, setSavingPessoa] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(''); setPessoaId(''); setProprietarioId(''); setValor('');
      setEtapaId(etapas[0]?.id || ''); setDataFechamento(''); setOrigem('');
      setPessoaSearch(''); setShowDropdown(false);
      setShowNovaPessoa(false); setNovaPessoa({ nome: '', email: '', telefone: '' });
    }
  }, [open, etapas]);

  const filteredPessoas = pessoas.filter(p =>
    !pessoaSearch || p.nome.toLowerCase().includes(pessoaSearch.toLowerCase())
  ).slice(0, 8);

  const handlePessoaSearch = (v: string) => {
    setPessoaSearch(v);
    setPessoaId('');
    setShowDropdown(true);
    setShowNovaPessoa(false);
  };

  const handleSelectPessoa = (p: Pessoa) => {
    setPessoaId(p.id);
    setPessoaSearch(p.nome);
    setShowDropdown(false);
  };

  const handleClearPessoa = () => {
    setPessoaId('');
    setPessoaSearch('');
    setShowDropdown(false);
  };

  const handleSaveNovaPessoa = async () => {
    if (!novaPessoa.nome.trim()) return;
    setSavingPessoa(true);
    const { data, error } = await onAddPessoa({
      nome: novaPessoa.nome.trim(),
      email: novaPessoa.email || null,
      telefone: novaPessoa.telefone || null,
    });
    setSavingPessoa(false);
    if (!error && data) {
      setPessoaId(data.id);
      setPessoaSearch(data.nome);
      setShowNovaPessoa(false);
      setNovaPessoa({ nome: '', email: '', telefone: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !pessoaId) return;
    setSaving(true);
    const etapa = etapas.find(et => et.id === etapaId) || etapas[0];
    await onSave({
      nome: nome.trim(),
      pessoa_id: pessoaId,
      proprietario_id: proprietarioId || null,
      valor: valor ? parseFloat(valor) : null,
      etapa_id: etapa?.id || null,
      etapa_funil: etapa?.nome || '',
      proxima_acao_data: dataFechamento || null,
      origem: origem || null,
      funil_id: funilId,
    });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo Negócio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2 overflow-y-auto flex-1 pr-1">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="neg-nome">Nome <span className="text-destructive">*</span></Label>
            <input
              id="neg-nome"
              className="dental-input w-full"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome do negócio..."
              required
            />
          </div>

          {/* Pessoa vinculada — obrigatório */}
          <div className="space-y-1.5">
            <Label>
              Pessoa vinculada <span className="text-destructive">*</span>
            </Label>

            {pessoaId ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20">
                <span className="flex-1 text-sm font-medium text-foreground truncate">{pessoaSearch}</span>
                <button type="button" onClick={handleClearPessoa} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      className="dental-input w-full pr-8"
                      value={pessoaSearch}
                      onChange={e => handlePessoaSearch(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Buscar pessoa por nome..."
                      autoComplete="off"
                    />
                    {pessoaSearch && (
                      <button
                        type="button"
                        onClick={handleClearPessoa}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowNovaPessoa(v => !v); setShowDropdown(false); }}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-border bg-muted hover:bg-muted/80 text-xs text-foreground transition-colors shrink-0"
                    title="Criar nova pessoa"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>

                {/* Dropdown de resultados */}
                {showDropdown && pessoaSearch && !pessoaId && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 border border-border rounded-lg bg-card shadow-md overflow-hidden max-h-40 overflow-y-auto">
                    {filteredPessoas.length > 0 ? (
                      filteredPessoas.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPessoa(p)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        >
                          <span className="font-medium">{p.nome}</span>
                          {p.telefone && <span className="text-muted-foreground text-xs ml-2">{p.telefone}</span>}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Nenhuma pessoa encontrada.{' '}
                        <button
                          type="button"
                          className="text-primary underline"
                          onClick={() => { setShowDropdown(false); setShowNovaPessoa(true); }}
                        >
                          Criar nova
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Mini-form nova pessoa */}
                {showNovaPessoa && (
                  <div className="mt-2 p-3 border border-border rounded-lg bg-muted/30 space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <UserPlus size={13} /> Criar nova pessoa
                    </p>
                    <input
                      className="dental-input w-full"
                      placeholder="Nome *"
                      value={novaPessoa.nome}
                      onChange={e => setNovaPessoa(p => ({ ...p, nome: e.target.value }))}
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="dental-input w-full"
                        placeholder="E-mail"
                        type="email"
                        value={novaPessoa.email}
                        onChange={e => setNovaPessoa(p => ({ ...p, email: e.target.value }))}
                      />
                      <input
                        className="dental-input w-full"
                        placeholder="Telefone"
                        type="tel"
                        value={novaPessoa.telefone}
                        onChange={e => setNovaPessoa(p => ({ ...p, telefone: maskPhone(e.target.value) }))}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowNovaPessoa(false)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!novaPessoa.nome.trim() || savingPessoa}
                        onClick={handleSaveNovaPessoa}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {savingPessoa ? 'Salvando...' : 'Criar pessoa'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Proprietário */}
          <div className="space-y-1.5">
            <Label htmlFor="neg-prop">Proprietário</Label>
            <select
              id="neg-prop"
              className="dental-input w-full"
              value={proprietarioId}
              onChange={e => setProprietarioId(e.target.value)}
            >
              <option value="">Sem proprietário</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <Label htmlFor="neg-valor">Valor (R$)</Label>
            <input
              id="neg-valor"
              type="number"
              min="0"
              step="0.01"
              className="dental-input w-full"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>

          {/* Etapa */}
          <div className="space-y-1.5">
            <Label htmlFor="neg-etapa">Etapa inicial</Label>
            <select
              id="neg-etapa"
              className="dental-input w-full"
              value={etapaId}
              onChange={e => setEtapaId(e.target.value)}
            >
              {etapas.map(et => <option key={et.id} value={et.id}>{et.nome}</option>)}
            </select>
          </div>

          {/* Data fechamento */}
          <div className="space-y-1.5">
            <Label htmlFor="neg-data">Data de fechamento esperado</Label>
            <input
              id="neg-data"
              type="date"
              className="dental-input w-full"
              value={dataFechamento}
              onChange={e => setDataFechamento(e.target.value)}
            />
          </div>

          {/* Origem */}
          <div className="space-y-1.5">
            <Label htmlFor="neg-origem">Origem</Label>
            <select
              id="neg-origem"
              className="dental-input w-full"
              value={origem}
              onChange={e => setOrigem(e.target.value)}
            >
              <option value="">Selecionar...</option>
              {origensAtivas.map(o => <option key={o.id} value={o.nome}>{o.nome}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!nome.trim() || !pessoaId || saving}>
              {saving ? 'Salvando...' : 'Criar Negócio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
