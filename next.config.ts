import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
