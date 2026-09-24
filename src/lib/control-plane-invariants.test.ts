import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = join(sourceRoot, '..');

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

test('the historical HLS relay and its secret stay removed', () => {
  assert.equal(existsSync(join(sourceRoot, 'lib', 'hls-relay.ts')), false);
  assert.equal(
    existsSync(join(sourceRoot, 'app', 'api', 'streams', '[streamId]', 'hls', 'route.ts')),
    false,
  );
  assert.doesNotMatch(
    readFileSync(join(projectRoot, '.env.example'), 'utf8'),
    /HLS_PROXY_SECRET/,
  );
});

test('API routes cannot become media, manifest, segment, or key relays', () => {
  const apiRoot = join(sourceRoot, 'app', 'api');
  const forbiddenRoutePath =
    /(?:^|[\\/])(?:hls|manifest|manifests|playlist|playlists|segment|segments|key|keys|media-key|media-keys|relay|proxy)(?:[\\/]|$)/i;
  const forbiddenMediaResponse =
    /#EXTM3U|content-disposition|application\/(?:vnd\.apple\.mpegurl|x-mpegurl)|audio\/(?:mpegurl|x-mpegurl)|video\/mp2t|content-range|accept-ranges|new\s+ReadableStream|Readable\.toWeb|createReadStream|new\s+Response\s*\(\s*(?:upstream|response|manifest|segment|media)\.body/i;

  for (const file of sourceFiles(apiRoot).filter((path) => path.endsWith('route.ts'))) {
    const routePath = relative(apiRoot, file);
    assert.doesNotMatch(routePath, forbiddenRoutePath, `${routePath} ressemble à une route média`);
    assert.doesNotMatch(
      readFileSync(file, 'utf8'),
      forbiddenMediaResponse,
      `${routePath} contient un marqueur de réponse média`,
    );
  }
});

test('the client cannot manufacture or download an M3U playlist', () => {
  const clientRoots = [join(sourceRoot, 'app'), join(sourceRoot, 'components')];
  const forbiddenDownload =
    /content-disposition|new\s+Blob\s*\(|URL\.createObjectURL|download\s*=|["'`][^"'`\r\n]*\.m3u["'`]/i;

  for (const root of clientRoots) {
    for (const file of sourceFiles(root)) {
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        forbiddenDownload,
        `${relative(sourceRoot, file)} peut exposer un téléchargement M3U`,
      );
    }
  }
});

test('the public catalogue does not expose technical stream-status filters', () => {
  const sidebar = readFileSync(
    join(sourceRoot, 'components', 'FilterSidebar.tsx'),
    'utf8',
  );

  assert.doesNotMatch(sidebar, /catalog-status|BROWSER_OK|VLC_ONLY|OFFLINE|UNTESTED/);
});
