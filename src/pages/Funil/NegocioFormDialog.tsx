import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FunilEtapa, Pessoa, Usuario } from '@/types';

const ORIGENS = ['Instagram', 'Google Ads', 'Facebook', 'Site', 'Indicação', 'WhatsApp', 'Outro'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  etapas: FunilEtapa[];
  pessoas: Pessoa[];
  usuarios: Usuario[];
  funilId: string | null;
}

export default function NegocioFormDialog({ open, onClose, onSave, etapas, pessoas, usuarios, funilId }: Props) {
  const [nome, setNome] = useState('');
  const [pessoaId, setPessoaId] = useState('');
  const [proprietarioId, setProprietarioId] = useState('');
  const [valor, setValor] = useState('');
  const [etapaId, setEtapaId] = useState('');
  const [dataFechamento, setDataFechamento] = useState('');
  const [origem, setOrigem] = useState('');
  const [pessoaSearch, setPessoaSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(''); setPessoaId(''); setProprietarioId(''); setValor('');
      setEtapaId(etapas[0]?.id || ''); setDataFechamento(''); setOrigem('');
      setPessoaSearch('');
    }
  }, [open, etapas]);

  const filteredPessoas = pessoas.filter(p =>
    !pessoaSearch || p.nome.toLowerCase().includes(pessoaSearch.toLowerCase())
  ).slice(0, 8);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    const etapa = etapas.find(et => et.id === etapaId) || etapas[0];
    await onSave({
      nome: nome.trim(),
      pessoa_id: pessoaId || null,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Negócio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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

          {/* Pessoa */}
          <div className="space-y-1.5">
            <Label>Pessoa vinculada</Label>
            <input
              className="dental-input w-full"
              value={pessoaSearch}
              onChange={e => { setPessoaSearch(e.target.value); setPessoaId(''); }}
              placeholder="Buscar pessoa por nome..."
            />
            {pessoaSearch && !pessoaId && filteredPessoas.length > 0 && (
              <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden max-h-40 overflow-y-auto">
                {filteredPessoas.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPessoaId(p.id); setPessoaSearch(p.nome); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{p.nome}</span>
                    {p.telefone && <span className="text-muted-foreground text-xs ml-2">{p.telefone}</span>}
                  </button>
                ))}
              </div>
            )}
            {pessoaId && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-emerald-600">✓ Vinculado</span>
                <button type="button" onClick={() => { setPessoaId(''); setPessoaSearch(''); }}>
                  <X size={12} />
                </button>
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
              {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!nome.trim() || saving}>
              {saving ? 'Salvando...' : 'Criar Negócio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
