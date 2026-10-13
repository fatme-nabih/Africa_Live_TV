import type { Metadata } from 'next';
import { DEFAULT_EDITION, enabledEditions, type Edition } from '@/lib/editions';
import { editionHref } from '@/lib/edition-routing';
import { getDictionary } from './dictionary';

/**
 * Métadonnées par édition (EDI-501). Le français garde exactement les métadonnées reçues (titre, description, aperçu) ;
 * EN/AR ont leur titre, leur description et leur image d'aperçu. Canonique et `hreflang` ne sont émis que si plusieurs
 * éditions sont actives : un build `EDITIONS=fr` produit le même `<head>` qu'avant.
 */
const OG_IMAGE: Readonly<Record<Edition, string>> = { fr: '/og-image.png', en: '/og-image-en.png', ar: '/og-image-ar.png' };
const OG_LOCALE: Readonly<Record<Edition, string>> = { fr: 'fr_FR', en: 'en_GB', ar: 'ar_AR' };

function preview(edition: Edition, title: string, description: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = OG_IMAGE[edition];
  return {
    openGraph: { title, description, locale: OG_LOCALE[edition], images: [{ url: image, width: 1200, height: 630, alt: getDictionary(edition).landing.ogAlt }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

/** Métadonnées du document racine d'une édition (layout `app/[edition]`), à partir des métadonnées françaises reçues. */
export function editionRootMetadata(edition: Edition, rootMetadata: Metadata): Metadata {
  if (edition === DEFAULT_EDITION) return rootMetadata;
  const t = getDictionary(edition).landing;
  const title = `Africa Live — ${t.signature}`;
  return { ...rootMetadata, title, description: t.description, ...preview(edition, title, t.description) };
}

/** Métadonnées d'une page publique : titre propre éventuel, puis canonique et versions des autres éditions actives. */
export function publicPageMetadata(edition: Edition, path: string, page?: { title: string; description: string }): Metadata {
  const metadata: Metadata = {};
  if (page) {
    metadata.title = page.title;
    metadata.description = page.description;
    if (edition !== DEFAULT_EDITION) Object.assign(metadata, preview(edition, page.title, page.description));
  }
  const enabled = enabledEditions();
  if (enabled.length > 1) {
    metadata.alternates = {
      canonical: editionHref(path, edition),
      languages: { ...Object.fromEntries(enabled.map(other => [other, editionHref(path, other)])), 'x-default': path },
    };
  }
  return metadata;
}
