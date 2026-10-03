import type { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
import type { ComponentProps } from 'react';

type ClerkProps = ComponentProps<typeof ClerkProvider>;

/**
 * Apparence des widgets Clerk alignée sur les jetons de globals.css (aucune couleur littérale ici) :
 * jaune = action principale, or = bordures et focus, rouge = erreurs, Manrope pour le texte.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: 'var(--color-al-yellow)',
    colorPrimaryForeground: 'var(--color-ink)',
    colorBackground: 'var(--color-surface-1)',
    colorInput: 'var(--color-surface-2)',
    colorInputForeground: 'var(--color-text)',
    colorForeground: 'var(--color-text)',
    colorMutedForeground: 'var(--color-text-muted)',
    colorRing: 'var(--color-al-gold)',
    colorDanger: 'var(--color-al-red-soft)',
    colorSuccess: 'var(--color-al-green)',
    colorWarning: 'var(--color-al-gold)',
    fontFamily: 'var(--font-sans)',
    fontFamilyButtons: 'var(--font-sans)',
    fontSize: '0.9375rem',
    borderRadius: 'var(--radius-control)',
  },
  elements: {
    cardBox: 'rounded-card! border! border-line-gold! shadow-xl shadow-black/40',
    formButtonPrimary: 'font-bold',
    footerActionLink: 'font-semibold',
  },
} satisfies ClerkProps['appearance'];

/**
 * Traduction française officielle de Clerk (`@clerk/localizations`, tous les écrans), complétée par les libellés de marque :
 * les sous-titres « pour continuer vers {{applicationName}} » afficheraient le nom du tableau de bord Clerk.
 */
const AFRICA_LIVE = 'Africa Live';

export const clerkLocalization = {
  ...frFR,
  signIn: {
    ...frFR.signIn,
    start: {
      ...frFR.signIn?.start,
      title: `Connexion à ${AFRICA_LIVE}`,
      titleCombined: `Connexion à ${AFRICA_LIVE}`,
      subtitle: 'Heureux de vous revoir : connectez-vous pour continuer.',
      subtitleCombined: 'Heureux de vous revoir : connectez-vous pour continuer.',
      actionText: 'Pas de compte ?',
      actionLink: 'Créer un compte',
    },
  },
  signUp: {
    ...frFR.signUp,
    start: {
      ...frFR.signUp?.start,
      title: 'Créer votre compte',
      titleCombined: 'Créer votre compte',
      subtitle: '5 jours d’essai offerts, sans carte bancaire.',
      subtitleCombined: '5 jours d’essai offerts, sans carte bancaire.',
    },
  },
} satisfies ClerkProps['localization'];
