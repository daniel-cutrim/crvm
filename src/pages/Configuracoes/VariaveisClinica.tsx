import { useAuth } from '@/contexts/AuthContext';
import { useFunis } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Database, Link2, Copy, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import type { FunilEtapa } from '@/types';

export default function VariaveisClinica() {
  const { usuario } = useAuth();
  const { funis, loading: loadingFunis } = useFunis();
  const [etapas, setEtapas] = useState<Record<string, FunilEtapa[]>>({});
  const [loadingEtapas, setLoadingEtapas] = useState(false);

  useEffect(() => {
    if (funis.length > 0) {
      fetchTodasEtapas();
    }
  }, [funis]);

  const fetchTodasEtapas = async () => {
    setLoadingEtapas(true);
    const funilIds = funis.map((f) => f.id);
    const { data } = await supabase
      .from('funil_etapas')
      .select('*')
      .in('funil_id', funilIds)
      .order('ordem', { ascending: true });

    if (data) {
      const mapeado: Record<string, FunilEtapa[]> = {};
      funis.forEach((f) => {
        mapeado[f.id] = data
          .filter((etapa) => etapa.funil_id === f.id)
          .map((etapa) => ({
            id: etapa.id,
            funil_id: etapa.funil_id,
            nome: etapa.nome,
            ordem: etapa.ordem,
            cor: etapa.cor || '#6b7280',
            criado_em: etapa.created_at,
          }));
      });
      setEtapas(mapeado);
    }
    setLoadingEtapas(false);
  };

  const copyToClipboard = (text: string | undefined | null, desc: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${desc} copiado!`);
  };

  if (loadingFunis) {
    return <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-primary">
          <Database className="h-5 w-5" />
          Variáveis da Empresa
        </CardTitle>
        <CardDescription>
          Utilize estes IDs ao configurar integrações externas (Zapier, Make, RD Station, webhooks) para direcionar leads aos fluxos corretos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clinica ID */}
        <div className="flex items-end gap-3 p-3 bg-background rounded-md border shadow-sm">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">ID da Empresa (clinica_id)</Label>
            <Input readOnly value={usuario?.clinica_id || ''} className="font-mono text-xs text-muted-foreground bg-muted/50" />
          </div>
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={() => copyToClipboard(usuario?.clinica_id, 'ID da Empresa')}
            title="Copiar clinica_id"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Funis e Etapas */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Funis e Etapas</Label>
          {funis.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 border rounded-md">
              Nenhum funil configurado.
            </div>
          ) : (
            <Accordion type="multiple" className="w-full space-y-2">
              {funis.map((funil) => (
                <AccordionItem value={funil.id} key={funil.id} className="border bg-background rounded-md px-1 data-[state=open]:shadow-sm">
                  <AccordionTrigger className="hover:no-underline py-3 px-2">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-sm">{funil.nome}</span>
                        <span className="text-xs text-muted-foreground font-mono mt-1">
                          funil_id: {funil.id.split('-')[0]}...
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-2 hover:bg-primary/10 hover:text-primary z-10"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          copyToClipboard(funil.id, `ID do Funil ${funil.nome}`);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                        <span className="text-xs hidden sm:inline">Copiar funil_id</span>
                      </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-3 px-2">
                    <div className="pt-2 border-t space-y-2 mt-1">
                      {loadingEtapas ? (
                        <div className="py-2 text-center text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin inline mr-2"/>Carregando etapas...</div>
                      ) : etapas[funil.id]?.length === 0 ? (
                        <p className="text-xs text-muted-foreground pl-2 py-1">Nenhuma etapa cadastrada.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 pl-2">
                          {etapas[funil.id]?.map((etapa) => (
                            <div key={etapa.id} className="flex items-center justify-between bg-muted/30 p-2 rounded border border-transparent hover:border-border transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: etapa.cor }} />
                                <span className="text-sm font-medium">{etapa.ordem}. {etapa.nome}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => copyToClipboard(etapa.id, `ID da Etapa ${etapa.nome}`)}
                              >
                                <Copy className="h-3 w-3" />
                                <span className="sr-only sm:not-sr-only">etapa_id</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
