import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Link2, Network, Bot, SlidersHorizontal } from 'lucide-react';
import ClinicaTab from './ClinicaTab';
import UsuariosTab from './UsuariosTab';
import IntegracoesTab from './IntegracoesTab';
import SetoresFunisTab from './SetoresFunisTab';
import SupervisoraTab from './SupervisoraTab';
import CamposPersonalizadosTab from './CamposPersonalizadosTab';
import { useSearchParams } from 'react-router-dom';

export default function ConfiguracoesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'clinica';
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      <Tabs 
        value={defaultTab} 
        onValueChange={(v) => setSearchParams({ tab: v })} 
        className="space-y-4"
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="clinica" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Empresa
          </TabsTrigger>
          <TabsTrigger value="setores-funis" className="gap-1.5">
            <Network className="h-4 w-4" /> Setores, Funis & Origens
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-1.5">
            <Link2 className="h-4 w-4" /> Integrações
          </TabsTrigger>
          <TabsTrigger value="supervisora" className="gap-1.5">
            <Bot className="h-4 w-4" /> Supervisora IA
          </TabsTrigger>
          <TabsTrigger value="campos" className="gap-1.5">
            <SlidersHorizontal className="h-4 w-4" /> Campos Personalizados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinica"><ClinicaTab /></TabsContent>
        <TabsContent value="setores-funis"><SetoresFunisTab /></TabsContent>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        <TabsContent value="integracoes"><IntegracoesTab /></TabsContent>
        <TabsContent value="supervisora"><SupervisoraTab /></TabsContent>
        <TabsContent value="campos"><CamposPersonalizadosTab /></TabsContent>
      </Tabs>
    </div>
  );
}
