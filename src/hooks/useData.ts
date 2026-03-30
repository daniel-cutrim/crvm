import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';
import type {
  Paciente, Consulta, Lead, PlanoTratamento, Receita, Despesa,
  Tarefa, Usuario, ProcedimentoPadrao, Clinica, LeadHistorico,
  PlanoTratamentoItem, NotificationSettings, PacienteDocumento,
  ProntuarioEntrada, DespesaRecorrente, Integracao, LeadJornada,
  Setor, Funil, FunilEtapa
} from '@/types';
import type { OdontogramaEntrada } from '@/types/odontograma';

type TableName = keyof Database['public']['Tables'];

// Generic hook factory
function useSupabaseTable<T extends { id: string }>(
  table: TableName,
  selectQuery: string = '*',
  orderBy: string = 'created_at',
  ascending: boolean = false
) {
  const { usuario } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const sb = supabase;
    const { data: result } = await sb.from(table)
      .select(selectQuery)
      .order(orderBy, { ascending });
    setData((result || []) as T[]);
    setLoading(false);
  }, [table, selectQuery, orderBy, ascending]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (item: Record<string, unknown>) => {
    const sb = supabase;
    const { data: result, error } = await sb.from(table)
      .insert(item).select(selectQuery).single();
    if (!error && result) {
      setData(prev => [...prev, result as T]);
      logger.info(`Create ${table}`, { 
        tabela: table, 
        registro_id: result.id, 
        clinica_id: usuario?.clinica_id, 
        usuario_id: usuario?.id,
        detalhes: { item } 
      });
    } else if (error) {
      logger.error(`Create Error ${table}`, error, { tabela: table, clinica_id: usuario?.clinica_id, usuario_id: usuario?.id });
    }
    return { data: result as T | null, error };
  };

  const update = async (id: string, updates: Record<string, unknown>) => {
    const sb = supabase;
    const { data: result, error } = await sb.from(table)
      .update(updates).eq('id', id).select(selectQuery).single();
    if (!error && result) {
      setData(prev => prev.map(d => d.id === id ? result as T : d));
      logger.info(`Update ${table}`, { 
        tabela: table, 
        registro_id: id, 
        clinica_id: usuario?.clinica_id, 
        usuario_id: usuario?.id,
        detalhes: { updates } 
      });
    } else if (error) {
      logger.error(`Update Error ${table}`, error, { tabela: table, registro_id: id, clinica_id: usuario?.clinica_id, usuario_id: usuario?.id });
    }
    return { data: result as T | null, error };
  };

  const remove = async (id: string) => {
    const sb = supabase;
    const { error } = await sb.from(table).delete().eq('id', id);
    if (!error) {
      setData(prev => prev.filter(d => d.id !== id));
      logger.info(`Delete ${table}`, { 
        tabela: table, 
        registro_id: id, 
        clinica_id: usuario?.clinica_id, 
        usuario_id: usuario?.id 
      });
    } else if (error) {
      logger.error(`Delete Error ${table}`, error, { tabela: table, registro_id: id, clinica_id: usuario?.clinica_id, usuario_id: usuario?.id });
    }
    return { error };
  };

  return { data, loading, fetch, add, update, remove, setData };
}

export function usePacientes() {
  const h = useSupabaseTable<Paciente>('pacientes', '*, dentista:usuarios!dentista_id(*)', 'nome', true);
  return { pacientes: h.data, loading: h.loading, fetchPacientes: h.fetch, addPaciente: h.add, updatePaciente: h.update, deletePaciente: h.remove };
}

