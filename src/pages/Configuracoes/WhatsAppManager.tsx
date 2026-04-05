import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSetores } from '@/hooks/useData';
import { Integracao, Setor } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2, QrCode, Power, Plus, Trash2, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

type ConnectionState = 'open' | 'close' | 'connecting' | 'unknown';

interface IntegracaoWithStatus extends Integracao {
  setor?: Setor;
  connectionState: ConnectionState;
}

export default function WhatsAppManager() {
  const { usuario } = useAuth();
  const { setores } = useSetores();
  const [integracoes, setIntegracoes] = useState<IntegracaoWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [creating, setCreating] = useState(false);
  const [selectedSetorId, setSelectedSetorId] = useState<string>('');

  const [qrCode, setQrCode] = useState<{ url: string, instanceName: string } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnectionStatus = useCallback(async (instanceName: string): Promise<ConnectionState> => {
    try {
      const { data } = await supabase.functions.invoke('evolution-api-manager', {
        body: { action: 'check_connection', instanceName }
      });
      return (data?.state as ConnectionState) || 'unknown';
    } catch {
      return 'unknown';
    }
  }, []);

  const fetchIntegracoes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('integracoes')
      .select('*, setor:setores(*)')
      .eq('tipo', 'evolution_api');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (data || []) as any[];
    
    // Check connection status for each instance
    const withStatus = await Promise.all(
      raw.map(async (integ) => {
        const instName = (integ.credentials as Record<string, string>)?.instanceName;
        const state = instName 
          ? await checkConnectionStatus(instName)
          : 'unknown' as ConnectionState;
        return { ...integ, connectionState: state };
      })
    );

    setIntegracoes(withStatus);
    setLoading(false);
  }, [checkConnectionStatus]);

  // Polling: refresh status every 15s
  useEffect(() => {
    fetchIntegracoes();

    pollingRef.current = setInterval(async () => {
      setIntegracoes(prev => {
        // Trigger async updates without blocking
        prev.forEach(async (integ) => {
          const instName = (integ.credentials as Record<string, string>)?.instanceName;
          if (!instName) return;
          const state = await checkConnectionStatus(instName);
          setIntegracoes(current => 
            current.map(i => i.id === integ.id ? { ...i, connectionState: state } : i)
          );
        });
        return prev;
      });
    }, 15000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchIntegracoes, checkConnectionStatus]);

  const handleCreateInstance = async () => {
    if (!selectedSetorId) {
      toast.error('Selecione um setor para vincular este WhatsApp');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api-manager', {
        body: { action: 'create_instance', setorId: selectedSetorId }
      });
      if (error) throw error;
      if (data?.status === 'error' || data?.error) throw new Error(data?.error || 'Erro desconhecido');
      
      toast.success('Instância criada com sucesso!');
      await fetchIntegracoes();
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Erro ao criar instância do WhatsApp');
    }
    setCreating(false);
  };

  const handleGetQrCode = async (instanceName: string) => {
    toast.info('Buscando QR Code...');
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api-manager', {
        body: { action: 'get_qr_code', instanceName }
      });
      if (error) throw error;
      if (data?.status === 'error' || data?.error) throw new Error(data?.error || 'Erro desconhecido');
      
      if (data?.base64) {
        setQrCode({ url: data.base64, instanceName });
      } else {
        toast.error('Instância já está conectada ou ocorreu um erro.');
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Erro ao buscar QR Code');
    }
  };

  const handleLogout = async (instanceName: string) => {
    if (!confirm('Deseja realmente desconectar este número?')) return;
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api-manager', {
         body: { action: 'logout', instanceName }
      });
      if (error) throw error;
      if (data?.status === 'error' || data?.error) throw new Error(data?.error || 'Erro desconhecido');
      
      toast.success('Número desconectado. Leia o QR Code novamente para conectar.');
      // Update status immediately
      setIntegracoes(prev => 
        prev.map(i => i.credentials?.instanceName === instanceName 
          ? { ...i, connectionState: 'close' as ConnectionState } 
          : i
        )
      );
      if (qrCode?.instanceName === instanceName) setQrCode(null);
    } catch {
      toast.error('Erro ao desconectar instância');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir definitivamente esta integração?')) return;
    const { error } = await supabase.from('integracoes').delete().eq('id', id);
    if (!error) {
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
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-pulse relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500" />
          </span>
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
              WhatsApp (Evolution API)
            </CardTitle>
            <CardDescription className="mt-1">
              Gerencie as instâncias de WhatsApp conectadas a cada setor da sua clínica.
            </CardDescription>
          </div>
          
          <div className="flex items-end gap-2 shrink-0">
            <div className="space-y-2">
              <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione um Setor" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateInstance} disabled={creating || !selectedSetorId}>
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
            <p className="text-sm">Selecione um setor acima e crie uma nova instância.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {integracoes.map((integ) => {
              const isConnected = integ.connectionState === 'open';

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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleGetQrCode((integ.credentials as Record<string, string>)?.instanceName)}
                        disabled={isConnected}
                        className={isConnected ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        <QrCode className="h-3 w-3 mr-2" />
                        Conectar WhatsApp
                      </Button>
                      {isConnected && (
                        <Button variant="outline" size="sm" onClick={() => handleLogout((integ.credentials as Record<string, string>)?.instanceName)}>
                          <Power className="h-3 w-3 mr-2 text-red-500" /> Desconectar
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDelete(integ.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {qrCode?.instanceName === integ.credentials.instanceName && (
                    <div className="mt-4 p-4 border rounded-lg bg-white inline-block text-center w-full md:w-auto">
                      <img src={qrCode.url} alt="WhatsApp QR Code" className="w-[200px] h-[200px] mx-auto block" />
                      <p className="text-sm font-medium mt-2 text-black">Leia o código com seu WhatsApp</p>
                      <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={() => setQrCode(null)}>
                        Fechar
                      </Button>
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
