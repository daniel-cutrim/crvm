import { useState, useEffect } from 'react';
import { useUsuarios } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Pencil, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Usuario } from '@/types';
import { useClinicaConfig } from '@/hooks/useClinicaConfig';
import { isGestor } from '@/utils/roles';

const PERMISSOES_CONFIG = [
  { key: 'ver_dashboard', label: 'Ver Dashboard (métricas e gráficos)' },
  { key: 'ver_funil', label: 'Visualizar Funil de Vendas' },
  { key: 'editar_negocios', label: 'Criar e editar Negócios' },
  { key: 'fechar_negocios', label: 'Marcar Negócios como Ganho/Perdido' },
  { key: 'ver_pessoas', label: 'Visualizar Pessoas/Contatos' },
  { key: 'editar_pessoas', label: 'Criar e editar Pessoas' },
  { key: 'ver_marketing', label: 'Visualizar Marketing e relatórios' },
  { key: 'editar_marketing', label: 'Editar Investimentos e Metas' },
  { key: 'acessar_chat', label: 'Acessar Chat/WhatsApp' },
  { key: 'ver_agenda', label: 'Visualizar Agenda' },
  { key: 'gerenciar_usuarios', label: 'Gerenciar Usuários do sistema' },
] as const;

const defaultPermissoes = {
  ver_dashboard: false,
  ver_funil: false,
  editar_negocios: false,
  fechar_negocios: false,
  ver_pessoas: false,
  editar_pessoas: false,
  ver_marketing: false,
  editar_marketing: false,
  acessar_chat: false,
  ver_agenda: false,
  gerenciar_usuarios: false,
};

export default function UsuariosTab() {
  const { usuarios, loading, addUsuario, updateUsuario } = useUsuarios();
  const { usuario } = useAuth();
  const { labelProfissional } = useClinicaConfig();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    papel: 'Comercial' as string,
    permissoes: { ...defaultPermissoes },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_auth') === 'success') {
      toast.success('Google Agenda conectado com sucesso!');
      window.history.replaceState({}, '', window.location.pathname + '?tab=equipe');
    }
  }, []);

  const handleConnectGoogle = async () => {
    if (!editing || !usuario?.empresa_id) return;
    setConnectingGoogle(true);
    try {
      const { data, error } = await supabase.functions.invoke(`google-calendar-auth?action=url&dentista_id=${editing.id}&empresa_id=${usuario.empresa_id}`, {
        method: 'GET',
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao conectar Google Agenda. Verifique as chaves no Supabase.');
      setConnectingGoogle(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nome: '', email: '', papel: 'Comercial', permissoes: { ...defaultPermissoes } });
    setOpen(true);
  };

  const openEdit = (u: Usuario) => {
    setEditing(u);
    setForm({
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      permissoes: { ...defaultPermissoes, ...(u.permissoes || {}) },
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const permissoesToSave = isGestor(form.papel) ? null : form.permissoes;

      if (editing) {
        const { error } = await updateUsuario(editing.id, {
          nome: form.nome,
          email: form.email,
          papel: form.papel,
          permissoes: permissoesToSave,
        });
        if (error) throw error;
        toast.success('Usuário atualizado');
      } else {
        const { error } = await addUsuario({
          nome: form.nome,
          email: form.email,
          papel: form.papel,
          permissoes: permissoesToSave,
        });
        if (error) throw error;
        toast.success('Usuário criado');
      }
      setOpen(false);
    } catch {
      toast.error('Erro ao salvar usuário');
    }
    setSaving(false);
  };

  const toggleAtivo = async (u: Usuario) => {
    const { error } = await updateUsuario(u.id, { ativo: !u.ativo });
    if (error) toast.error('Erro ao atualizar status');
    else toast.success(u.ativo ? 'Usuário desativado' : 'Usuário ativado');
  };

  const papeisDisponiveis = ['Gestor', 'Comercial'];

  const papelColor = (p: string) => {
    if (p === 'Gestor') return 'bg-primary/10 text-primary border-primary/20';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Equipe ({usuarios.length})
          </CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={papelColor(u.papel)}>{u.papel}</Badge>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleAtivo(u)} className="text-xs font-medium cursor-pointer">
                      <Badge variant={u.ativo ? 'default' : 'secondary'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {usuarios.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={form.papel} onValueChange={v => setForm(f => ({ ...f, papel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {papeisDisponiveis.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Permissoes — apenas para nao-Gestores */}
            {!isGestor(form.papel) && (
              <div className="space-y-3 pt-2 border-t mt-4">
                <Label className="text-sm font-semibold">Permissões de Acesso</Label>
                <p className="text-xs text-muted-foreground">Selecione o que este usuário pode visualizar e editar.</p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {PERMISSOES_CONFIG.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 p-1.5 rounded">
                      <input
                        type="checkbox"
                        checked={!!(form.permissoes as any)[key]}
                        onChange={(e) => setForm(f => ({
                          ...f,
                          permissoes: { ...f.permissoes, [key]: e.target.checked },
                        }))}
                        className="rounded border-gray-300 h-4 w-4"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.papel !== 'Gestor' && editing && (
              <div className="space-y-2 pt-2 border-t mt-4">
                <Label>Integração com Agenda</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleConnectGoogle}
                    disabled={connectingGoogle}
                  >
                    {connectingGoogle ? (
                      <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    ) : (
                      <CalendarIcon className="h-4 w-4 text-orange-500" />
                    )}
                    {connectingGoogle ? 'Conectando...' : 'Conectar Google Agenda'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Permite sincronização bidirecional de agendamentos usando a conta deste {labelProfissional.toLowerCase()}.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
