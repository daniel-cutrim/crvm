import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, User, Calendar as CalendarIcon } from 'lucide-react';
import { useUsuarios, usePacientes, useConsultas } from '@/hooks/useData';
import { useAgenda, AgendaEvent } from '@/hooks/useAgenda';
import type { Consulta } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { isDentista, isOnlyDentista } from '@/utils/roles';
import { getAppointmentDateKey, getAppointmentHour } from '@/utils/appointmentDateTime';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AgendaFormDialog from './AgendaFormDialog';
import AgendaEventCard from './AgendaEventCard';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7h–19h

type ViewMode = 'week' | 'day';

export default function AgendaPage() {
  const { usuario } = useAuth();
  
  // Keep useConsultas just for mutation methods (add, update, delete)
  const { addConsulta, updateConsulta, deleteConsulta } = useConsultas();
  const { usuarios } = useUsuarios();
  const { pacientes } = usePacientes();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(window.innerWidth < 640 ? 'day' : 'week');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsulta, setEditingConsulta] = useState<AgendaEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [selectedDentista, setSelectedDentista] = useState<string>('all');

  // Compute view boundaries to fetch correct events dynamically
  const viewStart = useMemo(() => viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : currentDate, [currentDate, viewMode]);
  const viewEnd = useMemo(() => viewMode === 'week' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : addDays(currentDate, 1), [currentDate, viewMode]);

  // Hook dedicated for Unified Agenda viewing
  const { events: consultas, loading, fetchAgenda } = useAgenda(viewStart, viewEnd);

  useEffect(() => {
    if (usuario && isOnlyDentista(usuario.papel)) {
      setSelectedDentista(usuario.id);
    }
  }, [usuario]);

  const dentistas = useMemo(() => usuarios.filter(u => isDentista(u.papel) && u.ativo), [usuarios]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const displayDays = viewMode === 'week' ? weekDays.slice(0, 6) : [currentDate]; // Mon-Sat or single day

  const consultasFiltradas = useMemo(() => {
    if (selectedDentista === 'all') return consultas;
    return consultas.filter(c => c.dentista_id === selectedDentista);
  }, [consultas, selectedDentista]);

  const consultasByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    consultasFiltradas.forEach(c => {
      const key = getAppointmentDateKey(c.data_hora);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return map;
  }, [consultasFiltradas]);

  const navigate = (dir: number) => {
    setCurrentDate(prev => viewMode === 'week' ? (dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1)) : addDays(prev, dir));
  };

  const handleSlotClick = (day: Date, hour: number) => {
    setSelectedSlot({ date: day, hour });
    setEditingConsulta(null);
    setDialogOpen(true);
  };

  const handleEventClick = (consulta: AgendaEvent) => {
    setEditingConsulta(consulta);
    setSelectedSlot(null);
    setDialogOpen(true);
  };

  const handleSave = async (data: Record<string, unknown>) => {
    if (editingConsulta) {
      const { error } = await updateConsulta(editingConsulta.id, data);
      if (error) {
        toast.error('Erro ao atualizar consulta: ' + error.message);
        return;
      }
      toast.success('Consulta atualizada com sucesso');
    } else {
      const { error } = await addConsulta(data);
      if (error) {
        toast.error('Erro ao agendar consulta: ' + error.message);
        return;
      }
      toast.success('Consulta agendada com sucesso');
    }
    await fetchAgenda();
    setDialogOpen(false);
    setEditingConsulta(null);
    setSelectedSlot(null);
  };

  const handleDelete = async (id: string) => {
    await deleteConsulta(id);
    await fetchAgenda();
    setDialogOpen(false);
    setEditingConsulta(null);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateConsulta(id, { status: status as Consulta['status'] });
    await fetchAgenda();
  };

  const todayStats = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todayConsultas = consultasByDay.get(todayKey) || [];
    return {
      total: todayConsultas.length,
      confirmadas: todayConsultas.filter(c => c.status === 'Confirmada' || c.status === 'Compareceu').length,
      agendadas: todayConsultas.filter(c => c.status === 'Agendada').length,
    };
  }, [consultasByDay]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="dental-card p-8 h-96 animate-pulse bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {todayStats.total > 0
              ? `Hoje: ${todayStats.total} consulta${todayStats.total > 1 ? 's' : ''} · ${todayStats.confirmadas} confirmada${todayStats.confirmadas !== 1 ? 's' : ''}`
              : 'Nenhuma consulta agendada para hoje'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isOnlyDentista(usuario?.papel) && (
            <Select value={selectedDentista} onValueChange={setSelectedDentista}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Todos os Profissionais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Profissionais</SelectItem>
                {dentistas.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <button
            onClick={() => { setEditingConsulta(null); setSelectedSlot(null); setDialogOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium
              hover:opacity-90 transition-opacity active:scale-[0.97]"
          >
            <Plus size={16} />
            Nova Consulta
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarIcon size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hoje</p>
            <p className="text-lg font-semibold text-foreground">{todayStats.total}</p>
          </div>
        </div>
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <User size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Confirmadas</p>
            <p className="text-lg font-semibold text-foreground">{todayStats.confirmadas}</p>
          </div>
        </div>
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Aguardando</p>
            <p className="text-lg font-semibold text-foreground">{todayStats.agendadas}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="dental-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-95">
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-primary"
          >
            Hoje
          </button>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-95">
            <ChevronRight size={18} />
          </button>
        </div>

        <h2 className="text-sm font-semibold text-foreground capitalize text-center">
          {viewMode === 'week'
            ? `${format(displayDays[0], "d 'de' MMM", { locale: ptBR })} — ${format(displayDays[displayDays.length - 1], "d 'de' MMM, yyyy", { locale: ptBR })}`
            : format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </h2>

        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['week', 'day'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
              }`}
            >
              {mode === 'week' ? 'Semana' : 'Dia'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="dental-card overflow-hidden">
        {/* Day Headers */}
        <div className="grid border-b border-border" style={{ gridTemplateColumns: `56px repeat(${displayDays.length}, 1fr)` }}>
          <div className="p-2 border-r border-border" />
          {displayDays.map(day => {
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`p-2.5 text-center border-r border-border last:border-r-0 cursor-pointer transition-colors
                  ${isToday ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                onClick={() => { setCurrentDate(day); setViewMode('day'); }}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {format(day, 'EEE', { locale: ptBR })}
                </p>
                <p className={`text-lg font-semibold mt-0.5 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time Slots */}
        <div className="max-h-[560px] overflow-y-auto">
          {HOURS.map(hour => (
            <div
              key={hour}
              className="grid border-b border-border last:border-b-0"
              style={{ gridTemplateColumns: `56px repeat(${displayDays.length}, 1fr)` }}
            >
              <div className="p-1.5 text-[11px] text-muted-foreground font-medium text-right pr-2 border-r border-border flex items-start justify-end pt-1">
                {String(hour).padStart(2, '0')}:00
              </div>
              {displayDays.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayConsultas = consultasByDay.get(dayKey) || [];
                const slotConsultas = dayConsultas.filter(c => {
                  const h = getAppointmentHour(c.data_hora);
                  return h === hour;
                });
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={`${dayKey}-${hour}`}
                    className={`min-h-[60px] p-0.5 border-r border-border last:border-r-0 cursor-pointer transition-colors
                      ${isToday ? 'bg-primary/[0.02]' : ''} hover:bg-muted/40`}
                    onClick={() => handleSlotClick(day, hour)}
                  >
                    {slotConsultas.map(c => (
                      <AgendaEventCard
                        key={c.id}
                        consulta={c}
                        onClick={() => handleEventClick(c)}
                        compact={viewMode === 'week'}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Dialog */}
      <AgendaFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingConsulta(null); setSelectedSlot(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        consulta={editingConsulta}
        selectedSlot={selectedSlot}
        dentistas={dentistas}
        pacientes={pacientes}
        usuario={usuario ?? null}
      />
    </div>
  );
}
