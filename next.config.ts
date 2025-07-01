
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['*.cloudworkstations.dev'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
