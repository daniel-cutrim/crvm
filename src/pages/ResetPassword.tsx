import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message || 'Erro ao atualizar senha.');
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center mx-auto mb-4">
            <img src="/logo-medroi-final.png" alt="MedROI" className="h-10" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Link inválido</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Este link de recuperação é inválido ou expirou. Solicite um novo link na tela de login.
          </p>
          <a href="/" className="text-primary font-medium hover:underline text-sm">
            Voltar ao login
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-emerald-600" size={24} />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Senha atualizada!</h1>
          <p className="text-muted-foreground text-sm">
            Sua senha foi alterada com sucesso. Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img 
            src="/logo-medroi-final.png" 
            alt="MedROI" 
            className="h-9 contrast-125 brightness-[1.05] drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]" 
          />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-1">Nova senha</h2>
        <p className="text-muted-foreground mb-8 text-sm">
          Digite sua nova senha abaixo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nova senha</label>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar senha</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="dental-input"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm
              hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <a href="/" className="text-primary font-medium hover:underline">
            Voltar ao login
          </a>
        </p>
      </div>
    </div>
  );
}
