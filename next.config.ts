
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  
  async headers() {
    return [
      {
        // Apply CORS headers to all API routes
        source: '/api/:path*',
        headers: [
          { 
            key: 'Access-Control-Allow-Credentials', 
            value: 'true' 
          },
          { 
            key: 'Access-Control-Allow-Origin', 
            value: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:8080' 
          },
          { 
            key: 'Access-Control-Allow-Methods', 
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' // ✅ Added PATCH
          },
          { 
            key: 'Access-Control-Allow-Headers', 
            value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin' 
          },
          { 
            key: 'Access-Control-Max-Age', 
            value: '86400' // 24 hours
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;