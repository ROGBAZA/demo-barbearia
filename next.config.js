/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['xzsltthkgkoatmchixqo.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
  // Otimizações de desempenho
  compress: true,
  productionBrowserSourceMaps: false,
  // Configurações de segurança
  poweredByHeader: false,
  // Configurações de cache
  experimental: {
    scrollRestoration: true,
  },
  // Otimizações de build
  webpack: (config, { isServer }) => {
    // Adiciona regras para otimização de imagens
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|webp|avif|ico|bmp|svg)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next',
            name: 'static/media/[name].[hash].[ext]',
          },
        },
      ],
    });

    return config;
  },
};

module.exports = nextConfig;
