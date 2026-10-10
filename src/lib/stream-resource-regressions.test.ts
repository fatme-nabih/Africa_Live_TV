import assert from 'node:assert/strict';
import test from 'node:test';
import { createCipheriv } from 'node:crypto';
import { hlsAttributes, mediaSampleEvidence, parseHlsProbeResources } from './hls-probe-resources';
import { checkHlsStream, type UpstreamFetcher } from './stream-verification';

export function syntheticTs() {
  const data = new Uint8Array(188 * 3).fill(255);
  for (let offset = 0; offset < data.length; offset += 188) data.set([0x47, 0x1f, 0xff, 0x10], offset);
  return data;
}
function response(body: BodyInit, url: string, status = 200, type = 'application/octet-stream') {
  const value = new Response(body, { status, headers: { 'content-type': type, 'access-control-allow-origin': '*' } });
  Object.defineProperty(value, 'url', { value: url }); return value;
}
async function probe(manifest: string, resource: (url: URL) => Response) {
  const fetcher: UpstreamFetcher = async url => url.pathname === '/index.m3u8' ? response(manifest, url.href, 200, 'application/vnd.apple.mpegurl') : resource(url);
  return checkHlsStream('https://media.fixture.test/index.m3u8', { timeoutMs: 200, retries: 0, origin: 'https://staging.fixture.test', fetcher });
}
test('B03: an HTTP segment of an HTTPS manifest can only qualify for VLC', async () => {
  const result = await probe('#EXTM3U\n#EXTINF:4,\nhttp://media.fixture.test/video.ts', url => response(syntheticTs(), url.href));
  assert.equal(result.available, true); assert.equal(result.mixedContent, true); assert.equal(result.playableStatus, 'VLC_ONLY');
});
test('B04: JSON disguised as video is not fresh media evidence', async () => {
  const result = await probe('#EXTM3U\n#EXTINF:4,\nvideo.ts', url => response('{"error":"unavailable"}', url.href, 200, 'video/mp2t'));
  assert.equal(result.available, false);
});
test('B05: a forbidden indispensable AES key prevents qualification', async () => {
  const result = await probe('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\n#EXTINF:4,\nvideo.ts', url => url.pathname === '/key.bin' ? response('denied', url.href, 403) : response(syntheticTs(), url.href));
  assert.equal(result.available, false);
});

