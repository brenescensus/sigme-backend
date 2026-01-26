
// module.exports = nextConfig;

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
        // CORS for API routes - Allow all origins since this is a public API
        source: '/api/:path*',
        headers: [
          { 
            key: 'Access-Control-Allow-Credentials', 
            value: 'true' 
          },
          { 
            key: 'Access-Control-Allow-Origin', 
            value: '*' //  Allow all origins for public API
          },
          { 
            key: 'Access-Control-Allow-Methods', 
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' 
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
      {
        // CORS for static files (sigme.js, sigme-universal-sw.js)
        source: '/:path*.js',
        headers: [
          { 
            key: 'Access-Control-Allow-Origin', 
            value: '*' //  Allow all origins to load scripts
          },
          { 
            key: 'Access-Control-Allow-Methods', 
            value: 'GET, OPTIONS' 
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/' //  Allow service worker to control any scope
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8'
          }
        ],
      },
      {
        // Special CORS for the admin dashboard (restrict to your frontend only)
        source: '/api/admin/:path*',
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
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' 
          },
          { 
            key: 'Access-Control-Allow-Headers', 
            value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin' 
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;