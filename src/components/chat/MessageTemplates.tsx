import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileText, Tag } from 'lucide-react';
import { confirmDialog } from '@/components/ui/confirm-dialog';

export interface MessageTemplate {
  id: string;
  empresa_id: string;
  titulo: string;
  conteudo: string;
  categoria: string | null;
  atalho: string | null;
  created_at: string;
}

// Hook para usar templates em qualquer componente
export function useMessageTemplates() {
  const { usuario } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!usuario?.empresa_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('chat_modelos_mensagem')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .order('titulo', { ascending: true });
    setTemplates((data as MessageTemplate[] | null) || []);
    setLoading(false);
  }, [usuario?.empresa_id]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const addTemplate = async (item: Partial<MessageTemplate>) => {
    const { data, error } = await supabase
      .from('chat_modelos_mensagem')
      .insert({ ...item, empresa_id: usuario?.empresa_id })
      .select()
      .single();
    if (!error && data) {
      setTemplates(prev => [...prev, data as MessageTemplate]);
    }
    return { data: data as MessageTemplate | null, error };
  };

  const updateTemplate = async (id: string, updates: Partial<MessageTemplate>) => {
    const { data, error } = await supabase
      .from('chat_modelos_mensagem')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setTemplates(prev => prev.map(t => t.id === id ? data as MessageTemplate : t));
    }
    return { data: data as MessageTemplate | null, error };
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('chat_modelos_mensagem')
      .delete()
      .eq('id', id);
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
    return { error };
  };

  return { templates, loading, fetchTemplates, addTemplate, updateTemplate, deleteTemplate };
}

// Dialog de gerenciamento de templates
interface ManagerProps {
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function MessageTemplateManager({ open, onClose, onUpdate }: ManagerProps) {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useMessageTemplates();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [atalho, setAtalho] = useState('');
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditingId(null);
    setTitulo('');
    setConteudo('');
    setCategoria('');
    setAtalho('');
    setFormOpen(true);
  }

  function openEdit(t: MessageTemplate) {
    setEditingId(t.id);
    setTitulo(t.titulo);
    setConteudo(t.conteudo);
    setCategoria(t.categoria || '');
    setAtalho(t.atalho || '');
    setFormOpen(true);
  }

  async function handleSave() {
    if (!titulo.trim() || !conteudo.trim()) {
      toast.error('Preencha título e conteúdo');
      return;
    }
    setSaving(true);
    const payload = {
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      categoria: categoria.trim() || null,
      atalho: atalho.trim() || null,
    };

    if (editingId) {
      const { error } = await updateTemplate(editingId, payload);
      if (error) toast.error('Erro ao atualizar modelo');
      else { toast.success('Modelo atualizado'); onUpdate?.(); }
    } else {
      const { error } = await addTemplate(payload);
      if (error) toast.error('Erro ao criar modelo');
      else { toast.success('Modelo criado'); onUpdate?.(); }
    }
    setSaving(false);
    setFormOpen(false);
  }

  async function handleDelete(id: string) {
    if (!await confirmDialog({ description: 'Deseja apagar este modelo de mensagem?' })) return;
    const { error } = await deleteTemplate(id);
    if (error) toast.error('Erro ao apagar');
    else { toast.success('Modelo apagado'); onUpdate?.(); }
  }

  const categorias = [...new Set(templates.map(t => t.categoria).filter(Boolean))] as string[];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} />
            Modelos de Mensagem
          </DialogTitle>
        </DialogHeader>

        {formOpen ? (
          <div className="space-y-3 flex-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Título *</label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Boas-vindas" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Conteúdo *</label>
              <Textarea value={conteudo} onChange={e => setConteudo(e.target.value)} placeholder="Olá {nome}, tudo bem? ..." rows={5} />
              <p className="text-[10px] text-muted-foreground mt-1">Use {'{nome}'} para substituir pelo nome do contato</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <Input value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex: Agendamento" list="categorias-list" />
                <datalist id="categorias-list">
                  {categorias.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Atalho</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/</span>
                  <Input value={atalho} onChange={e => setAtalho(e.target.value.replace(/\s/g, ''))} placeholder="boasvindas" className="pl-6" />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={openNew} className="gap-1.5">
                <Plus size={14} /> Novo Modelo
              </Button>
            </div>
            <ScrollArea className="flex-1 max-h-[50vh]">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum modelo cadastrado</p>
                  <p className="text-xs mt-1">Crie modelos para agilizar o envio de mensagens</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map(t => (
                    <div key={t.id} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{t.titulo}</p>
                            {t.atalho && (
                              <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                                /{t.atalho}
                              </span>
                            )}
                          </div>
                          {t.categoria && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Tag size={10} className="text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground">{t.categoria}</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.conteudo}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-muted">
                            <Pencil size={13} className="text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-destructive/10">
                            <Trash2 size={13} className="text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Popup de seleção rápida de templates (aparece ao digitar /)
interface PickerProps {
  query: string;
  templates: MessageTemplate[];
  onSelect: (template: MessageTemplate) => void;
  onClose: () => void;
  visible: boolean;
}

export function TemplateQuickPicker({ query, templates, onSelect, onClose, visible }: PickerProps) {
  if (!visible || templates.length === 0) return null;

  const q = query.toLowerCase();
  const filtered = templates.filter(t =>
    t.titulo.toLowerCase().includes(q) ||
    (t.atalho && t.atalho.toLowerCase().includes(q)) ||
    (t.categoria && t.categoria.toLowerCase().includes(q))
  );

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg max-h-[240px] overflow-y-auto z-50">
      <div className="p-1.5">
        <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium uppercase tracking-wider">Modelos de Mensagem</p>
        {filtered.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="w-full text-left px-2.5 py-2 rounded-md hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t.titulo}</span>
              {t.atalho && (
                <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  /{t.atalho}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.conteudo}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
