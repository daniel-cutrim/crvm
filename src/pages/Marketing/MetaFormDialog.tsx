import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Record<string, unknown>) => Promise<{ error: Record<string, unknown> }>;
}

export default function MetaFormDialog({ open, onOpenChange, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    mes: format(new Date(), 'yyyy-MM-01'),
    meta_leads: '',
    meta_conversoes: '',
    meta_roi: '',
  });

  const handleSave = async () => {
    if (!form.meta_leads || !form.meta_conversoes) {
      toast.error('Informe as metas de leads e conversões');
      return;
    }
    setSaving(true);
    const { error } = await onSave({
      mes: form.mes,
      meta_leads: parseInt(form.meta_leads),
      meta_conversoes: parseInt(form.meta_conversoes),
      meta_roi: form.meta_roi ? parseFloat(form.meta_roi) : null,
    });
    if (error) toast.error('Erro ao salvar meta');
    else {
      toast.success('Meta registrada');
      onOpenChange(false);
      setForm({ mes: format(new Date(), 'yyyy-MM-01'), meta_leads: '', meta_conversoes: '', meta_roi: '' });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir Meta Mensal</DialogTitle>
          <DialogDescription>Defina as metas de leads, conversões e ROI para o mês.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Mês Referência</Label>
            <Input
              type="month"
              value={form.mes.substring(0, 7)}
              onChange={e => setForm(p => ({ ...p, mes: e.target.value + '-01' }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Meta de Leads</Label>
              <Input
                type="number"
                min="0"
                value={form.meta_leads}
                onChange={e => setForm(p => ({ ...p, meta_leads: e.target.value }))}
                placeholder="50"
              />
            </div>
            <div>
              <Label className="text-xs">Meta Conversões</Label>
              <Input
                type="number"
                min="0"
                value={form.meta_conversoes}
                onChange={e => setForm(p => ({ ...p, meta_conversoes: e.target.value }))}
                placeholder="15"
              />
            </div>
            <div>
              <Label className="text-xs">Meta ROI (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={form.meta_roi}
                onChange={e => setForm(p => ({ ...p, meta_roi: e.target.value }))}
                placeholder="300"
              />
            </div>
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
