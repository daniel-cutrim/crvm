import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Wifi, WifiOff, Power, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type ConnectionState = 'open' | 'close' | 'unknown';

interface ZapiStatus {
  connected: boolean;
  state: ConnectionState;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_SERVER_API_KEY || '';

const serverHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
};

export default function WhatsAppManager() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresa_id;

  const [status, setStatus] = useState<ZapiStatus>({ connected: false, state: 'unknown' });
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const qrPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!empresaId) return false;
    try {
      const res = await fetch(`${SERVER_URL}/api/whatsapp/status?empresa_id=${empresaId}`, { headers: serverHeaders });
      if (res.status === 404) {
        setNotConfigured(true);
        setLoading(false);
        return false;
      }
      const data = await res.json() as ZapiStatus;
      setNotConfigured(false);
      setStatus(data);
      return data.connected;
    } catch {
      setStatus({ connected: false, state: 'unknown' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  const fetchQrCode = useCallback(async () => {
    if (!empresaId) return;
    setQrLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/whatsapp/qr-code?empresa_id=${empresaId}`, { headers: serverHeaders });
      const data = await res.json() as { qrCode?: string; error?: string };
      setQrCode(data.qrCode || null);
    } catch {
      setQrCode(null);
    } finally {
      setQrLoading(false);
    }
  }, [empresaId]);

  const startQrPolling = useCallback(() => {
    if (qrPollingRef.current) return;
    fetchQrCode();
    qrPollingRef.current = setInterval(() => { fetchQrCode(); }, 20000);
  }, [fetchQrCode]);

  const stopQrPolling = useCallback(() => {
    if (qrPollingRef.current) {
      clearInterval(qrPollingRef.current);
      qrPollingRef.current = null;
    }
    setQrCode(null);
  }, []);

  useEffect(() => {
    if (!empresaId) return;

    fetchStatus().then((connected) => {
      if (!connected) startQrPolling();
    });

    statusPollingRef.current = setInterval(async () => {
      const connected = await fetchStatus();
      if (connected) {
        stopQrPolling();
      } else {
        startQrPolling();
      }
    }, 5000);

    return () => {
      if (statusPollingRef.current) clearInterval(statusPollingRef.current);
      stopQrPolling();
    };
  }, [empresaId, fetchStatus, startQrPolling, stopQrPolling]);

  const handleDisconnect = async () => {
    if (!empresaId) return;
    if (!confirm('Deseja realmente desconectar o WhatsApp?')) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: serverHeaders,
        body: JSON.stringify({ empresa_id: empresaId }),
      });
      if (!res.ok) throw new Error('Erro ao desconectar');
      toast.success('WhatsApp desconectado. Escaneie o QR Code para reconectar.');
      await fetchStatus();
      startQrPolling();
    } catch {
      toast.error('Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshQr = () => {
    fetchQrCode();
    toast.info('QR Code atualizado');
  };

  if (!empresaId || loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (notConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-green-500" />
            WhatsApp
          </CardTitle>
          <CardDescription className="mt-1">
            Nenhuma instância Z-API configurada para esta empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-muted/30 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Como configurar:</p>
            <p>Insira as credenciais da sua instância Z-API no banco de dados:</p>
            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">{`INSERT INTO public.integracoes (empresa_id, tipo, credentials, ativo)
VALUES (
  '${empresaId}',
  'zapi',
  '{"instanceId": "SEU_INSTANCE_ID",
    "token": "SEU_TOKEN",
    "clientToken": "SEU_CLIENT_TOKEN"}',
  true
);`}</pre>
            <p>Após inserir, recarregue esta página.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-green-500" />
              WhatsApp
            </CardTitle>
            <CardDescription className="mt-1">
              Gerencie a conexão do WhatsApp da sua empresa.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {status.connected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting
                  ? <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  : <Power className="h-3 w-3 mr-2 text-red-500" />
                }
                Desconectar
              </Button>
            )}
            {!status.connected && (
              <Button variant="outline" size="sm" onClick={handleRefreshQr}>
                <RefreshCw className="h-3 w-3 mr-2" />
                Atualizar QR
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="p-4 border rounded-lg bg-card shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-full ${status.connected ? 'bg-green-50' : 'bg-red-50'}`}>
              {status.connected
                ? <Wifi className="h-6 w-6 text-green-600" />
                : <WifiOff className="h-6 w-6 text-red-400" />
              }
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Conecte seu WhatsApp</h4>
              {status.connected ? (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  <span className="text-xs font-medium text-green-600">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  <span className="text-xs font-medium text-red-500">Desconectado</span>
                </div>
              )}
            </div>
          </div>

          {!status.connected && (
            <div className="mt-2">
              {qrLoading && !qrCode ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando QR Code...
                </div>
              ) : qrCode ? (
                <div className="p-4 border rounded-lg bg-white inline-block text-center">
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-[200px] h-[200px] mx-auto block"
                  />
                  <p className="text-sm font-medium mt-2 text-black">Leia o código com seu WhatsApp</p>
                  <p className="text-xs text-gray-400 mt-1">Atualiza a cada 20 segundos</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando QR Code da Z-API...
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
