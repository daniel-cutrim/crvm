import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, User, Calendar, Target, X } from 'lucide-react';
import { usePacientes, useLeads, useConsultas } from '@/hooks/useData';
import { format } from 'date-fns';

interface Props {
  onNavigate: (page: string, id?: string) => void;
}

interface SearchResult {
  id: string;
  type: 'paciente' | 'lead' | 'consulta';
  title: string;
  subtitle: string;
  page: string;
}

export default function GlobalSearch({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { pacientes } = usePacientes();
  const { leads } = useLeads();
  const { consultas } = useConsultas();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const items: SearchResult[] = [];

    pacientes.forEach(p => {
      if (
        p.nome.toLowerCase().includes(q) ||
        p.cpf?.includes(q) ||
        p.telefone?.includes(q) ||
        p.codigo_paciente?.includes(q)
      ) {
        items.push({
          id: p.id,
          type: 'paciente',
          title: `${p.codigo_paciente ? `#${p.codigo_paciente} · ` : ''}${p.nome}`,
          subtitle: [p.telefone, p.cpf].filter(Boolean).join(' · ') || p.status,
          page: 'pacientes',
        });
      }
    });

    leads.forEach(l => {
      if (
        l.nome.toLowerCase().includes(q) ||
        l.telefone?.includes(q) ||
        l.email?.toLowerCase().includes(q)
      ) {
        items.push({
          id: l.id,
          type: 'lead',
          title: l.nome,
          subtitle: [l.telefone, l.etapa_funil].filter(Boolean).join(' · '),
          page: 'crm',
        });
      }
    });

    consultas.forEach(c => {
      const nome = c.paciente?.nome || c.lead?.nome || '';
      if (
        nome.toLowerCase().includes(q) ||
        c.tipo_procedimento.toLowerCase().includes(q)
      ) {
        items.push({
          id: c.id,
          type: 'consulta',
          title: `${nome} — ${c.tipo_procedimento}`,
          subtitle: `${format(new Date(c.data_hora), 'dd/MM/yyyy HH:mm')} · ${c.status}`,
          page: 'agenda',
        });
      }
    });

    return items.slice(0, 10);
  }, [query, pacientes, leads, consultas]);

  const iconMap = {
    paciente: <User size={14} className="text-primary" />,
    lead: <Target size={14} className="text-violet-500" />,
    consulta: <Calendar size={14} className="text-teal-500" />,
  };

  const labelMap = {
    paciente: 'Paciente',
    lead: 'Lead',
    consulta: 'Consulta',
  };

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      <input
        type="text"
        placeholder="Buscar pacientes, consultas..."
        className="dental-input pl-9 py-2 text-sm w-full"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => query.length >= 2 && setOpen(true)}
      />
      {query && (
        <button
          onClick={() => { setQuery(''); setOpen(false); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      )}

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum resultado para "{query}"
            </div>
          ) : (
            <ul className="py-1">
              {results.map(r => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      onNavigate(r.page);
                      setQuery('');
                      setOpen(false);
                    }}
                  >
                    {iconMap[r.type]}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {labelMap[r.type]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
