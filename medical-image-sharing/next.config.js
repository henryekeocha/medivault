/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001/api',
    NEXT_PUBLIC_WS_URL: 'ws://127.0.0.1:3001',
    BACKEND_URL: 'http://127.0.0.1:3001',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    
    // AWS Configuration
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    NEXT_PUBLIC_S3_BUCKET: process.env.NEXT_PUBLIC_S3_BUCKET || 'medical-images-dev',
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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        process: require.resolve('process/browser'),
      };
      config.plugins = [
        ...config.plugins,
        new (require('webpack')).ProvidePlugin({
          process: 'process/browser',
        }),
      ];
    }
    return config;
  },
  // Configure image domains for next/image
  images: {
    domains: ['localhost', 'medivault.online', 'api.medivault.online', 'medical-images-dev.s3.amazonaws.com'],
    unoptimized: process.env.NODE_ENV === 'development', // Allow unoptimized images in dev for GIFs
  },
  // Add headers configuration for CORS
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Allow all origins for development
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
  // Add API proxy configuration
  async rewrites() {
    console.log('[Next.js Config] Setting up API rewrites');
    
    return [
      // Direct passthrough to backend for debugging/development
      {
        source: '/direct-api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
      
      // 2FA Auth routes
      {
        source: '/api/auth/send-code',
        destination: 'http://127.0.0.1:3001/api/auth/send-code',
      },
      {
        source: '/api/auth/verify-code',
        destination: 'http://127.0.0.1:3001/api/auth/verify-code',
      },
      
      // Auth sync routes
      {
        source: '/api/auth/sync/:path*',
        destination: 'http://127.0.0.1:3001/api/auth/sync/:path*',
      },
      
      // Backend API routes - forcing IPv4
      {
        source: '/api/non-auth/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
      
      // Generic API passthrough
      {
        source: '/api/backend/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
      
      // Specific API routes that need proxying
      {
        source: '/api/images/:path*',
        destination: 'http://127.0.0.1:3001/api/images/:path*',
      },
      {
        source: '/api/users/:path*',
        destination: 'http://127.0.0.1:3001/api/users/:path*',
      },
      {
        source: '/api/files/:path*',
        destination: 'http://127.0.0.1:3001/api/files/:path*',
      },
      
      // v1 API routes - these map frontend v1 routes to backend without the v1 prefix
      {
        source: '/api/v1/analytics/:path*',
        destination: 'http://127.0.0.1:3001/api/analytics/:path*',
      },
      {
        source: '/api/v1/appointments/:path*',
        destination: 'http://127.0.0.1:3001/api/appointments/:path*',
      },
      {
        source: '/api/v1/notifications',
        destination: 'http://127.0.0.1:3001/api/notifications',
      },
      {
        source: '/api/v1/notifications/:path*',
        destination: 'http://127.0.0.1:3001/api/notifications/:path*',
      },
      {
        source: '/api/v1/provider/:path*',
        destination: 'http://127.0.0.1:3001/api/v1/providers/:path*',
      },
      {
        source: '/api/v1/patient/:path*',
        destination: 'http://127.0.0.1:3001/api/patient/:path*',
      },
    ];
  },
  // Explicitly define the source directory
  distDir: '.next',
  cleanDistDir: true
};

module.exports = nextConfig;