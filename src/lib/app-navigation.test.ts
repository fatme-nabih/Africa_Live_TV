import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { catalogCountryHref } from './catalog-filter-state';

// Render the actual navigation with only Next routing and the image boundary stubbed.
const requireNative = createRequire(import.meta.url);
function navigation(path: string, admin: boolean) {
  const output = ts.transpileModule(readFileSync('src/components/AppNavigation.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const testModule = { exports: {} as Record<string, unknown> };
  const requireBoundary = (name: string) => {
    if (name === 'next/navigation') return { usePathname: () => path };
    if (name === 'next/link') return { __esModule: true, default: 'a' };
    if (name === './BrandLogo') return { __esModule: true, default: 'img' };
    if (name === '@/lib/catalog-filter-state') return { catalogCountryHref };
    return requireNative(name);
  };
  compileFunction(output, ['require', 'module', 'exports'])(requireBoundary, testModule, testModule.exports);
  const Nav = testModule.exports.default as React.ComponentType<{ country: string }>;
  const Provider = testModule.exports.NavigationProvider as React.ComponentType<{ admin: boolean; children?: React.ReactNode }>;
  return renderToStaticMarkup(React.createElement(Provider, { admin }, React.createElement(Nav, { country: 'SN' })));
}

test('common navigation keeps country, identifies current page and hides administrator entry for standard users', () => {
  const html = navigation('/app', false);
  assert.match(html, /href="\/app\?country=SN"[^>]*aria-current="page"/);
  assert.match(html, /href="\/app\/live\?country=SN"/);
  assert.match(html, /href="\/account"/);
  assert.doesNotMatch(html, /href="\/admin"/);
});
test('common navigation shows administration only with server-verified capability', () => {
  assert.match(navigation('/admin', true), /href="\/admin"[^>]*aria-current="page"/);
});
