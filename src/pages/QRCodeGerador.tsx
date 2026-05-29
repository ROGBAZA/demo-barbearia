import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode, Copy, Check, ExternalLink } from "lucide-react";
import route66Logo from "@/assets/route66-logo.png";
import { useToast } from "@/hooks/use-toast";

import { useTenant } from "@/contexts/TenantContext";

export default function QRCodeGerador() {
    const { tenant } = useTenant();
    const appLink = tenant?.slug ? `${window.location.origin}/${tenant.slug}` : `${window.location.origin}/demo`;

    const handlePrint = () => {
        window.print();
    };

    const copyToClipboard = async (text: string, type: string) => {
        try {
            await navigator.clipboard.writeText(text);
            const { toast } = await import("@/hooks/use-toast").then(m => ({ toast: m.useToast().toast })); // Dynamic import to avoid hook rules issue if outside component or just use existing hook if available
            // Actually I should use the hook at top level
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const { toast } = useToast();
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

    const links = {
        app: appLink,
        fila: `${appLink}/chegou`,
        agendar: `${appLink}/agendar`
    };

    const handleCopy = (key: string, url: string) => {
        navigator.clipboard.writeText(url);
        setCopiedMap(prev => ({ ...prev, [key]: true }));
        toast({ title: "Link Copiado!", description: "URL transferida para área de transferência." });
        setTimeout(() => setCopiedMap(prev => ({ ...prev, [key]: false })), 2000);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* ... styles ... */}
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-content, #printable-content * {
                        visibility: visible;
                    }
                    #printable-content {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100vh;
                        visibility: visible;
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                        background-color: black !important;
                        z-index: 9999;
                    }
                    /* Remove headers/footers browser default */
                    @page {
                        size: auto;
                        margin: 0mm;
                    }
                }
                `}
            </style>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <QrCode className="h-8 w-8 text-primary" />
                        QR Code & Links
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie os pontos de acesso para seus clientes.
                    </p>
                </div>
                <Button
                    onClick={handlePrint}
                    className="bg-gradient-gold hover:bg-primary/90 text-primary-foreground font-bold shadow-gold"
                >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir Cartaz Oficial
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Links Management Card */}
                <Card className="bg-card border-border/50 h-fit order-2 lg:order-1">
                    <CardHeader>
                        <CardTitle>Links Diretos</CardTitle>
                        <CardDescription>URLs para compartilhar no WhatsApp e Redes Sociais</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Main App Link */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Página Inicial (Menu)</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono truncate text-zinc-300">
                                    {links.app}
                                </div>
                                <Button size="icon" variant="outline" onClick={() => handleCopy('app', links.app)}>
                                    {copiedMap['app'] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => window.open(links.app, '_blank')}>
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Queue Link */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Link Direto: Fila de Espera</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono truncate text-zinc-300">
                                    {links.fila}
                                </div>
                                <Button size="icon" variant="outline" onClick={() => handleCopy('fila', links.fila)}>
                                    {copiedMap['fila'] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => window.open(links.fila, '_blank')}>
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Scheduling Link */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Link Direto: Agendamento</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono truncate text-zinc-300">
                                    {links.agendar}
                                </div>
                                <Button size="icon" variant="outline" onClick={() => handleCopy('agendar', links.agendar)}>
                                    {copiedMap['agendar'] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => window.open(links.agendar, '_blank')}>
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 mt-6">
                            <p className="text-xs text-muted-foreground">
                                <strong className="text-primary">Dica:</strong> Cole estes links na bio do Instagram ou envie automaticamente pelo WhatsApp da barbearia.
                            </p>
                        </div>

                    </CardContent>
                </Card>

                {/* Preview Card */}
                <Card className="bg-gradient-card border-border/50 overflow-hidden shadow-2xl order-1 lg:order-2">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-primary" />
                            Cartaz de Balcão
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            Preview de impressão (A4). Ideal para recepção.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center p-8 bg-black/20">
                        {/* Preview em escala menor */}
                        <div className="scale-[0.4] origin-top h-[600px] w-full flex justify-center">
                            <PrintableContent link={appLink} tenant={tenant} />
                        </div>
                    </CardContent>
                </Card>
            </div>


            {/* Conteúdo Oculto (Aparece apenas na Impressão) */}
            <div id="printable-content" className="hidden">
                <PrintableContent link={appLink} tenant={tenant} />
            </div>
        </div>
    );
}

// Componente visual do Cartaz
const PrintableContent = ({ link, tenant }: { link: string, tenant: any }) => {
    return (
        <div className="w-[210mm] h-[297mm] bg-[#05070a] text-white flex flex-col items-center justify-center p-12 border-[20px] border-primary relative print:border-[20px] shadow-2xl">
            {/* Cantoneiras Decorativas */}
            <div className="absolute top-8 left-8 w-24 h-24 border-t-8 border-l-8 border-primary/50" />
            <div className="absolute top-8 right-8 w-24 h-24 border-t-8 border-r-8 border-primary/50" />
            <div className="absolute bottom-8 left-8 w-24 h-24 border-b-8 border-l-8 border-primary/50" />
            <div className="absolute bottom-8 right-8 w-24 h-24 border-b-8 border-r-8 border-primary/50" />

            <div className="mb-16 flex flex-col items-center">
                {tenant?.logo_url ? (
                    <img
                        src={tenant.logo_url}
                        alt="Logo"
                        className="w-48 h-48 mb-6 rounded-3xl object-cover border-4 border-primary/20 shadow-gold"
                    />
                ) : (
                    <div className="w-48 h-48 mb-6 rounded-3xl bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-gold">
                        <QrCode className="w-24 h-24 text-primary" />
                    </div>
                )}
                <h1
                    className="text-7xl font-black italic tracking-tighter bg-gradient-gold bg-clip-text text-transparent mb-4 text-center uppercase"
                >
                    {tenant?.nome || 'SUA BARBEARIA'}
                </h1>
                <p className="text-3xl tracking-[0.4em] text-primary uppercase font-bold">Gentlemen's Care</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-[0_0_80px_rgba(212,175,55,0.4)] mb-12">
                <QRCodeSVG
                    value={link}
                    size={500}
                    level="H"
                    includeMargin={true}
                    imageSettings={tenant?.logo_url ? {
                        src: tenant.logo_url,
                        x: undefined,
                        y: undefined,
                        height: 100,
                        width: 100,
                        excavate: true,
                    } : undefined}
                />
            </div>

            <div className="text-center space-y-6">
                <h2 className="text-5xl font-bold text-white mb-2 uppercase">Agende seu Horário</h2>
                <div className="w-32 h-2 bg-[#D4AF37] mx-auto rounded-full" />
                <p className="text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-light">
                    Aponte a câmera do seu celular para <br /> garantir seu atendimento exclusivo.
                </p>
            </div>
        </div>
    );
};
