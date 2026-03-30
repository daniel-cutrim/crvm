import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Stethoscope, Link2, Network, Columns } from 'lucide-react';
import ClinicaTab from './ClinicaTab';
import UsuariosTab from './UsuariosTab';
import ProcedimentosTab from './ProcedimentosTab';
import IntegracoesTab from './IntegracoesTab';
import SetoresTab from './SetoresTab';
import FunisTab from './FunisTab';

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      <Tabs defaultValue="clinica" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="clinica" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Clínica
          </TabsTrigger>
          <TabsTrigger value="setores" className="gap-1.5">
            <Network className="h-4 w-4" /> Setores (Empresa)
          </TabsTrigger>
          <TabsTrigger value="funis" className="gap-1.5">
            <Columns className="h-4 w-4" /> Funis de Vendas
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="procedimentos" className="gap-1.5">
            <Stethoscope className="h-4 w-4" /> Procedimentos
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-1.5">
            <Link2 className="h-4 w-4" /> Integrações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinica"><ClinicaTab /></TabsContent>
        <TabsContent value="setores"><SetoresTab /></TabsContent>
        <TabsContent value="funis"><FunisTab /></TabsContent>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        <TabsContent value="procedimentos"><ProcedimentosTab /></TabsContent>
        <TabsContent value="integracoes"><IntegracoesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
