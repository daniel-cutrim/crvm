import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { OdontogramaEntrada } from '@/types/odontograma';
import { STATUS_CONFIG, FACES } from '@/types/odontograma';

interface Props {
  denteNumero: number;
  entradas: OdontogramaEntrada[];
  selected: boolean;
  onClick: () => void;
}

function getStatusForFace(entradas: OdontogramaEntrada[], face: string): string {
  // Get the most recent entry for this face
  const faceEntries = entradas.filter(e => e.face === face || e.face === 'completo');
  if (faceEntries.length === 0) return 'Saudável';
  // Sort by date desc and return latest
  const sorted = [...faceEntries].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return sorted[0].status;
}

function getToothStatus(entradas: OdontogramaEntrada[]): string {
  const completo = entradas.filter(e => e.face === 'completo');
  if (completo.length > 0) {
    const sorted = [...completo].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return sorted[0].status;
  }
  return 'Saudável';
}

function ToothSVG({ denteNumero, entradas, selected, onClick }: Props) {
  const toothStatus = getToothStatus(entradas);
  const isAbsent = toothStatus === 'Ausente';

  const faceColors: Record<string, string> = {};
  for (const face of FACES) {
    const status = getStatusForFace(entradas, face);
    faceColors[face] = STATUS_CONFIG[status]?.color || STATUS_CONFIG['Saudável'].color;
  }

  // If entire tooth is marked, override all faces
  if (toothStatus !== 'Saudável') {
    const color = STATUS_CONFIG[toothStatus]?.color || '#22c55e';
    for (const face of FACES) {
      faceColors[face] = color;
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-1 rounded-lg transition-all hover:bg-muted/60',
        selected && 'ring-2 ring-primary bg-primary/5',
        isAbsent && 'opacity-40',
      )}
      title={`Dente ${denteNumero}`}
    >
      <svg width="36" height="36" viewBox="0 0 36 36" className="drop-shadow-sm">
        {/* Oclusal (center) */}
        <rect x="11" y="11" width="14" height="14" rx="2"
          fill={faceColors.oclusal} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Vestibular (top) */}
        <path d="M11 11 L25 11 L22 3 L14 3 Z" 
          fill={faceColors.vestibular} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Lingual (bottom) */}
        <path d="M11 25 L25 25 L22 33 L14 33 Z"
          fill={faceColors.lingual} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Mesial (left) */}
        <path d="M11 11 L11 25 L3 22 L3 14 Z"
          fill={faceColors.mesial} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Distal (right) */}
        <path d="M25 11 L25 25 L33 22 L33 14 Z"
          fill={faceColors.distal} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Absent X */}
        {isAbsent && (
          <>
            <line x1="6" y1="6" x2="30" y2="30" stroke="#6b7280" strokeWidth="2" />
            <line x1="30" y1="6" x2="6" y2="30" stroke="#6b7280" strokeWidth="2" />
          </>
        )}
      </svg>
      <span className={cn(
        'text-[10px] font-mono font-semibold',
        selected ? 'text-primary' : 'text-muted-foreground',
      )}>
        {denteNumero}
      </span>
    </button>
  );
}

export default memo(ToothSVG);
