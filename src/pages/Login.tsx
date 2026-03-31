import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (forgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message || 'Erro ao enviar e-mail.');
      else setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError('E-mail ou senha incorretos.');
    } else {
      if (!nome.trim()) { setError('Informe seu nome.'); setLoading(false); return; }
      const { error } = await signUp(email, password, nome);
      if (error) setError(error.message || 'Erro ao criar conta.');
      else setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12"
        style={{ background: 'linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 76%, 26%) 100%)' }}>
        <div className="max-w-md text-center">
          <div className="-mb-8">
            <img 
              src="/logo-medroi-final.png" 
              alt="MedROI" 
              className="h-72 mx-auto object-contain contrast-125 brightness-[1.1] drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
            />
          </div>
          <p className="text-white/80 text-lg">
            CRM + Gestão Clínica completa para sua clínica
          </p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src="/logo-medroi-final.png" alt="MedROI" className="h-9" />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            {forgotPassword ? 'Recuperar senha' : isLogin ? 'Entrar no sistema' : 'Criar conta'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {forgotPassword ? 'Informe seu e-mail para receber o link de recuperação' : isLogin ? 'Acesse seu painel de gestão' : 'Crie sua conta para começar'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="dental-input"
                  placeholder="Dr. João Silva"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="dental-input"
                placeholder="seu@email.com"
                required
              />
            </div>
            {!forgotPassword && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="dental-input pr-10"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(true); setError(''); setSuccessMessage(''); }}
                    className="text-xs text-primary hover:underline mt-1.5"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm
                hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? 'Carregando...' : forgotPassword ? 'Enviar link' : isLogin ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {forgotPassword ? (
              <button
                onClick={() => { setForgotPassword(false); setError(''); setSuccessMessage(''); }}
                className="text-primary font-medium hover:underline"
              >
                Voltar ao login
              </button>
            ) : (
              <>
                {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
                <button
                  onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMessage(''); }}
                  className="text-primary font-medium hover:underline"
                >
                  {isLogin ? 'Criar conta' : 'Fazer login'}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
