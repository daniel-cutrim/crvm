import { useState, useEffect } from 'react';
import { useIntegracoes } from '@/hooks/useData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Calendar, Target, Webhook, Facebook, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import WhatsAppManager from './WhatsAppManager';
import { supabase } from '@/integrations/supabase/client';
import VariaveisClinica from './VariaveisClinica';
export default function IntegracoesTab() {
  const { integracoes, loading, saveIntegracao } = useIntegracoes();
  const [saving, setSaving] = useState<string | null>(null);

  const [metaForm, setMetaForm] = useState({ pixelId: '', conversionsApiToken: '', enabled: true });
  const [googleForm, setGoogleForm] = useState({ ga4Id: '', gtmId: '', enabled: true });

  useEffect(() => {
    if (!loading && integracoes.length > 0) {
      const meta = integracoes.find(i => i.tipo === 'meta_ads');
      if (meta && meta.credentials) {
        setMetaForm({
          pixelId: (meta.credentials.pixelId as string) || '',
          conversionsApiToken: (meta.credentials.conversionsApiToken as string) || '',
          enabled: meta.ativo,
        });
      }

      const google = integracoes.find(i => i.tipo === 'google_ads');
      if (google && google.credentials) {
        setGoogleForm({
          ga4Id: (google.credentials.ga4Id as string) || '',
          gtmId: (google.credentials.gtmId as string) || '',
          enabled: google.ativo,
        });
      }
    }
  }, [integracoes, loading]);

  const handleSave = async (tipo: string, credentials: Record<string, unknown>, enabled: boolean) => {
    setSaving(tipo);
    const { error } = await saveIntegracao(tipo, credentials, enabled);
    if (error) {
      toast.error(`Erro ao salvar integração: ${tipo}`);
    } else {
      toast.success(`Integração salva com sucesso: ${tipo}`);
    }
    setSaving(null);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      
      {/* WhatsApp / Evolution API Management */}
      <WhatsAppManager />

      {/* Variáveis da Clínica para Integrações */}
      <VariaveisClinica />

      {/* Meta Ads Tracking */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-blue-500" />
              Meta Ads / Facebook
            </CardTitle>
            <CardDescription className="mt-1">
              Rastreamento de leads e conversões (Embeded / Pixel).
            </CardDescription>
          </div>
          <Switch 
            checked={metaForm.enabled} 
            onCheckedChange={(c) => setMetaForm({ ...metaForm, enabled: c })} 
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meta_pixel">Pixel ID</Label>
              <Input id="meta_pixel" value={metaForm.pixelId} onChange={e => setMetaForm({...metaForm, pixelId: e.target.value})} placeholder="Ex: 123456789..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta_token">Conversions API Token</Label>
              <Input id="meta_token" type="password" value={metaForm.conversionsApiToken} onChange={e => setMetaForm({...metaForm, conversionsApiToken: e.target.value})} placeholder="Token de acesso..." />
            </div>
          </div>
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Facebook className="text-blue-600 h-4 w-4" />
              Integração Avançada (Leads e Tracking)
            </h4>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <p className="text-xs text-muted-foreground max-w-[60%]">
                Conecte a conta do Facebook da sua clínica para que o sistema consiga ler campanhas, anúncios e salvar o histórico de origem exata dos seus Leads no CRM.
              </p>
              <Button 
                variant="outline" 
                className="gap-2 shrink-0 bg-[#1877F2] text-white hover:bg-[#0C63D4] border-none"
                onClick={() => toast.info('Aguardando aprovação do Aplicativo na Meta para uso global do SaaS.')}
              >
                <Facebook className="h-4 w-4" />
                Conectar com Facebook
              </Button>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => handleSave('meta_ads', { pixelId: metaForm.pixelId, conversionsApiToken: metaForm.conversionsApiToken }, metaForm.enabled)} disabled={saving === 'meta_ads'}>
              {saving === 'meta_ads' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Tracking Meta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Google Ads / Tracking */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Webhook className="h-5 w-5 text-red-500" />
              Google Tracking
            </CardTitle>
            <CardDescription className="mt-1">
              Configure as Tags do Google Analytics e Tag Manager.
            </CardDescription>
          </div>
          <Switch 
            checked={googleForm.enabled} 
            onCheckedChange={(c) => setGoogleForm({ ...googleForm, enabled: c })} 
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ga4_id">GA4 Measurement ID</Label>
              <Input id="ga4_id" value={googleForm.ga4Id} onChange={e => setGoogleForm({...googleForm, ga4Id: e.target.value})} placeholder="G-XXXXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gtm_id">Google Tag Manager ID</Label>
              <Input id="gtm_id" value={googleForm.gtmId} onChange={e => setGoogleForm({...googleForm, gtmId: e.target.value})} placeholder="GTM-XXXXXXX" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => handleSave('google_ads', { ga4Id: googleForm.ga4Id, gtmId: googleForm.gtmId }, googleForm.enabled)} disabled={saving === 'google_ads'}>
              {saving === 'google_ads' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Tracking Google
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar - OAuth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-orange-500" />
            Google Agenda (Opcional - Uso Pessoal)
          </CardTitle>
          <CardDescription className="mt-1">
            Conecte sua conta do Google para sincronização bidirecional de agendamentos. Como esta é uma configuração pessoal, cada membro da equipe pode autorizar sua própria conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto" 
            onClick={async () => {
              toast.info('Redirecionando para o Google...', { id: 'auth-redirect' });
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Você precisa estar logado");

                const { data: userData } = await supabase
                  .from('usuarios')
                  .select('clinica_id')
                  .eq('auth_user_id', session.user.id)
                  .single();

                if (!userData) throw new Error("Usuário não encontrado");

                const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
                  body: { user_id: session.user.id, clinica_id: userData.clinica_id }
                });

                if (error || data?.error) throw error || new Error(data?.error);

                if (data?.url) {
                  window.location.href = data.url;
                } else {
                  throw new Error("Erro ao obter URL do Google");
                }
              } catch (e: any) {
                toast.error(e.message || 'Erro ao iniciar autenticação');
              }
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Conectar com Google Workspace
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