export function useConsultas() {
  const h = useSupabaseTable<Consulta>('consultas', '*, paciente:pacientes(*), lead:leads(*), dentista:usuarios!dentista_id(*)', 'data_hora', true);
  return { consultas: h.data, loading: h.loading, fetchConsultas: h.fetch, addConsulta: h.add, updateConsulta: h.update, deleteConsulta: h.remove };
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    setLeads((data || []) as Lead[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload: Record<string, unknown>) => {
        if (payload.eventType === 'INSERT') setLeads(prev => [payload.new as Lead, ...prev]);
        else if (payload.eventType === 'UPDATE') setLeads(prev => prev.map(l => l.id === payload.new.id ? payload.new as Lead : l));
        else if (payload.eventType === 'DELETE') setLeads(prev => prev.filter(l => l.id !== payload.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const addLead = async (lead: Record<string, unknown>) => {
    const { data, error } = await supabase.from('leads').insert(lead).select().single();
    if (!error && data) setLeads(prev => [data as Lead, ...prev]);
    return { data: data as Lead | null, error };
  };
  const updateLead = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
    if (!error && data) setLeads(prev => prev.map(l => l.id === id ? data as Lead : l));
    return { data: data as Lead | null, error };
  };
  const deleteLead = async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) setLeads(prev => prev.filter(l => l.id !== id));
    return { error };
  };

  return { leads, loading, fetchLeads, addLead, updateLead, deleteLead };
}

export function useLeadHistorico(leadId: string | null) {
  const [historico, setHistorico] = useState<LeadHistorico[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistorico = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const { data } = await supabase.from('leads_historico')
      .select('*, usuario:usuarios(*)').eq('lead_id', leadId).order('created_at', { ascending: false });
    setHistorico((data || []) as LeadHistorico[]);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico]);

  const addHistorico = async (item: Record<string, unknown>) => {
    const { data, error } = await supabase.from('leads_historico')
      .insert(item).select('*, usuario:usuarios(*)').single();
    if (!error && data) setHistorico(prev => [data as LeadHistorico, ...prev]);
    return { data: data as LeadHistorico | null, error };
  };

  return { historico, loading, fetchHistorico, addHistorico };
}

export function useLeadJornada(leadId: string | null) {
  const [jornada, setJornada] = useState<LeadJornada[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJornada = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const { data } = await supabase.from('lead_jornada')
      .select('*').eq('lead_id', leadId).order('created_at', { ascending: true });
    setJornada((data || []) as LeadJornada[]);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { fetchJornada(); }, [fetchJornada]);

  return { jornada, loading, fetchJornada };
}

export function usePlanosTratamento() {
  const h = useSupabaseTable<PlanoTratamento>('planos_tratamento', '*, paciente:pacientes(*), dentista:usuarios!dentista_id(*)');
  return { planos: h.data, loading: h.loading, fetchPlanos: h.fetch, addPlano: h.add, updatePlano: h.update, deletePlano: h.remove };
}

export function usePlanoItens(planoId: string | null) {
  const [itens, setItens] = useState<PlanoTratamentoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItens = useCallback(async () => {
    if (!planoId) return;
    setLoading(true);
    const { data } = await supabase.from('planos_tratamento_itens')
      .select('*').eq('plano_id', planoId).order('created_at');
    setItens((data || []) as PlanoTratamentoItem[]);
    setLoading(false);
  }, [planoId]);

  useEffect(() => { fetchItens(); }, [fetchItens]);

  const addItem = async (item: Record<string, unknown>) => {
    const { data, error } = await supabase.from('planos_tratamento_itens').insert(item).select().single();
    if (!error && data) setItens(prev => [...prev, data as PlanoTratamentoItem]);
    return { data: data as PlanoTratamentoItem | null, error };
  };
  const updateItem = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from('planos_tratamento_itens')
      .update(updates).eq('id', id).select().single();
    if (!error && data) setItens(prev => prev.map(i => i.id === id ? data as PlanoTratamentoItem : i));
    return { data: data as PlanoTratamentoItem | null, error };
  };
  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('planos_tratamento_itens').delete().eq('id', id);
    if (!error) setItens(prev => prev.filter(i => i.id !== id));
    return { error };
  };

  return { itens, loading, fetchItens, addItem, updateItem, deleteItem };
}

export function useReceitas() {
  const h = useSupabaseTable<Receita>('receitas', '*, paciente:pacientes(*)', 'data', false);
  return { receitas: h.data, loading: h.loading, fetchReceitas: h.fetch, addReceita: h.add, updateReceita: h.update, deleteReceita: h.remove };
}

export function useDespesas() {
  const h = useSupabaseTable<Despesa>('despesas', '*', 'data');
  return { despesas: h.data, loading: h.loading, fetchDespesas: h.fetch, addDespesa: h.add, updateDespesa: h.update, deleteDespesa: h.remove };
}

export function useTarefas() {
  const h = useSupabaseTable<Tarefa>('tarefas', '*, paciente:pacientes(*), lead:leads(*), responsavel:usuarios!responsavel_id(*)');
  return { tarefas: h.data, loading: h.loading, fetchTarefas: h.fetch, addTarefa: h.add, updateTarefa: h.update, deleteTarefa: h.remove };
}

export function useUsuarios() {
  const h = useSupabaseTable<Usuario>('usuarios', '*', 'nome', true);
  return { usuarios: h.data, loading: h.loading, fetchUsuarios: h.fetch, addUsuario: h.add, updateUsuario: h.update, deleteUsuario: h.remove };
}

