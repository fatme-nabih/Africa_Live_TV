export function rewritePocHlsManifest(
  manifest: string,
  baseUrl: string,
  localUrlFor: (absoluteUrl: string) => string,
) {
  const localizeResource = (resource: string) => {
    const resolved = new URL(resource, baseUrl);
    return ['http:', 'https:'].includes(resolved.protocol)
      ? localUrlFor(resolved.toString())
      : resource;
  };

  return manifest
    .split(/(\r?\n)/)
    .map((part) => {
      if (part === '\n' || part === '\r\n' || !part.trim()) return part;

      const trimmed = part.trim();
      if (!trimmed.startsWith('#')) {
        const leading = part.slice(0, part.indexOf(trimmed));
        const trailing = part.slice(part.indexOf(trimmed) + trimmed.length);
        return `${leading}${localizeResource(trimmed)}${trailing}`;
      }

      return part.replace(
        /URI="([^"]+)"/gi,
        (_match, uri: string) => `URI="${localizeResource(uri)}"`,
      );
    })
    .join('');
}

export function isPocHlsManifest(contentType: string | null, url: URL) {
  const normalized = contentType?.toLowerCase() ?? '';
  return normalized.includes('mpegurl') || url.pathname.toLowerCase().endsWith('.m3u8');
}
