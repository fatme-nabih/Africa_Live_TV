import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import type { Edition } from '@/lib/editions';
import { editionHref, editionLinkPrefetch } from '@/lib/edition-routing';

/**
 * Texte de dictionnaire avec un balisage minimal (EDI-501/504) : `**gras**`, `[libellé](/chemin)` et `` `code` ``.
 * Le balisage est lu dans le gabarit avant la substitution des `{variables}` : une valeur saisie (un nom, par exemple)
 * n'est jamais interprétée comme du balisage. Les liens internes suivent l'édition (`/en/contact`, `/ar/account`).
 */
const TOKEN = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)|`(.+?)`/g;

function fill(text: string, values: Readonly<Record<string, string | number>>) {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/**
 * Ligne de copyright `… {year} …` rendue en trois nœuds de texte, comme l'ancien JSX `© {new Date().getFullYear()} …` :
 * un seul nœud déplace les glyphes d'un pixel (mesuré sur les captures FR, EDI-505).
 */
export function YearText({ template }: { template: string }) {
  return <TemplateText template={template} values={{ year: new Date().getFullYear() }} />;
}

/** Gabarit `{nom}` rendu en nœuds de texte séparés autour de chaque valeur, comme `{valeur} texte` en JSX. */
export function TemplateText({ template, values }: { template: string; values: Readonly<Record<string, string | number>> }) {
  const parts = template.split(/\{(\w+)\}/);
  return <>{parts.map((part, index) => part === '' ? null : <Fragment key={index}>{index % 2 === 1 && part in values ? values[part] : part}</Fragment>)}</>;
}

export default function RichText({ text, edition, values = {}, linkClassName }: {
  text: string;
  edition: Edition;
  values?: Readonly<Record<string, string | number>>;
  linkClassName?: string;
}) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) parts.push(fill(text.slice(last, match.index), values));
    const [, bold, label, href, code] = match;
    if (bold !== undefined) parts.push(<strong>{fill(bold, values)}</strong>);
    else if (label !== undefined) {
      const target = editionHref(href, edition);
      parts.push(<Link href={target} prefetch={editionLinkPrefetch(target)} className={linkClassName}>{fill(label, values)}</Link>);
    }
    else parts.push(<code>{code}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(fill(text.slice(last), values));
  return <>{parts.map((part, index) => <Fragment key={index}>{part}</Fragment>)}</>;
}
