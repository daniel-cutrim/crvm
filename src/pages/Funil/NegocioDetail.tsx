import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronLeft, Phone, AlertCircle, MoreHorizontal, Check, Pencil, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useLeadHistorico, useLeadEtapaHistorico, useCamposCategorias, useCamposValores,
  useUsuarios, useProdutos, useTarefasByLead,
} from '@/hooks/useData';
import GanhoDialog from '@/components/ui/GanhoDialog';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { useAuth } from '@/contexts/AuthContext';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import type { Lead, FunilEtapa } from '@/types';

const formatBRL = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function getInitials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
];
function avatarColor(nome: string) {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const TAG_COLORS = ['#f97316', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#0ea5e9', '#1e293b'];
function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffffffff;
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length];
}

const MOTIVOS_PERDA = [
  'Sem tempo', 'Achou caro', 'Está sem dinheiro', 'Descrença em si',
  'Descrença no método', 'Adiou', 'Vai se planejar',
  'Escolheu concorrente', 'Não respondeu', 'Fora do perfil',
  'Desistiu do tratamento', 'Outro',
] as const;

const TIPOS_TAREFA = {
  follow_up: 'Follow-up', ligacao: 'Ligação', reuniao: 'Reunião', email: 'E-mail', outros: 'Outros',
} as const;

const TIPOS_CONTATO = ['Ligação', 'WhatsApp', 'E-mail', 'Visita', 'Outro'] as const;

interface Props {
  lead: Lead | null;
  etapas: FunilEtapa[];
  funilNome: string;
  allTags: string[];
  onClose: () => void;
  onUpdateLead: (id: string, data: Record<string, unknown>) => Promise<{ data: Lead | null; error: unknown }>;
  onDelete: (id: string) => void;
}

