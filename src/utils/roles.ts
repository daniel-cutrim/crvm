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
