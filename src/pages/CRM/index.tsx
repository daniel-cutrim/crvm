import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Users, TrendingUp, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { useLeads, usePacientes, useFunis, useFunilEtapas } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import type { Lead, FunilEtapa } from '@/types';
import KanbanBoard from './KanbanBoard';
import LeadFormDialog from './LeadFormDialog';
import LeadDetailSheet from './LeadDetailSheet';
import CRMMetricsPanel from './CRMMetricsPanel';
import { toast } from 'sonner';

export default function CRMPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { leads, loading: loadingLeads, addLead, updateLead, deleteLead } = useLeads();
  const { funis, loading: loadingFunis } = useFunis();
  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!loadingFunis && funis.length > 0 && !selectedFunilId) {
      setSelectedFunilId(funis[0].id);
    }
  }, [funis, loadingFunis, selectedFunilId]);

  const { etapas, loading: loadingEtapas } = useFunilEtapas(selectedFunilId);
  const loading = loadingLeads || loadingFunis || loadingEtapas;

  const { pacientes, addPaciente } = usePacientes();
  const { usuario } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');

  const filteredLeads = useMemo(() => {
    const result = leads.filter(l => l.funil_id === selectedFunilId);
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(l =>
      l.nome.toLowerCase().includes(q) ||
      l.telefone?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
    );
  }, [leads, search, selectedFunilId]);

  const stats = useMemo(() => ({
    total: leads.length,
    ativos: leads.filter(l => l.etapa_funil !== 'Orçamento perdido').length,
    convertidos: leads.filter(l => l.convertido_paciente_id).length,
    perdidos: leads.filter(l => l.etapa_funil === 'Orçamento perdido').length,
  }), [leads]);

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (editingLead) {
        const { error } = await updateLead(editingLead.id, data);
        if (error) throw error;
        toast.success('Lead atualizado com sucesso!');
      } else {
        const { error } = await addLead({ 
          ...data, 
          clinica_id: usuario?.clinica_id,
          funil_id: selectedFunilId
        });
        if (error) throw error;
        toast.success('Lead cadastrado com sucesso!');
      }
      setFormOpen(false);
      setEditingLead(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar o lead');
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormOpen(true);
  };

  const handleMoveEtapa = async (leadId: string, novaEtapa: FunilEtapa) => {
    await updateLead(leadId, { etapa_funil: novaEtapa.nome, etapa_id: novaEtapa.id });
  };

  const handleConvert = async (lead: Lead) => {
    const { data: paciente } = await addPaciente({
      nome: lead.nome,
      telefone: lead.telefone,
      email: lead.email,
      status: 'Ativo',
    });
    if (paciente) {
      await updateLead(lead.id, {
        convertido_paciente_id: paciente.id,
        etapa_funil: 'Orçamento aprovado',
      });
      setDetailLead(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteLead(id);
    setDetailLead(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="dental-stat h-20 animate-pulse bg-muted/30" />)}
        </div>
        <div className="dental-card p-8 h-96 animate-pulse bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM / Leads</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {stats.total > 0
              ? `${stats.ativos} lead${stats.ativos !== 1 ? 's' : ''} ativo${stats.ativos !== 1 ? 's' : ''} · ${stats.convertidos} convertido${stats.convertidos !== 1 ? 's' : ''}`
              : 'Gerencie seus leads e funil de vendas'}
          </p>
        </div>
        <button
          onClick={() => { setEditingLead(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium
            hover:opacity-90 transition-opacity active:scale-[0.97]"
        >
          <Plus size={16} />
          Novo Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold text-foreground">{stats.total}</p>
          </div>
        </div>
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-lg font-semibold text-foreground">{stats.ativos}</p>
          </div>
        </div>
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <UserCheck size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Convertidos</p>
            <p className="text-lg font-semibold text-foreground">{stats.convertidos}</p>
          </div>
        </div>
        <div className="dental-stat flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <UserX size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Perdidos</p>
            <p className="text-lg font-semibold text-foreground">{stats.perdidos}</p>
          </div>
        </div>
      </div>

      {/* Search and Funnel Selection */}
      <div className="flex flex-col sm:flex-row gap-4">
        {funis.length > 0 ? (
          <div className="w-full sm:w-[250px]">
            <Select value={selectedFunilId || ''} onValueChange={setSelectedFunilId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o Funil" />
              </SelectTrigger>
              <SelectContent>
                {funis.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-600 rounded-lg w-full sm:w-auto text-sm border border-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              Você ainda não possui funis de venda estruturados.
              <button 
                onClick={() => {
                  window.history.pushState({}, '', '?tab=funis');
                  if (onNavigate) onNavigate('configuracoes');
                }}
                className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border shadow-sm border-amber-300 bg-white text-amber-700 hover:bg-amber-100 h-7 px-3 text-xs"
              >
                Criar um Funil agora
              </button>
            </div>
          </div>
        )}

        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="dental-input pl-9 w-full"
            placeholder="Buscar lead por nome, telefone ou e-mail..."
          />
        </div>
      </div>

      {/* Metrics Panel */}
      <CRMMetricsPanel leads={filteredLeads} funilEtapas={etapas} />

      {/* Kanban Board */}
      {etapas.length > 0 ? (
        <KanbanBoard
          leads={filteredLeads}
          etapas={etapas}
          onLeadClick={setDetailLead}
          onMoveEtapa={handleMoveEtapa}
        />
      ) : (
        <div className="text-center py-16 border rounded-xl bg-card">
          <p className="text-muted-foreground mb-4">Selecione um funil ou adicione etapas a ele.</p>
        </div>
      )}

      {/* Form Dialog */}
      <LeadFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingLead(null); }}
        onSave={handleSave}
        lead={editingLead}
        etapas={etapas}
      />

      {/* Detail Sheet */}
      <LeadDetailSheet
        lead={detailLead}
        onClose={() => setDetailLead(null)}
        onEdit={handleEdit}
        onConvert={handleConvert}
        onDelete={handleDelete}
        onUpdateLead={updateLead}
        usuario={usuario}
      />
    </div>
  );
}
