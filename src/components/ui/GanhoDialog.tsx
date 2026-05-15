import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';
import type { Produto } from '@/types';

interface GanhoData {
  valor_coletado: number;
  valor_contrato: number;
  produtos_interesse: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: GanhoData) => Promise<void>;
  produtos: Produto[];
  onAddProduto: (nome: string) => Promise<{ data: Produto | null; error: unknown }>;
}

export default function GanhoDialog({ open, onClose, onConfirm, produtos, onAddProduto }: Props) {
  const [valorColetado, setValorColetado] = useState('');
  const [valorContrato, setValorContrato] = useState('');
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  const [novoProduto, setNovoProduto] = useState('');
  const [addingProduto, setAddingProduto] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetAndClose = () => {
    setValorColetado('');
    setValorContrato('');
    setProdutosSelecionados([]);
    setNovoProduto('');
    onClose();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetAndClose();
  };

  const toggleProduto = (nome: string) => {
    setProdutosSelecionados(prev =>
      prev.includes(nome) ? prev.filter(p => p !== nome) : [...prev, nome]
    );
  };

  const handleAddNovoProduto = async () => {
    if (!novoProduto.trim()) return;
    setAddingProduto(true);
    const { data, error } = await onAddProduto(novoProduto.trim());
    setAddingProduto(false);
    if (!error && data) {
      setProdutosSelecionados(prev => [...prev, data.nome]);
      setNovoProduto('');
    }
  };

  const canConfirm =
    parseFloat(valorColetado) > 0 &&
    parseFloat(valorContrato) > 0 &&
    produtosSelecionados.length > 0;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    await onConfirm({
      valor_coletado: parseFloat(valorColetado),
      valor_contrato: parseFloat(valorContrato),
      produtos_interesse: produtosSelecionados,
    });
    setSaving(false);
    resetAndClose();
  };

  const produtosAtivos = produtos.filter(p => p.ativo);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-emerald-600">Marcar como Ganho</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Preencha os dados obrigatórios para registrar este negócio como ganho.
          </p>

          <div className="space-y-1.5">
            <Label>
              Valor Coletado (R$) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={valorColetado}
              onChange={e => setValorColetado(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Valor efetivamente pago/coletado</p>
          </div>

          <div className="space-y-1.5">
            <Label>
              Valor do Contrato (R$) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={valorContrato}
              onChange={e => setValorContrato(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Valor total acordado no contrato</p>
          </div>

          <div className="space-y-2">
            <Label>
              Produtos de Interesse <span className="text-destructive">*</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">Selecione um ou mais produtos contratados</p>

            {produtosAtivos.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto border rounded-lg p-2">
                {produtosAtivos.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={produtosSelecionados.includes(p.nome)}
                      onChange={() => toggleProduto(p.nome)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {p.nome}
                  </label>
                ))}
              </div>
            )}

            {produtosAtivos.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Nenhum produto cadastrado. Adicione um abaixo ou acesse Configurações.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Novo produto..."
                value={novoProduto}
                onChange={e => setNovoProduto(e.target.value)}
                className="flex-1 h-8 text-sm"
                onKeyDown={e => { if (e.key === 'Enter') handleAddNovoProduto(); }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={handleAddNovoProduto}
                disabled={!novoProduto.trim() || addingProduto}
              >
                {addingProduto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </Button>
            </div>

            {produtosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {produtosSelecionados.map(p => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700"
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => toggleProduto(p)}
                      className="hover:text-emerald-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar Ganho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
