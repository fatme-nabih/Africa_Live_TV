import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { isLocalDevMode } from "@/lib/local-dev";
import "./globals.css";



export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"),
  title: "Africa Live — Catalogue unifié",
  description: "Un catalogue TV fluide et fiabilisé avec détection de compatibilité navigateur et lecteur externe VLC.",
  icons: {
    icon: "/africa-live.svg",
    apple: "/africa-live.svg",
  },
  openGraph: {
    title: "Africa Live",
    description: "Catalogue TV fluide avec lecture navigateur et VLC.",
    images: ["/africa-live.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Africa Live",
    description: "Catalogue TV fluide avec lecture navigateur et VLC.",
    images: ["/africa-live.svg"],
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
        {isLocalDevMode() ? children : <ClerkProvider>{children}</ClerkProvider>}
      </body>
    </html>
  );
}
