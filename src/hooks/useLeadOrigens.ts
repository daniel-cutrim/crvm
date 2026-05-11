import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { LeadOrigem } from '@/types';

export function useLeadOrigens() {
  const { usuario } = useAuth();
  const [origens, setOrigens] = useState<LeadOrigem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrigens = useCallback(async () => {
    if (!usuario?.clinica_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('lead_origens')
      .select('*')
      .eq('clinica_id', usuario.clinica_id)
      .order('ordem', { ascending: true });
    setOrigens((data || []) as LeadOrigem[]);
    setLoading(false);
  }, [usuario?.clinica_id]);

  useEffect(() => { fetchOrigens(); }, [fetchOrigens]);

  const addOrigem = async (nome: string) => {
    if (!usuario?.clinica_id) return { error: new Error('No clinica') };
    const maxOrdem = origens.reduce((max, o) => Math.max(max, o.ordem), 0);
    const { data, error } = await supabase
      .from('lead_origens')
      .insert({
        clinica_id: usuario.clinica_id,
        nome,
        ordem: maxOrdem + 1,
        ativo: true,
      })
      .select()
      .single();
    if (!error && data) {
      setOrigens(prev => [...prev, data as LeadOrigem]);
    }
    return { data, error };
  };

  const updateOrigem = async (id: string, updates: Partial<Pick<LeadOrigem, 'nome' | 'ativo' | 'ordem'>>) => {
    const { data, error } = await supabase
      .from('lead_origens')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setOrigens(prev => prev.map(o => o.id === id ? (data as LeadOrigem) : o));
    }
    return { data, error };
  };

  const deleteOrigem = async (id: string) => {
    const { error } = await supabase
      .from('lead_origens')
      .delete()
      .eq('id', id);
    if (!error) {
      setOrigens(prev => prev.filter(o => o.id !== id));
    }
    return { error };
  };

  // Active only
  const origensAtivas = origens.filter(o => o.ativo);

  return { origens, origensAtivas, loading, fetchOrigens, addOrigem, updateOrigem, deleteOrigem };
}
