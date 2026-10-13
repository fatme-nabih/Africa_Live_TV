import type { NextConfig } from "next";
import { CLERK_CAPTCHA_ORIGIN, clerkFrontendApiOrigin } from "./src/lib/clerk-csp";
import { editionRewrites } from "./src/lib/edition-routing";
import { enabledEditions } from "./src/lib/editions";

const isDev = process.env.NODE_ENV !== 'production';
// Domaine Clerk de l'instance utilisée (dev : *.clerk.accounts.dev ; production : clerk.africatv.sn), lu dans la clé publique.
const clerkOrigin = clerkFrontendApiOrigin(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) ?? '';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://clerk.com https://*.clerk.accounts.dev https://api.clerk.com ${clerkOrigin} ${CLERK_CAPTCHA_ORIGIN};
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
  frame-src 'self' ${CLERK_CAPTCHA_ORIGIN};
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  experimental: {
    // Les pages vivent sous app/[edition] : une adresse inconnue n'a pas de layout racine commun (not-found.md).
    globalNotFound: true,
  },
  // Éditions linguistiques : adresses visibles inchangées, réécriture interne vers app/[edition] (EDI-103).
  async rewrites() {
    return editionRewrites(enabledEditions());
  },
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
      {
        // Service worker hors-ligne (UX-504) : jamais mis en cache, pour que chaque version soit prise aussitôt.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
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
      './src/app/[edition]/layout.tsx',
      './src/app/[edition]/page.tsx',
      './src/components/**/*',
      './src/scripts/**/*',
      './tsconfig.json',
      './tsconfig.tsbuildinfo',
    ],
  },
};

export default nextConfig;
