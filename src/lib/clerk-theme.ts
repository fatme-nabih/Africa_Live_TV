import type { Edition } from './editions';
import type { ClerkProvider } from '@clerk/nextjs';
import { arSA, frFR, enGB } from '@clerk/localizations';
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

const frenchLocalization = {
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

export const clerkLocalization = frenchLocalization;

/** Traduction arabe officielle de Clerk (`arSA`) et libellés de marque, en arabe standard moderne à relire (D7). */
const arabicLocalization = {
  ...arSA,
  // Textes indicatifs absents de `arSA` 4.9.0 (sinon affichés en anglais) ; chiffres occidentaux (D3).
  formFieldInputPlaceholder__emailAddress: 'أدخل بريدك الإلكتروني',
  formFieldInputPlaceholder__emailAddress_username: 'أدخل بريدك الإلكتروني أو اسم المستخدم',
  formFieldInputPlaceholder__password: 'أدخل كلمة المرور',
  formFieldInputPlaceholder__signUpPassword: 'أنشئ كلمة مرور',
  formFieldInputPlaceholder__firstName: 'الاسم',
  formFieldInputPlaceholder__lastName: 'اسم العائلة',
  formFieldInputPlaceholder__username: 'اسم المستخدم',
  formFieldInputPlaceholder__phoneNumber: 'رقم الهاتف',
  formFieldInputPlaceholder__backupCode: 'رمز احتياطي',
  signIn: {
    ...arSA.signIn,
    start: {
      ...arSA.signIn?.start,
      title: `تسجيل الدخول إلى ${AFRICA_LIVE}`,
      titleCombined: `تسجيل الدخول إلى ${AFRICA_LIVE}`,
      subtitle: 'سعداء بعودتك. سجّل الدخول للمتابعة.',
      subtitleCombined: 'سعداء بعودتك. سجّل الدخول للمتابعة.',
      actionText: 'ليس لديك حساب؟',
      actionLink: 'إنشاء حساب',
    },
  },
  signUp: {
    ...arSA.signUp,
    start: {
      ...arSA.signUp?.start,
      title: 'أنشئ حسابك',
      titleCombined: 'أنشئ حسابك',
      subtitle: 'تجربة مجانية لمدة 5 أيام، دون بطاقة مصرفية.',
      subtitleCombined: 'تجربة مجانية لمدة 5 أيام، دون بطاقة مصرفية.',
    },
  },
} satisfies ClerkProps['localization'];
export function clerkLocalizationForEdition(edition: Edition = 'fr'): ClerkProps['localization'] {
  if (edition === 'fr') return frenchLocalization;
  if (edition === 'ar') return arabicLocalization;
  return { ...enGB, signIn: { ...enGB.signIn, start: { ...enGB.signIn?.start, title: 'Sign in to Africa Live', titleCombined: 'Sign in to Africa Live', subtitle: 'Welcome back. Sign in to continue.', subtitleCombined: 'Welcome back. Sign in to continue.', actionText: 'No account?', actionLink: 'Create an account' } }, signUp: { ...enGB.signUp, start: { ...enGB.signUp?.start, title: 'Create your account', titleCombined: 'Create your account', subtitle: '5-day free trial, no bank card required.', subtitleCombined: '5-day free trial, no bank card required.' } } };
}
