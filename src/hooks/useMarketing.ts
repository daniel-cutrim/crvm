import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MarketingInvestimento, MarketingMeta } from '@/types/marketing';

export function useMarketingInvestimentos() {
  const [investimentos, setInvestimentos] = useState<MarketingInvestimento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('marketing_investimentos')
      .select('*')
      .order('mes', { ascending: false });
    setInvestimentos((data || []) as MarketingInvestimento[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addInvestimento = async (item: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('marketing_investimentos')
      .insert(item)
      .select()
      .single();
    if (!error && data) setInvestimentos(prev => [data as MarketingInvestimento, ...prev]);
    return { data, error };
  };

  const deleteInvestimento = async (id: string) => {
    const { error } = await supabase
      .from('marketing_investimentos')
      .delete()
      .eq('id', id);
    if (!error) setInvestimentos(prev => prev.filter(i => i.id !== id));
    return { error };
  };

  return { investimentos, loading, addInvestimento, deleteInvestimento, fetch };
}

export function useMarketingMetas() {
  const [metas, setMetas] = useState<MarketingMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('marketing_metas')
      .select('*')
      .order('mes', { ascending: false });
    setMetas((data || []) as MarketingMeta[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addMeta = async (item: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('marketing_metas')
      .insert(item)
      .select()
      .single();
    if (!error && data) setMetas(prev => [data as MarketingMeta, ...prev]);
    return { data, error };
  };

  return { metas, loading, addMeta, fetch };
}
