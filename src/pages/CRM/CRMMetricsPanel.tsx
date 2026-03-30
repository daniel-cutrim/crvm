import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, FunnelChart, Funnel, LabelList } from 'recharts';
import { TrendingUp, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import type { Lead } from '@/types';

interface CRMMetricsPanelProps {
  leads: Lead[];
}

const ETAPAS_ORDER = ['Novo Lead', 'Em Contato', 'Avaliação marcada', 'Orçamento aprovado'];
const ETAPA_COLORS = ['hsl(199, 89%, 38%)', 'hsl(38, 92%, 50%)', 'hsl(162, 63%, 41%)', 'hsl(142, 71%, 45%)'];
const ORIGEM_COLORS = ['hsl(199, 89%, 38%)', 'hsl(38, 92%, 50%)', 'hsl(162, 63%, 41%)', 'hsl(0, 72%, 51%)', 'hsl(270, 60%, 50%)', 'hsl(210, 15%, 55%)'];

export default function CRMMetricsPanel({ leads }: CRMMetricsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const funnelData = useMemo(() => {
    const activeLeads = leads.filter(l => l.etapa_funil !== 'Orçamento perdido');
    return ETAPAS_ORDER.map((etapa, i) => {
      const count = etapa === 'Novo Lead'
        ? leads.filter(l => l.etapa_funil !== 'Orçamento perdido').length
        : etapa === 'Em Contato'
          ? leads.filter(l => ['Em Contato', 'Avaliação marcada', 'Orçamento aprovado'].includes(l.etapa_funil)).length
          : etapa === 'Avaliação marcada'
            ? leads.filter(l => ['Avaliação marcada', 'Orçamento aprovado'].includes(l.etapa_funil)).length
            : leads.filter(l => l.etapa_funil === 'Orçamento aprovado').length;
      return {
        name: etapa,
        value: count,
        fill: ETAPA_COLORS[i],
      };
    });
  }, [leads]);

  const conversionByOrigin = useMemo(() => {
    const origensMap = new Map<string, { total: number; convertidos: number }>();

    leads.forEach(lead => {
      const origem = lead.origem || 'Sem origem';
      if (!origensMap.has(origem)) {
        origensMap.set(origem, { total: 0, convertidos: 0 });
      }
      const entry = origensMap.get(origem)!;
      entry.total++;
      if (lead.convertido_paciente_id) entry.convertidos++;
    });

    return Array.from(origensMap.entries())
      .map(([origem, data]) => ({
        origem,
        total: data.total,
        convertidos: data.convertidos,
        taxa: data.total > 0 ? Math.round((data.convertidos / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  const overallConversion = useMemo(() => {
    if (leads.length === 0) return 0;
    const converted = leads.filter(l => l.convertido_paciente_id).length;
    return Math.round((converted / leads.length) * 100);
  }, [leads]);

  const avgConversionTime = useMemo(() => {
    const convertedLeads = leads.filter(l => l.convertido_paciente_id);
    if (convertedLeads.length === 0) return null;
    // Placeholder — would need conversion date for real calculation
    return null;
  }, [leads]);

  if (leads.length === 0) return null;

  return (
    <div className="dental-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground">Métricas de Conversão</h3>
            <p className="text-xs text-muted-foreground">
              Taxa geral: <span className="font-semibold text-primary">{overallConversion}%</span>
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5">
          {/* Funnel visualization */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Funil de Conversão
            </h4>
            <div className="space-y-2">
              {funnelData.map((stage, i) => {
                const maxValue = funnelData[0].value || 1;
                const widthPercent = Math.max((stage.value / maxValue) * 100, 15);
                const convRate = i === 0
                  ? 100
                  : funnelData[0].value > 0
                    ? Math.round((stage.value / funnelData[0].value) * 100)
                    : 0;

                return (
                  <div key={stage.name} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{stage.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {stage.value} · {convRate}%
                        </span>
                      </div>
                      <div className="h-7 bg-muted/50 rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                          style={{
                            width: `${widthPercent}%`,
                            backgroundColor: stage.fill,
                          }}
                        >
                          {stage.value > 0 && (
                            <span className="text-[10px] font-bold text-white whitespace-nowrap">
                              {stage.value}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drop-off indicators */}
            <div className="mt-3 flex flex-wrap gap-2">
              {funnelData.slice(1).map((stage, i) => {
                const prev = funnelData[i].value;
                const dropOff = prev > 0 ? Math.round(((prev - stage.value) / prev) * 100) : 0;
                return (
                  <div key={stage.name} className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {funnelData[i].name.split(' ')[0]} → {stage.name.split(' ')[0]}: <span className={dropOff > 50 ? 'text-destructive font-semibold' : 'font-medium'}>{dropOff}% perda</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conversion by Origin */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Conversão por Origem
            </h4>

            {conversionByOrigin.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={conversionByOrigin} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis
                        dataKey="origem"
                        type="category"
                        tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number, name: string) => [
                          value,
                          name === 'total' ? 'Total' : 'Convertidos',
                        ]}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary) / 0.2)" radius={[0, 4, 4, 0]} barSize={16} name="total" />
                      <Bar dataKey="convertidos" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} barSize={16} name="convertidos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Origin table */}
                <div className="mt-3 space-y-1.5">
                  {conversionByOrigin.map((item, i) => (
                    <div key={item.origem} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ORIGEM_COLORS[i % ORIGEM_COLORS.length] }}
                        />
                        <span className="text-xs font-medium text-foreground">{item.origem}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {item.convertidos}/{item.total}
                        </span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          item.taxa >= 50
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : item.taxa >= 25
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-red-500/10 text-red-600'
                        }`}>
                          {item.taxa}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum lead com origem definida
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}