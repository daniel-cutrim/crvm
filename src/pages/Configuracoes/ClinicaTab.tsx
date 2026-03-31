import { useState, useEffect, useRef } from 'react';
import { useClinica } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Save, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ClinicaTab() {
  const { clinica, loading, updateClinica, createClinica } = useClinica();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    logo_url: '',
    cor_primaria: '199 89% 38%',
    cor_secundaria: '199 89% 28%',
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
      });
    }
  }, [clinica]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, envie apenas imagens (PNG, JPG, SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `logo_${clinica?.id || 'new'}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setForm(f => ({ ...f, logo_url: urlData.publicUrl }));
      toast.success('Logo enviado com sucesso!');
    } catch (err: any) {
      console.error('[ClinicaTab] Erro upload:', err);
      toast.error(err?.message || 'Erro ao enviar a logo.');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome da clínica é obrigatório');
      return;
    }
    setSaving(true);
    try {
      if (clinica) {
        const { error } = await updateClinica(clinica.id, form);
        if (error) {
          console.error('[ClinicaTab] Erro ao atualizar clínica:', error);
          throw error;
        }
      } else {
        const { error } = await createClinica(form);
        if (error) {
          console.error('[ClinicaTab] Erro ao criar clínica:', error);
          throw error;
        }
      }
      toast.success('Dados da clínica salvos com sucesso');
    } catch (err: any) {
      console.error('[ClinicaTab] Detalhes do erro:', err);
      toast.error(err?.message || 'Erro ao salvar dados da clínica');
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
            <Input id="nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="MedROI" />
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

          {/* Personalize seu Sistema */}
          <div className="md:col-span-2 border-t pt-4 mt-2">
            <h3 className="font-medium mb-4 text-foreground">Personalize seu Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Upload de Logo */}
              <div className="md:col-span-2 space-y-3">
                <Label>Logo da Empresa</Label>
                <div className="flex items-center gap-4">
                  {form.logo_url ? (
                    <div className="relative group">
                      <img
                        src={form.logo_url}
                        alt="Logo"
                        className="w-20 h-20 rounded-lg object-contain border bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, logo_url: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
                      <Upload className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? 'Enviando...' : form.logo_url ? 'Trocar Logo' : 'Enviar Logo'}
                    </Button>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máx 2MB.</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
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