export default function NegocioDetail({ lead, etapas, funilNome, allTags, onClose, onUpdateLead, onDelete }: Props) {
  const { usuario } = useAuth();
  const { usuarios } = useUsuarios();

  const { produtos, addProduto } = useProdutos();
  const [showGanhoDialog, setShowGanhoDialog] = useState(false);

  const { historico, addHistorico } = useLeadHistorico(lead?.id || null);
  const { tarefas: leadTarefas, addTarefa: addLeadTarefa, updateTarefa: updateLeadTarefa } = useTarefasByLead(lead?.id || null);
  const { historico: etapaHistorico } = useLeadEtapaHistorico(lead?.id || null);
  const { categorias } = useCamposCategorias();
  const { valores, upsertValor } = useCamposValores(lead?.id || null);

  const [editingNome, setEditingNome] = useState(false);
  const [nomeEdit, setNomeEdit] = useState('');
  const [motivoSelecionado, setMotivoSelecionado] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [tipoContato, setTipoContato] = useState<string>('WhatsApp');
  const [descricaoHistorico, setDescricaoHistorico] = useState('');
  const [sendingHistorico, setSendingHistorico] = useState(false);
  const [valorEditCents, setValorEditCents] = useState(0);
  const [editingValor, setEditingValor] = useState(false);
  const [tarefaForm, setTarefaForm] = useState({ nome: '', tipo: '', descricao: '', responsavel_id: '', data_vencimento: '', status: 'Pendente' });
  const [savingTarefa, setSavingTarefa] = useState(false);
  const [activeTab, setActiveTab] = useState('foco');

  // Inline campo editing
  const [editingCampoId, setEditingCampoId] = useState<string | null>(null);
  const [editingCampoVal, setEditingCampoVal] = useState('');

  // Tags
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (lead) {
      setNomeEdit(lead.nome);
      setValorEditCents(Math.round((lead.valor || 0) * 100));
    }
  }, [lead]);

  const diasNaEtapa = useMemo(() => {
    if (!lead) return 0;
    const desde = lead.etapa_entrou_at || lead.created_at;
    return Math.floor((Date.now() - new Date(desde).getTime()) / (1000 * 60 * 60 * 24));
  }, [lead]);

  const handleSaveNome = useCallback(async () => {
    if (!lead || !nomeEdit.trim()) return;
    await onUpdateLead(lead.id, { nome: nomeEdit.trim() });
    setEditingNome(false);
  }, [lead, nomeEdit, onUpdateLead]);

  const handleSaveValor = useCallback(async () => {
    if (!lead) return;
    await onUpdateLead(lead.id, { valor: valorEditCents / 100 });
    setEditingValor(false);
    toast.success('Valor atualizado');
  }, [lead, valorEditCents, onUpdateLead]);

  const handleGanho = useCallback(() => {
    if (!lead) return;
    setShowGanhoDialog(true);
  }, [lead]);

  const confirmGanho = useCallback(async (data: {
    valor_coletado: number;
    valor_contrato: number;
    produtos_interesse: string[];
  }) => {
    if (!lead) return;
    await onUpdateLead(lead.id, {
      resultado: 'ganho',
      resultado_at: new Date().toISOString(),
      valor_coletado: data.valor_coletado,
      valor_contrato: data.valor_contrato,
      produtos_interesse: data.produtos_interesse,
    });
    toast.success('Negócio marcado como ganho!');
  }, [lead, onUpdateLead]);

  const handleAddProduto = useCallback(async (nome: string) => {
    return await addProduto({ nome, ativo: true });
  }, [addProduto]);

  const handlePerdido = useCallback(async () => {
    if (!lead) return;
    setShowMotivoModal(true);
  }, [lead]);

  const confirmPerdido = useCallback(async () => {
    if (!lead) return;
    const motivo = motivoSelecionado === 'Outro' ? motivoOutro : motivoSelecionado;
    await onUpdateLead(lead.id, {
      resultado: 'perdido',
      motivo_perda: motivo || null,
      resultado_at: new Date().toISOString(),
    });
    setShowMotivoModal(false);
    setMotivoSelecionado('');
    setMotivoOutro('');
    toast.success('Negócio marcado como perdido.');
  }, [lead, motivoSelecionado, motivoOutro, onUpdateLead]);

  const handleDelete = useCallback(async () => {
    if (!lead) return;
    if (!await confirmDialog({ description: 'Deseja excluir este negócio permanentemente?' })) return;
    onDelete(lead.id);
    onClose();
  }, [lead, onDelete, onClose]);

  const handleProprietario = useCallback(async (uid: string) => {
    if (!lead) return;
    await onUpdateLead(lead.id, { proprietario_id: uid || null });
  }, [lead, onUpdateLead]);

  const handleAddHistorico = useCallback(async () => {
    if (!lead || !descricaoHistorico.trim()) return;
    setSendingHistorico(true);
    await addHistorico({
      lead_id: lead.id,
      tipo_contato: tipoContato,
      descricao: descricaoHistorico.trim(),
      usuario_id: usuario?.id || null,
    });
    setDescricaoHistorico('');
    setSendingHistorico(false);
  }, [lead, descricaoHistorico, tipoContato, usuario, addHistorico]);

  const handleAddTarefa = useCallback(async () => {
    if (!lead || !tarefaForm.descricao.trim() || !tarefaForm.data_vencimento) return;
    setSavingTarefa(true);
    await addLeadTarefa({
      nome: tarefaForm.nome.trim() || null,
      tipo: tarefaForm.tipo || null,
      descricao: tarefaForm.descricao.trim(),
      responsavel_id: tarefaForm.responsavel_id || null,
      data_vencimento: tarefaForm.data_vencimento,
      status: tarefaForm.status,
      lead_id: lead.id,
    });
    setTarefaForm({ nome: '', tipo: '', descricao: '', responsavel_id: '', data_vencimento: '', status: 'Pendente' });
    setSavingTarefa(false);
    toast.success('Atividade criada');
  }, [lead, tarefaForm, addLeadTarefa]);

  const handleCampoValor = useCallback(async (campoId: string, valor: string) => {
    if (!lead) return;
    await upsertValor(campoId, lead.id, valor);
  }, [lead, upsertValor]);

  const handleSaveCampo = useCallback(async (campoId: string) => {
    await handleCampoValor(campoId, editingCampoVal);
    setEditingCampoId(null);
  }, [editingCampoVal, handleCampoValor]);

  const handleAddTag = useCallback(async (tag: string) => {
    if (!lead) return;
    const currentTags = lead.tags || [];
    if (currentTags.includes(tag)) { setTagPickerOpen(false); return; }
    await onUpdateLead(lead.id, { tags: [...currentTags, tag] });
    setTagPickerOpen(false);
    setNewTag('');
  }, [lead, onUpdateLead]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!lead) return;
    const currentTags = lead.tags || [];
    await onUpdateLead(lead.id, { tags: currentTags.filter(t => t !== tag) });
  }, [lead, onUpdateLead]);

  if (!lead) return null;

  const categoriasFiltradas = categorias.filter(
    c => c.is_sistema || !lead.funil_id || c.funis_ids?.includes(lead.funil_id)
  );

  const etapaAtual = etapas.find(e => e.id === lead.etapa_id || e.nome === lead.etapa_funil);
  const leadTags = lead.tags || [];
  const availableTags = allTags.filter(t => !leadTags.includes(t));

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 flex">
        <div className="relative bg-background w-full h-full flex flex-col overflow-hidden">

          {/* ── Header ── */}
          <div className="flex-shrink-0 border-b border-border bg-card px-5 py-3">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors flex-shrink-0">
                <ChevronLeft size={18} />
              </button>

              {editingNome ? (
                <input
                  autoFocus
                  className="dental-input flex-1 text-base font-semibold"
                  value={nomeEdit}
                  onChange={e => setNomeEdit(e.target.value)}
                  onBlur={handleSaveNome}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveNome(); if (e.key === 'Escape') setEditingNome(false); }}
                />
              ) : (
                <h2
                  className="flex-1 text-base font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setEditingNome(true)}
                  title="Clique para editar"
                >
                  {lead.nome}
                  <Pencil size={12} className="inline ml-1.5 opacity-30" />
                </h2>
              )}

              {/* Proprietário select */}
              <select
                className="text-xs border border-border rounded-lg px-2 py-1 bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                value={lead.proprietario_id || ''}
                onChange={e => handleProprietario(e.target.value)}
              >
                <option value="">Sem prop.</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>

              {/* Fechar */}
              <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Resultado buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={lead.resultado === 'ganho' ? 'default' : 'outline'}
                className={cn(
                  'h-7 text-xs gap-1',
                  lead.resultado === 'ganho' && 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600',
                )}
                onClick={handleGanho}
              >
                <Check size={12} /> Ganho
              </Button>
              <Button
                size="sm"
                variant={lead.resultado === 'perdido' ? 'default' : 'outline'}
                className={cn(
                  'h-7 text-xs gap-1',
                  lead.resultado === 'perdido' && 'bg-red-600 hover:bg-red-700 border-red-600',
                )}
                onClick={handlePerdido}
              >
                <X size={12} /> Perdido
              </Button>
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                    Excluir negócio
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ── Timeline de etapas ── */}
          <div className="flex-shrink-0 bg-muted/30 border-b border-border px-5 py-2 overflow-x-auto">
            <div className="flex items-center gap-0 min-w-max">
              {etapas.map((etapa, idx) => {
                const hist = etapaHistorico.find(h => h.etapa_id === etapa.id || h.etapa_nome === etapa.nome);
                const isCurrent = etapa.id === lead.etapa_id || etapa.nome === lead.etapa_funil;
                const isPast = etapaHistorico.some(h => (h.etapa_id === etapa.id || h.etapa_nome === etapa.nome) && h.saida_at);

                return (
                  <div key={etapa.id} className="flex items-center">
                    <div className={cn(
                      'flex flex-col items-center px-3 py-1 rounded-lg text-center min-w-[80px]',
                      isCurrent && 'bg-primary/10 ring-1 ring-primary/40',
                      isPast && !isCurrent && 'opacity-60',
                    )}>
                      <div className={cn(
                        'w-2 h-2 rounded-full mb-0.5',
                        isCurrent ? 'bg-primary' : isPast ? 'bg-primary/50' : 'bg-muted-foreground/30',
                      )} />
                      <span className={cn(
                        'text-[10px] font-medium leading-tight',
                        isCurrent ? 'text-primary' : 'text-muted-foreground',
                      )}>
                        {etapa.nome}
                      </span>
                      {isCurrent ? (
                        <span className="text-[9px] text-primary font-semibold">{diasNaEtapa}d aqui</span>
                      ) : hist ? (
                        <span className="text-[9px] text-muted-foreground">{hist.dias ?? 0}d</span>
                      ) : null}
                    </div>
                    {idx < etapas.length - 1 && (
                      <div className="w-4 h-px bg-border flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
            {etapaAtual && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {funilNome} → <span className="font-medium text-foreground">{etapaAtual.nome}</span>
                {' '}· <span className="text-primary font-medium">{diasNaEtapa}d nesta etapa</span>
              </p>
            )}
          </div>

          {/* ── Layout 2 colunas ── */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* Coluna esquerda */}
            <div className="w-[300px] flex-shrink-0 border-r border-border overflow-y-auto p-4 space-y-5 bg-card/50">

              {/* Resumo */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Resumo</h3>
                <div className="space-y-3">
                  {/* Valor */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Valor</p>
                    {editingValor ? (
                      <CurrencyInput
                        autoFocus
                        cents={valorEditCents}
                        onCentsChange={setValorEditCents}
                        onBlur={handleSaveValor}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveValor(); if (e.key === 'Escape') setEditingValor(false); }}
                        className="w-full"
                      />
                    ) : (
                      <button
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                        onClick={() => setEditingValor(true)}
                      >
                        {formatBRL(lead.valor)}
                        <Pencil size={10} className="inline ml-1 opacity-30" />
                      </button>
                    )}
                  </div>

                  {/* Telefone */}
                  {lead.telefone && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Telefone</p>
                      <a
                        href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <Phone size={11} /> {lead.telefone}
                      </a>
                    </div>
                  )}

                  {/* Tags / Etiquetas */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Etiquetas</p>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {leadTags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                          style={{ backgroundColor: tagColor(tag) }}
                        >
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-70 ml-0.5">
                            <X size={8} />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => setTagPickerOpen(v => !v)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
                      >
                        <Plus size={8} /> Tag
                      </button>
                    </div>
                    {tagPickerOpen && (
                      <div className="border border-border rounded-lg bg-card shadow-sm p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
                        {availableTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => handleAddTag(tag)}
                            className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-muted transition-colors text-left"
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tagColor(tag) }} />
                            {tag}
                          </button>
                        ))}
                        <div className="flex gap-1 mt-1">
                          <input
                            className="dental-input flex-1 text-xs h-6 px-2"
                            placeholder="Nova tag..."
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newTag.trim()) handleAddTag(newTag.trim());
                            }}
                          />
                          <button
                            onClick={() => { if (newTag.trim()) handleAddTag(newTag.trim()); }}
                            className="h-6 w-6 flex items-center justify-center rounded bg-primary text-primary-foreground flex-shrink-0"
                          >
                            <Check size={10} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interesse */}
                  {lead.interesse && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Interesse</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                        {lead.interesse}
                      </span>
                    </div>
                  )}

                  {/* Data fechamento */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Fechamento esperado</p>
                    <input
                      type="date"
                      className="dental-input w-full text-xs"
                      value={lead.proxima_acao_data?.split('T')[0] || ''}
                      onChange={async e => {
                        await onUpdateLead(lead.id, { proxima_acao_data: e.target.value || null });
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Pessoas */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pessoas</h3>
                {lead.pessoa ? (
                  <div className="p-2 rounded-lg border border-border bg-card text-sm">
                    <p className="font-medium text-foreground">{lead.pessoa.nome}</p>
                    {lead.pessoa.telefone && <p className="text-xs text-muted-foreground">{lead.pessoa.telefone}</p>}
                    {lead.pessoa.email && <p className="text-xs text-muted-foreground">{lead.pessoa.email}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nenhuma pessoa vinculada</p>
                )}
              </section>

              {/* Detalhes */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detalhes</h3>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Criado em {format(parseISO(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {lead.origem && <p className="text-[11px] text-muted-foreground">Origem: {lead.origem}</p>}
                  {lead.resultado_at && (
                    <p className="text-[11px] text-muted-foreground">
                      {lead.resultado === 'ganho' ? 'Ganho' : 'Perdido'} em{' '}
                      {format(parseISO(lead.resultado_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                  {lead.motivo_perda && (
                    <p className="text-[11px] text-muted-foreground">Motivo perda: {lead.motivo_perda}</p>
                  )}
                </div>

                {/* Campos personalizados */}
                {categoriasFiltradas.map(cat => (
                  <div key={cat.id} className="mt-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{cat.nome}</p>
                    <div className="space-y-2">
                      {(cat.campos || []).map(campo => {
                        const valObj = valores.find(v => v.campo_id === campo.id);
                        const val = valObj?.valor || '';

                        return (
                          <div key={campo.id}>
                            <p className="text-[10px] text-muted-foreground mb-0.5">{campo.nome}</p>
                            {campo.tipo === 'lista' && campo.opcoes_lista ? (
                              <select
                                className="dental-input w-full text-xs"
                                value={val}
                                onChange={e => handleCampoValor(campo.id, e.target.value)}
                              >
                                <option value="">Selecionar...</option>
                                {campo.opcoes_lista.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : campo.tipo === 'booleano' ? (
                              <input
                                type="checkbox"
                                checked={val === 'true'}
                                onChange={e => handleCampoValor(campo.id, e.target.checked ? 'true' : 'false')}
                                className="w-4 h-4 rounded border-border"
                              />
                            ) : campo.tipo === 'data' ? (
                              <input
                                type="date"
                                className="dental-input w-full text-xs"
                                value={val}
                                onChange={e => handleCampoValor(campo.id, e.target.value)}
                              />
                            ) : editingCampoId === campo.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  type={campo.tipo === 'numero' || campo.tipo === 'moeda' ? 'number' : 'text'}
                                  className="dental-input flex-1 text-xs"
                                  value={editingCampoVal}
                                  onChange={e => setEditingCampoVal(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveCampo(campo.id);
                                    if (e.key === 'Escape') setEditingCampoId(null);
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveCampo(campo.id)}
                                  className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => setEditingCampoId(null)}
                                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-1 group cursor-pointer rounded px-1 py-0.5 hover:bg-muted/50 transition-colors"
                                onClick={() => { setEditingCampoId(campo.id); setEditingCampoVal(val); }}
                              >
                                <span className="text-xs text-foreground flex-1 min-w-0 truncate">
                                  {val || <span className="text-muted-foreground italic">—</span>}
                                </span>
                                <Pencil size={10} className="opacity-0 group-hover:opacity-40 text-muted-foreground transition-opacity flex-shrink-0" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            </div>

            {/* Coluna direita */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
                <TabsList className="flex-shrink-0 justify-start rounded-none border-b border-border bg-transparent h-9 px-4 gap-0">
                  {[
                    { value: 'foco', label: 'Foco' },
                    { value: 'anotacoes', label: 'Anotações' },
                    { value: 'atividade', label: 'Atividade' },
                    { value: 'registro', label: 'Registros' },
                    { value: 'conversas', label: 'Conversas' },
                  ].map(tab => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-9 px-3"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Foco */}
                <TabsContent value="foco" className="flex-1 overflow-y-auto p-4 m-0">
                  <p className="text-xs text-muted-foreground mb-3">Adicionar anotação rápida</p>
                  <textarea
                    className="dental-input w-full h-24 resize-none text-sm"
                    placeholder="Escreva uma nota sobre este negócio..."
                    onBlur={async e => {
                      const txt = e.target.value.trim();
                      if (txt && lead) {
                        await addHistorico({ lead_id: lead.id, tipo_contato: 'Outro', descricao: txt, usuario_id: usuario?.id || null });
                        e.target.value = '';
                        toast.success('Anotação salva');
                      }
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setActiveTab('atividade')}>
                      + Atividade
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setActiveTab('anotacoes')}>
                      + Anotação
                    </Button>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Atividades recentes</p>
                    {leadTarefas.slice(0, 3).map(t => (
                      <div key={t.id} className="p-2 rounded-lg border border-border bg-card text-xs">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-medium text-foreground truncate">{t.nome || t.descricao}</span>
                          <button
                            onClick={() => updateLeadTarefa(t.id, { status: t.status === 'Concluída' ? 'Pendente' : 'Concluída' })}
                            className={cn('shrink-0 w-4 h-4 rounded border flex items-center justify-center', t.status === 'Concluída' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border hover:border-primary')}
                          >
                            {t.status === 'Concluída' && <Check size={10} />}
                          </button>
                        </div>
                        {t.nome && <p className="text-muted-foreground truncate">{t.descricao}</p>}
                        <p className="text-muted-foreground">{format(parseISO(t.data_vencimento), 'dd/MM/yy', { locale: ptBR })}{t.responsavel && ` · ${t.responsavel.nome}`}</p>
                      </div>
                    ))}
                    {leadTarefas.length === 0 && historico.slice(0, 2).map(h => (
                      <div key={h.id} className="p-2 rounded-lg border border-border bg-card text-xs">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-foreground">{h.tipo_contato}</span>
                          <span className="text-muted-foreground">{format(parseISO(h.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                        </div>
                        <p className="text-foreground leading-relaxed">{h.descricao}</p>
                      </div>
                    ))}
                    {leadTarefas.length === 0 && historico.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Nenhuma atividade registrada</p>
                    )}
                  </div>
                </TabsContent>

                {/* Anotações */}
                <TabsContent value="anotacoes" className="flex-1 overflow-y-auto p-4 m-0 space-y-2">
                  {historico.filter(h => h.tipo_contato === 'Outro').length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-8">Nenhuma anotação registrada</p>
                  )}
                  {historico.filter(h => h.tipo_contato === 'Outro').map(h => (
                    <div key={h.id} className="p-3 rounded-lg border border-border bg-card text-xs">
                      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                        <span>{format(parseISO(h.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                        {h.usuario && <span>por {h.usuario.nome}</span>}
                      </div>
                      <p className="text-foreground leading-relaxed">{h.descricao}</p>
                    </div>
                  ))}
                </TabsContent>

                {/* Atividade */}
                <TabsContent value="atividade" className="flex-1 overflow-y-auto p-4 m-0">
                  <p className="text-xs font-medium text-foreground mb-3">Nova Atividade</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Nome</p>
                      <input className="dental-input w-full text-sm" placeholder="Ex: Ligar para o cliente..." value={tarefaForm.nome} onChange={e => setTarefaForm(f => ({ ...f, nome: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Tipo</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.entries(TIPOS_TAREFA) as [string, string][]).map(([key, label]) => (
                          <button key={key} onClick={() => setTarefaForm(f => ({ ...f, tipo: f.tipo === key ? '' : key }))}
                            className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors', tarefaForm.tipo === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Descrição</p>
                      <textarea className="dental-input w-full h-16 resize-none text-sm" placeholder="Detalhes..." value={tarefaForm.descricao} onChange={e => setTarefaForm(f => ({ ...f, descricao: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Responsável</p>
                        <select className="dental-input w-full text-sm" value={tarefaForm.responsavel_id} onChange={e => setTarefaForm(f => ({ ...f, responsavel_id: e.target.value }))}>
                          <option value="">Nenhum</option>
                          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Prazo</p>
                        <input type="date" className="dental-input w-full text-sm" value={tarefaForm.data_vencimento} onChange={e => setTarefaForm(f => ({ ...f, data_vencimento: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Status</p>
                      <div className="flex gap-1.5">
                        {(['Pendente', 'Em andamento'] as const).map(s => (
                          <button key={s} onClick={() => setTarefaForm(f => ({ ...f, status: s }))}
                            className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors', tarefaForm.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" disabled={!tarefaForm.descricao.trim() || !tarefaForm.data_vencimento || savingTarefa} onClick={handleAddTarefa} className="w-full">
                      {savingTarefa ? 'Salvando...' : 'Criar atividade'}
                    </Button>
                  </div>
                  {leadTarefas.length > 0 && (
                    <div className="mt-5 space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Atividades criadas</p>
                      {leadTarefas.map(t => (
                        <div key={t.id} className="p-2.5 rounded-lg border border-border bg-card text-xs">
                          <div className="flex items-start gap-2">
                            <button onClick={() => updateLeadTarefa(t.id, { status: t.status === 'Concluída' ? 'Pendente' : 'Concluída' })}
                              className={cn('mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center', t.status === 'Concluída' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border hover:border-primary')}>
                              {t.status === 'Concluída' && <Check size={10} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={cn('font-medium text-foreground truncate', t.status === 'Concluída' && 'line-through opacity-60')}>{t.nome || t.descricao}</p>
                              {t.nome && <p className="text-muted-foreground truncate">{t.descricao}</p>}
                              <p className="text-muted-foreground mt-0.5">{t.tipo && `${TIPOS_TAREFA[t.tipo as keyof typeof TIPOS_TAREFA]} · `}{format(parseISO(t.data_vencimento), 'dd/MM/yy', { locale: ptBR })}{t.responsavel && ` · ${t.responsavel.nome}`}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Registro */}
                <TabsContent value="registro" className="flex-1 overflow-y-auto p-4 m-0 space-y-2">
                  {historico.length === 0 && leadTarefas.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-8">Nenhum registro</p>
                  )}
                  {leadTarefas.map(t => (
                    <div key={`t-${t.id}`} className="relative pl-4 border-l-2 border-blue-200">
                      <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-blue-500" />
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="dental-badge text-[10px] bg-blue-50 text-blue-700 border-blue-200">Atividade</span>
                          {t.tipo && <span className="text-[10px] text-muted-foreground">{TIPOS_TAREFA[t.tipo as keyof typeof TIPOS_TAREFA]}</span>}
                          <span className="text-[10px] text-muted-foreground">prazo {format(parseISO(t.data_vencimento), 'dd/MM/yy', { locale: ptBR })}</span>
                        </div>
                        <button onClick={() => updateLeadTarefa(t.id, { status: t.status === 'Concluída' ? 'Pendente' : 'Concluída' })}
                          className={cn('shrink-0 w-4 h-4 rounded border flex items-center justify-center', t.status === 'Concluída' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border hover:border-primary')}>
                          {t.status === 'Concluída' && <Check size={10} />}
                        </button>
                      </div>
                      <p className={cn('text-xs text-foreground', t.status === 'Concluída' && 'line-through opacity-60')}>{t.nome || t.descricao}</p>
                      {t.nome && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
                      {t.responsavel && <p className="text-[10px] text-muted-foreground mt-0.5">responsável: {t.responsavel.nome}</p>}
                    </div>
                  ))}
                  {historico.map(h => (
                    <div key={`h-${h.id}`} className="relative pl-4 border-l-2 border-border">
                      <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="dental-badge dental-badge-default text-[10px]">{h.tipo_contato}</span>
                        <span className="text-[10px] text-muted-foreground">{format(parseISO(h.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{h.descricao}</p>
                      {h.usuario && <p className="text-[10px] text-muted-foreground mt-0.5">por {h.usuario.nome}</p>}
                    </div>
                  ))}
                </TabsContent>

                {/* Conversas */}
                <TabsContent value="conversas" className="flex-1 overflow-y-auto p-4 m-0">
                  <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                    <AlertCircle size={32} className="text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Conversas do WhatsApp vinculadas</p>
                    <p className="text-xs text-muted-foreground/60">Funcionalidade em desenvolvimento</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <GanhoDialog
        open={showGanhoDialog}
        onClose={() => setShowGanhoDialog(false)}
        onConfirm={confirmGanho}
        produtos={produtos}
        onAddProduto={handleAddProduto}
      />

      {/* Modal motivo perda */}
      {showMotivoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMotivoModal(false)} />
          <div className="relative bg-card rounded-xl shadow-2xl border border-border p-5 w-full max-w-sm">
            <h3 className="text-base font-semibold text-foreground mb-1">Motivo da perda</h3>
            <p className="text-xs text-muted-foreground mb-3">Selecione o principal motivo</p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {MOTIVOS_PERDA.map(m => (
                <button key={m} onClick={() => setMotivoSelecionado(prev => prev === m ? '' : m)}
                  className={cn('px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors border',
                    motivoSelecionado === m ? 'bg-red-50 border-red-400 text-red-700' : 'bg-muted/50 border-border text-foreground hover:border-red-300')}>
                  {m}
                </button>
              ))}
            </div>
            {motivoSelecionado === 'Outro' && (
              <textarea autoFocus className="dental-input w-full h-16 resize-none text-sm mb-3" placeholder="Descreva o motivo..." value={motivoOutro} onChange={e => setMotivoOutro(e.target.value)} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowMotivoModal(false); setMotivoSelecionado(''); setMotivoOutro(''); }}>Cancelar</Button>
              <Button size="sm" variant="destructive" onClick={confirmPerdido}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
