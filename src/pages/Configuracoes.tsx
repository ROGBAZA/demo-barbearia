
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Clock,
  Save,
  Palette,
  Image as ImageIcon,
  Building2,
  CalendarDays,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useConfiguracoes, useUpdateConfiguracoes } from '@/hooks/useDatabase';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ImageUpload';
import { useTenant } from '@/contexts/TenantContext';
import StripePricing from '@/components/StripePricing';
import { CustomQRCode } from '@/components/CustomQRCode';
import { supabase } from '@/integrations/supabase/client';

interface ConfigForm {
  nome_barbearia: string;
  endereco: string;
  telefone: string;
  email: string;
  horario_abertura: string;
  horario_fechamento: string;
  dias_funcionamento: number[];
  logo_url?: string;
  banner_url?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  fonte_primaria?: string;
}

const fontesDisponiveis = [
  { nome: 'Inter (Moderno)', value: 'Inter' },
  { nome: 'Montserrat (Elegante)', value: 'Montserrat' },
  { nome: 'Playfair Display (Premium)', value: 'Playfair Display' },
  { nome: 'Oswald (Forte)', value: 'Oswald' },
  { nome: 'Roboto (Clássico)', value: 'Roboto' },
];

const diasSemana = [
  { id: 0, nome: 'Dom' },
  { id: 1, nome: 'Seg' },
  { id: 2, nome: 'Ter' },
  { id: 3, nome: 'Qua' },
  { id: 4, nome: 'Qui' },
  { id: 5, nome: 'Sex' },
  { id: 6, nome: 'Sáb' },
];

const coresPredefinidas = [
  { nome: 'Ouro', cor: '#EAB308' },
  { nome: 'Vermelho', cor: '#EF4444' },
  { nome: 'Azul', cor: '#3B82F6' },
  { nome: 'Verde', cor: '#10B981' },
  { nome: 'Roxo', cor: '#8B5CF6' },
  { nome: 'Rosa', cor: '#EC4899' },
  { nome: 'Laranja', cor: '#F97316' },
  { nome: 'Ciano', cor: '#06B6D4' },
];

