// Test-only module loader: run actual handlers while replacing trusted boundaries.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
const nativeRequire = createRequire(import.meta.url);
type Exports = Record<string, unknown>;
export function loadSource(entry: string, mocks: Record<string, Exports>) {
  const root = path.resolve('src'), cache = new Map<string, Exports>();
  function load(file: string): Exports {
    if (cache.has(file)) return cache.get(file)!;
    const testModule = { exports: {} as Exports }; cache.set(file, testModule.exports);
    const output = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const requireSource = (specifier: string) => {
      const local = specifier.startsWith('@/') ? path.resolve(root, specifier.slice(2)) : specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier) : null;
      const key = local ? '@/' + path.relative(root, local).replaceAll('\\','/') : specifier;
      if (Object.hasOwn(mocks, key)) return mocks[key];
      if (!local) {
        if (specifier.startsWith('@clerk/') || specifier === 'server-only') throw new Error('Unmocked identity boundary');
        return nativeRequire(specifier);
      }
      const target = [local + '.ts', local + '.tsx', path.join(local, 'index.ts')].find(existsSync);
      if (!target) throw new Error('Missing source dependency: ' + specifier);
      return load(target);
    };
    compileFunction(output, ['require','module','exports'], { filename: file })(requireSource, testModule, testModule.exports);
    return testModule.exports;
  }
  return load(path.resolve(root, entry));
}
