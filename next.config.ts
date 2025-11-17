import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Aumentamos el timeout para dar tiempo a procesos largos como la generación de PDF
      // y el envío de correos. 5 minutos (300s) deberían ser suficientes.
      executionTimeout: 300, 
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
