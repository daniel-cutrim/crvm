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
  Setor, Funil, FunilEtapa, Pessoa, CampoCategoria, CampoPersonalizado,
  CampoValor, LeadEtapaHistorico
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
    let query = sb.from(table).select(selectQuery);

    if (usuario?.clinica_id) {
      if (table === 'clinica') {
        query = (query as any).eq('id', usuario.clinica_id);
      } else if (table !== 'usuario_setores') {
        query = (query as any).eq('clinica_id', usuario.clinica_id);
      }
    }

    const { data: result } = await query.order(orderBy, { ascending });
    setData((result as unknown as T[] | null) || []);
    setLoading(false);
  }, [table, selectQuery, orderBy, ascending, usuario?.clinica_id]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (item: Record<string, unknown>) => {
    const sb = supabase;
    const { data: result, error } = await (sb.from(table) as any)
      .insert(item).select(selectQuery).single();
    if (!error && result) {
      setData(prev => [...prev, result as unknown as T]);
      logger.info(`Create ${table}`, { 
        tabela: table, 
        registro_id: (result as any).id, 
        clinica_id: usuario?.clinica_id, 
        usuario_id: usuario?.id,
        detalhes: { item } 
      });
    } else if (error) {
      logger.error(`Create Error ${table}`, { error, tabela: table, clinica_id: usuario?.clinica_id, usuario_id: usuario?.id });
    }
    return { data: result as unknown as T | null, error };
  };

  const update = async (id: string, updates: Record<string, unknown>) => {
    const sb = supabase;
    const { data: result, error } = await (sb.from(table) as any)
      .update(updates).eq('id', id).select(selectQuery).single();
    if (!error && result) {
      setData(prev => prev.map(d => d.id === id ? result as unknown as T : d));
      logger.info(`Update ${table}`, { 
        tabela: table, 
        registro_id: id, 
        clinica_id: usuario?.clinica_id, 
        usuario_id: usuario?.id,
        detalhes: { updates } 
      });
    } else if (error) {
      logger.error(`Update Error ${table}`, { error, tabela: table, registro_id: id, clinica_id: usuario?.clinica_id, usuario_id: usuario?.id });
    }
    return { data: result as unknown as T | null, error };
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
      logger.error(`Delete Error ${table}`, { error, tabela: table, registro_id: id, clinica_id: usuario?.clinica_id, usuario_id: usuario?.id });
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

  const addConsulta = async (item: Partial<Consulta>) => {
    const res = await h.add(item as Record<string, unknown>);
    if (res.data) {
      // Assíncronamente dispara PUSH sem travar UI
      supabase.functions.invoke('google-calendar-push', {
        body: { action: 'create', consulta: res.data, dentista_id: res.data.dentista_id }
      }).catch(console.error);
    }
    return res;
  };

  const updateConsulta = async (id: string, item: Partial<Consulta>) => {
    const existing = h.data.find(c => c.id === id);
    const updated = { ...existing, ...item };
    const res = await h.update(id, item as Record<string, unknown>);
    
    if (!res.error && updated.google_event_id) {
      supabase.functions.invoke('google-calendar-push', {
        body: { action: 'update', consulta: updated, dentista_id: updated.dentista_id }
      }).catch(console.error);
    }
    return res;
  };

  const deleteConsulta = async (id: string) => {
    const existing = h.data.find(c => c.id === id);
    const res = await h.remove(id);
    if (!res.error && existing?.google_event_id) {
      supabase.functions.invoke('google-calendar-push', {
        body: { action: 'delete', consulta: existing, dentista_id: existing.dentista_id }
      }).catch(console.error);
    }
    return res;
  };

  return { consultas: h.data, loading: h.loading, fetchConsultas: h.fetch, addConsulta, updateConsulta, deleteConsulta };
}

