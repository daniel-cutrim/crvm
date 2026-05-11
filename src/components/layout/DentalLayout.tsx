import { ReactNode, useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Calendar, Target, ClipboardList,
  DollarSign, CheckSquare, Settings, LogOut, Menu, X, Megaphone, MessageSquare,
  PanelLeftClose, PanelLeftOpen, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isGestor, isProfissional } from '@/utils/roles';
import { useTheme } from '@/contexts/ThemeContext';
import { useConsultas, useTarefas } from '@/hooks/useData';
import GlobalSearch from './GlobalSearch';
import ReminderNotifications from '@/components/notifications/ReminderNotifications';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Gestor', 'Profissional', 'Recepção', 'Gestor/Profissional'] },
  { id: 'agenda', label: 'Agenda', icon: Calendar, roles: ['Gestor', 'Profissional', 'Recepção', 'Gestor/Profissional'] },
  { id: 'crm', label: 'CRM / Leads', icon: Target, roles: ['Gestor', 'Recepção', 'Gestor/Profissional'] },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign, roles: ['Gestor', 'Gestor/Profissional'] },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, roles: ['Gestor', 'Gestor/Profissional'] },
  { id: 'chat', label: 'Chat WhatsApp', icon: MessageSquare, roles: ['Gestor', 'Recepção', 'Gestor/Profissional'] },
  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare, roles: ['Gestor', 'Profissional', 'Recepção', 'Gestor/Profissional'] },
  { id: 'configuracoes', label: 'Configurações', icon: Settings, roles: ['Gestor', 'Gestor/Profissional'] },
];

const SIDEBAR_COLLAPSED_KEY = 'crvm-sidebar-collapsed';

export default function AppLayout({ children, currentPage, onPageChange }: LayoutProps) {
  const { usuario, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { consultas } = useConsultas();
  const { tarefas } = useTarefas();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'; }
    catch { return false; }
  });

  const menuItems = allMenuItems.filter(item =>
    usuario && item.roles.includes(usuario.papel)
  );

  const getInitials = (nome: string) =>
    nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const handlePageChange = (page: string) => {
    onPageChange(page);
    setSidebarOpen(false);
  };

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  };

  useEffect(() => {
    if (usuario?.clinica?.cor_primaria) {
      document.documentElement.style.setProperty('--primary', usuario.clinica.cor_primaria);
    }
  }, [usuario?.clinica?.cor_primaria]);

  const clinicaNome = usuario?.clinica?.nome || 'CRVM';
  const clinicaLogo = usuario?.clinica?.logo_url;
  const clinicaIniciais = clinicaNome.substring(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-200 ease-in-out overflow-hidden
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          lg:translate-x-0 ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}
        style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
      >
        {/* Header */}
        <div className="h-14 px-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className={`flex items-center gap-3 min-w-0 overflow-hidden ${collapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            {clinicaLogo ? (
              <img src={clinicaLogo} alt={clinicaNome} className="w-8 h-8 rounded-lg object-contain bg-white shrink-0" />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-[10px]">{clinicaIniciais}</span>
              </div>
            )}
            <h1
              className={`font-semibold text-sm truncate whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:hidden' : ''}`}
              style={{ color: 'hsl(var(--sidebar-text-active))' }}
            >
              {clinicaNome}
            </h1>
          </div>
          {/* Mobile close */}
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10"
            style={{ color: 'hsl(var(--sidebar-text))' }}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
          {/* Desktop collapse toggle */}
          <button
            className={`hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0 ${collapsed ? 'lg:hidden' : ''}`}
            style={{ color: 'hsl(var(--sidebar-text))' }}
            onClick={toggleCollapsed}
            title="Retrair menu"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handlePageChange(item.id)}
                    className={`w-full flex items-center rounded-lg transition-all duration-200 overflow-hidden
                      ${collapsed ? 'lg:justify-center lg:px-0 lg:py-2.5' : ''} px-3 py-2.5`}
                    style={{
                      backgroundColor: isActive ? 'hsl(var(--sidebar-bg-active))' : 'transparent',
                      color: isActive ? 'hsl(var(--sidebar-text-active))' : 'hsl(var(--sidebar-text))',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'hsl(var(--sidebar-bg-hover))';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className={`text-sm font-medium truncate whitespace-nowrap ml-3 transition-opacity duration-200 ${collapsed ? 'lg:hidden' : ''}`}>
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Expand button when collapsed */}
          {collapsed && (
            <div className="hidden lg:block mt-3 px-0">
              <button
                className="w-full flex justify-center py-2.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: 'hsl(var(--sidebar-text))' }}
                onClick={toggleCollapsed}
                title="Expandir menu"
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
          )}
        </nav>

        {/* User info at bottom */}
        {usuario && (
          <div className="p-2 border-t shrink-0" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
            <div className={`flex items-center overflow-hidden ${collapsed ? 'lg:flex-col lg:gap-2 lg:py-1' : 'gap-3 px-1'}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/20 shrink-0">
                <span className="text-[10px] font-semibold text-primary-foreground">
                  {getInitials(usuario.nome)}
                </span>
              </div>
              <div className={`flex-1 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
                <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--sidebar-text-active))' }}>
                  {usuario.nome}
                </p>
                <p className="text-xs truncate" style={{ color: 'hsl(var(--sidebar-text))' }}>
                  {usuario.papel === 'Profissional' ? (usuario.especialidade || 'Profissional') : usuario.papel}
                </p>
              </div>
              <div className={`flex items-center ${collapsed ? 'lg:flex-col' : ''} gap-0.5`}>
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: 'hsl(var(--sidebar-text))' }}
                  title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                >
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                <button
                  onClick={signOut}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: 'hsl(var(--sidebar-text))' }}
                  title="Sair"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-200 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Top bar */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              className="lg:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block flex-1 min-w-0">
              <GlobalSearch onNavigate={(page) => handlePageChange(page)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ReminderNotifications consultas={consultas} tarefas={tarefas} />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
