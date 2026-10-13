import type { Metadata, Viewport } from "next";
import { EDITIONS, enabledEditions, isEdition, type Edition } from "@/lib/editions";
import { getEdition } from "@/i18n/edition";
import { I18nProvider } from "@/i18n/client";
import { clientMessages } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionary";
import { editionRootMetadata } from "@/i18n/metadata";
import EditionSuggestion, { type EditionSuggestionTexts } from "@/components/shell/EditionSuggestion";
import { RootDocument, rootMetadata, rootViewport } from "../root-document";
import "../globals.css";

export const viewport: Viewport = rootViewport;

// Titre, description et aperçu de l'édition ; le français garde exactement ses métadonnées (EDI-501).
export async function generateMetadata({ params }: { params: Promise<{ edition: string }> }): Promise<Metadata> {
  const { edition } = await params;
  return editionRootMetadata(isEdition(edition) ? edition : "fr", rootMetadata);
}

// Une page statique par édition active (EDITIONS, défaut fr) ; toute autre valeur du segment répond 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return enabledEditions().map(edition => ({ edition }));
}

/** Textes de la suggestion de langue, chacun dans sa propre édition (EDI-503) ; vide avec une seule édition. */
function suggestionTexts(current: Edition): Partial<Record<Edition, EditionSuggestionTexts>> {
  return Object.fromEntries(enabledEditions().filter(edition => edition !== current).map(edition => {
    const t = getDictionary(edition).shell.edition;
    return [edition, { text: t.suggestText, action: t.suggestAction, close: t.suggestClose }];
  }));
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const edition = await getEdition();
  const suggestions = suggestionTexts(edition);
  return (
    <RootDocument lang={edition} dir={EDITIONS[edition].dir === "rtl" ? "rtl" : undefined}>
      <I18nProvider edition={edition} enabled={enabledEditions()} messages={clientMessages(edition, ["shell", "errors"])}>
        {children}
        {Object.keys(suggestions).length > 0 && <EditionSuggestion edition={edition} suggestions={suggestions} />}
      </I18nProvider>
    </RootDocument>
  );
}
