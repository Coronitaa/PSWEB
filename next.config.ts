
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
        hostname: '**', // Permite cualquier hostname bajo HTTPS
      },
      {
        protocol: 'http',
        hostname: '**', // Permite cualquier hostname bajo HTTP
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Excluir 'sqlite3' y 'sqlite' del bundle del cliente.
      // Estos paquetes son para uso del lado del servidor.
      config.externals = [...(config.externals || []), 'sqlite3', 'sqlite'];
    }
    return config;
  },
};

export default nextConfig;
