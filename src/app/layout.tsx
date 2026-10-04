import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import Script from "next/script";
import ServiceWorkerRegister from "@/components/shell/ServiceWorkerRegister";
import { ECO_BOOT_SCRIPT } from "@/lib/eco-mode";
import "./globals.css";

// `subsets` ne règle que le préchargement : les autres sous-ensembles (latin-ext pour ŋ, etc.) restent déclarés et se chargent
// seulement si la page en contient. Précharger latin-ext coûtait 130 Ko (dont 115 Ko pour Unbounded) sur chaque page.
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const unbounded = Unbounded({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-unbounded",
});

const SIGNATURE = "Le live qui vient à vous";
const DESCRIPTION = "L’Afrique en direct : chaînes TV, dépêches, carte et météo, réunies dans un seul espace.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"),
  title: `Africa Live — ${SIGNATURE}`,
  description: DESCRIPTION,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/africa-live-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: `Africa Live — ${SIGNATURE}`,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Africa Live" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Africa Live — ${SIGNATURE}`,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Le mode Éco data pose data-eco sur <html> avant l'affichage : l'hydratation tolère cet attribut.
  const ecoBoot = <Script id="al-eco-boot" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: ECO_BOOT_SCRIPT }} />;
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${manrope.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Clerk n'est monté que dans le groupe (clerk) (app, compte, admin, tarifs, connexion) : voir src/app/(clerk)/layout.tsx. */}
        {ecoBoot}
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