export function useProcedimentosPadrao() {
  const h = useSupabaseTable<ProcedimentoPadrao>('procedimentos_padrao', '*', 'nome', true);
  return { procedimentos: h.data, loading: h.loading, fetchProcedimentos: h.fetch, addProcedimento: h.add, updateProcedimento: h.update, deleteProcedimento: h.remove };
}

export function useClinica() {
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
    const { data } = await supabase.from('clinica').select('*').limit(1).maybeSingle();
      setClinica(data as Clinica | null);
      setLoading(false);
    })();
  }, []);

  const updateClinica = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from('clinica').update(updates).eq('id', id).select().single();
    if (!error && data) setClinica(data as Clinica);
    return { data: data as Clinica | null, error };
  };
  const createClinica = async (item: Record<string, unknown>) => {
    const { data, error } = await supabase.from('clinica').insert(item).select().single();
    if (!error && data) setClinica(data as Clinica);
    return { data: data as Clinica | null, error };
  };

  return { clinica, loading, updateClinica, createClinica };
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
    const { data } = await supabase.from('notification_settings').select('*');
      setSettings((data || []) as NotificationSettings[]);
      setLoading(false);
    })();
  }, []);

  const updateSettings = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from('notification_settings').update(updates).eq('id', id).select().single();
    if (!error && data) setSettings(prev => prev.map(s => s.id === id ? data as NotificationSettings : s));
    return { data: data as NotificationSettings | null, error };
  };

  return { settings, loading, updateSettings };
}

export function usePacienteDocumentos(pacienteId: string | null) {
  const [documentos, setDocumentos] = useState<PacienteDocumento[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocumentos = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    const { data } = await supabase.from('paciente_documentos')
      .select('*').eq('paciente_id', pacienteId).order('created_at', { ascending: false });
    setDocumentos((data || []) as PacienteDocumento[]);
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => { fetchDocumentos(); }, [fetchDocumentos]);

  const addDocumento = async (doc: Record<string, unknown>) => {
    const { data, error } = await supabase.from('paciente_documentos').insert(doc).select().single();
    if (!error && data) setDocumentos(prev => [data as PacienteDocumento, ...prev]);
    return { data: data as PacienteDocumento | null, error };
  };
  const deleteDocumento = async (id: string, storagePath: string) => {
    await supabase.storage.from('paciente-documentos').remove([storagePath]);
    const { error } = await supabase.from('paciente_documentos').delete().eq('id', id);
    if (!error) setDocumentos(prev => prev.filter(d => d.id !== id));
    return { error };
  };

  return { documentos, loading, fetchDocumentos, addDocumento, deleteDocumento };
}

export function useProntuario(pacienteId: string | null) {
  const [entradas, setEntradas] = useState<ProntuarioEntrada[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntradas = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    const { data } = await supabase.from('prontuario_entradas')
      .select('*, dentista:usuarios!dentista_id(*)').eq('paciente_id', pacienteId).order('data_registro', { ascending: false });
    setEntradas((data || []) as ProntuarioEntrada[]);
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => { fetchEntradas(); }, [fetchEntradas]);

  const addEntrada = async (item: Record<string, unknown>) => {
    const { data, error } = await supabase.from('prontuario_entradas')
      .insert(item).select('*, dentista:usuarios!dentista_id(*)').single();
    if (!error && data) setEntradas(prev => [data as ProntuarioEntrada, ...prev]);
    return { data: data as ProntuarioEntrada | null, error };
  };

  const updateEntrada = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from('prontuario_entradas')
      .update(updates).eq('id', id).select('*, dentista:usuarios!dentista_id(*)').single();
    if (!error && data) setEntradas(prev => prev.map(e => e.id === id ? data as ProntuarioEntrada : e));
    return { data: data as ProntuarioEntrada | null, error };
  };

  const deleteEntrada = async (id: string) => {
    const { error } = await supabase.from('prontuario_entradas').delete().eq('id', id);
    if (!error) setEntradas(prev => prev.filter(e => e.id !== id));
    return { error };
  };

  return { entradas, loading, fetchEntradas, addEntrada, updateEntrada, deleteEntrada };
}

