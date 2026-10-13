// Partage (WhatsApp, Facebook, menu du téléphone, copie) : titre + adresse publique, rien d'autre.
// Jamais d'URL de flux média ni de donnée personnelle. Textes et liens selon l'édition (EDI-502) ; le français est inchangé.
import { fr } from '@/i18n/fr';
import type { Dictionary } from '@/i18n/dictionary';
import { format } from '@/i18n/message';
import { DEFAULT_EDITION, type Edition } from './editions';
import { editionHref } from './edition-routing';

type ShareMessages = Dictionary['share']['messages'];
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

/**
 * Chaîne : lien vers le lecteur Africa Live (le destinataire se connecte, puis regarde). Hors français, le lien porte
 * l'édition (`/en/player/…`) : le proxy la mémorise puis ouvre l'adresse courte.
 */
export function channelShare(input: { name: string; id: string; origin: string }, edition: Edition = DEFAULT_EDITION, messages: ShareMessages = fr.share.messages): ShareLink | null {
  const url = `${input.origin.replace(/\/+$/, '')}${editionHref(`/player/${encodeURIComponent(input.id)}`, edition)}`;
  if (!isShareableUrl(url)) return null;
  const title = format(messages.channelTitle, { name: input.name.trim() });
  const text = format(messages.channelText, { name: input.name.trim(), url });
  return { href: whatsappHref(text), facebook: facebookHref(url), title, text: clamp(text), url };
}

/** Dépêche : titre, rédaction, adresse de l'article chez l'éditeur, puis l'accueil d'Africa Live dans l'édition. */
export function articleShare(input: { title: string; sourceName?: string; articleUrl: string; origin: string }, edition: Edition = DEFAULT_EDITION, messages: ShareMessages = fr.share.messages): ShareLink | null {
  if (!isShareableUrl(input.articleUrl)) return null;
  const source = input.sourceName?.trim();
  const home = input.origin.replace(/\/+$/, '') + (edition === DEFAULT_EDITION ? '' : `/${edition}`);
  const text = [
    source ? `${input.title.trim()} (${source})` : input.title.trim(),
    input.articleUrl,
    format(messages.via, { url: home }),
  ].join('\n');
  return { href: whatsappHref(text), facebook: facebookHref(input.articleUrl), title: input.title.trim(), text: clamp(text), url: input.articleUrl };
}
