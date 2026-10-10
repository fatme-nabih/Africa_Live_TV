import { test, expect } from '@playwright/test';
import { build, type Plugin } from 'esbuild';
import { createRequire } from 'node:module';
import { compileFunction } from 'node:vm';
import path from 'node:path';

const nativeRequire = createRequire(path.resolve('package.json'));

async function accountFixture(local: boolean, mode: 'development' | 'production') {
  const boundary = (server: boolean): Plugin => ({
    name: 'test-clerk-loading-boundary',
    setup(builder) {
      builder.onResolve({ filter: /^@clerk\/nextjs$/ }, () => ({ path: 'clerk', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
        loader: 'tsx', resolveDir: process.cwd(),
        // Clerk's server instance is not loaded; a warm browser can already be loaded.
        contents: server ? 'export function UserButton(){return null}' : `
          import React from 'react';
          export function UserButton(){
            const [open,setOpen]=React.useState(false);
            return <div data-clerk-component="UserButton">
              <button onClick={()=>setOpen(!open)} aria-label="Ouvrir le menu utilisateur">Compte</button>
              {open && <p>Mon profil</p>}
            </div>;
          }`,
      }));
    },
  });
  const common = {
    bundle: true, write: false as const, jsx: 'automatic' as const, logLevel: 'silent' as const,
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.NEXT_PUBLIC_LOCAL_DEV_MODE': JSON.stringify(String(local)),
    },
  };
  const server = await build({
    ...common, platform: 'node', format: 'cjs', external: ['react', 'react-dom/server', 'react/jsx-runtime'],
    plugins: [boundary(true)],
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { renderToString } from 'react-dom/server';
      import Controls from './src/components/LocalAccountControls';
      export const html=renderToString(<Controls/>);`,
    },
  });
  const fixtureModule = { exports: {} as { html: string } };
  compileFunction(server.outputFiles[0].text, ['require', 'module', 'exports'])(nativeRequire, fixtureModule, fixtureModule.exports);
  const client = await build({
    ...common, platform: 'browser', format: 'iife', plugins: [boundary(false)],
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { hydrateRoot } from 'react-dom/client';
      import Controls from './src/components/LocalAccountControls';
      window.accountHydrationErrors=[];
      hydrateRoot(document.getElementById('root'),<Controls/>,{
        onRecoverableError:error=>window.accountHydrationErrors.push(error.message)
      });`,
    },
  });
  return { html: fixtureModule.exports.html, script: client.outputFiles[0].text };
}

for (const scenario of [
  { local: false, mode: 'development', badge: false },
  { local: true, mode: 'development', badge: true },
  { local: true, mode: 'production', badge: false },
] as const) {
  test(`account controls hydrate with warm Clerk (local=${scenario.local}, ${scenario.mode})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    const fixture = await accountFixture(scenario.local, scenario.mode);
    await page.setContent(`<!doctype html><div id="root">${fixture.html}</div>`);
    await page.addScriptTag({ content: fixture.script });
    if (scenario.badge) {
      await expect(page.getByText('Version locale', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ouvrir le menu utilisateur' })).toHaveCount(0);
    } else {
      await page.getByRole('button', { name: 'Ouvrir le menu utilisateur' }).click();
      await expect(page.getByText('Mon profil', { exact: true })).toBeVisible();
      await expect(page.getByText('Version locale', { exact: true })).toHaveCount(0);
    }
    expect(await page.evaluate(() => (window as unknown as { accountHydrationErrors: string[] }).accountHydrationErrors)).toEqual([]);
    expect(errors).toEqual([]);
  });
}
