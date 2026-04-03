import { useAuth } from '@/contexts/AuthContext';

export function useClinicaConfig() {
  const { usuario } = useAuth();
  const tipo = usuario?.clinica?.tipo_especialidade || 'geral';

  return {
    isOdontologia: tipo === 'odontologia',
    showOdontograma: tipo === 'odontologia',
    labelProfissional: tipo === 'odontologia' ? 'Dentista' : 'Profissional',
    labelDenteRegiao: tipo === 'odontologia' ? 'Dente/Região' : 'Região/Local',
  };
}
