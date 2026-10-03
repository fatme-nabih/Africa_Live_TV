import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { ECO_BOOT_SCRIPT } from "@/lib/eco-mode";
import { isLocalDevMode } from "@/lib/local-dev";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-manrope",
});

const unbounded = Unbounded({
  subsets: ["latin", "latin-ext"],
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
        {isLocalDevMode() ? <>{ecoBoot}{children}</> : (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/app/live"
            signUpFallbackRedirectUrl="/app/live"
            appearance={{ variables: {
              colorPrimary: '#fcd116',
              colorPrimaryForeground: '#000000',
              colorBackground: '#0b0b0c',
              colorForeground: '#f5f5f4',
              colorMutedForeground: '#a8a29e',
              colorDanger: '#e8112d',
              colorSuccess: '#12b54a',
              borderRadius: '0.875rem',
            } }}
          >
            {ecoBoot}
            {children}
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}
