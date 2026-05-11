import { format } from 'date-fns';
import { parseAppointmentDateTime } from '@/utils/appointmentDateTime';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { AgendaEvent } from '@/hooks/useAgenda';
import { useClinicaConfig } from '@/hooks/useClinicaConfig';

const STATUS_STYLES: Record<string, string> = {
  Agendada: 'bg-sky-50 border-sky-200 text-sky-800',
  Confirmada: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  Compareceu: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  Faltou: 'bg-red-50 border-red-200 text-red-700',
  Cancelada: 'bg-slate-100 border-slate-200 text-slate-500 line-through',
  Google: 'bg-indigo-50 border-indigo-200 text-indigo-800'
};

interface Props {
  consulta: AgendaEvent;
  onClick: () => void;
  compact?: boolean;
}

export default function AgendaEventCard({ consulta, onClick, compact }: Props) {
  const time = format(parseAppointmentDateTime(consulta.data_hora), 'HH:mm');
  const style = consulta.is_google ? STATUS_STYLES.Google : (STATUS_STYLES[consulta.status] || STATUS_STYLES.Agendada);
  const nome = consulta.is_google ? consulta.tipo_procedimento : (consulta.paciente?.nome || consulta.lead?.nome || 'Cliente');


  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left rounded-md border px-1.5 py-1 mb-0.5 text-[11px] leading-tight transition-all
        hover:shadow-sm active:scale-[0.98] ${style}`}
    >
      <div className="flex items-center gap-1">
        {consulta.is_google && <CalendarIcon size={10} className="text-indigo-600 shrink-0" />}
        <span className="font-semibold">{time}</span>
      </div>
      <span className="block truncate mt-0.5">{compact ? nome.split(' ')[0] : nome}</span>
      {!compact && !consulta.is_google && (
        <p className="text-[10px] opacity-70 truncate mt-0.5">
          {consulta.tipo_procedimento}
          {consulta.dentista ? ` · ${consulta.dentista.nome.split(' ')[0]}` : ''}
        </p>
      )}
    </button>
  );
}
