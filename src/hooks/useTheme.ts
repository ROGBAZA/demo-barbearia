import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';

export function useTheme() {
  const { tenant } = useTenant();

  function hexToHsl(hex: string): string {
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
  }

  useEffect(() => {
    // Aplicar cores do tenant ou valores padrão
    const primaryColor = tenant?.cor_primaria || '#EAB308';
    const secondaryColor = tenant?.cor_secundaria || '#FFFFFF';

    const primaryHsl = hexToHsl(primaryColor);
    const secondaryHsl = hexToHsl(secondaryColor);

    // Aplicar cores nas variáveis CSS (formato HSL para Tailwind)
    document.documentElement.style.setProperty('--primary', primaryHsl);
    document.documentElement.style.setProperty('--secondary', secondaryHsl);

    // Fallback para variáveis legadas se necessário
    document.documentElement.style.setProperty('--route66-gold', primaryHsl);

    // Compatibilidade com transparências via RGB
    const primaryRgb = hexToRgb(primaryColor) || { r: 234, g: 179, b: 8 };
    document.documentElement.style.setProperty('--primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);

  }, [tenant?.cor_primaria, tenant?.cor_secundaria]);

  // Função auxiliar para converter hex para RGB
  function hexToRgb(hex: string) {
    // Remove o # se existir
    hex = hex.replace(/^#/, '');

    // Converte para valores RGB
    const bigint = parseInt(hex, 16);
    if (hex.length === 3) {
      // Formato abreviado (#RGB)
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    } else if (hex.length === 6) {
      // Formato completo (#RRGGBB)
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return { r, g, b };
    }
    return null;
  }

  // Função para ajustar o brilho de uma cor
  function adjustBrightness(color: string, percent: number) {
    const rgb = hexToRgb(color) || { r: 0, g: 0, b: 0 };

    // Ajusta o brilho
    const r = Math.max(0, Math.min(255, Math.round(rgb.r + (255 * percent / 100))));
    const g = Math.max(0, Math.min(255, Math.round(rgb.g + (255 * percent / 100))));
    const b = Math.max(0, Math.min(255, Math.round(rgb.b + (255 * percent / 100))));

    // Converte de volta para hex
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  return null;
}
