import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://img.clerk.com *;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  connect-src 'self' https://*.clerk.accounts.dev *;
  media-src 'self' blob: *;
  worker-src 'self' blob:;
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
