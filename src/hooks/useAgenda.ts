import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Consulta } from '@/types';
import { addDays, subDays } from 'date-fns';

export interface AgendaEvent extends Partial<Consulta> {
  is_google?: boolean;
  google_event_url?: string;
  original_id?: string;
  // Fallbacks explicitly mapped to help UI rendering
  id: string;
  data_hora: string;
  duracao_minutos: number;
  tipo_procedimento: string;
  status: 'Agendada' | 'Confirmada' | 'Compareceu' | 'Faltou' | 'Cancelada';
}

export function useAgenda(startDate: Date, endDate: Date) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    let combinedEvents: AgendaEvent[] = [];

    // 1. Fetch Supabase Consultas in range
    const { data: consultas, error: dbError } = await supabase
      .from('consultas')
      .select('*, paciente:pacientes(*), dentista:usuarios!dentista_id(*)')
      .gte('data_hora', startDate.toISOString())
      .lte('data_hora', endDate.toISOString())
      .order('data_hora', { ascending: true });

    if (!dbError && consultas) {
      combinedEvents = consultas.map(c => ({
        ...c,
        id: c.id,
        is_google: false
      })) as AgendaEvent[];
    }

    // 2. Fetch Google Calendar Events via Edge Function
    try {
      const { data: googleEvents, error: googleError } = await supabase.functions.invoke('google-calendar-sync', {
        body: { 
          timeMin: startDate.toISOString(), 
          timeMax: endDate.toISOString() 
        }
      });
      
      // Edge function will return an empty array if not authenticated, or the array of mapped events
      if (!googleError && Array.isArray(googleEvents)) {
        combinedEvents = [...combinedEvents, ...googleEvents];
      }
    } catch (e) {
      console.warn("Failed to fetch Google Events", e);
    }

    // Sort all events combined
    combinedEvents.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

    setEvents(combinedEvents);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  return { events, loading, fetchAgenda };
}
