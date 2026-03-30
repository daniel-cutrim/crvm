import { useState, useMemo } from 'react';
import { Search, Plus, Filter, Phone, Mail, Download, ChevronDown, X, MessageSquare } from 'lucide-react';
import { formatWhatsAppLink } from '@/utils/masks';
import { usePacientes, useUsuarios, useConsultas, usePlanosTratamento, useReceitas } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import type { Paciente } from '@/types';
import PacienteForm from './PacienteForm';
import PacienteDetail from './PacienteDetail';
import { exportToCSV, exportToPDF } from '@/utils/export';

export default function PacientesPage() {
  const { usuario } = useAuth();
  const { pacientes, addPaciente, updatePaciente, deletePaciente } = usePacientes();
  const { usuarios } = useUsuarios();
  const { consultas } = useConsultas();
  const { planos } = usePlanosTratamento();
  const { receitas } = useReceitas();
  const isGestor = usuario?.papel === 'Gestor';

  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dentistaFilter, setDentistaFilter] = useState('');
  const [sexoFilter, setSexoFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const syncedSelectedPaciente = useMemo(() => {
    if (!selectedPaciente) return null;
    return pacientes.find(p => p.id === selectedPaciente.id) || selectedPaciente;
  }, [pacientes, selectedPaciente]);

  const filteredPacientes = useMemo(() => {
    return pacientes.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = p.nome.toLowerCase().includes(q) ||
        p.telefone?.includes(search) || p.cpf?.includes(search) ||
        p.codigo_paciente?.includes(search);
      const matchStatus = !statusFilter || p.status === statusFilter;
      const matchDentista = !dentistaFilter || p.dentista_id === dentistaFilter;
      const matchSexo = !sexoFilter || p.sexo === sexoFilter;
      return matchSearch && matchStatus && matchDentista && matchSexo;
    });
  }, [pacientes, search, statusFilter, dentistaFilter, sexoFilter]);

  const activeFilterCount = [statusFilter, dentistaFilter, sexoFilter].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter('');
    setDentistaFilter('');
    setSexoFilter('');
  };

  const handleSave = async (data: Partial<Paciente>) => {
    if (editingPaciente) await updatePaciente(editingPaciente.id, data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else await addPaciente(data as any);
    setIsFormOpen(false);
    setEditingPaciente(null);
  };

  const handleDelete = async (id: string) => {
    await deletePaciente(id);
    setSelectedPaciente(null);
  };

  const exportColumns = [
    { header: 'Código', accessor: (p: Paciente) => p.codigo_paciente || '' },
    { header: 'Nome', accessor: (p: Paciente) => p.nome },
    { header: 'CPF', accessor: (p: Paciente) => p.cpf || '' },
    { header: 'Telefone', accessor: (p: Paciente) => p.telefone || '' },
    { header: 'E-mail', accessor: (p: Paciente) => p.email || '' },
    { header: 'Status', accessor: (p: Paciente) => p.status },
    { header: 'Dentista', accessor: (p: Paciente) => p.dentista?.nome || '' },
    { header: 'Sexo', accessor: (p: Paciente) => p.sexo || '' },
  ];

  const handleExportCSV = () => {
    exportToCSV('pacientes', exportColumns, filteredPacientes);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    exportToPDF('Pacientes', exportColumns, filteredPacientes);
    setShowExportMenu(false);
  };

  const dentistas = usuarios.filter(u => u.papel === 'Dentista');

  const getStatusBadge = (status: string) => {
    const cls: Record<string, string> = {
      Ativo: 'dental-badge-success', 'Em tratamento': 'dental-badge-info',
      Inadimplente: 'dental-badge-danger', Inativo: 'dental-badge-warning',
    };
    return <span className={`dental-badge ${cls[status] || 'dental-badge-default'}`}>{status}</span>;
  };

  if (syncedSelectedPaciente) {
    return (
      <>
        <PacienteDetail
          paciente={syncedSelectedPaciente}
          consultas={consultas}
          planos={planos}
          receitas={receitas}
          onBack={() => setSelectedPaciente(null)}
          onEdit={() => { setEditingPaciente(syncedSelectedPaciente); setIsFormOpen(true); }}
        />
        <PacienteForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingPaciente(null); }}
          onSave={handleSave}
          onDelete={handleDelete}
          paciente={editingPaciente}
          dentistas={usuarios}
          isGestor={isGestor}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {filteredPacientes.length} paciente{filteredPacientes.length !== 1 ? 's' : ''} encontrado{filteredPacientes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-2 px-3 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground"
              >
                <Download size={16} /> Exportar <ChevronDown size={14} />
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[140px]">
                    <button onClick={handleExportCSV} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors rounded-t-lg text-foreground">
                      Exportar CSV
                    </button>
                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors rounded-b-lg text-foreground">
                      Exportar PDF
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => { setEditingPaciente(null); setIsFormOpen(true); }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity active:scale-[0.97]">
              <Plus size={16} /> Novo Paciente
            </button>
          </div>
        </div>

        <div className="dental-card">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input placeholder="Buscar por nome, telefone, CPF ou código..." value={search}
                  onChange={e => setSearch(e.target.value)} className="dental-input pl-9" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    showAdvancedFilters || activeFilterCount > 0
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted text-foreground'
                  }`}
                >
                  <Filter size={16} />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="dental-input w-full">
                    <option value="">Todos</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Em tratamento">Em tratamento</option>
                    <option value="Inadimplente">Inadimplente</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Dentista</label>
                  <select value={dentistaFilter} onChange={e => setDentistaFilter(e.target.value)} className="dental-input w-full">
                    <option value="">Todos</option>
                    {dentistas.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Sexo</label>
                  <select value={sexoFilter} onChange={e => setSexoFilter(e.target.value)} className="dental-input w-full">
                    <option value="">Todos</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-border">
            {filteredPacientes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Nenhum paciente encontrado</div>
            ) : filteredPacientes.map(p => (
              <button key={p.id} className="w-full text-left p-4 hover:bg-muted/30 transition-colors active:bg-muted/50"
                onClick={() => setSelectedPaciente(p)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{p.nome}</span>
                  {getStatusBadge(p.status)}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  {p.codigo_paciente && <span className="font-mono text-primary">#{p.codigo_paciente}</span>}
                  {p.telefone && <span className="flex items-center gap-1"><Phone size={10} />{p.telefone}</span>}
                  {p.dentista?.nome && <span>Dr. {p.dentista.nome}</span>}
                </div>
              </button>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">E-mail</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">CPF</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Dentista</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPacientes.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">Nenhum paciente encontrado</td></tr>
                ) : filteredPacientes.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedPaciente(p)}>
                    <td className="py-3 px-4 text-sm font-mono font-semibold text-primary">{p.codigo_paciente || '—'}</td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{p.nome}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {p.telefone || p.whatsapp ? (
                        <span className="flex items-center gap-2">
                          <Phone size={12} />{p.telefone || p.whatsapp}
                          <a
                            href={formatWhatsAppLink(
                              p.whatsapp || p.telefone!,
                              `Olá ${p.nome.split(' ')[0]}, tudo bem? Aqui é da F&F Odonto! 😊`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                            title="Abrir WhatsApp"
                          >
                            <MessageSquare size={10} />
                          </a>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell">
                      {p.email ? <span className="flex items-center gap-1"><Mail size={12} />{p.email}</span> : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground hidden xl:table-cell">{p.cpf || '—'}</td>
                    <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell">{p.dentista?.nome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PacienteForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingPaciente(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        paciente={editingPaciente}
        dentistas={usuarios}
        isGestor={isGestor}
      />
    </>
  );
}
