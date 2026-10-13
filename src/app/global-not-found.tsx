import type { Metadata, Viewport } from "next";
import NotFound from "./[edition]/not-found";
import { RootDocument, rootMetadata, rootViewport } from "./root-document";
import "./globals.css";

/**
 * 404 des adresses qui ne correspondent à aucune route (les pages vivent sous app/[edition], sans layout racine commun).
 * Même document et même écran « Page hors antenne » que le 404 d'une page ; en français, l'édition n'étant pas connue ici.
 */
export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = rootViewport;

export default function GlobalNotFound() {
  return <RootDocument lang="fr"><NotFound /></RootDocument>;
}
