import { useState } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import {
  ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, Plus,
  FileText, Stethoscope, DollarSign, ClipboardList, Upload,
  Trash2, Loader2, Pencil, User, Clock, MessageSquare,
} from 'lucide-react';
import { formatWhatsAppLink } from '@/utils/masks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useProntuario, usePacienteDocumentos } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { Paciente, Consulta, PlanoTratamento, Receita, ProntuarioEntrada } from '@/types';
import Odontograma from './Odontograma';
import { useClinicaConfig } from '@/hooks/useClinicaConfig';

const TIPOS_PRONTUARIO = ['Evolução', 'Anamnese', 'Exame', 'Procedimento', 'Prescrição', 'Observação'] as const;
const TIPOS_DOCUMENTO = ['Exame', 'Atestado', 'Laudo', 'Contrato', 'Receita', 'Foto', 'Outro'] as const;

interface Props {
  paciente: Paciente;
  consultas: Consulta[];
  planos: PlanoTratamento[];
  receitas: Receita[];
  onBack: () => void;
  onEdit: () => void;
}

export default function PacienteDetail({ paciente, consultas, planos, receitas, onBack, onEdit }: Props) {
  const { usuario } = useAuth();
  const clinicaNome = usuario?.clinica?.nome || 'MedROI';
  const { entradas, loading: loadingPront, addEntrada, deleteEntrada } = useProntuario(paciente.id);
  const { documentos, loading: loadingDocs, addDocumento, deleteDocumento } = usePacienteDocumentos(paciente.id);
  const { isOdontologia, labelProfissional, showOdontograma } = useClinicaConfig();

  const [prontuarioOpen, setProntuarioOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [pronForm, setPronForm] = useState({
    tipo: 'Evolução' as string,
    titulo: '',
    descricao: '',
    data_registro: format(new Date(), 'yyyy-MM-dd'),
  });

  const [docForm, setDocForm] = useState({
    tipo_documento: 'Exame' as string,
    descricao: '',
    file: null as File | null,
  });

  const pacienteConsultas = consultas.filter(c => c.paciente_id === paciente.id);
  const pacientePlanos = planos.filter(p => p.paciente_id === paciente.id);
  const pacienteReceitas = receitas.filter(r => r.paciente_id === paciente.id);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatDate = (d: string | null) => d ? format(parseISO(d), 'dd/MM/yyyy') : '—';

  const statusCls: Record<string, string> = {
    Ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Em tratamento': 'bg-blue-50 text-blue-700 border-blue-200',
    Inadimplente: 'bg-red-50 text-red-700 border-red-200',
    Inativo: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const tipoIcon = (tipo: string) => {
    if (tipo === 'Exame') return '🔬';
    if (tipo === 'Anamnese') return '📋';
    if (tipo === 'Procedimento') return '🦷';
    if (tipo === 'Prescrição') return '💊';
    if (tipo === 'Evolução') return '📝';
    return '📌';
  };

  // ── Save prontuário entry ──
  const handleSaveProntuario = async () => {
    if (!pronForm.titulo.trim()) { toast.error('Título é obrigatório'); return; }
    setSaving(true);
    const { error } = await addEntrada({
      paciente_id: paciente.id,
      tipo: pronForm.tipo,
      titulo: pronForm.titulo.trim(),
      descricao: pronForm.descricao.trim() || null,
      data_registro: pronForm.data_registro,
      dentista_id: usuario?.id || null,
    });
    if (error) toast.error('Erro ao salvar');
    else { toast.success('Registro adicionado ao prontuário'); setProntuarioOpen(false); }
    setSaving(false);
  };

  // ── Upload document ──
  const handleUpload = async () => {
    if (!docForm.file) { toast.error('Selecione um arquivo'); return; }
    setUploading(true);
    const file = docForm.file;
    const ext = file.name.split('.').pop();
    const path = `${paciente.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('paciente-documentos').upload(path, file);
    if (uploadErr) { toast.error('Erro no upload'); setUploading(false); return; }
    const { error } = await addDocumento({
      paciente_id: paciente.id,
      nome_arquivo: file.name,
      tipo_documento: docForm.tipo_documento,
      tipo_mime: file.type,
      tamanho_bytes: file.size,
      storage_path: path,
      descricao: docForm.descricao.trim() || null,
      usuario_upload_id: usuario?.id || null,
    });
    if (error) toast.error('Erro ao salvar documento');
    else { toast.success('Documento enviado'); setUploadOpen(false); setDocForm({ tipo_documento: 'Exame', descricao: '', file: null }); }
    setUploading(false);
  };

  const handleDeleteEntrada = async (e: ProntuarioEntrada) => {
    if (!await confirmDialog({ description: `Excluir "${e.titulo}"?` })) return;
    const { error } = await deleteEntrada(e.id);
    if (error) toast.error('Erro ao excluir');
    else toast.success('Registro excluído');
  };

  const handleDeleteDocumento = async (id: string, storagePath: string) => {
    if (!await confirmDialog({ description: 'Excluir documento?' })) return;
    const { error } = await deleteDocumento(id, storagePath);
    if (error) toast.error('Erro ao excluir');
    else toast.success('Documento excluído');
  };

  const handleDownloadDoc = async (storagePath: string, fileName: string) => {
    const { data } = await supabase.storage.from('paciente-documentos').createSignedUrl(storagePath, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('Erro ao gerar link');
  };

  const totalReceitas = pacienteReceitas.reduce((s, r) => s + Number(r.valor), 0);
  const totalRecebido = pacienteReceitas.filter(r => r.status === 'Pago').reduce((s, r) => s + Number(r.valor), 0);
  const totalAberto = totalReceitas - totalRecebido;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {paciente.codigo_paciente && (
              <span className="text-sm font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                #{paciente.codigo_paciente}
              </span>
            )}
            <h1 className="text-2xl font-bold text-foreground">{paciente.nome}</h1>
            <Badge variant="outline" className={statusCls[paciente.status] || ''}>{paciente.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {paciente.telefone && `${paciente.telefone} · `}
            {paciente.email || ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(paciente.whatsapp || paciente.telefone) && (
            <a
              href={formatWhatsAppLink(
                paciente.whatsapp || paciente.telefone!,
                `Olá ${paciente.nome.split(' ')[0]}, tudo bem? Aqui é da ${clinicaNome}! 😊`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp
            </a>
          )}
          <Button onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="prontuario" className="space-y-4">
        <TabsList>
          <TabsTrigger value="prontuario" className="gap-1.5">
            <ClipboardList className="h-4 w-4" /> Prontuário
          </TabsTrigger>
          <TabsTrigger value="dados" className="gap-1.5">
            <User className="h-4 w-4" /> Dados
          </TabsTrigger>
          <TabsTrigger value="consultas" className="gap-1.5">
            <Calendar className="h-4 w-4" /> Consultas
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1.5">
            <FileText className="h-4 w-4" /> Documentos
          </TabsTrigger>
          {showOdontograma && (
            <TabsTrigger value="odontograma" className="gap-1.5">
              🦷 Odontograma
            </TabsTrigger>
          )}
          <TabsTrigger value="financeiro" className="gap-1.5">
            <DollarSign className="h-4 w-4" /> Financeiro
          </TabsTrigger>
        </TabsList>

        {/* ══ PRONTUÁRIO ══ */}
        <TabsContent value="prontuario">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Prontuário Clínico</h2>
              <Button size="sm" onClick={() => {
                setPronForm({ tipo: 'Evolução', titulo: '', descricao: '', data_registro: format(new Date(), 'yyyy-MM-dd') });
                setProntuarioOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-1" /> Nova Entrada
              </Button>
            </div>

            {/* Clinical info summary */}
            {paciente.informacoes_clinicas && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Informações Clínicas Gerais</p>
                  <p className="text-sm whitespace-pre-wrap">{paciente.informacoes_clinicas}</p>
                </CardContent>
              </Card>
            )}

            {loadingPront ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : entradas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhum registro no prontuário</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Entrada" para adicionar evoluções, exames e mais</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {entradas.map(e => (
                  <Card key={e.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{tipoIcon(e.tipo)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{e.tipo}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(e.data_registro)}</span>
                            {e.dentista && (
                              <span className="text-xs text-muted-foreground">· {isOdontologia ? 'Dr(a). ' : ''}{e.dentista.nome}</span>
                            )}
                          </div>
                          <h4 className="text-sm font-medium mt-1">{e.titulo}</h4>
                          {e.descricao && (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{e.descricao}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => handleDeleteEntrada(e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══ DADOS PESSOAIS ══ */}
        <TabsContent value="dados">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Telefone', value: paciente.telefone, icon: Phone },
                  { label: 'WhatsApp', value: paciente.whatsapp, icon: Phone },
                  { label: 'E-mail', value: paciente.email, icon: Mail },
                  { label: 'Data de Nascimento', value: formatDate(paciente.data_nascimento), icon: Calendar },
                  { label: 'CPF', value: paciente.cpf },
                  { label: 'Sexo', value: paciente.sexo },
                  { label: labelProfissional, value: paciente.dentista ? `${isOdontologia ? 'Dr(a). ' : ''}${paciente.dentista.nome}` : undefined, icon: Stethoscope },
                ].map((f, i) => f.value ? (
                  <div key={i} className="flex items-center gap-2">
                    {f.icon && <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="text-muted-foreground">{f.label}:</span>
                    <span className="font-medium">{f.value}</span>
                  </div>
                ) : null)}
              </div>
              {(paciente.rua || paciente.cidade) && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Endereço:</span>
                    <span className="font-medium">
                      {[paciente.rua, paciente.numero, paciente.complemento, paciente.bairro, paciente.cidade, paciente.estado, paciente.cep]
                        .filter(Boolean).join(', ')}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ CONSULTAS ══ */}
        <TabsContent value="consultas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consultas ({pacienteConsultas.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pacienteConsultas.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Nenhuma consulta registrada</div>
              ) : (
                <ul className="divide-y">
                  {pacienteConsultas.map(c => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.tipo_procedimento}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(c.data_hora)} · {c.dentista ? `${isOdontologia ? 'Dr(a). ' : ''}${c.dentista.nome}` : ''}</p>
                      </div>
                      <Badge variant={c.status === 'Compareceu' ? 'default' : c.status === 'Faltou' ? 'destructive' : 'secondary'} className="text-xs">
                        {c.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ DOCUMENTOS ══ */}
        <TabsContent value="documentos">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Documentos & Exames</h2>
              <Button size="sm" onClick={() => { setDocForm({ tipo_documento: 'Exame', descricao: '', file: null }); setUploadOpen(true); }}>
                <Upload className="h-4 w-4 mr-1" /> Enviar Arquivo
              </Button>
            </div>
            {loadingDocs ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : documentos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhum documento enviado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documentos.map(d => (
                  <Card key={d.id} className="group">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate cursor-pointer hover:text-primary" onClick={() => handleDownloadDoc(d.storage_path, d.nome_arquivo)}>
                          {d.nome_arquivo}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs">{d.tipo_documento}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(d.created_at)}</span>
                          <span className="text-xs text-muted-foreground">{(d.tamanho_bytes / 1024).toFixed(0)} KB</span>
                        </div>
                        {d.descricao && <p className="text-xs text-muted-foreground mt-1">{d.descricao}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteDocumento(d.id, d.storage_path)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══ ODONTOGRAMA ══ */}
        {showOdontograma && (
          <TabsContent value="odontograma">
            <Odontograma pacienteId={paciente.id} />
          </TabsContent>
        )}

        {/* ══ FINANCEIRO ══ */}
        <TabsContent value="financeiro">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Total Receitas</p>
                <p className="text-xl font-bold tabular-nums mt-1">{formatCurrency(totalReceitas)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="text-xl font-bold tabular-nums mt-1 text-emerald-600">{formatCurrency(totalRecebido)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Em Aberto</p>
                <p className="text-xl font-bold tabular-nums mt-1 text-destructive">{formatCurrency(totalAberto)}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Planos de Tratamento ({pacientePlanos.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {pacientePlanos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum plano de tratamento</p>
              ) : (
                <ul className="divide-y">
                  {pacientePlanos.map(p => (
                    <li key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(p.valor_total)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.created_at)} · {isOdontologia ? 'Dr(a). ' : ''}{p.dentista?.nome}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{p.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Pagamentos ({pacienteReceitas.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {pacienteReceitas.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pagamento registrado</p>
              ) : (
                <ul className="divide-y">
                  {pacienteReceitas.map(r => (
                    <li key={r.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{r.procedimento || 'Pagamento'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.data)} · {r.forma_pagamento}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">{formatCurrency(Number(r.valor))}</p>
                        <Badge variant={r.status === 'Pago' ? 'default' : 'destructive'} className="text-[10px]">{r.status}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Nova Entrada Prontuário ── */}
      <Dialog open={prontuarioOpen} onOpenChange={setProntuarioOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Entrada no Prontuário</DialogTitle>
            <DialogDescription>Registre evoluções, exames e procedimentos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={pronForm.tipo} onValueChange={v => setPronForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_PRONTUARIO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={pronForm.data_registro} onChange={e => setPronForm(f => ({ ...f, data_registro: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={pronForm.titulo} onChange={e => setPronForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Avaliação inicial, Raio-X panorâmico..." />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={pronForm.descricao} onChange={e => setPronForm(f => ({ ...f, descricao: e.target.value }))} rows={5}
                placeholder="Descreva observações, resultados de exames, evolução clínica..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProntuarioOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveProntuario} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Upload Documento ── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
            <DialogDescription>Envie exames, laudos e outros documentos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={docForm.tipo_documento} onValueChange={v => setDocForm(f => ({ ...f, tipo_documento: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <Input type="file" onChange={e => setDocForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={docForm.descricao} onChange={e => setDocForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Raio-X panorâmico 2026" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
