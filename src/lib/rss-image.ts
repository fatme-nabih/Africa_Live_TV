// Image d'illustration d'une dépêche, telle que l'éditeur la publie dans son flux.
// Le serveur ne télécharge, ne convertit ni ne stocke jamais cette image : seule l'adresse https
// est transmise (http est relevé en https), et c'est le navigateur de l'utilisateur qui la charge chez l'éditeur.

const MAX_IMAGE_URL_LENGTH = 600;
const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp|avif|gif)(?:[?#]|$)/i;
// Pastilles de suivi, émojis, avatars et pixels espions ne sont pas des illustrations.
const IGNORED_IMAGE = /gravatar\.com|s\.w\.org|\/emoji\/|(?:^|[^a-z])pixel(?:[^a-z]|$)|spacer|1x1|feedburner|doubleclick|\/ads?\//i;

function unescapeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff) || 32))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Math.min(parseInt(dec, 10), 0x10ffff) || 32))
    .replace(/&amp;/gi, '&');
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`(?:^|[\\s<])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match ? (match[1] ?? match[2] ?? '') : null;
}

/** Adresse https exploitable comme illustration, sinon `null`. Les adresses relatives sont résolues sur l'article. */
export function safeImageUrl(raw: string | null | undefined, base?: string): string | null {
  if (!raw) return null;
  const text = unescapeXml(raw).trim();
  if (!text || text.length > MAX_IMAGE_URL_LENGTH) return null;
  let url: URL;
  try {
    url = base ? new URL(text, base) : new URL(text);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol === 'http:' && !url.port) {
    // Un site en https ne charge pas d'image http : on tente https, le repli typographique couvre l'échec.
    url.protocol = 'https:';
  }
  if (url.protocol !== 'https:') return null;
  if (IGNORED_IMAGE.test(url.toString())) return null;
  url.hash = '';
  const result = url.toString();
  return result.length > MAX_IMAGE_URL_LENGTH ? null : result;
}

function declaresImage(tag: string, url: string | null): boolean {
  const medium = attribute(tag, 'medium');
  if (medium) return medium.toLowerCase() === 'image';
  const type = attribute(tag, 'type');
  if (type) return /^image\//i.test(type);
  return url ? IMAGE_EXTENSION.test(url) : false;
}

function tinyImage(tag: string): boolean {
  const width = Number(attribute(tag, 'width'));
  const height = Number(attribute(tag, 'height'));
  return (Number.isFinite(width) && width > 0 && width <= 2) || (Number.isFinite(height) && height > 0 && height <= 2);
}

/** Cherche l'illustration d'un élément de flux : médias déclarés d'abord, puis première image du texte. */
export function extractImageUrl(itemXml: string, base?: string): string | null {
  for (const tag of itemXml.match(/<media:content\b[^>]*>/gi) ?? []) {
    const url = attribute(tag, 'url');
    if (declaresImage(tag, url)) {
      const safe = safeImageUrl(url, base);
      if (safe) return safe;
    }
  }
  for (const tag of itemXml.match(/<media:thumbnail\b[^>]*>/gi) ?? []) {
    const safe = safeImageUrl(attribute(tag, 'url'), base);
    if (safe) return safe;
  }
  for (const tag of itemXml.match(/<enclosure\b[^>]*>/gi) ?? []) {
    const url = attribute(tag, 'url');
    if (declaresImage(tag, url)) {
      const safe = safeImageUrl(url, base);
      if (safe) return safe;
    }
  }
  for (const tag of itemXml.match(/<link\b[^>]*>/gi) ?? []) {
    if (attribute(tag, 'rel')?.toLowerCase() !== 'enclosure') continue;
    const url = attribute(tag, 'href');
    if (declaresImage(tag, url)) {
      const safe = safeImageUrl(url, base);
      if (safe) return safe;
    }
  }
  for (const block of itemXml.matchAll(/<(content:encoded|description|summary|content)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const html = unescapeXml(block[2]);
    for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
      if (tinyImage(tag)) continue;
      const safe = safeImageUrl(attribute(tag, 'src') ?? attribute(tag, 'data-src') ?? attribute(tag, 'data-lazy-src'), base);
      if (safe) return safe;
    }
  }
  return null;
}