export function useOdontograma(pacienteId: string | null) {
  const [entradas, setEntradas] = useState<OdontogramaEntrada[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntradas = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    const { data } = await supabase.from('odontograma_entradas')
      .select('*, dentista:usuarios!dentista_id(id, nome)')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });
    setEntradas((data || []) as OdontogramaEntrada[]);
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => { fetchEntradas(); }, [fetchEntradas]);

  const addEntrada = async (item: Record<string, unknown>) => {
    const { data, error } = await supabase.from('odontograma_entradas')
      .insert(item).select('*, dentista:usuarios!dentista_id(id, nome)').single();
    if (!error && data) setEntradas(prev => [data as OdontogramaEntrada, ...prev]);
    return { data: data as OdontogramaEntrada | null, error };
  };

  const deleteEntrada = async (id: string) => {
    const { error } = await supabase.from('odontograma_entradas').delete().eq('id', id);
    if (!error) setEntradas(prev => prev.filter(e => e.id !== id));
    return { error };
  };

  return { entradas, loading, fetchEntradas, addEntrada, deleteEntrada };
}

export function useDespesasRecorrentes() {
  const h = useSupabaseTable<DespesaRecorrente>('despesas_recorrentes', '*', 'descricao', true);
  return { recorrentes: h.data, loading: h.loading, fetchRecorrentes: h.fetch, addRecorrente: h.add, updateRecorrente: h.update, deleteRecorrente: h.remove };
}

export function useIntegracoes() {
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
    const { data } = await supabase.from('integracoes').select('*');
      setIntegracoes((data || []) as Integracao[]);
      setLoading(false);
    })();
  }, []);

  const saveIntegracao = async (tipo: string, credentials: Record<string, unknown>, ativo: boolean = true) => {
    // Upsert logic: check if exists
    const existing = integracoes.find(i => i.tipo === tipo);
    if (existing) {
    const { data, error } = await supabase.from('integracoes')
        .update({ credentials, ativo, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single();
      if (!error && data) {
        setIntegracoes(prev => prev.map(i => i.id === existing.id ? data as Integracao : i));
      }
      return { data: data as Integracao | null, error };
    } else {
      // Create new
    const { data, error } = await supabase.from('integracoes')
        .insert({ tipo, credentials, ativo })
        .select().single();
      if (!error && data) {
        setIntegracoes(prev => [...prev, data as Integracao]);
      }
      return { data: data as Integracao | null, error };
    }
  };

  return { integracoes, loading, saveIntegracao };
}

export function useSetores() {
  const h = useSupabaseTable<Setor>('setores', '*', 'nome', true);
  return { setores: h.data, loading: h.loading, fetchSetores: h.fetch, addSetor: h.add, updateSetor: h.update, deleteSetor: h.remove };
}

export function useFunis() {
  const h = useSupabaseTable<Funil>('funis', '*', 'nome', true);
  return { funis: h.data, loading: h.loading, fetchFunis: h.fetch, addFunil: h.add, updateFunil: h.update, deleteFunil: h.remove };
}

export function useFunilEtapas(funilId: string | null) {
  const [etapas, setEtapas] = useState<FunilEtapa[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEtapas = useCallback(async () => {
    if (!funilId) return;
    setLoading(true);
    const { data } = await supabase.from('funil_etapas')
      .select('*').eq('funil_id', funilId).order('ordem', { ascending: true });
    setEtapas((data || []) as FunilEtapa[]);
    setLoading(false);
  }, [funilId]);

  useEffect(() => { fetchEtapas(); }, [fetchEtapas]);

  const addEtapa = async (item: Record<string, unknown>) => {
    const { data, error } = await supabase.from('funil_etapas').insert(item).select().single();
    if (!error && data) {
      setEtapas(prev => {
        const next = [...prev, data as FunilEtapa];
        return next.sort((a,b) => a.ordem - b.ordem);
      });
    }
    return { data: data as FunilEtapa | null, error };
  };

  const updateEtapa = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from('funil_etapas')
      .update(updates).eq('id', id).select().single();
    if (!error && data) {
      setEtapas(prev => {
        const next = prev.map(e => e.id === id ? data as FunilEtapa : e);
        return next.sort((a,b) => a.ordem - b.ordem);
      });
    }
    return { data: data as FunilEtapa | null, error };
  };

  const deleteEtapa = async (id: string) => {
    const { error } = await supabase.from('funil_etapas').delete().eq('id', id);
    if (!error) setEtapas(prev => prev.filter(e => e.id !== id));
    return { error };
  };

  return { etapas, setEtapas, loading, fetchEtapas, addEtapa, updateEtapa, deleteEtapa };
}
