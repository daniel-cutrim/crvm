import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useOdontograma } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { DENTES_SUPERIOR, DENTES_INFERIOR, STATUS_CONFIG } from '@/types/odontograma';
import ToothSVG from './ToothSVG';
import ToothDetailPanel from './ToothDetailPanel';

interface Props {
  pacienteId: string;
}

export default function Odontograma({ pacienteId }: Props) {
  const { entradas, loading, addEntrada, deleteEntrada } = useOdontograma(pacienteId);
  const { usuario } = useAuth();
  const [selectedDente, setSelectedDente] = useState<number | null>(null);

  const handleAdd = useCallback(async (data: Record<string, unknown>) => {
    return addEntrada({ ...data, paciente_id: pacienteId });
  }, [addEntrada, pacienteId]);

  const handleDelete = useCallback(async (id: string) => {
    return deleteEntrada(id);
  }, [deleteEntrada]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Odontograma</h2>
        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_CONFIG).map(([key, { color, label }]) => (
            <div key={key} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dental chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4 space-y-6">
              {/* Superior arch */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1 text-center uppercase tracking-wider">
                  Arcada Superior
                </p>
                <div className="flex justify-center gap-0.5 flex-wrap">
                  {DENTES_SUPERIOR.map(num => (
                    <ToothSVG
                      key={num}
                      denteNumero={num}
                      entradas={entradas.filter(e => e.dente_numero === num)}
                      selected={selectedDente === num}
                      onClick={() => setSelectedDente(num)}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t border-dashed border-border" />

              {/* Inferior arch */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1 text-center uppercase tracking-wider">
                  Arcada Inferior
                </p>
                <div className="flex justify-center gap-0.5 flex-wrap">
                  {DENTES_INFERIOR.map(num => (
                    <ToothSVG
                      key={num}
                      denteNumero={num}
                      entradas={entradas.filter(e => e.dente_numero === num)}
                      selected={selectedDente === num}
                      onClick={() => setSelectedDente(num)}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <div>
          {selectedDente ? (
            <ToothDetailPanel
              denteNumero={selectedDente}
              entradas={entradas}
              onAdd={handleAdd}
              onDelete={handleDelete}
              usuarioId={usuario?.id || null}
            />
          ) : (
            <Card className="h-full">
              <CardContent className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center">
                  <span className="text-4xl mb-2 block">🦷</span>
                  <p className="text-sm text-muted-foreground">Selecione um dente para ver detalhes</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
