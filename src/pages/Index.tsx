import { useState, Suspense, lazy, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isGestor, isOnlyProfissional } from '@/utils/roles';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/DentalLayout';
import Login from '@/pages/Login';
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const AgendaPage = lazy(() => import('@/pages/Agenda'));
const CRMPage = lazy(() => import('@/pages/CRM'));
const FinanceiroPage = lazy(() => import('@/pages/Financeiro'));
const TarefasPage = lazy(() => import('@/pages/Tarefas'));
const ConfiguracoesPage = lazy(() => import('@/pages/Configuracoes'));
const MarketingPage = lazy(() => import('@/pages/Marketing'));
const ChatPage = lazy(() => import('@/pages/Chat'));

// Novos módulos (serão criados nas próximas fases)
const FunilPage = lazy(() =>
  import('@/pages/Funil').catch(() => import('@/pages/CRM'))
);
const AtividadesPage = lazy(() =>
  import('@/pages/Atividades').catch(() => import('@/pages/Tarefas'))
);
const PessoasPage = lazy(() =>
  import('@/pages/Pessoas').catch(() => ({ default: () => null as any }))
);

type Page = 'dashboard' | 'agenda' | 'funil' | 'pessoas' | 'atividades' | 'financeiro' | 'marketing' | 'chat' | 'configuracoes';

export default function IndexPage() {
  const { user, usuario, loading } = useAuth();
  const { page } = useParams<{ page: string }>();
  const navigate = useNavigate();

  const validPages: Page[] = ['dashboard', 'agenda', 'funil', 'pessoas', 'atividades', 'financeiro', 'marketing', 'chat', 'configuracoes'];
  const initialPage = (page && validPages.includes(page as Page)) ? (page as Page) : 'dashboard';

  const [currentPage, setCurrentPage] = useState<Page>(initialPage);

  useEffect(() => {
    if (page && validPages.includes(page as Page)) {
      setCurrentPage(page as Page);
    } else if (!page) {
      setCurrentPage('dashboard');
    }
  }, [page]);

  const handlePageChange = (p: string) => {
    setCurrentPage(p as Page);
    if (p === 'dashboard' || p === '') navigate('/');
    else navigate(`/${p}`);
  };

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
      case 'dashboard': return <Dashboard onNavigate={(p) => handlePageChange(p as Page)} />;
      case 'agenda': return <AgendaPage />;
      case 'funil': return !isOnlyProfissional(papel) ? <FunilPage onNavigate={(p) => handlePageChange(p as Page)} /> : <Dashboard onNavigate={(p) => handlePageChange(p as Page)} />;
      case 'pessoas': return !isOnlyProfissional(papel) ? <PessoasPage /> : <Dashboard onNavigate={(p) => handlePageChange(p as Page)} />;
      case 'atividades': return <AtividadesPage />;
      case 'financeiro': return isGestor(papel) ? <FinanceiroPage /> : <Dashboard />;
      case 'marketing': return isGestor(papel) ? <MarketingPage /> : <Dashboard />;
      case 'chat': return (isGestor(papel) || papel === 'Recepção') ? <ChatPage /> : <Dashboard />;
      case 'configuracoes': return isGestor(papel) ? <ConfiguracoesPage /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onPageChange={handlePageChange}>
      <Suspense fallback={
        <div className="w-full h-full flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground mt-4 text-sm">Carregando módulo...</p>
        </div>
      }>
        {renderPage()}
      </Suspense>
    </AppLayout>
  );
}
