// Standalone test harness. This server is never part of the Next application.
import http from 'node:http';
import path from 'node:path';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const absolute = p => path.resolve(p).replaceAll('\\', '/');
const output = await build({
  entryPoints: ['e2e/components/entry.tsx'], bundle: true, write: false,
  format: 'iife', platform: 'browser', jsx: 'automatic', logLevel: 'silent',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_LOCAL_PLAYBACK': '"false"',
    'process.env.NEXT_PUBLIC_LOCAL_DEV_MODE': '"false"',
  },
  plugins: [{ name: 'test-boundaries', setup(builder) {
    builder.onResolve({ filter: /^hls\.js$/ }, () => ({ path: 'hls', namespace: 'test' }));
    builder.onResolve({ filter: /components\/shell\/AppShell$/ }, () => ({ path: 'shell', namespace: 'test' }));
    builder.onResolve({ filter: /^next\/(link|image|navigation|dynamic)$/ }, args => ({ path: args.path, namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'tsx', resolveDir: process.cwd(), contents:
      args.path === 'hls' ? `import Real from '${absolute('node_modules/hls.js/dist/hls.mjs')}';export default class Hls extends Real {constructor(config){super(config);window.testHls=this;window.testHlsErrors=[];this.on(Real.Events.ERROR,(_,e)=>window.testHlsErrors.push({fatal:e.fatal,details:e.details,status:e.response?.code}));}}` :
      args.path === 'shell' ? 'export default function Shell({children}){return children}' :
      args.path === 'next/navigation' ? 'export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:()=>{},replace:()=>{}});' :
      args.path === 'next/dynamic' ? `import React,{useState,useEffect} from 'react';export default function dynamic(loader){let cached;return function(props){const [C,setC]=useState(()=>cached);useEffect(()=>{let alive=true;loader().then(m=>{cached=m.default;if(alive)setC(()=>cached)});return()=>{alive=false}},[]);return C?<C {...props}/>:null}}` :
      args.path === 'next/image' ? `export default function Image({fill,priority,...props}){void fill;void priority;return <img {...props}/>} ` :
      'export default function Link(props){return <a {...props}/>}'
    }));
  }}],
});
let tickerCss;
const server = http.createServer(async (request, response) => {
  if (request.url === '/ticker.css') {
    tickerCss ??= readFile('src/app/globals.css', 'utf8').then(css => postcss([tailwindcss()]).process(css, { from: absolute('src/app/globals.css') }));
    const stylesheet = await tickerCss;
    response.setHeader('Content-Type', 'text/css');
    response.end(stylesheet.css);
    return;
  }
  if (request.url === '/components.js') {
    response.setHeader('Content-Type', 'application/javascript');
    response.end(output.outputFiles[0].text);
  } else {
    response.setHeader('Content-Type', 'text/html');
    const styles = new URL(request.url, 'http://localhost').searchParams.get('kind')?.match(/^(ticker|country-grid|share)$/) ? '<link rel="stylesheet" href="/ticker.css">' : '';
    response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' + styles + '<div id="root"></div><script src="/components.js"></script>');
  }
});
server.listen(Number(process.env.COMPONENT_TEST_PORT ?? 3001), '127.0.0.1');
