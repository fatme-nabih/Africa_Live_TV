// Partage (WhatsApp, Facebook, menu du téléphone, copie) : titre + adresse publique, rien d'autre.
// Jamais d'URL de flux média ni de donnée personnelle.
const MAX_MESSAGE_LENGTH = 1_000;
const MEDIA_PATH = /\.(m3u8?|mpd|ts|mp4|webm|aac)(\?|#|$)/i;

/** Adresse partageable : http(s) sans identifiants, qui ne désigne pas un fichier ou une liste média. */
export function isShareableUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    return !MEDIA_PATH.test(url.pathname + url.search);
  } catch {
    return false;
  }
}

function clamp(text: string) {
  return text.length <= MAX_MESSAGE_LENGTH ? text : `${text.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
}

export function whatsappHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(clamp(text))}`;
}

/** Facebook ne prend qu'une adresse : l'aperçu (titre, image) vient de la page partagée. */
export function facebookHref(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/** `href` : lien WhatsApp ; `title` : titre pour le menu de partage du téléphone. */
export type ShareLink = { href: string; facebook: string; title: string; text: string; url: string };

/** Chaîne : lien vers le lecteur Africa Live (le destinataire se connecte, puis regarde). */
export function channelShare(input: { name: string; id: string; origin: string }): ShareLink | null {
  const url = `${input.origin.replace(/\/+$/, '')}/player/${encodeURIComponent(input.id)}`;
  if (!isShareableUrl(url)) return null;
  const title = `${input.name.trim()} en direct sur Africa Live`;
  const text = `Regarde ${input.name.trim()} en direct sur Africa Live : ${url}`;
  return { href: whatsappHref(text), facebook: facebookHref(url), title, text: clamp(text), url };
}

/** Dépêche : titre, rédaction, adresse de l'article chez l'éditeur, puis l'accueil d'Africa Live. */
export function articleShare(input: { title: string; sourceName?: string; articleUrl: string; origin: string }): ShareLink | null {
  if (!isShareableUrl(input.articleUrl)) return null;
  const source = input.sourceName?.trim();
  const text = [
    source ? `${input.title.trim()} (${source})` : input.title.trim(),
    input.articleUrl,
    `Via Africa Live : ${input.origin.replace(/\/+$/, '')}`,
  ].join('\n');
  return { href: whatsappHref(text), facebook: facebookHref(input.articleUrl), title: input.title.trim(), text: clamp(text), url: input.articleUrl };
}
