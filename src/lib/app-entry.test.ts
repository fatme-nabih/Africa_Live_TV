import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const requireNative = createRequire(import.meta.url);
function loadComponent(entry: string, boundaries: Record<string, unknown>) {
  const output = ts.transpileModule(readFileSync(entry, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const testModule = { exports: {} as Record<string, unknown> };
  const requireBoundary = (name: string) => {
    if (name.endsWith('.css')) return {};
    if (Object.hasOwn(boundaries, name)) return boundaries[name];
    return requireNative(name);
  };
  compileFunction(output, ['require', 'module', 'exports'])(requireBoundary, testModule, testModule.exports);
  return testModule.exports.default;
}

test('Clerk fallback after sign-in/sign-up is dashboard; explicit deep-link redirections remain SDK-owned', () => {
  // UX-603 : ClerkProvider vit dans le layout du groupe (clerk) (app, compte, admin, tarifs, connexion), plus dans le layout racine.
  const Layout = loadComponent('src/app/(clerk)/layout.tsx', {
    '@/lib/local-dev': { isLocalDevMode: () => false }, '@clerk/nextjs': { ClerkProvider: 'clerk-provider' },
  }) as (props: { children: string }) => React.ReactElement<Record<string, unknown>>;
  const provider = Layout({ children: 'app' });
  assert.equal(provider.type, 'clerk-provider');
  assert.equal(provider.props.children, 'app');
  assert.equal(provider.props.signInFallbackRedirectUrl, '/app/live');
  assert.equal(provider.props.signUpFallbackRedirectUrl, '/app/live');
  assert.equal(provider.props.signInForceRedirectUrl, undefined);
  assert.equal(provider.props.signUpForceRedirectUrl, undefined);
});
test('completed checkout renders dashboard destination without submitting a payment', () => {
  const Success = loadComponent('src/app/(clerk)/pricing/success/SuccessClient.tsx', {
    react: { ...React, useReducer: () => [{ tag: 'done', status: 'completed' }, () => {}], useEffect: () => {} },
    'next/link': { __esModule: true, default: 'a' },
    'next/navigation': { useSearchParams: () => new URLSearchParams('order_id=synthetic') },
    '@/lib/payment-contracts': { checkoutStatusResponseSchema: {} },
  }) as React.ComponentType;
  const html = renderToStaticMarkup(React.createElement(Success));
  assert.match(html, /Paiement réussi/);
  assert.match(html, /href="\/app\/live"/);
  assert.match(html, /Ouvrir le dashboard/);
});
