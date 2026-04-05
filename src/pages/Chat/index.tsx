import { useState, useEffect, useRef, useCallback } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Search, Send, MessageSquare, Phone, User, Image, FileText, Mic, MapPin, Sticker, ArrowLeft, Trash2, CheckSquare, ChevronDown, Wifi, MessageCirclePlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import AudioRecorder from '@/components/chat/AudioRecorder';
import ContactStatusTag from '@/components/chat/ContactStatusTag';
import ChatFilterBar, { ChatFilters, EMPTY_FILTERS } from '@/components/chat/ChatFilterBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Conversa {
  id: string;
  phone: string;
  nome: string;
  foto_url: string | null;
  ultima_mensagem: string | null;
  ultima_mensagem_at: string | null;
  nao_lidas: number;
  lead_id: string | null;
  paciente_id: string | null;
  setor_id: string | null;
}

interface Mensagem {
  id: string;
  conversa_id: string;
  message_id: string | null;
  from_me: boolean;
  tipo: string;
  conteudo: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  timestamp: string;
  status: string | null;
}

interface WhatsAppInstance {
  id: string;
  instanceName: string;
  setorId: string;
  setorNome: string;
  state: 'open' | 'connecting' | 'close';
}

type ConnectionState = 'green' | 'yellow' | 'red';

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Ontem';
  return format(date, 'dd/MM/yy', { locale: ptBR });
}

