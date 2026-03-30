import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CANAIS_MARKETING } from '@/types/marketing';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Record<string, unknown>) => Promise<{ error: Record<string, unknown> }>;
  initialData?: Record<string, unknown>;
}

export default function InvestimentoFormDialog({ open, onOpenChange, onSave, initialData }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    canal: initialData?.canal || 'Google Ads',
    mes: initialData?.mes || format(new Date(), 'yyyy-MM-01'),
    valor_investido: initialData?.valor_investido?.toString() || '',
    observacao: initialData?.observacao || '',
  });

  const handleSave = async () => {
    if (!form.valor_investido || parseFloat(form.valor_investido) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    setSaving(true);
    const { error } = await onSave({
      canal: form.canal,
      mes: form.mes,
      valor_investido: parseFloat(form.valor_investido),
      observacao: form.observacao.trim() || null,
    });
    if (error) toast.error('Erro ao salvar investimento');
    else {
      toast.success('Investimento registrado');
      onOpenChange(false);
      setForm({ canal: 'Google Ads', mes: format(new Date(), 'yyyy-MM-01'), valor_investido: '', observacao: '' });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Investimento</DialogTitle>
          <DialogDescription>Informe o valor investido em marketing por canal e mês.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Canal</Label>
              <Select value={form.canal} onValueChange={v => setForm(p => ({ ...p, canal: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CANAIS_MARKETING.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Mês Referência</Label>
              <Input
                type="month"
                value={form.mes.substring(0, 7)}
                onChange={e => setForm(p => ({ ...p, mes: e.target.value + '-01' }))}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Valor Investido (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valor_investido}
              onChange={e => setForm(p => ({ ...p, valor_investido: e.target.value }))}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label className="text-xs">Observação</Label>
            <Textarea
              value={form.observacao}
              onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
              placeholder="Detalhes da campanha..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
