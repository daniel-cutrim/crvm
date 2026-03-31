import { ReactNode, useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Calendar, Target, ClipboardList,
  DollarSign, CheckSquare, Settings, LogOut, Menu, X, Megaphone, MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isGestor, isDentista } from '@/utils/roles';
import { useConsultas, useTarefas } from '@/hooks/useData';
import GlobalSearch from './GlobalSearch';
import ReminderNotifications from '@/components/notifications/ReminderNotifications';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Gestor', 'Dentista', 'Recepção', 'Gestor/Dentista'] },
  { id: 'pacientes', label: 'Pacientes', icon: Users, roles: ['Gestor', 'Dentista', 'Recepção', 'Gestor/Dentista'] },
  { id: 'agenda', label: 'Agenda', icon: Calendar, roles: ['Gestor', 'Dentista', 'Recepção', 'Gestor/Dentista'] },
  { id: 'crm', label: 'CRM / Leads', icon: Target, roles: ['Gestor', 'Recepção', 'Gestor/Dentista'] },
  { id: 'planos', label: 'Planos de Tratamento', icon: ClipboardList, roles: ['Gestor', 'Dentista', 'Recepção', 'Gestor/Dentista'] },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign, roles: ['Gestor', 'Gestor/Dentista'] },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, roles: ['Gestor', 'Gestor/Dentista'] },
  { id: 'chat', label: 'Chat WhatsApp', icon: MessageSquare, roles: ['Gestor', 'Recepção', 'Gestor/Dentista'] },
  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare, roles: ['Gestor', 'Dentista', 'Recepção', 'Gestor/Dentista'] },
  { id: 'configuracoes', label: 'Configurações', icon: Settings, roles: ['Gestor', 'Gestor/Dentista'] },
];

export default function DentalLayout({ children, currentPage, onPageChange }: LayoutProps) {
  const { usuario, signOut } = useAuth();
  const { consultas } = useConsultas();
  const { tarefas } = useTarefas();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = allMenuItems.filter(item =>
    usuario && item.roles.includes(usuario.papel)
  );

  const getInitials = (nome: string) =>
    nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const handlePageChange = (page: string) => {
    onPageChange(page);
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (usuario?.clinica?.cor_primaria) {
      document.documentElement.style.setProperty('--primary', usuario.clinica.cor_primaria);
    }
  }, [usuario?.clinica?.cor_primaria]);

  const clinicaNome = usuario?.clinica?.nome || 'MedROI';
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
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className="flex items-center gap-3">
            {clinicaLogo ? (
              <img src={clinicaLogo} alt={clinicaNome} className="w-10 h-10 rounded-lg object-contain bg-white" />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">{clinicaIniciais}</span>
              </div>
            )}
            <div>
              <h1 className="font-semibold text-lg" style={{ color: 'hsl(var(--sidebar-text-active))' }}>
                {clinicaNome}
              </h1>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10"
            style={{ color: 'hsl(var(--sidebar-text))' }}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handlePageChange(item.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
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
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info at bottom */}
        {usuario && (
          <div className="p-4 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/20">
                <span className="text-xs font-semibold text-primary-foreground">
                  {getInitials(usuario.nome)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--sidebar-text-active))' }}>
                  {usuario.nome}
                </p>
                <p className="text-xs" style={{ color: 'hsl(var(--sidebar-text))' }}>
                  {usuario.papel}
                </p>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: 'hsl(var(--sidebar-text))' }}
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 gap-3">
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
            <button className="sm:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => {
                const searchEl = document.querySelector<HTMLInputElement>('.mobile-search-input');
                if (searchEl) searchEl.focus();
              }}
            >
              {/* Mobile search handled by page-level search */}
            </button>
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
