import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logger } from "@/utils/logger";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";

const RouteLogger = () => {
  const location = useLocation();
  const { usuario } = useAuth();

  useEffect(() => {
    logger.info(`Visit Page: ${location.pathname}`, {
      tabela: 'page_view',
      empresa_id: usuario?.empresa_id,
      usuario_id: usuario?.id,
      detalhes: { path: location.pathname, search: location.search }
    });
  }, [location.pathname, location.search, usuario?.id, usuario?.empresa_id]);

  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ConfirmDialogProvider />
          <BrowserRouter>
            <RouteLogger />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/:page" element={<Index />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