test('HLS attributes, active key, explicit ranges and NONE retain the selected resource context', () => {
  assert.equal(hlsAttributes('METHOD=AES-128,URI="key,a.bin",IV=0x1').URI, 'key,a.bin');
  const parsed = parseHlsProbeResources('#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:42\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXT-X-MAP:URI="init",BYTERANGE="40@8"\n#EXT-X-KEY:METHOD=NONE\n#EXT-X-BYTERANGE:564@0\nvideo');
  assert.equal(parsed.key, undefined); assert.equal(parsed.sequence, BigInt(42));
  assert.deepEqual(parsed.initialization?.range, { length: 40, offset: 8 });
  assert.deepEqual(parsed.segment?.range, { length: 564, offset: 0 });
});
test('B04: misleading MIME, XML, text, empty and arbitrary octet-stream never qualify', async () => {
  for (const [body, type] of [['{"error":1}', 'application/json'], ['<Error/>', 'video/mp2t'], ['unavailable', 'video/mp2t'], ['', 'video/mp2t'], ['garbage', 'application/octet-stream']] as const) {
    assert.equal((await probe('#EXTM3U\n#EXTINF:4,\nvideo.ts', url => response(body, url.href, 200, type))).available, false);
  }
  assert.equal(mediaSampleEvidence(syntheticTs()), 'valid');
});
test('B05: invalid key sizes, unsupported key formats and inaccessible initialization are reviewed', async () => {
  for (const size of [0,15,17,100]) {
    const result = await probe('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXTINF:4,\nvideo.ts', url => response(url.pathname === '/key' ? new Uint8Array(size) : syntheticTs(), url.href));
    assert.equal(result.available, false);
  }
  const drm = await probe('#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="key",KEYFORMAT="vendor"\n#EXTINF:4,\nvideo.ts', url => response(syntheticTs(), url.href));
  assert.equal(drm.evidence, 'incomplete');
  const init = await probe('#EXTM3U\n#EXT-X-MAP:URI="init"\n#EXTINF:4,\nvideo.m4s', url => response('denied', url.href, 403));
  assert.equal(init.available, false);
});
test('B05: real synthetic AES-CBC segment, relative comma key, correct IV and no retained key content', async () => {
  const key = Buffer.alloc(16, 7), iv = Buffer.alloc(16); iv[15] = 42;
  const cipher = createCipheriv('aes-128-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(syntheticTs()), cipher.final()]);
  const calls: string[] = [];
  const result = await probe('#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:42\n#EXT-X-KEY:METHOD=AES-128,URI="key,a.bin"\n#EXTINF:4,\nvideo.ts', url => { calls.push(url.pathname); return response(url.pathname === '/key,a.bin' ? key : encrypted, url.href); });
  assert.equal(result.playableStatus, 'BROWSER_OK'); assert.deepEqual(calls, ['/key,a.bin','/video.ts']);
  assert.equal('key' in result, false);
});
function box(kind: string, size = 16): Buffer {
  const children = kind === 'moov' ? Buffer.concat([box('mvhd'),box('trak')]) : kind === 'moof' ? Buffer.concat([box('mfhd'),box('traf')]) : null;
  const bytes = Buffer.alloc(children ? children.length+8 : size); bytes.writeUInt32BE(bytes.length); bytes.write(kind,4);
  if (children) bytes.set(children,8);
  if (kind === 'ftyp') bytes.write('iso6',8);
  return bytes;
}
test('B05: fMP4 requires a valid initialization, including a bounded explicit range', async () => {
  const init = Buffer.concat([box('ftyp'), box('moov')]), segment = Buffer.concat([box('moof'), box('mdat')]);
  const result = await probe('#EXTM3U\n#EXT-X-MAP:URI="init",BYTERANGE="56@8"\n#EXTINF:4,\nvideo.m4s', url => {
    const value = response(url.pathname === '/init' ? init : segment, url.href, url.pathname === '/init' ? 206 : 200);
    if (url.pathname === '/init') value.headers.set('content-range', 'bytes 8-63/64'); return value;
  });
  assert.equal(result.playableStatus, 'BROWSER_OK');
  assert.equal((await probe('#EXTM3U\n#EXTINF:4,\nvideo.m4s', url => response(segment, url.href))).available, false);
});
test('B05: MAP retains its encryption key after METHOD=NONE changes the segment key', async () => {
  const result = await probe('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="init.key",IV=0x1\n#EXT-X-MAP:URI="init"\n#EXT-X-KEY:METHOD=NONE\n#EXTINF:4,\nvideo.ts',url => response('denied',url.href,403));
  assert.equal(result.available,false); assert.equal(result.httpStatus,403);
});
test('B04: ADTS needs two complete audio frames; a truncated second frame is not evidence', () => {
  const frame = Buffer.alloc(16, 0x11);
  frame.set([0xff, 0xf1, 0x50, 0x80, 0x02, 0x1f, 0xfc]);
  assert.equal(mediaSampleEvidence(Buffer.concat([frame, frame]), 'audio/aac'), 'valid');
  assert.equal(mediaSampleEvidence(frame, 'audio/aac'), 'invalid');
  assert.equal(mediaSampleEvidence(Buffer.concat([frame, frame.subarray(0, 7)]), 'audio/aac'), 'invalid');
  for (const samplingIndex of [13, 14, 15]) {
    const invalidSampling = Buffer.from(frame);
    invalidSampling[2] = (frame[2] & 0xc3) | (samplingIndex << 2);
    assert.equal(mediaSampleEvidence(Buffer.concat([invalidSampling, frame]), 'audio/aac'), 'invalid');
  }
});

test('B04: MP3 requires two complete aligned frames and empty MP4 boxes are not positive evidence', () => {
  const audio = new Uint8Array(834); audio.set([0xff,0xfb,0x90,0],0); audio.set([0xff,0xfb,0x90,0],417);
  assert.equal(mediaSampleEvidence(audio,'audio/mpeg'),'valid');
  const empty = Buffer.from([0,0,0,8,109,111,111,102,0,0,0,8,109,100,97,116]);
  assert.equal(mediaSampleEvidence(empty,'video/mp4'),'invalid');
});
test('B03/B05: HTTP or absent CORS on the AES key prevents web qualification while positive VLC evidence remains', async () => {
  const key = Buffer.alloc(16,7), iv = Buffer.alloc(16), cipher = createCipheriv('aes-128-cbc',key,iv);
  const encrypted = Buffer.concat([cipher.update(syntheticTs()),cipher.final()]);
  for (const mode of ['http','cors']) {
    const result = await probe('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXTINF:4,\nvideo.ts',url => {
      const value = response(url.pathname === '/key' ? key : encrypted, url.pathname === '/key' && mode === 'http' ? url.href.replace('https:','http:') : url.href);
      if (url.pathname === '/key' && mode === 'cors') value.headers.delete('access-control-allow-origin'); return value;
    });
    assert.equal(result.available,true); assert.equal(result.playableStatus,'VLC_ONLY');
  }
});
test('L3: deterministic unsafe transport never retains classification as a transient network issue', async () => {
  const result = await checkHlsStream('https://media.fixture.test/live.m3u8',{ timeoutMs:100,retries:2,fetcher:async()=>{ throw new Error('PRIVATE_UPSTREAM_HOST'); } });
  assert.equal(result.evidence,'incomplete'); assert.equal(result.attempts,1); assert.equal(result.temporaryFailure,false);
});
test('B05: malformed Content-Range cannot prove the indispensable initialization range', async () => {
  for (const range of ['bytes 7-62/64','bytes 8-63/32','bytes 8-7/64','invalid']) {
    const result = await probe('#EXTM3U\n#EXT-X-MAP:URI="init",BYTERANGE="56@8"\n#EXTINF:4,\nvideo.m4s',url => {
      const value = response(Buffer.concat([box('ftyp'),box('moov')]),url.href,206); value.headers.set('content-range',range); return value;
    });
    assert.equal(result.available,false); assert.equal(result.evidence,'incomplete');
  }
});
test('B03: final HTTP or missing CORS on each indispensable resource prevents web qualification', async () => {
  const init = Buffer.concat([box('ftyp'),box('moov')]), segment = Buffer.concat([box('moof'),box('mdat')]);
  for (const target of ['/index.m3u8','/init','/video.m4s']) for (const mode of ['http','cors']) {
    const fetcher: UpstreamFetcher = async url => {
      const body = url.pathname === '/index.m3u8' ? '#EXTM3U\n#EXT-X-MAP:URI="init"\n#EXTINF:4,\nvideo.m4s' : url.pathname === '/init' ? init : segment;
      const value = response(body, url.pathname === target && mode === 'http' ? url.href.replace('https:', 'http:') : url.href);
      if (url.pathname === target && mode === 'cors') value.headers.delete('access-control-allow-origin'); return value;
    };
    const result = await checkHlsStream('https://media.fixture.test/index.m3u8', { timeoutMs: 200, retries: 0, fetcher });
    assert.equal(result.available, true); assert.equal(result.playableStatus, 'VLC_ONLY');
  }
});
test('B04: ignored Range and fragmented endless bodies are sampled at 4 KiB then cancelled; body deadlines apply', async () => {
  let canceled = false;
  const result = await probe('#EXTM3U\n#EXTINF:4,\nvideo.ts', url => {
    let first = true;
    const value = new Response(new ReadableStream({ pull(controller) { controller.enqueue(first ? syntheticTs() : new Uint8Array(40000)); first = false; }, cancel() { canceled = true; } }));
    value.headers.set('access-control-allow-origin', '*'); Object.defineProperty(value, 'url', { value: url.href }); return value;
  });
  assert.equal(result.available, true); assert.equal(canceled, true);
  const start = Date.now();
  const timeout = await checkHlsStream('https://media.fixture.test/index.m3u8', { timeoutMs: 20, totalBudgetMs: 40, retries: 2, fetcher: async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('#EXTM3U\n')); }, cancel() { canceled = true; } })) });
  assert.equal(timeout.failureReason, 'TIMEOUT'); assert.ok(Date.now() - start < 1000);
});