const LEADS_SELECT = '*, pessoa:pessoas!pessoa_id(*), proprietario:usuarios!proprietario_id(*)';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('leads').select(LEADS_SELECT).order('created_at', { ascending: false });
    setLeads((data as unknown as Lead[] | null) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        const oldRecord = payload.old as Record<string, unknown> | undefined;
        if (payload.eventType === 'DELETE' && oldRecord) {
          setLeads(prev => prev.filter(l => l.id !== (oldRecord as any).id));
        } else {
          fetchLeads();
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const addLead = async (lead: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('leads') as any).insert(lead).select(LEADS_SELECT).single();
    if (!error && data) setLeads(prev => [data as unknown as Lead, ...prev]);
    return { data: data as unknown as Lead | null, error };
  };
  const updateLead = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('leads') as any).update(updates).eq('id', id).select(LEADS_SELECT).single();
    if (!error && data) setLeads(prev => prev.map(l => l.id === id ? data as unknown as Lead : l));
    return { data: data as unknown as Lead | null, error };
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
    setHistorico((data as unknown as LeadHistorico[] | null) || []);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico]);

  const addHistorico = async (item: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('leads_historico') as any)
      .insert(item).select('*, usuario:usuarios(*)').single();
    if (!error && data) setHistorico(prev => [data as unknown as LeadHistorico, ...prev]);
    return { data: data as unknown as LeadHistorico | null, error };
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
    setJornada((data as unknown as LeadJornada[] | null) || []);
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
    setItens((data as unknown as PlanoTratamentoItem[] | null) || []);
    setLoading(false);
  }, [planoId]);

  useEffect(() => { fetchItens(); }, [fetchItens]);

  const addItem = async (item: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('planos_tratamento_itens') as any).insert(item).select().single();
    if (!error && data) setItens(prev => [...prev, data as unknown as PlanoTratamentoItem]);
    return { data: data as unknown as PlanoTratamentoItem | null, error };
  };
  const updateItem = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('planos_tratamento_itens') as any)
      .update(updates).eq('id', id).select().single();
    if (!error && data) setItens(prev => prev.map(i => i.id === id ? data as unknown as PlanoTratamentoItem : i));
    return { data: data as unknown as PlanoTratamentoItem | null, error };
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
  const h = useSupabaseTable<Tarefa>('tarefas', '*, paciente:pacientes(*), lead:leads(*), responsavel:usuarios!responsavel_id(*), pessoa:pessoas!pessoa_id(*)');
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
    const { data, error } = await (supabase.from('clinica') as any).update(updates).eq('id', id).select().single();
    if (!error && data) setClinica(data as Clinica);
    return { data: data as Clinica | null, error };
  };
  const createClinica = async (item: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('clinica') as any).insert(item).select().single();
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
      setSettings((data as unknown as NotificationSettings[] | null) || []);
      setLoading(false);
    })();
  }, []);

  const updateSettings = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('notification_settings') as any).update(updates).eq('id', id).select().single();
    if (!error && data) setSettings(prev => prev.map(s => s.id === id ? data as unknown as NotificationSettings : s));
    return { data: data as unknown as NotificationSettings | null, error };
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
    setDocumentos((data as unknown as PacienteDocumento[] | null) || []);
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => { fetchDocumentos(); }, [fetchDocumentos]);

  const addDocumento = async (doc: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('paciente_documentos') as any).insert(doc).select().single();
    if (!error && data) setDocumentos(prev => [data as unknown as PacienteDocumento, ...prev]);
    return { data: data as unknown as PacienteDocumento | null, error };
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
    setEntradas((data as unknown as ProntuarioEntrada[] | null) || []);
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => { fetchEntradas(); }, [fetchEntradas]);

  const addEntrada = async (item: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('prontuario_entradas') as any)
      .insert(item).select('*, dentista:usuarios!dentista_id(*)').single();
    if (!error && data) setEntradas(prev => [data as unknown as ProntuarioEntrada, ...prev]);
    return { data: data as unknown as ProntuarioEntrada | null, error };
  };

  const updateEntrada = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('prontuario_entradas') as any)
      .update(updates).eq('id', id).select('*, dentista:usuarios!dentista_id(*)').single();
    if (!error && data) setEntradas(prev => prev.map(e => e.id === id ? data as unknown as ProntuarioEntrada : e));
    return { data: data as unknown as ProntuarioEntrada | null, error };
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
    setEntradas((data as unknown as OdontogramaEntrada[] | null) || []);
    setLoading(false);
  }, [pacienteId]);

  useEffect(() => { fetchEntradas(); }, [fetchEntradas]);

  const addEntrada = async (item: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('odontograma_entradas') as any)
      .insert(item).select('*, dentista:usuarios!dentista_id(id, nome)').single();
    if (!error && data) setEntradas(prev => [data as unknown as OdontogramaEntrada, ...prev]);
    return { data: data as unknown as OdontogramaEntrada | null, error };
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
      setIntegracoes((data as unknown as Integracao[] | null) || []);
      setLoading(false);
    })();
  }, []);

  const saveIntegracao = async (tipo: string, credentials: Record<string, unknown>, ativo: boolean = true) => {
    // Upsert logic: check if exists
    const existing = integracoes.find(i => i.tipo === tipo);
    if (existing) {
    const { data, error } = await (supabase.from('integracoes') as any)
        .update({ credentials: credentials as any, ativo, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single();
      if (!error && data) {
        setIntegracoes(prev => prev.map(i => i.id === existing.id ? data as unknown as Integracao : i));
      }
      return { data: data as unknown as Integracao | null, error };
    } else {
      // Create new
    const { data, error } = await (supabase.from('integracoes') as any)
        .insert({ tipo, credentials: credentials as any, ativo })
        .select().single();
      if (!error && data) {
        setIntegracoes(prev => [...prev, data as unknown as Integracao]);
      }
      return { data: data as unknown as Integracao | null, error };
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
    // Map DB columns (created_at) to app type (criado_em)
    const mapped = (data || []).map(row => ({
      id: row.id,
      funil_id: row.funil_id,
      nome: row.nome,
      ordem: row.ordem,
      cor: row.cor || '#6b7280',
      criado_em: row.created_at,
    })) as FunilEtapa[];
    setEtapas(mapped);
    setLoading(false);
  }, [funilId]);

  useEffect(() => { fetchEtapas(); }, [fetchEtapas]);

  const addEtapa = async (item: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('funil_etapas') as any).insert(item).select().single();
    if (!error && data) {
      const mapped: FunilEtapa = {
        id: (data as any).id,
        funil_id: (data as any).funil_id,
        nome: (data as any).nome,
        ordem: (data as any).ordem,
        cor: (data as any).cor || '#6b7280',
        criado_em: (data as any).created_at,
      };
      setEtapas(prev => {
        const next = [...prev, mapped];
        return next.sort((a,b) => a.ordem - b.ordem);
      });
    }
    return { data: data ? { id: (data as any).id, funil_id: (data as any).funil_id, nome: (data as any).nome, ordem: (data as any).ordem, cor: (data as any).cor || '#6b7280', criado_em: (data as any).created_at } as FunilEtapa : null, error };
  };

  const updateEtapa = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('funil_etapas') as any)
      .update(updates).eq('id', id).select().single();
    if (!error && data) {
      const mapped: FunilEtapa = {
        id: (data as any).id,
        funil_id: (data as any).funil_id,
        nome: (data as any).nome,
        ordem: (data as any).ordem,
        cor: (data as any).cor || '#6b7280',
        criado_em: (data as any).created_at,
      };
      setEtapas(prev => {
        const next = prev.map(e => e.id === id ? mapped : e);
        return next.sort((a,b) => a.ordem - b.ordem);
      });
    }
    return { data: data ? { id: (data as any).id, funil_id: (data as any).funil_id, nome: (data as any).nome, ordem: (data as any).ordem, cor: (data as any).cor || '#6b7280', criado_em: (data as any).created_at } as FunilEtapa : null, error };
  };

  const deleteEtapa = async (id: string) => {
    const { error } = await supabase.from('funil_etapas').delete().eq('id', id);
    if (!error) setEtapas(prev => prev.filter(e => e.id !== id));
    return { error };
  };

  return { etapas, setEtapas, loading, fetchEtapas, addEtapa, updateEtapa, deleteEtapa };
}

