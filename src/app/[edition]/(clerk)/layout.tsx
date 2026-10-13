import { getEdition } from '@/i18n/edition';
import { clientMessages } from '@/i18n/server';
import { I18nProvider } from '@/i18n/client';
import { enabledEditions } from '@/lib/editions';
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance, clerkLocalizationForEdition } from "@/lib/clerk-theme";
import { isLocalDevMode } from "@/lib/local-dev";

/**
 * Routes qui se servent de Clerk (espace /app, compte, administration, tarifs, connexion, inscription, lecteur séparé).
 * Le groupe ne change aucune URL. Les pages publiques hors du groupe (landing, CGU, confidentialité, contact) ne chargent
 * pas le JavaScript de Clerk (≈ 340 Ko sur 4G lente, UX-603) ; la landing lit seulement un indice de session (SessionSwitch).
 */
export default async function ClerkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const edition = await getEdition();
  const content = <I18nProvider edition={edition} enabled={enabledEditions()} messages={clientMessages(edition, ['tv', 'player', 'search', 'share', 'account', 'pricing', 'errors'])}>{children}</I18nProvider>;
  if (isLocalDevMode()) return content;
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/app/live"
      signUpFallbackRedirectUrl="/app/live"
      appearance={clerkAppearance}
      localization={clerkLocalizationForEdition(edition)}
    >
      {content}
    </ClerkProvider>
  );
}