export default function Configuracoes() {
  const { toast } = useToast();
  const { tenant } = useTenant();
  const { data: config, isLoading } = useConfiguracoes();
  const updateConfiguracoes = useUpdateConfiguracoes();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      const verifySession = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('verify-stripe-session', {
            body: { sessionId }
          });

          if (error) throw error;

          if (data?.success) {
            toast({
              title: "🎉 Assinatura Ativa!",
              description: "Seu Plano Profissional foi confirmado e ativado com sucesso!",
              className: "bg-primary text-black font-bold border-none"
            });

            // Recarregar a página para aplicar limites
            setTimeout(() => {
              window.location.href = window.location.pathname;
            }, 3000);
          }
        } catch (err) {
          console.error('Erro ao verificar sessão:', err);
        }
      };

      verifySession();
    }
  }, [searchParams]);

  const [formData, setFormData] = useState<ConfigForm>({
    nome_barbearia: '',
    endereco: '',
    telefone: '',
    email: '',
    horario_abertura: '08:00',
    horario_fechamento: '18:00',
    dias_funcionamento: [1, 2, 3, 4, 5, 6],
    logo_url: '',
    banner_url: '',
    cor_primaria: '#EAB308',
    cor_secundaria: '#000000',
    fonte_primaria: 'Inter'
  });

  useEffect(() => {
    if (config) {
      setFormData({
        nome_barbearia: config.nome_barbearia || '',
        endereco: config.endereco || '',
        telefone: config.telefone || '',
        email: config.email || '',
        horario_abertura: config.horario_abertura || '08:00',
        horario_fechamento: config.horario_fechamento || '18:00',
        dias_funcionamento: config.dias_funcionamento || [1, 2, 3, 4, 5, 6],
        logo_url: config.logo_url || tenant?.logo_url || '',
        banner_url: config.banner_url || tenant?.banner_url || '',
        cor_primaria: tenant?.cor_primaria || '#EAB308',
        cor_secundaria: tenant?.cor_secundaria || '#000000',
        fonte_primaria: config.fonte_primaria || tenant?.fonte_primaria || 'Inter'
      });
    }
  }, [config, tenant]);

  const hexToHsl = (hex: string): string => {
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    } else {
      s = 0;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) {
      toast({ title: 'Erro de Identificação', description: 'Tenant não carregado.', variant: 'destructive' });
      return;
    }

    try {
      const {
        cor_primaria,
        cor_secundaria,
      } = formData;

      await updateConfiguracoes.mutateAsync({
        ...formData
      });

      // Aplicar cores imediatamente no CSS root
      if (cor_primaria) {
        document.documentElement.style.setProperty('--primary', hexToHsl(cor_primaria));
      }
      if (cor_secundaria) {
        document.documentElement.style.setProperty('--secondary', hexToHsl(cor_secundaria));
      }

      toast({
        title: 'Sistema Sincronizado',
        description: 'Configurações salvas! Recarregue a página para ver todas as mudanças.'
      });

      // Recarregar após 2 segundos
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Falha na Sincronização', description: error.message || 'Erro ao salvar dados.', variant: 'destructive' });
    }
  };

  const handleDiaChange = (diaId: number, checked: boolean) => {
    let newDias = checked
      ? [...formData.dias_funcionamento, diaId].sort()
      : formData.dias_funcionamento.filter(d => d !== diaId);
    setFormData({ ...formData, dias_funcionamento: newDias });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <Skeleton className="h-48 w-full rounded-[3rem] bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-80 rounded-3xl bg-white/5" />
          <Skeleton className="h-80 rounded-3xl bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header com Badge de Segurança Premium */}
      <div className="relative overflow-hidden bg-black/40 border border-white/5 rounded-[3rem] p-8 md:p-12 backdrop-blur-3xl shadow-2xl flex flex-col md:block">
        <div className="md:absolute md:top-0 md:right-0 md:p-8 mb-6 md:mb-0 self-start">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
            <ShieldCheck className="w-3 h-3" />
            Isolamento SaaS Ativado
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-gold/20 shrink-0">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">Painel de Controle</h1>
            <p className="text-muted-foreground mt-1 font-medium italic opacity-70">Gerencie sua identidade digital e operação</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Tabs defaultValue={searchParams.get('tab') || 'geral'} className="space-y-8" onValueChange={handleTabChange}>
          <TabsList className="flex md:grid md:grid-cols-4 bg-white/5 border border-white/10 p-1 rounded-2xl h-auto overflow-x-auto no-scrollbar whitespace-nowrap">
            <TabsTrigger value="geral" className="flex-1 min-w-[100px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black py-4 md:py-2">
              <Building2 className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="visual" className="flex-1 min-w-[100px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black py-4 md:py-2">
              <Palette className="h-4 w-4 mr-2" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="horarios" className="flex-1 min-w-[100px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black py-4 md:py-2">
              <Clock className="h-4 w-4 mr-2" />
              Horários
            </TabsTrigger>
            <TabsTrigger value="assinatura" className="flex-1 min-w-[100px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black py-4 md:py-2">
              <Zap className="h-4 w-4 mr-2" />
              Assinatura
            </TabsTrigger>
          </TabsList>

          {/* ABA GERAL */}
          <TabsContent value="geral" className="space-y-6">
            <Card className="bg-black/60 border-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informações da Barbearia
                </CardTitle>
                <CardDescription>Dados básicos do seu estabelecimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">Nome da Barbearia</Label>
                    <Input
                      value={formData.nome_barbearia}
                      onChange={(e) => setFormData({ ...formData, nome_barbearia: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Ex: Barbearia Elite"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="contato@barbearia.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Telefone</Label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="(11) 98765-4321"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Endereço</Label>
                    <Input
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Rua Principal, 123"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <CustomQRCode
              url={`${window.location.origin}/t/${tenant?.slug || ''}`}
              size={300}
            />
          </TabsContent>

          {/* ABA VISUAL */}
          <TabsContent value="visual" className="space-y-6">
            <Card className="bg-black/60 border-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Identidade Visual
                </CardTitle>
                <CardDescription>Logo, banner e cores da sua marca</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ImageUpload
                    currentImage={formData.logo_url}
                    onImageUploaded={(url) => setFormData({ ...formData, logo_url: url })}
                    bucket="company-assets"
                    folder="branding"
                    label="Logo"
                    aspectRatio="1/1"
                  />

                  <ImageUpload
                    currentImage={formData.banner_url}
                    onImageUploaded={(url) => setFormData({ ...formData, banner_url: url })}
                    bucket="company-assets"
                    folder="branding"
                    label="Banner"
                    aspectRatio="16/9"
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <Label className="text-white mb-4 block">Cor Primária</Label>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-4">
                      {coresPredefinidas.map((c) => (
                        <button
                          key={c.cor}
                          type="button"
                          onClick={() => setFormData({ ...formData, cor_primaria: c.cor })}
                          className={`h-12 rounded-xl border-2 transition-all ${formData.cor_primaria === c.cor ? 'border-white scale-110' : 'border-white/20'
                            }`}
                          style={{ backgroundColor: c.cor }}
                          title={c.nome}
                        />
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <Input
                        type="color"
                        value={formData.cor_primaria}
                        onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                        className="w-20 h-12 cursor-pointer"
                      />
                      <Input
                        value={formData.cor_primaria}
                        onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                        className="bg-white/5 border-white/10 text-white font-mono"
                        placeholder="#EAB308"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white mb-4 block">Cor Secundária</Label>
                    <div className="flex gap-3">
                      <Input
                        type="color"
                        value={formData.cor_secundaria}
                        onChange={(e) => setFormData({ ...formData, cor_secundaria: e.target.value })}
                        className="w-20 h-12 cursor-pointer"
                      />
                      <Input
                        value={formData.cor_secundaria}
                        onChange={(e) => setFormData({ ...formData, cor_secundaria: e.target.value })}
                        className="bg-white/5 border-white/10 text-white font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-4 block">Fonte Principal</Label>
                  <select
                    value={formData.fonte_primaria}
                    onChange={(e) => setFormData({ ...formData, fonte_primaria: e.target.value })}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl text-white px-4 focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="" className="bg-zinc-900">Padrão do Sistema</option>
                    {fontesDisponiveis.map(f => (
                      <option key={f.value} value={f.value} className="bg-zinc-900">{f.nome}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-2 italic px-1">
                    *A fonte será aplicada em todo o sistema após salvar.
                  </p>
                </div>

                <div className="overflow-x-auto pb-4 custom-scrollbar">
                  <div className="min-w-[800px] rounded-[2.5rem] border border-white/5 bg-black/40 overflow-hidden">
                    <div className="p-6">
                      <p className="text-sm text-muted-foreground mb-4">Preview das cores:</p>
                      <div className="flex gap-4">
                        <div className="flex-1 h-20 rounded-xl" style={{ backgroundColor: formData.cor_primaria }} />
                        <div className="flex-1 h-20 rounded-xl" style={{ backgroundColor: formData.cor_secundaria }} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA HORÁRIOS */}
          <TabsContent value="horarios" className="space-y-6">
            <Card className="bg-black/60 border-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Horário de Funcionamento
                </CardTitle>
                <CardDescription>Defina quando sua barbearia está aberta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">Abertura</Label>
                    <Input
                      type="time"
                      value={formData.horario_abertura}
                      onChange={(e) => setFormData({ ...formData, horario_abertura: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Fechamento</Label>
                    <Input
                      type="time"
                      value={formData.horario_fechamento}
                      onChange={(e) => setFormData({ ...formData, horario_fechamento: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white">Dias de Funcionamento</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {diasSemana.map((dia) => (
                      <div key={dia.id} className="flex flex-col items-center gap-2">
                        <Checkbox
                          id={`dia-${dia.id}`}
                          checked={formData.dias_funcionamento.includes(dia.id)}
                          onCheckedChange={(checked) => handleDiaChange(dia.id, checked as boolean)}
                          className="border-white/20"
                        />
                        <label
                          htmlFor={`dia-${dia.id}`}
                          className="text-xs font-bold text-white cursor-pointer"
                        >
                          {dia.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assinatura" className="space-y-6">
            <StripePricing />
          </TabsContent>
        </Tabs>

        {/* Botões de Ação Global (Aparecem apenas se não estiver na aba de assinatura) */}
        {!searchParams.get('tab') || searchParams.get('tab') !== 'assinatura' ? (
          <div className="flex justify-end gap-4 mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
              className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateConfiguracoes.isPending}
              className="h-14 px-10 bg-primary text-black font-black rounded-2xl shadow-lg hover:scale-105 transition-all"
            >
              {updateConfiguracoes.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
}