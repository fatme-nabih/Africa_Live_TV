import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { isLocalDevMode } from "@/lib/local-dev";
import "./globals.css";



export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"),
  title: "Africa Live — Le radar panafricain",
  description: "Suivez l’Afrique avec un dashboard de veille, une carte interactive, les dépêches et les chaînes TV en direct.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Africa Live",
    description: "Veille panafricaine, carte interactive et télévision en direct.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Africa Live" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Africa Live",
    description: "Veille panafricaine, carte interactive et télévision en direct.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {isLocalDevMode() ? children : (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/app/live"
            signUpFallbackRedirectUrl="/app/live"
            appearance={{ variables: {
              colorPrimary: '#fbbf24',
              colorBackground: '#050505',
              colorForeground: '#fafafa',
              colorMutedForeground: '#a1a1aa',
              borderRadius: '0.75rem',
            } }}
          >
            {children}
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}
