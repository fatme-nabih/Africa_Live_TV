import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildNavItems } from './shell-nav';

// Rend la vraie navigation (NavLinks) avec les entrées calculées par buildNavItems ; seul next/link est simulé.
const requireNative = createRequire(import.meta.url);
type NavProps = { items: ReturnType<typeof buildNavItems>; variant: 'header' | 'tabs'; onSearch?: () => void };
function loadNavLinks() {
  const output = ts.transpileModule(readFileSync('src/components/shell/NavLinks.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const testModule = { exports: {} as Record<string, unknown> };
  const requireBoundary = (name: string) => (name === 'next/link' ? { __esModule: true, default: 'a' } : requireNative(name));
  compileFunction(output, ['require', 'module', 'exports'])(requireBoundary, testModule, testModule.exports);
  return testModule.exports.default as React.ComponentType<NavProps>;
}
function navigation(pathname: string, admin: boolean, variant: 'header' | 'tabs' = 'header') {
  const NavLinks = loadNavLinks();
  const items = buildNavItems({ pathname, country: 'SN', admin });
  return renderToStaticMarkup(React.createElement(NavLinks, { items, variant, onSearch: variant === 'tabs' ? () => {} : undefined }));
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
test('mobile tab bar lists Radar, TV, Recherche, Compte in that order and keeps the same guarantees', () => {
  const html = navigation('/app/live', false, 'tabs');
  const labels = [...html.matchAll(/<span>([^<]+)<\/span>/g)].map(match => match[1]);
  assert.deepEqual(labels, ['Radar', 'TV', 'Recherche', 'Compte']);
  assert.match(html, /href="\/app\/live\?country=SN"[^>]*aria-current="page"/);
  assert.match(html, /<button[^>]*type="button"/);
  assert.doesNotMatch(html, /href="\/admin"/);
  assert.match(navigation('/account', true, 'tabs'), /href="\/admin"/);
});
test('both navigation bars carry the same accessible landmark name, one is hidden per breakpoint', () => {
  assert.match(navigation('/app', false, 'header'), /aria-label="Navigation principale"[^>]*class="hidden[^"]*md:flex"/);
  assert.match(navigation('/app', false, 'tabs'), /aria-label="Navigation principale"[^>]*class="md:hidden"/);
});
