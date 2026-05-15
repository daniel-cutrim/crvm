import type { Permissoes } from '@/types';

export const isGestor = (role?: string | null) => {
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  return lowerRole === 'gestor' || lowerRole.includes('gestor');
};

export const isProfissional = (role?: string | null) => {
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  return lowerRole === 'profissional' || lowerRole.includes('profissional');
};

export const isOnlyProfissional = (role?: string | null) => {
  if (!role) return false;
  return isProfissional(role) && !isGestor(role);
};

// Verifica se usuário tem permissão específica. Gestor tem todas por padrão.
export const temPermissao = (
  papel: string | undefined | null,
  permissoes: Permissoes | undefined | null,
  perm: keyof Permissoes
): boolean => {
  if (isGestor(papel)) return true;
  return permissoes?.[perm] === true;
};
