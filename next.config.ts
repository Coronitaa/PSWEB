
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: ['*.cloudworkstations.dev'],
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
};

export default nextConfig;
