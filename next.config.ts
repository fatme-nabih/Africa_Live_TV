import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://clerk.com https://*.clerk.accounts.dev https://api.clerk.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https: http:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.com wss://*.clerk.accounts.dev https: http:;
  media-src 'self' blob: https: http:;
  worker-src 'self' blob:;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()',
          }
        ],
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
  outputFileTracingExcludes: {
    '/api/open-vlc': [
      './AGENTS.md',
      './CLAUDE.md',
      './Demarrer IPTV.bat',
      './README.md',
      './drizzle.config.ts',
      './eslint.config.mjs',
      './iptv.db',
      './next.config.ts',
      './postcss.config.mjs',
      './public/**/*',
      './src/app/favicon.ico',
      './src/app/globals.css',
      './src/app/layout.tsx',
      './src/app/page.tsx',
      './src/components/**/*',
      './src/scripts/**/*',
      './tsconfig.json',
      './tsconfig.tsbuildinfo',
    ],
  },
};

export default nextConfig;