export function usePessoas() {
  const { usuario } = useAuth();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPessoas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pessoas')
      .select('*')
      .order('nome', { ascending: true });
    setPessoas((data as unknown as Pessoa[] | null) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPessoas(); }, [fetchPessoas]);

  const addPessoa = async (item: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('pessoas') as any)
      .insert({ ...item, clinica_id: usuario?.clinica_id })
      .select().single();
    if (!error && data) setPessoas(prev => [...prev, data as unknown as Pessoa].sort((a, b) => a.nome.localeCompare(b.nome)));
    return { data: data as unknown as Pessoa | null, error };
  };

  const updatePessoa = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('pessoas') as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (!error && data) setPessoas(prev => prev.map(p => p.id === id ? data as unknown as Pessoa : p));
    return { data: data as unknown as Pessoa | null, error };
  };

  const deletePessoa = async (id: string) => {
    const { error } = await supabase.from('pessoas').delete().eq('id', id);
    if (!error) setPessoas(prev => prev.filter(p => p.id !== id));
    return { error };
  };

  return { pessoas, loading, fetchPessoas, addPessoa, updatePessoa, deletePessoa };
}

export function useLeadEtapaHistorico(leadId: string | null) {
  const [historico, setHistorico] = useState<LeadEtapaHistorico[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistorico = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const { data } = await supabase
      .from('lead_etapa_historico')
      .select('*')
      .eq('lead_id', leadId)
      .order('entrada_at', { ascending: true });

    const mapped = ((data as unknown as LeadEtapaHistorico[] | null) || []).map(h => ({
      ...h,
      dias: Math.floor(
        (new Date(h.saida_at || new Date().toISOString()).getTime() - new Date(h.entrada_at).getTime())
        / (1000 * 60 * 60 * 24)
      ),
    }));
    setHistorico(mapped);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico]);

  const registrarEntrada = async (leadId: string, etapaId: string | null, etapaNome: string) => {
    // Fechar etapa anterior
    const etapaAberta = historico.find(h => !h.saida_at);
    if (etapaAberta) {
      await (supabase.from('lead_etapa_historico') as any)
        .update({ saida_at: new Date().toISOString() })
        .eq('id', etapaAberta.id);
    }
    // Abrir nova etapa
    const { data, error } = await (supabase.from('lead_etapa_historico') as any)
      .insert({ lead_id: leadId, etapa_id: etapaId, etapa_nome: etapaNome })
      .select().single();
    if (!error) fetchHistorico();
    return { data, error };
  };

  return { historico, loading, fetchHistorico, registrarEntrada };
}

