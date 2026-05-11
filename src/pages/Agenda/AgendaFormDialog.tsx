import { useState, useEffect, FormEvent } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { format, parseISO } from 'date-fns';
import { X, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { buildAppointmentTimestamp, getAppointmentFormValues } from '@/utils/appointmentDateTime';
import type { Paciente, Usuario as DBUsuario } from '@/types';
import type { Usuario as AuthUsuario } from '@/contexts/AuthContext';
import type { AgendaEvent } from '@/hooks/useAgenda';
import { useClinicaConfig } from '@/hooks/useClinicaConfig';

const STATUSES = ['Agendada', 'Confirmada', 'Compareceu', 'Faltou', 'Cancelada'] as const;
const DURATIONS = [15, 30, 45, 60, 90, 120];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  consulta: AgendaEvent | null;
  selectedSlot: { date: Date; hour: number } | null;
  profissionais: DBUsuario[];
  pacientes: Paciente[];
  usuario: AuthUsuario | null;
}

export default function AgendaFormDialog({
  open, onClose, onSave, onDelete,
  consulta, selectedSlot, profissionais, pacientes, usuario,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { labelProfissional } = useClinicaConfig();

  const defaultDate = selectedSlot
    ? format(selectedSlot.date, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');
  const defaultHour = selectedSlot ? String(selectedSlot.hour).padStart(2, '0') + ':00' : '08:00';

  const [formData, setFormData] = useState({
    paciente_id: '',
    dentista_id: '',
    data: defaultDate,
    hora: defaultHour,
    duracao_minutos: 30,
    tipo_procedimento: '',
    status: 'Agendada',
    sala: '',
    observacoes: '',
  });

  const [calendarDate, setCalendarDate] = useState<Date | undefined>(
    selectedSlot?.date || new Date()
  );

  useEffect(() => {
    if (consulta) {
      const appointmentValues = getAppointmentFormValues(consulta.data_hora);
      setFormData({
        paciente_id: consulta.paciente_id || '',
        dentista_id: consulta.dentista_id,
        data: appointmentValues.date,
        hora: appointmentValues.time,
        duracao_minutos: consulta.duracao_minutos,
        tipo_procedimento: consulta.tipo_procedimento,
        status: consulta.status,
        sala: consulta.sala || '',
        observacoes: consulta.observacoes || '',
      });
      setCalendarDate(appointmentValues.dateObject);
    } else {
      const d = selectedSlot ? format(selectedSlot.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const h = selectedSlot ? String(selectedSlot.hour).padStart(2, '0') + ':00' : '08:00';
      setFormData({
        paciente_id: '',
        dentista_id: profissionais.length === 1 ? profissionais[0].id : ((usuario?.papel === 'Profissional' || usuario?.papel === 'Gestor/Profissional') ? usuario?.id || '' : ''),
        data: d,
        hora: h,
        duracao_minutos: 30,
        tipo_procedimento: '',
        status: 'Agendada',
        sala: '',
        observacoes: '',
      });
      setCalendarDate(selectedSlot?.date || new Date());
    }
  }, [consulta, selectedSlot, open, profissionais, usuario]);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setCalendarDate(date);
      setFormData(prev => ({ ...prev, data: format(date, 'yyyy-MM-dd') }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data_hora = buildAppointmentTimestamp(formData.data, formData.hora);
    await onSave({
      paciente_id: formData.paciente_id || null,
      dentista_id: formData.dentista_id,
      data_hora,
      duracao_minutos: formData.duracao_minutos,
      tipo_procedimento: formData.tipo_procedimento,
      status: formData.status,
      sala: formData.sala || null,
      observacoes: formData.observacoes || null,
    });
    setSaving(false);
  };

  const handleDeleteClick = async () => {
    if (!consulta || !await confirmDialog({ description: 'Deseja realmente excluir este agendamento?' })) return;
    setDeleting(true);
    await onDelete(consulta.id);
    setDeleting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4 border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {consulta ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Cliente</label>
            <select
              value={formData.paciente_id}
              onChange={e => setFormData(prev => ({ ...prev, paciente_id: e.target.value }))}
              className="dental-input"
            >
              <option value="">Selecione um cliente</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          {/* Dentista */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{labelProfissional} *</label>
            <select
              value={formData.dentista_id}
              onChange={e => setFormData(prev => ({ ...prev, dentista_id: e.target.value }))}
              className="dental-input"
              required
            >
              <option value="">Selecione o {labelProfissional.toLowerCase()}</option>
              {profissionais.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>

          {/* Data + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Data *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="dental-input text-left">
                    {formData.data
                      ? format(parseISO(formData.data), "dd/MM/yyyy")
                      : 'Selecionar data'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={calendarDate}
                    onSelect={handleCalendarSelect}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Hora *</label>
              <input
                type="time"
                value={formData.hora}
                onChange={e => setFormData(prev => ({ ...prev, hora: e.target.value }))}
                className="dental-input"
                required
              />
            </div>
          </div>

          {/* Duração + Sala */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Duração</label>
              <select
                value={formData.duracao_minutos}
                onChange={e => setFormData(prev => ({ ...prev, duracao_minutos: Number(e.target.value) }))}
                className="dental-input"
              >
                {DURATIONS.map(d => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Sala</label>
              <input
                type="text"
                value={formData.sala}
                onChange={e => setFormData(prev => ({ ...prev, sala: e.target.value }))}
                className="dental-input"
                placeholder="Ex: Sala 1"
              />
            </div>
          </div>

          {/* Procedimento */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Procedimento *</label>
            <input
              type="text"
              value={formData.tipo_procedimento}
              onChange={e => setFormData(prev => ({ ...prev, tipo_procedimento: e.target.value }))}
              className="dental-input"
              placeholder="Ex: Reunião, Consultoria, Avaliação"
              required
            />
          </div>

          {/* Status */}
          {consulta && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: s }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                      formData.status === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              className="dental-input min-h-[72px] resize-none"
              placeholder="Anotações sobre o agendamento..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {consulta && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-destructive 
                  hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            )}
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
              {saving ? 'Salvando...' : consulta ? 'Atualizar' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
