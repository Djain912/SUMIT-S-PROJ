import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  serverExternalPackages: ['ws', '@neondatabase/serverless', 'pdf-parse'],
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
  async redirects() {
    return [
      {
        source: '/feedback',
        destination: 'https://forms.gle/fUSrURc3w9pBePf48',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
