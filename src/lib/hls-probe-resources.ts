export type ByteRange = { offset: number; length: number };
export type HlsResource = { uri: string; range?: ByteRange };
export type HlsKey = HlsResource & { method: string; format: string; iv?: string };
export type HlsProbeResources = {
  variant?: string; segment?: HlsResource; key?: HlsKey; initialization?: HlsResource & { key?: HlsKey };
  sequence: bigint; incomplete: boolean;
};

// HLS quoted attribute values may contain commas; splitting on commas loses URIs.
export function hlsAttributes(source: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))(?:,|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) attributes[match[1]] = match[2] ?? match[3];
  return attributes;
}
function range(value: string | undefined): ByteRange | undefined {
  if (!value) return undefined;
  const match = /^(\d+)@(\d+)$/.exec(value);
  if (!match) throw new Error('UNSUPPORTED_HLS_BYTE_RANGE');
  const length = Number(match[1]), offset = Number(match[2]);
  if (!Number.isSafeInteger(length) || length <= 0 || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length + offset)) throw new Error('INVALID_HLS_BYTE_RANGE');
  return { length, offset };
}
export function parseHlsProbeResources(manifest: string): HlsProbeResources {
  const result: HlsProbeResources = { sequence: BigInt(0), incomplete: false };
  let variantPending = false, segmentRange: ByteRange | undefined;
  const lines = manifest.split(/\r?\n/).map(line => line.trim());
  for (const line of lines) {
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      variantPending = true;
      const attrs = hlsAttributes(line.slice(line.indexOf(':') + 1));
      // A separate rendition requires its own probe; conservative review until supported.
      if (attrs.AUDIO && lines.some(value => value.startsWith('#EXT-X-MEDIA:') && hlsAttributes(value.slice(value.indexOf(':') + 1))['GROUP-ID'] === attrs.AUDIO && hlsAttributes(value.slice(value.indexOf(':') + 1)).URI)) result.incomplete = true;
    } else if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
      const value = line.slice(line.indexOf(':') + 1);
      if (!/^\d{1,39}$/.test(value)) throw new Error('INVALID_HLS_SEQUENCE');
      result.sequence = BigInt(value);
    } else if (line.startsWith('#EXT-X-KEY:')) {
      const attrs = hlsAttributes(line.slice(line.indexOf(':') + 1));
      result.key = attrs.METHOD === 'NONE' ? undefined : { uri: attrs.URI ?? '', method: attrs.METHOD ?? '', format: attrs.KEYFORMAT ?? 'identity', iv: attrs.IV };
    } else if (line.startsWith('#EXT-X-MAP:')) {
      const attrs = hlsAttributes(line.slice(line.indexOf(':') + 1));
      result.initialization = { uri: attrs.URI ?? '', range: range(attrs.BYTERANGE),key:result.key ? { ...result.key } : undefined };
    } else if (line.startsWith('#EXT-X-BYTERANGE:')) segmentRange = range(line.slice(line.indexOf(':') + 1));
    else if (line && !line.startsWith('#')) {
      if (variantPending) result.variant = line;
      else result.segment = { uri: line, range: segmentRange };
      return result;
    }
  }
  return result;
}

export type MediaEvidence = 'valid' | 'invalid' | 'incomplete';
export function mediaSampleEvidence(bytes: Uint8Array, contentType = '', initialization = false): MediaEvidence {
  if (!bytes.length) return 'invalid';
  const prefix = new TextDecoder().decode(bytes.subarray(0, 128)).trimStart();
  if (/^(?:[\[{<]|(?:error|unavailable|forbidden|not found)\b)/i.test(prefix) || /(?:json|text\/|xml)/i.test(contentType)) return 'invalid';
  if (!initialization && bytes.length >= 188 * 3) {
    const packet = (offset: number) => bytes[offset] === 0x47 && (bytes[offset + 3] & 0x30) !== 0;
    if (packet(0) && packet(188) && packet(376)) return 'valid';
  }
  const boxes = new Map<string,{ offset:number; size:number }>();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset + 8 <= bytes.length;) {
    const size = view.getUint32(offset);
    const kind = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (size < 8 || !/^[a-z0-9 ]{4}$/i.test(kind)) break;
    boxes.set(kind,{ offset,size });
    if (size > bytes.length - offset) break; // Prefix only; never claim full decoding.
    offset += size;
  }
  const children = (parent: { offset:number;size:number }|undefined) => {
    const found: string[] = [];
    if (!parent) return found;
    for (let offset = parent.offset+8; offset+8 <= Math.min(bytes.length,parent.offset+parent.size);) {
      const size = view.getUint32(offset), kind = String.fromCharCode(...bytes.subarray(offset+4,offset+8));
      if (size < 8 || size > parent.offset+parent.size-offset) break;
      found.push(kind); offset += size;
    }
    return found;
  };
  const ftyp = boxes.get('ftyp'), moof = boxes.get('moof'), mdat = boxes.get('mdat');
  if (initialization && ftyp && ftyp.size >= 16 && /^[a-z0-9 ]{4}$/i.test(String.fromCharCode(...bytes.subarray(ftyp.offset+8,ftyp.offset+12))) && children(boxes.get('moov')).includes('trak')) return 'valid';
  if (!initialization && moof && mdat && mdat.size > 8 && children(moof).includes('mfhd') && children(moof).includes('traf')) return 'valid';
  // ADTS AAC and MPEG audio require a second complete frame, not just magic bytes.
  const adtsFrame = (offset: number) => {
    if (offset + 7 > bytes.length || bytes[offset] !== 0xff || (bytes[offset + 1] & 0xf6) !== 0xf0 || ((bytes[offset + 2] >> 2) & 15) >= 13) return 0;
    const headerSize = (bytes[offset + 1] & 1) === 1 ? 7 : 9;
    const size = ((bytes[offset + 3] & 3) << 11) | (bytes[offset + 4] << 3) | (bytes[offset + 5] >> 5);
    return size > headerSize && offset + size <= bytes.length ? size : 0;
  };
  const firstAdtsFrame = !initialization ? adtsFrame(0) : 0;
  if (firstAdtsFrame && adtsFrame(firstAdtsFrame)) return 'valid';
  const mpegFrame = (offset:number) => {
    if (offset+4 > bytes.length || bytes[offset] !== 0xff || (bytes[offset+1]&0xe0) !== 0xe0) return 0;
    const version = (bytes[offset+1]>>3)&3, layer = (bytes[offset+1]>>1)&3, rate = (bytes[offset+2]>>2)&3, index = bytes[offset+2]>>4;
    if (version === 1 || layer !== 1 || rate === 3 || index === 0 || index === 15) return 0;
    const bitrate = (version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[index]*1000;
    const sampling = [44100,48000,32000][rate]/(version === 3 ? 1 : version === 2 ? 2 : 4);
    return Math.floor((version === 3 ? 144 : 72)*bitrate/sampling) + ((bytes[offset+2]>>1)&1);
  };
  const firstFrame = !initialization ? mpegFrame(0) : 0;
  if (firstFrame && mpegFrame(firstFrame) && firstFrame+mpegFrame(firstFrame) <= bytes.length) return 'valid';
  return /(?:mp2t|mp4|aac|audio\/mpeg)/i.test(contentType) ? 'invalid' : 'incomplete';
}