export function useCamposCategorias() {
  const { usuario } = useAuth();
  const [categorias, setCategorias] = useState<CampoCategoria[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategorias = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('campos_categorias')
      .select('*, campos:campos_personalizados(*)')
      .order('ordem', { ascending: true });
    setCategorias((data as unknown as CampoCategoria[] | null) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategorias(); }, [fetchCategorias]);

  const addCategoria = async (item: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('campos_categorias') as any)
      .insert({ ...item, clinica_id: usuario?.clinica_id })
      .select('*, campos:campos_personalizados(*)').single();
    if (!error && data) setCategorias(prev => [...prev, data as unknown as CampoCategoria]);
    return { data: data as unknown as CampoCategoria | null, error };
  };

  const updateCategoria = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('campos_categorias') as any)
      .update(updates).eq('id', id)
      .select('*, campos:campos_personalizados(*)').single();
    if (!error && data) setCategorias(prev => prev.map(c => c.id === id ? data as unknown as CampoCategoria : c));
    return { data: data as unknown as CampoCategoria | null, error };
  };

  const deleteCategoria = async (id: string) => {
    const { error } = await supabase.from('campos_categorias').delete().eq('id', id);
    if (!error) setCategorias(prev => prev.filter(c => c.id !== id));
    return { error };
  };

  return { categorias, loading, fetchCategorias, addCategoria, updateCategoria, deleteCategoria };
}

export function useCamposPersonalizados(categoriaId: string | null) {
  const [campos, setCampos] = useState<CampoPersonalizado[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCampos = useCallback(async () => {
    if (!categoriaId) return;
    setLoading(true);
    const { data } = await supabase
      .from('campos_personalizados')
      .select('*')
      .eq('categoria_id', categoriaId)
      .order('ordem', { ascending: true });
    setCampos((data as unknown as CampoPersonalizado[] | null) || []);
    setLoading(false);
  }, [categoriaId]);

  useEffect(() => { fetchCampos(); }, [fetchCampos]);

  const addCampo = async (item: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('campos_personalizados') as any)
      .insert(item).select().single();
    if (!error && data) setCampos(prev => [...prev, data as unknown as CampoPersonalizado]);
    return { data: data as unknown as CampoPersonalizado | null, error };
  };

  const updateCampo = async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await (supabase.from('campos_personalizados') as any)
      .update(updates).eq('id', id).select().single();
    if (!error && data) setCampos(prev => prev.map(c => c.id === id ? data as unknown as CampoPersonalizado : c));
    return { data: data as unknown as CampoPersonalizado | null, error };
  };

  const deleteCampo = async (id: string) => {
    const { error } = await supabase.from('campos_personalizados').delete().eq('id', id);
    if (!error) setCampos(prev => prev.filter(c => c.id !== id));
    return { error };
  };

  return { campos, loading, fetchCampos, addCampo, updateCampo, deleteCampo };
}

export function useCamposValores(leadId: string | null) {
  const [valores, setValores] = useState<CampoValor[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchValores = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const { data } = await supabase
      .from('campos_valores')
      .select('*')
      .eq('lead_id', leadId);
    setValores((data as unknown as CampoValor[] | null) || []);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { fetchValores(); }, [fetchValores]);

  const upsertValor = async (campoId: string, leadId: string, valor: string) => {
    const { data, error } = await (supabase.from('campos_valores') as any)
      .upsert({ campo_id: campoId, lead_id: leadId, valor, updated_at: new Date().toISOString() }, { onConflict: 'campo_id,lead_id' })
      .select().single();
    if (!error && data) {
      setValores(prev => {
        const idx = prev.findIndex(v => v.campo_id === campoId);
        if (idx >= 0) return prev.map((v, i) => i === idx ? data as unknown as CampoValor : v);
        return [...prev, data as unknown as CampoValor];
      });
    }
    return { data: data as unknown as CampoValor | null, error };
  };

  return { valores, loading, fetchValores, upsertValor };
}
