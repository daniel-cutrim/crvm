import { useState, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DentalLayout from '@/components/layout/DentalLayout';
import Login from '@/pages/Login';
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const PacientesPage = lazy(() => import('@/pages/Pacientes'));
const AgendaPage = lazy(() => import('@/pages/Agenda'));
const CRMPage = lazy(() => import('@/pages/CRM'));
const PlanosTratamentoPage = lazy(() => import('@/pages/PlanosTratamento'));
const FinanceiroPage = lazy(() => import('@/pages/Financeiro'));
const TarefasPage = lazy(() => import('@/pages/Tarefas'));
const ConfiguracoesPage = lazy(() => import('@/pages/Configuracoes'));
const MarketingPage = lazy(() => import('@/pages/Marketing'));
const ChatPage = lazy(() => import('@/pages/Chat'));

type Page = 'dashboard' | 'pacientes' | 'agenda' | 'crm' | 'planos' | 'financeiro' | 'marketing' | 'chat' | 'tarefas' | 'configuracoes';

export default function IndexPage() {
  const { user, usuario, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !usuario) return <Login />;

  const renderPage = () => {
    const papel = usuario.papel;
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={(p) => setCurrentPage(p as Page)} />;
      case 'pacientes': return <PacientesPage />;
      case 'agenda': return <AgendaPage />;
      case 'crm': return papel !== 'Dentista' ? <CRMPage /> : <Dashboard />;
      case 'planos': return <PlanosTratamentoPage />;
      case 'financeiro': return papel === 'Gestor' ? <FinanceiroPage /> : <Dashboard />;
      case 'marketing': return papel === 'Gestor' ? <MarketingPage /> : <Dashboard />;
      case 'chat': return (papel === 'Gestor' || papel === 'Recepção') ? <ChatPage /> : <Dashboard />;
      case 'tarefas': return <TarefasPage />;
      case 'configuracoes': return papel === 'Gestor' ? <ConfiguracoesPage /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  return (
    <DentalLayout currentPage={currentPage} onPageChange={(p) => setCurrentPage(p as Page)}>
      <Suspense fallback={
        <div className="w-full h-full flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground mt-4 text-sm">Carregando módulo...</p>
        </div>
      }>
        {renderPage()}
      </Suspense>
    </DentalLayout>
  );
}
