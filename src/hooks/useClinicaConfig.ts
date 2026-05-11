import { useAuth } from '@/contexts/AuthContext';

export function useClinicaConfig() {
  return {
    labelProfissional: 'Profissional',
    labelDenteRegiao: 'Região/Local',
  };
}
