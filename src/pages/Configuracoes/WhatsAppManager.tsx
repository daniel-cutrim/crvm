import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSetores } from '@/hooks/useData';
import { Integracao, Setor } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2, QrCode, Power, Plus, Trash2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppManager() {
  const { usuario } = useAuth();
  const { setores } = useSetores();
  const [integracoes, setIntegracoes] = useState<(Integracao & { setor?: Setor })[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [creating, setCreating] = useState(false);
  const [selectedSetorId, setSelectedSetorId] = useState<string>('');

  const [qrCode, setQrCode] = useState<{ url: string, instanceName: string } | null>(null);

  const fetchIntegracoes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('integracoes')
      .select('*, setor:setores(*)')
      .eq('tipo', 'evolution_api');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setIntegracoes((data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchIntegracoes();
  }, []);

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
      if (error || data?.error) throw error || new Error(data?.error);
      
      toast.success('Instância criada com sucesso!');
      await fetchIntegracoes();
    } catch (e: Record<string, unknown>) {
      toast.error(e.message || 'Erro ao criar instância do WhatsApp');
    }
    setCreating(false);
  };

  const handleGetQrCode = async (instanceName: string) => {
    toast.info('Buscando QR Code...');
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api-manager', {
        body: { action: 'get_qr_code', instanceName }
      });
      if (error || data?.error) throw error || new Error(data?.error);
      
      if (data?.base64) {
        setQrCode({ url: data.base64, instanceName });
      } else {
        toast.error('Instância já está conectada ou ocorreu um erro.');
      }
    } catch (e: Record<string, unknown>) {
      toast.error(e.message || 'Erro ao buscar QR Code');
    }
  };

  const checkConnection = async (instanceName: string) => {
    try {
      const { data } = await supabase.functions.invoke('evolution-api-manager', {
        body: { action: 'check_connection', instanceName }
      });
      if (data?.state === 'open') {
        toast.success(`Instância ${instanceName} está conectada!`);
        if (qrCode?.instanceName === instanceName) setQrCode(null);
      } else {
        toast.warning(`Instância ${instanceName} está desconectada.`);
      }
    } catch {
      toast.error('Erro ao verificar conexão');
    }
  };

  const handleLogout = async (instanceName: string) => {
    if (!confirm('Deseja realmente desconectar este número?')) return;
    try {
      await supabase.functions.invoke('evolution-api-manager', {
         body: { action: 'logout', instanceName }
      });
      toast.success('Número desconectado. Leia o QR Code novamente para conectar.');
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
          <div className="space-y-6">
            {integracoes.map((integ) => (
              <div key={integ.id} className="p-4 border rounded-lg bg-card shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-full">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      {integ.setor?.nome || 'Setor Desconhecido'}
                      <Badge variant={integ.ativo ? 'default' : 'secondary'}>
                        {integ.ativo ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground">Instância: {integ.credentials?.instanceName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => checkConnection(integ.credentials.instanceName)}>
                    <Power className="h-3 w-3 mr-2 text-blue-500" /> Testar Conexão
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleGetQrCode(integ.credentials.instanceName)}>
                    <QrCode className="h-3 w-3 mr-2" /> Ver QR Code
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleLogout(integ.credentials.instanceName)}>
                    <Power className="h-3 w-3 mr-2 text-red-500" /> Desconectar
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDelete(integ.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
