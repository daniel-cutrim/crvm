export const isGestor = (role?: string | null) => {
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  return lowerRole === 'gestor' || lowerRole.includes('gestor');
};

export const isDentista = (role?: string | null) => {
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  return lowerRole === 'dentista' || lowerRole.includes('dentista');
};

export const isOnlyDentista = (role?: string | null) => {
  if (!role) return false;
  return isDentista(role) && !isGestor(role);
};
