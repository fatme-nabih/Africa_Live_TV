import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance, clerkLocalization } from "@/lib/clerk-theme";
import { isLocalDevMode } from "@/lib/local-dev";

/**
 * Routes qui se servent de Clerk (espace /app, compte, administration, tarifs, connexion, inscription, lecteur séparé).
 * Le groupe ne change aucune URL. Les pages publiques hors du groupe (landing, CGU, confidentialité, contact) ne chargent
 * pas le JavaScript de Clerk (≈ 340 Ko sur 4G lente, UX-603) ; la landing lit seulement un indice de session (SessionSwitch).
 */
export default function ClerkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isLocalDevMode()) return children;
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/app/live"
      signUpFallbackRedirectUrl="/app/live"
      appearance={clerkAppearance}
      localization={clerkLocalization}
    >
      {children}
    </ClerkProvider>
  );
}
