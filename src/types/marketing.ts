export interface MarketingInvestimento {
  id: string;
  canal: string;
  mes: string;
  valor_investido: number;
  observacao: string | null;
  created_at: string;
}

export interface MarketingMeta {
  id: string;
  mes: string;
  meta_leads: number;
  meta_conversoes: number;
  meta_roi: number | null;
  created_at: string;
}

export const CANAIS_MARKETING = [
  'Google Ads',
  'Meta Ads',
  'Instagram',
  'Facebook',
  'TikTok Ads',
  'Indicação',
  'Site/SEO',
  'Outro',
] as const;
