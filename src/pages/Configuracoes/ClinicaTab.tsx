import { useState, useEffect, useRef } from 'react';
import { useClinica } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Save, Loader2, Upload, X, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Convert HEX to HSL string (without "hsl()" wrapper, space-separated for CSS vars)
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '199 89% 38%';

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Convert HSL string to HEX
function hslToHex(hslStr: string): string {
  const parts = hslStr.replace(/,/g, '').split(/\s+/);
  if (parts.length < 3) return '#0c84ab';

  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface ColorPickerFieldProps {
  label: string;
  hslValue: string;
  onChange: (hsl: string) => void;
}

function ColorPickerField({ label, hslValue, onChange }: ColorPickerFieldProps) {
  const hexValue = hslToHex(hslValue);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2.5 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors text-left"
          >
            <div
              className="w-8 h-8 rounded-md border border-border/50 shadow-sm shrink-0"
              style={{ backgroundColor: hexValue }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{hexValue.toUpperCase()}</p>
              <p className="text-[10px] text-muted-foreground">HSL: {hslValue}</p>
            </div>
            <Palette size={14} className="text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <input
              type="color"
              value={hexValue}
              onChange={(e) => onChange(hexToHsl(e.target.value))}
              className="w-48 h-40 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
              style={{ WebkitAppearance: 'none' }}
            />
            <div className="flex items-center gap-2 pt-1">
              <div
                className="w-6 h-6 rounded-full border border-border/50"
                style={{ backgroundColor: hexValue }}
              />
              <span className="text-xs font-mono text-muted-foreground">{hexValue.toUpperCase()}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

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
      toast.error('Nome da empresa é obrigatório');
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
      toast.success('Dados da empresa salvos com sucesso');
    } catch (err: any) {
      console.error('[ClinicaTab] Detalhes do erro:', err);
      toast.error(err?.message || 'Erro ao salvar dados da empresa');
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
          Dados da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Empresa *</Label>
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

              <ColorPickerField
                label="Cor Primária"
                hslValue={form.cor_primaria}
                onChange={(hsl) => setForm(f => ({ ...f, cor_primaria: hsl }))}
              />
              <ColorPickerField
                label="Cor Secundária"
                hslValue={form.cor_secundaria}
                onChange={(hsl) => setForm(f => ({ ...f, cor_secundaria: hsl }))}
              />
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
