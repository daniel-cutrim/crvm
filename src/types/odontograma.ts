export interface OdontogramaEntrada {
  id: string;
  paciente_id: string;
  dente_numero: number;
  face: 'vestibular' | 'lingual' | 'mesial' | 'distal' | 'oclusal' | 'completo';
  status: 'Saudável' | 'Cariado' | 'Restaurado' | 'Ausente' | 'Prótese' | 'Implante' | 'Fraturado' | 'Endodontia';
  procedimento: string | null;
  observacao: string | null;
  dentista_id: string | null;
  data_registro: string;
  created_at: string;
  dentista?: { id: string; nome: string };
}

export const STATUS_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
  'Saudável': { color: '#22c55e', label: 'Saudável', emoji: '✅' },
  'Cariado': { color: '#ef4444', label: 'Cariado', emoji: '🔴' },
  'Restaurado': { color: '#3b82f6', label: 'Restaurado', emoji: '🔵' },
  'Ausente': { color: '#9ca3af', label: 'Ausente', emoji: '⬜' },
  'Prótese': { color: '#a855f7', label: 'Prótese', emoji: '🟣' },
  'Implante': { color: '#f59e0b', label: 'Implante', emoji: '🟡' },
  'Fraturado': { color: '#f97316', label: 'Fraturado', emoji: '🟠' },
  'Endodontia': { color: '#ec4899', label: 'Endodontia', emoji: '🩷' },
};

export const FACES = ['oclusal', 'vestibular', 'lingual', 'mesial', 'distal'] as const;

export const DENTES_SUPERIOR = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const DENTES_INFERIOR = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export function getDenteLabel(num: number): string {
  return `${num}`;
}

export function isAnterior(num: number): boolean {
  const u = num % 10;
  return u >= 1 && u <= 3;
}
