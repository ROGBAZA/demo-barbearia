import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, QrCode, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';

interface CustomQRCodeProps {
  url: string;
  size?: number;
}

export function CustomQRCode({ url, size = 300 }: CustomQRCodeProps) {
  const { toast } = useToast();
  const { tenant } = useTenant();
  const qrRef = useRef<HTMLDivElement>(null);
  const [incluirLogo, setIncluirLogo] = useState(true);

  // Cores do tenant ou padrão
  const corPrimaria = tenant?.cor_primaria || '#EAB308';
  const corFundo = '#FFFFFF';
  const logoUrl = tenant?.logo_url;

  const downloadQRCode = (formato: 'png' | 'svg') => {
    try {
      if (formato === 'svg') {
        // Download SVG
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `qrcode-${tenant?.slug || 'barbearia'}.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(svgUrl);
      } else {
        // Download PNG
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Alta qualidade
        const scale = 4;
        canvas.width = size * scale;
        canvas.height = size * scale;

        const img = new Image();
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          if (ctx) {
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
              if (blob) {
                const pngUrl = URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = pngUrl;
                downloadLink.download = `qrcode-${tenant?.slug || 'barbearia'}.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(pngUrl);
              }
            });
          }
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }

      toast({
        title: '✅ QR Code Baixado',
        description: `Arquivo ${formato.toUpperCase()} salvo com sucesso!`
      });
    } catch (error) {
      console.error('Erro ao baixar QR Code:', error);
      toast({
        title: 'Erro ao baixar',
        description: 'Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="bg-black/60 border-white/5">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          QR Code Premium Personalizado
        </CardTitle>
        <CardDescription>
          QR Code com as cores e logo da sua barbearia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview do QR Code */}
        <div className="flex flex-col items-center gap-4">
          <div 
            ref={qrRef}
            className="p-8 bg-white rounded-[2rem] shadow-2xl border-4"
            style={{ borderColor: corPrimaria }}
          >
            <QRCodeSVG
              value={url}
              size={size}
              bgColor={corFundo}
              fgColor={corPrimaria}
              level="H"
              includeMargin={false}
              imageSettings={
                incluirLogo && logoUrl
                  ? {
                      src: logoUrl,
                      height: size * 0.2,
                      width: size * 0.2,
                      excavate: true,
                    }
                  : undefined
              }
            />
          </div>

          {/* Controles */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIncluirLogo(!incluirLogo)}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
              disabled={!logoUrl}
            >
              <Palette className="h-4 w-4 mr-2" />
              {incluirLogo ? 'Remover' : 'Adicionar'} Logo
            </Button>
          </div>

          {/* Botões de Download */}
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              onClick={() => downloadQRCode('png')}
              className="flex-1 bg-primary text-black font-bold hover:bg-primary/90"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar PNG (Alta Qualidade)
            </Button>
            <Button
              type="button"
              onClick={() => downloadQRCode('svg')}
              variant="outline"
              className="flex-1 border-primary text-primary hover:bg-primary/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar SVG (Vetorial)
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
          <p className="text-xs text-primary/80 text-center">
            💡 <strong>Dica:</strong> O formato SVG é ideal para impressão em grandes dimensões, 
            enquanto PNG é perfeito para uso digital e redes sociais.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