function getInitials(nome: string) {
  return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function MessageTypeIcon({ tipo }: { tipo: string }) {
  switch (tipo) {
    case 'image': return <Image size={14} className="inline mr-1" />;
    case 'audio': return <Mic size={14} className="inline mr-1" />;
    case 'video': return <Image size={14} className="inline mr-1" />;
    case 'document': return <FileText size={14} className="inline mr-1" />;
    case 'sticker': return <Sticker size={14} className="inline mr-1" />;
    case 'contact': return <User size={14} className="inline mr-1" />;
    case 'location': return <MapPin size={14} className="inline mr-1" />;
    default: return null;
  }
}

export default function ChatPage() {
  const { usuario } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ChatFilters>(EMPTY_FILTERS);
  const [leadMap, setLeadMap] = useState<Record<string, { etapa_funil: string; created_at: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;

  // WhatsApp instance state
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<Set<string>>(new Set());
  const instancePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // New Chat Dialog State
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatInstanceId, setNewChatInstanceId] = useState<string>('');
  const [newChatLoading, setNewChatLoading] = useState(false);

  const checkConnectionStatus = useCallback(async (instanceName: string): Promise<ConnectionState> => {
    try {
      const { data } = await supabase.functions.invoke('evolution-api-manager', {
        body: { action: 'check_connection', instanceName }
      });
      const state = data?.state;
      return state === 'open' ? 'green' : state === 'connecting' ? 'yellow' : 'red';
    } catch {
      return 'red';
    }
  }, []);

  const fetchInstances = useCallback(async () => {
    const { data } = await supabase
      .from('integracoes')
      .select('*, setor:setores(*)')
      .eq('tipo', 'evolution_api')
      .eq('ativo', true);
      
    if (!data) return;

    const withStatus = await Promise.all(
      data.map(async (integ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instName = (integ.credentials as any)?.instanceName;
        const state = instName ? await checkConnectionStatus(instName) : 'red';
        return {
          id: integ.id,
          instanceName: instName,
          setorId: integ.setor_id,
          setorNome: integ.setor?.nome || 'Geral',
          state: state === 'green' ? 'open' : state === 'yellow' ? 'connecting' : 'close'
        } as WhatsAppInstance;
      })
    );
    setInstances(withStatus);
    
    // Automatically select all instances on initial load if none selected
    setSelectedInstanceIds(prev => {
      if (prev.size === 0 && withStatus.length > 0) {
        return new Set(withStatus.map(i => i.id));
      }
      return prev;
    });
  }, [checkConnectionStatus]);

  useEffect(() => {
    fetchInstances();
    
    instancePollingRef.current = setInterval(async () => {
      setInstances(prev => {
        prev.forEach(async (integ) => {
          if (!integ.instanceName) return;
          const statusResult = await checkConnectionStatus(integ.instanceName);
          const newState = statusResult === 'green' ? 'open' : statusResult === 'yellow' ? 'connecting' : 'close';
          setInstances(current => 
            current.map(i => i.id === integ.id ? { ...i, state: newState } : i)
          );
        });
        return prev;
      });
    }, 15000);

    return () => {
      if (instancePollingRef.current) clearInterval(instancePollingRef.current);
    };
  }, [fetchInstances, checkConnectionStatus]);

  const globalStatus = instances.length === 0 ? 'red' : instances.some(i => i.state === 'open') ? 'green' : instances.some(i => i.state === 'connecting') ? 'yellow' : 'red';

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!await confirmDialog({ description: `Tem certeza que deseja apagar ${selectedIds.size} conversa(s) e suas mensagens?` })) return;
    for (const id of selectedIds) {
      await supabase.from('chat_mensagens').delete().eq('conversa_id', id);
      await supabase.from('chat_conversas').delete().eq('id', id);
    }
    if (selectedConversa && selectedIds.has(selectedConversa.id)) {
      setSelectedConversa(null);
      setMensagens([]);
    }
    const count = selectedIds.size;
    setSelectedIds(new Set());
    toast.success(`${count} conversa(s) apagada(s)`);
    loadConversas();
  }

  async function handleCreateChat() {
    if (!newChatPhone || !newChatInstanceId) {
      toast.error('Preencha o telefone e escolha o setor/instância');
      return;
    }
    
    setNewChatLoading(true);
    try {
      const instance = instances.find(i => i.id === newChatInstanceId);
      if (!instance || !instance.instanceName) throw new Error('Instância inválida');

      const { data, error } = await supabase.functions.invoke('evolution-api-manager', {
         body: { action: 'check_whatsapp', instanceName: instance.instanceName, phone: newChatPhone }
      });

      if (error) throw error;
      if (!data?.success || !data?.exists) {
         toast.error('Este número não possui WhatsApp registrado.');
         setNewChatLoading(false);
         return;
      }

      const wppPhone = data.formattedPhone || newChatPhone.replace(/\D/g, "");

      const { data: existing } = await supabase.from('chat_conversas')
        .select('*')
        .eq('phone', wppPhone)
        .eq('clinica_id', usuario?.clinica_id)
        .maybeSingle();

      if (existing) {
         setSelectedConversa(existing);
      } else {
         const { data: newConv, error: newErr } = await supabase.from('chat_conversas')
           .insert({
              phone: wppPhone,
              nome: `WhatsApp ${newChatPhone}`,
              clinica_id: usuario?.clinica_id,
              setor_id: instance.setorId
           })
           .select()
           .single();
           
         if (newErr) throw newErr;
         setSelectedConversa(newConv);
         setConversas(prev => [newConv, ...prev]);
      }

      setNewChatOpen(false);
      setNewChatPhone('');
    } catch (err: unknown) {
      toast.error('Erro ao criar conversa: ' + ((err as Error).message || 'Erro desconhecido'));
    } finally {
      setNewChatLoading(false);
    }
  }

  async function handleDeleteConversa(conversaId: string) {
    if (!await confirmDialog({ description: 'Tem certeza que deseja apagar esta conversa e todas as mensagens?' })) return;
    // Delete messages first, then conversation
    await supabase.from('chat_mensagens').delete().eq('conversa_id', conversaId);
    const { error } = await supabase.from('chat_conversas').delete().eq('id', conversaId);
    if (error) {
      toast.error('Erro ao apagar conversa');
      return;
    }
    if (selectedConversa?.id === conversaId) {
      setSelectedConversa(null);
      setMensagens([]);
    }
    toast.success('Conversa apagada');
    loadConversas();
  }

  useEffect(() => {
    loadConversas();

    const channel = supabase
      .channel('chat-conversas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversas' }, () => {
        loadConversas();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!selectedConversa) return;
    loadMensagens(selectedConversa.id);
    markAsRead(selectedConversa.id);

    const channel = supabase
      .channel(`chat-msgs-${selectedConversa.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mensagens',
        filter: `conversa_id=eq.${selectedConversa.id}`,
      }, (payload) => {
        setMensagens(prev => [...prev, payload.new as Mensagem]);
        markAsRead(selectedConversa.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversa]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function loadConversas() {
    const { data } = await supabase
      .from('chat_conversas')
      .select('*')
      .order('ultima_mensagem_at', { ascending: false });
    if (data) {
      setConversas(data as Conversa[]);
      const leadIds = data.filter(c => c.lead_id).map(c => c.lead_id!);
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, etapa_funil, created_at')
          .in('id', leadIds);
        if (leads) {
          const map: Record<string, { etapa_funil: string; created_at: string }> = {};
          leads.forEach(l => { map[l.id] = { etapa_funil: l.etapa_funil, created_at: l.created_at || '' }; });
          setLeadMap(map);
        }
      }
    }
    setLoading(false);
  }

  async function loadMensagens(conversaId: string) {
    const { data } = await supabase
      .from('chat_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('timestamp', { ascending: true });
    if (data) setMensagens(data as Mensagem[]);
  }

  async function markAsRead(conversaId: string) {
    await supabase.from('chat_conversas').update({ nao_lidas: 0 }).eq('id', conversaId);
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedConversa || sending) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          phone: selectedConversa.phone,
          message: newMessage,
          conversa_id: selectedConversa.id,
          type: 'text',
          clinica_id: usuario?.clinica_id,
          setor_id: selectedConversa.setor_id,
        },
      });

      if (error) throw error;
      if (data?.status === 'error' || data?.error) throw new Error(data.error);

      setNewMessage('');
    } catch (err: Record<string, unknown>) {
      toast.error('Erro ao enviar mensagem: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSending(false);
    }
  }

  async function handleSendAudio(base64: string) {
    if (!selectedConversa || sending) return;
    setSending(true);

    try {
      const fetchRes = await fetch(base64);
      const blob = await fetchRes.blob();
      const fileName = `audio_${Date.now()}.webm`;
      const filePath = `${selectedConversa.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-audio')
        .upload(filePath, blob, { contentType: blob.type });

      if (uploadError) throw uploadError;

      const { data: signData, error: signError } = await supabase.storage
        .from('chat-audio')
        .createSignedUrl(filePath, 3600);

      if (signError) throw signError;

      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          phone: selectedConversa.phone,
          conversa_id: selectedConversa.id,
          type: 'audio',
          audio_url: signData.signedUrl,
          clinica_id: usuario?.clinica_id,
          setor_id: selectedConversa.setor_id,
        },
      });

      if (error) throw error;
      if (data?.status === 'error' || data?.error) throw new Error(data.error);
    } catch (err: unknown) {
      toast.error('Erro ao enviar áudio: ' + ((err as Error).message || 'Erro desconhecido'));
    } finally {
      setSending(false);
    }
  }

  const filtered = conversas.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    if (!matchesSearch) return false;

    if (filters.etapas.length > 0) {
      if (!c.lead_id) return false;
      const lead = leadMap[c.lead_id];
      if (!lead || !filters.etapas.includes(lead.etapa_funil)) return false;
    }

    if (filters.dataInicio || filters.dataFim) {
      if (!c.lead_id) return false;
      const lead = leadMap[c.lead_id];
      if (!lead || !lead.created_at) return false;
      const leadDate = new Date(lead.created_at);
      if (filters.dataInicio && leadDate < filters.dataInicio) return false;
      if (filters.dataFim) {
        const endOfDay = new Date(filters.dataFim);
        endOfDay.setHours(23, 59, 59, 999);
        if (leadDate > endOfDay) return false;
      }
    }

    if (c.setor_id) {
       const hasSelectedInstance = instances.some(i => selectedInstanceIds.has(i.id) && i.setorId === c.setor_id);
       if (!hasSelectedInstance) return false;
    }

    return true;
  });

  const totalNaoLidas = conversas.reduce((sum, c) => sum + (c.nao_lidas || 0), 0);

  return (
    <div className="h-[calc(100vh-7rem)] flex rounded-xl border border-border overflow-hidden bg-card">
      <div className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col ${selectedConversa ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-primary" />
              <h2 className="font-semibold text-foreground">Chat WhatsApp</h2>
              <span className="relative flex h-2.5 w-2.5 ml-1">
                {globalStatus === 'green' && (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </>
                )}
                {globalStatus === 'yellow' && (
                  <span className="animate-pulse relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500" />
                )}
                {globalStatus === 'red' && (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                )}
              </span>
            </div>

            <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-muted border shadow-sm">
                   <MessageCirclePlus size={16} className="text-primary" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conversa WhatsApp</DialogTitle>
                  <DialogDescription>
                    Digite o número e escolha por qual instância (Setor) deseja enviar a mensagem.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone (DDD + Número)</label>
                    <Input 
                      placeholder="Ex: 5511999999999" 
                      value={newChatPhone} 
                      onChange={e => setNewChatPhone(e.target.value)} 
                      type="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Setor / Instância Remetente</label>
                    <Select value={newChatInstanceId} onValueChange={setNewChatInstanceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um WhatsApp ativo" />
                      </SelectTrigger>
                      <SelectContent>
                        {instances.map(i => (
                          <SelectItem key={i.id} value={i.id} disabled={i.state !== 'open'}>
                            <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${i.state === 'open' ? 'bg-green-500' : 'bg-red-500'}`} />
                               {i.setorNome || 'Geral'} {i.state !== 'open' ? '(Offline)' : ''}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewChatOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateChat} disabled={newChatLoading || !newChatInstanceId}>{newChatLoading ? 'Validando...' : 'Iniciar Conversa'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 border shadow-sm">
                  <Wifi size={14} className={globalStatus === 'green' ? 'text-green-500' : globalStatus === 'yellow' ? 'text-yellow-500' : 'text-red-500'} />
                  {selectedInstanceIds.size > 0 ? (
                    <span className="text-xs">{selectedInstanceIds.size} Filtros</span>
                  ) : (
                    <span className="text-xs">Instâncias</span>
                  )}
                  <ChevronDown size={14} className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm px-2">Caixas de WhatsApp</h4>
                  {instances.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2 py-2">Nenhum setor conectado.</p>
                  )}
                  {instances.map(instance => (
                    <div 
                      key={instance.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => {
                        setSelectedInstanceIds(prev => {
                           const next = new Set(prev);
                           if (next.has(instance.id)) next.delete(instance.id);
                           else next.add(instance.id);
                           return next;
                        });
                      }}
                    >
                      <Checkbox checked={selectedInstanceIds.has(instance.id)} readOnly className="pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{instance.setorNome}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${instance.state === 'open' ? 'bg-green-500' : instance.state === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <ChatFilterBar filters={filters} onChange={setFilters} />

        {/* Selection toolbar */}
        {filtered.length > 0 && (
          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onCheckedChange={toggleSelectAll}
              className="h-4 w-4"
            />
            <span className="text-xs text-muted-foreground">
              {selectionMode ? `${selectedIds.size} selecionada(s)` : 'Selecionar'}
            </span>
            {selectionMode && (
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto h-7 text-xs gap-1"
                onClick={handleDeleteSelected}
              >
                <Trash2 size={13} />
                Apagar ({selectedIds.size})
              </Button>
            )}
          </div>
        )}

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma conversa ainda</p>
              <p className="text-xs mt-1">As conversas aparecerão quando mensagens forem recebidas via WhatsApp</p>
            </div>
          ) : (
            filtered.map(conv => (
              <div
                key={conv.id}
                className={`group w-full flex items-center gap-2 px-3 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 cursor-pointer ${
                  selectedConversa?.id === conv.id ? 'bg-muted' : ''
                } ${selectedIds.has(conv.id) ? 'bg-primary/5' : ''}`}
                onClick={() => setSelectedConversa(conv)}
              >
                <div className="shrink-0" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(conv.id)}
                    onCheckedChange={() => toggleSelect(conv.id)}
                    className="h-4 w-4"
                  />
                </div>
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={conv.foto_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(conv.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate text-foreground">{conv.nome}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {conv.ultima_mensagem_at && formatTime(conv.ultima_mensagem_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{conv.ultima_mensagem || 'Sem mensagens'}</p>
                    {conv.nao_lidas > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-5 min-w-5 shrink-0">{conv.nao_lidas}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Message Area */}
      <div className={`flex-1 flex flex-col ${!selectedConversa ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversa ? (
          <>
            {/* Chat header */}
            <div className="h-14 px-4 border-b border-border flex items-center gap-3 shrink-0">
              <button onClick={() => setSelectedConversa(null)} className="md:hidden p-1 hover:bg-muted rounded">
                <ArrowLeft size={20} />
              </button>
              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedConversa.foto_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(selectedConversa.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedConversa.nome}</p>
                <p className="text-xs text-muted-foreground">{selectedConversa.phone}</p>
              </div>
              <ContactStatusTag leadId={selectedConversa.lead_id} pacienteId={selectedConversa.paciente_id} />
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2 max-w-3xl mx-auto">
                {mensagens.map(msg => (
                  <div key={msg.id} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                      msg.from_me
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}>
                      {msg.tipo !== 'text' && (
                        <div className="mb-1">
                          <MessageTypeIcon tipo={msg.tipo} />
                          {msg.tipo === 'image' && msg.media_url && (
                            <img src={msg.media_url} alt="" className="rounded-lg max-w-full mt-1" />
                          )}
                          {msg.tipo === 'audio' && msg.media_url && (
                            <audio controls src={msg.media_url} className="max-w-full mt-1" />
                          )}
                          {msg.tipo === 'video' && msg.media_url && (
                            <video controls src={msg.media_url} className="rounded-lg max-w-full mt-1" />
                          )}
                          {msg.tipo === 'document' && msg.media_url && (
                            <a href={msg.media_url} target="_blank" rel="noopener" className="underline text-xs">
                              📎 {msg.conteudo || 'Documento'}
                            </a>
                          )}
                          {msg.tipo === 'sticker' && msg.media_url && (
                            <img src={msg.media_url} alt="sticker" className="w-24 h-24" />
                          )}
                          {msg.tipo === 'location' && (
                            <span className="text-xs">📍 Localização compartilhada</span>
                          )}
                          {msg.tipo === 'contact' && (
                            <span className="text-xs">👤 Contato compartilhado</span>
                          )}
                        </div>
                      )}
                      {msg.conteudo && msg.tipo === 'text' && <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>}
                      {msg.conteudo && msg.tipo === 'image' && <p className="text-xs mt-1 opacity-80">{msg.conteudo}</p>}
                      <p className={`text-[10px] mt-1 ${msg.from_me ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {format(new Date(msg.timestamp), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2 max-w-3xl mx-auto items-center">
                {newMessage.trim() ? (
                  <>
                    <Input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Digite uma mensagem..."
                      className="flex-1"
                      disabled={sending}
                    />
                    <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon">
                      <Send size={18} />
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Digite uma mensagem..."
                      className="flex-1"
                      disabled={sending}
                    />
                    <AudioRecorder onSend={handleSendAudio} disabled={sending} />
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
