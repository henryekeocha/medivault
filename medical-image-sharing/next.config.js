/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    typedRoutes: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure image domains for next/image
  images: {
    domains: ['localhost', 'medivault.online', 'api.medivault.online', 'medical-images-dev.s3.amazonaws.com'],
    unoptimized: process.env.NODE_ENV === 'development', // Allow unoptimized images in dev for GIFs
  },
  // Improve error handling
  onError: (error, errorInfo) => {
    console.log('Next.js error:', error);
    return error;
  },
};

module.exports = nextConfig;