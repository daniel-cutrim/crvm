import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Target, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import WhatsAppManager from './WhatsAppManager';
import { supabase } from '@/integrations/supabase/client';
import VariaveisClinica from './VariaveisClinica';
export default function IntegracoesTab() {
  const [loading] = useState(false);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      
      {/* WhatsApp / Evolution API Management */}
      <WhatsAppManager />

      {/* Variáveis da Clínica para Integrações */}
      <VariaveisClinica />

      {/* Meta Ads / Facebook - Em Breve */}
      <Card className="relative overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-blue-500" />
            Meta Ads / Facebook
          </CardTitle>
          <CardDescription className="mt-1">
            Rastreamento de leads e conversões via Pixel e Conversions API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950/30 mb-4">
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Em breve</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              A integração com Meta Ads / Facebook está em desenvolvimento. Em breve você poderá conectar seu Pixel, Conversions API e gerenciar campanhas diretamente pelo CRM.
            </p>
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
