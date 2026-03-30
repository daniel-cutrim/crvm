import { useState, useEffect } from 'react';
import { useClinica } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClinicaTab() {
  const { clinica, loading, updateClinica, createClinica } = useClinica();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    logo_url: '',
    cor_primaria: '199 89% 38%',
    cor_secundaria: '199 89% 28%',
    dominio: '',
  });

  useEffect(() => {
    if (clinica) {
      setForm({
        nome: clinica.nome || '',
        cnpj: clinica.cnpj || '',
        endereco: clinica.endereco || '',
        telefone: clinica.telefone || '',
        email: clinica.email || '',
        logo_url: clinica.logo_url || '',
        cor_primaria: clinica.cor_primaria || '199 89% 38%',
        cor_secundaria: clinica.cor_secundaria || '199 89% 28%',
        dominio: clinica.dominio || '',
      });
    }
  }, [clinica]);

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome da clínica é obrigatório');
      return;
    }
    setSaving(true);
    try {
      if (clinica) {
        const { error } = await updateClinica(clinica.id, form);
        if (error) throw error;
      } else {
        const { error } = await createClinica(form);
        if (error) throw error;
      }
      toast.success('Dados da clínica salvos com sucesso');
    } catch {
      toast.error('Erro ao salvar dados da clínica');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Dados da Clínica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Clínica *</Label>
            <Input id="nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="F&F Odonto" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@clinica.com" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, bairro, cidade - UF" />
          </div>
          <div className="md:col-span-2 border-t pt-4 mt-2">
            <h3 className="font-medium mb-4 text-foreground">Identidade Visual (White-label)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL da Logo</Label>
                <Input id="logo_url" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
                <p className="text-xs text-muted-foreground">Insira um link direto para a imagem do logo da clínica.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dominio">Domínio Personalizado</Label>
                <Input id="dominio" value={form.dominio} onChange={e => setForm(f => ({ ...f, dominio: e.target.value }))} placeholder="app.suaclinica.com.br" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor_primaria">Cor Primária (HSL)</Label>
                <Input id="cor_primaria" value={form.cor_primaria} onChange={e => setForm(f => ({ ...f, cor_primaria: e.target.value }))} placeholder="199 89% 38%" />
                <p className="text-xs text-muted-foreground">Formato HSL compatível com o sistema (Ex: 199 89% 38%)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor_secundaria">Cor Secundária (HSL)</Label>
                <Input id="cor_secundaria" value={form.cor_secundaria} onChange={e => setForm(f => ({ ...f, cor_secundaria: e.target.value }))} placeholder="199 89% 28%" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
