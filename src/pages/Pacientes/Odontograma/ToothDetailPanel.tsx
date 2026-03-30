import { useState } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Trash2, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { OdontogramaEntrada } from '@/types/odontograma';
import { STATUS_CONFIG, FACES } from '@/types/odontograma';

interface Props {
  denteNumero: number;
  entradas: OdontogramaEntrada[];
  onAdd: (data: Record<string, unknown>) => Promise<{ error: Record<string, unknown> }>;
  onDelete: (id: string) => Promise<{ error: Record<string, unknown> }>;
  usuarioId: string | null;
}

const STATUSES = Object.keys(STATUS_CONFIG);

export default function ToothDetailPanel({ denteNumero, entradas, onAdd, onDelete, usuarioId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    face: 'oclusal' as string,
    status: 'Cariado' as string,
    procedimento: '',
    observacao: '',
    data_registro: format(new Date(), 'yyyy-MM-dd'),
  });

  const denteEntradas = entradas
    .filter(e => e.dente_numero === denteNumero)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await onAdd({
      dente_numero: denteNumero,
      face: form.face,
      status: form.status,
      procedimento: form.procedimento.trim() || null,
      observacao: form.observacao.trim() || null,
      data_registro: form.data_registro,
      dentista_id: usuarioId,
    });
    if (error) toast.error('Erro ao salvar');
    else {
      toast.success('Registro adicionado');
      setDialogOpen(false);
      setForm({ face: 'oclusal', status: 'Cariado', procedimento: '', observacao: '', data_registro: format(new Date(), 'yyyy-MM-dd') });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!await confirmDialog({ description: 'Excluir este registro?' })) return;
    const { error } = await onDelete(id);
    if (error) toast.error('Erro ao excluir');
    else toast.success('Registro excluído');
  };

  // Current status summary per face
  const faceStatuses = FACES.map(face => {
    const faceEntries = denteEntradas.filter(e => e.face === face || e.face === 'completo');
    const latest = faceEntries[0];
    return { face, status: latest?.status || 'Saudável' };
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            🦷 Dente {denteNumero}
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Registrar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Face status summary */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">STATUS POR FACE</p>
          <div className="grid grid-cols-5 gap-1">
            {faceStatuses.map(({ face, status }) => (
              <div key={face} className="flex flex-col items-center gap-1 p-1.5 rounded-md bg-muted/50">
                <div
                  className="w-4 h-4 rounded-full border border-border"
                  style={{ backgroundColor: STATUS_CONFIG[status]?.color || '#22c55e' }}
                />
                <span className="text-[9px] text-muted-foreground capitalize">{face === 'oclusal' ? 'Ocl' : face === 'vestibular' ? 'Vest' : face === 'lingual' ? 'Ling' : face === 'mesial' ? 'Mes' : 'Dist'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">HISTÓRICO ({denteEntradas.length})</p>
          {denteEntradas.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {denteEntradas.map(e => (
                <div key={e.id} className="group flex items-start gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div
                    className="w-3 h-3 rounded-full mt-0.5 shrink-0 border border-border"
                    style={{ backgroundColor: STATUS_CONFIG[e.status]?.color || '#22c55e' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{e.status}</Badge>
                      <span className="text-[10px] text-muted-foreground capitalize">{e.face}</span>
                    </div>
                    {e.procedimento && <p className="text-xs font-medium mt-0.5">{e.procedimento}</p>}
                    {e.observacao && <p className="text-[11px] text-muted-foreground mt-0.5">{e.observacao}</p>}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {format(parseISO(e.data_registro), 'dd/MM/yy')}
                      </span>
                      {e.dentista && (
                        <span className="inline-flex items-center gap-0.5">
                          <User className="h-2.5 w-2.5" />
                          {e.dentista.nome}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(e.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Add dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar — Dente {denteNumero}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Face</Label>
                <Select value={form.face} onValueChange={v => setForm(p => ({ ...p, face: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FACES.map(f => (
                      <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                    ))}
                    <SelectItem value="completo">Completo (todas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CONFIG[s].emoji} {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Procedimento Realizado</Label>
              <Input
                value={form.procedimento}
                onChange={e => setForm(p => ({ ...p, procedimento: e.target.value }))}
                placeholder="Ex: Restauração resina composta"
              />
            </div>
            <div>
              <Label className="text-xs">Observação</Label>
              <Textarea
                value={form.observacao}
                onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                placeholder="Anotações sobre o dente..."
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                value={form.data_registro}
                onChange={e => setForm(p => ({ ...p, data_registro: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
