import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSetores } from '@/hooks/useData';
import { Integracao, Setor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Power, Plus, Trash2, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

type ConnectionState = 'open' | 'close' | 'connecting' | 'unknown';

interface IntegracaoWithStatus extends Integracao {
  setor?: Setor;
  connectionState: ConnectionState;
}

export default function WhatsAppManager() {
  const { setores } = useSetores();
  const [integracoes, setIntegracoes] = useState<IntegracaoWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedSetorId, setSelectedSetorId] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());

  const qrPollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const connectionPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. checkConnectionStatus — no deps
  const checkConnectionStatus = useCallback(async (phoneNumberId: string): Promise<ConnectionState> => {
    try {
      const { data } = await supabase.functions.invoke('uzapi-manager', {
        body: { action: 'check_connection', phoneNumberId }
      });
      return (data?.state as ConnectionState) || 'unknown';
    } catch {
      return 'unknown';
    }
  }, []);

  // 2. stopQrPolling
  const stopQrPolling = useCallback((integId: string) => {
    if (qrPollingRef.current[integId]) {
      clearInterval(qrPollingRef.current[integId]);
      delete qrPollingRef.current[integId];
    }
    setPollingIds(prev => { const n = new Set(prev); n.delete(integId); return n; });
  }, []);

  // 3. startQrPolling — reads credentials.connected from DB (set by webhook)
  const startQrPolling = useCallback((integId: string) => {
    if (qrPollingRef.current[integId]) return;
    setPollingIds(prev => new Set(prev).add(integId));

    qrPollingRef.current[integId] = setInterval(async () => {
      const { data } = await supabase
        .from('integracoes')
        .select('credentials')
        .eq('id', integId)
        .single();

      const creds = data?.credentials as Record<string, string | boolean> | null;
      const qr = creds?.qr_code as string | undefined;
      const connected = creds?.connected === true;

      // Sync QR state
      setQrCodes(prev => {
        if (qr) return { ...prev, [integId]: qr };
        if (prev[integId]) { const n = { ...prev }; delete n[integId]; return n; }
        return prev;
      });

      // Connected flag set by webhook
      if (connected) {
        stopQrPolling(integId);
        setQrCodes(prev => { const n = { ...prev }; delete n[integId]; return n; });
        setIntegracoes(prev => prev.map(i => i.id === integId ? { ...i, connectionState: 'open' } : i));
      }
    }, 2000);
  }, [stopQrPolling]);

  // 4. fetchIntegracoes — uses credentials.connected as source of truth
  const fetchIntegracoes = useCallback(async () => {
    const { data } = await supabase
      .from('integracoes')
      .select('*, setor:setores(*)')
      .eq('tipo', 'uzapi');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (data || []) as any[];

    const withStatus = raw.map((integ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const creds = integ.credentials as Record<string, any>;
      const state: ConnectionState = creds?.connected === true ? 'open' : 'close';
      return { ...integ, connectionState: state };
    });

    setIntegracoes(withStatus);
    setLoading(false);

    // Start QR polling for disconnected instances only
    withStatus.forEach(integ => {
      if (integ.connectionState !== 'open') startQrPolling(integ.id);
      else stopQrPolling(integ.id);
    });
  }, [startQrPolling, stopQrPolling]);

  useEffect(() => {
    fetchIntegracoes();

    // Refresh integracoes from DB every 30s to sync credentials.connected
    connectionPollingRef.current = setInterval(() => {
      fetchIntegracoes();
    }, 30000);

    return () => {
      if (connectionPollingRef.current) clearInterval(connectionPollingRef.current);
      Object.values(qrPollingRef.current).forEach(clearInterval);
    };
  }, [fetchIntegracoes, checkConnectionStatus]);

  const handleCreateInstance = async () => {
    if (!selectedSetorId) { toast.error('Selecione um setor'); return; }
    if (!newPhone.trim()) { toast.error('Informe o número de telefone (com DDD)'); return; }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('uzapi-manager', {
        body: { action: 'create_instance', setorId: selectedSetorId, phone: newPhone.trim() }
      });
      if (error) throw error;
      if (data?.status === 'error' || data?.error) throw new Error(data?.error || 'Erro desconhecido');

      toast.success('Instância criada! Aguardando QR Code...');
      setNewPhone('');

      const { data: updated } = await supabase
        .from('integracoes')
        .select('*, setor:setores(*)')
        .eq('tipo', 'uzapi')
        .order('created_at', { ascending: false });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (updated || []) as any[];
      const withStatus = await Promise.all(
        raw.map(async (integ) => {
          const phoneNumId = (integ.credentials as Record<string, string>)?.phoneNumberId;
          const state = phoneNumId ? await checkConnectionStatus(phoneNumId) : 'unknown' as ConnectionState;
          return { ...integ, connectionState: state };
        })
      );
      setIntegracoes(withStatus);

      if (raw.length > 0) startQrPolling(raw[0].id);
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Erro ao criar instância');
    }
    setCreating(false);
  };

  const handleLogout = async (phoneNumberId: string, integId: string) => {
    if (!confirm('Deseja realmente desconectar este número?')) return;
    try {
      const { data, error } = await supabase.functions.invoke('uzapi-manager', {
        body: { action: 'logout', phoneNumberId }
      });
      if (error) throw error;
      if (data?.status === 'error' || data?.error) throw new Error(data?.error || 'Erro desconhecido');

      toast.success('Número desconectado.');
      setQrCodes(prev => { const n = { ...prev }; delete n[integId]; return n; });
      setIntegracoes(prev => prev.map(i => i.id === integId ? { ...i, connectionState: 'close' } : i));
      startQrPolling(integId);
    } catch {
      toast.error('Erro ao desconectar instância');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir definitivamente esta integração?')) return;
    const integ = integracoes.find(i => i.id === id);
    const phoneNumId = (integ?.credentials as Record<string, string>)?.phoneNumberId;

    if (phoneNumId) {
      try {
        await supabase.functions.invoke('uzapi-manager', {
          body: { action: 'delete_instance', phoneNumberId: phoneNumId }
        });
      } catch { /* continue */ }
    }

    const { error } = await supabase.from('integracoes').delete().eq('id', id);
    if (!error) {
      stopQrPolling(id);
      setQrCodes(prev => { const n = { ...prev }; delete n[id]; return n; });
      toast.success('Integração removida');
      fetchIntegracoes();
    }
  };

  function ConnectionIndicator({ state }: { state: ConnectionState }) {
    if (state === 'open') {
      return (
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-xs font-medium text-green-600">Conectado</span>
        </div>
      );
    }
    if (state === 'connecting') {
      return (
        <div className="flex items-center gap-1.5">
          <span className="animate-pulse relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500" />
          <span className="text-xs font-medium text-yellow-600">Conectando...</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        <span className="text-xs font-medium text-red-500">Desconectado</span>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-green-500" />
              WhatsApp (UZAPI)
            </CardTitle>
            <CardDescription className="mt-1">
              Gerencie as instâncias de WhatsApp conectadas a cada setor da sua clínica.
            </CardDescription>
          </div>

          <div className="flex items-end gap-2 shrink-0 flex-wrap">
            <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              className="w-[160px]"
              placeholder="55119..."
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
            />
            <Button onClick={handleCreateInstance} disabled={creating || !selectedSetorId || !newPhone.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Nova Instância
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {integracoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-accent/20 border-dashed">
            <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum WhatsApp cadastrado.</p>
            <p className="text-sm">Selecione um setor, informe o telefone e crie uma nova instância.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {integracoes.map((integ) => {
              const isConnected = integ.connectionState === 'open';
              const phoneNumId = (integ.credentials as Record<string, string>)?.phoneNumberId;
              const qrCode = qrCodes[integ.id];
              const isPolling = pollingIds.has(integ.id);

              return (
                <div key={integ.id} className="p-4 border rounded-lg bg-card shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${isConnected ? 'bg-green-50' : 'bg-red-50'}`}>
                        {isConnected
                          ? <Wifi className="h-6 w-6 text-green-600" />
                          : <WifiOff className="h-6 w-6 text-red-400" />
                        }
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          {integ.setor?.nome || 'Setor Desconhecido'}
                          <Badge variant={integ.ativo ? 'default' : 'secondary'}>
                            {integ.ativo ? 'Ativo' : 'Pausado'}
                          </Badge>
                        </h4>
                        <ConnectionIndicator state={integ.connectionState} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isConnected && phoneNumId && (
                        <Button variant="outline" size="sm" onClick={() => handleLogout(phoneNumId, integ.id)}>
                          <Power className="h-3 w-3 mr-2 text-red-500" /> Desconectar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(integ.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {!isConnected && (
                    <div className="mt-4">
                      {qrCode ? (
                        <div className="p-4 border rounded-lg bg-white inline-block text-center">
                          <img
                            src={`data:image/png;base64,${qrCode}`}
                            alt="WhatsApp QR Code"
                            className="w-[200px] h-[200px] mx-auto block"
                          />
                          <p className="text-sm font-medium mt-2 text-black">Leia o código com seu WhatsApp</p>
                          <p className="text-xs text-gray-400 mt-1">Atualiza automaticamente</p>
                        </div>
                      ) : isPolling ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Aguardando QR Code...
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
