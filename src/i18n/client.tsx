'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_EDITION, type Edition } from '@/lib/editions';
import type { Dictionary } from './dictionary';
import { fr } from './fr';

/**
 * Édition et textes côté navigateur (EDI-104). Sans fournisseur (banc de composants, tests), tout se replie sur le français.
 * Le français est déjà dans le bundle : pour lui, le serveur n'envoie aucun message. Une autre édition reçoit ses espaces
 * de noms du serveur ; un espace absent se replie sur le français plutôt que de casser l'écran.
 */
type I18nValue = { edition: Edition; enabled: readonly Edition[]; t: Dictionary };

const FALLBACK: I18nValue = { edition: DEFAULT_EDITION, enabled: [DEFAULT_EDITION], t: fr };
const I18nContext = createContext<I18nValue>(FALLBACK);

export function I18nProvider({ edition, enabled, messages, children }: {
  edition?: Edition;
  enabled?: readonly Edition[];
  messages?: Partial<Dictionary>;
  children?: ReactNode;
}) {
  const parent = useContext(I18nContext);
  const value = useMemo<I18nValue>(() => ({
    edition: edition ?? parent.edition,
    enabled: enabled ?? parent.enabled,
    t: messages ? { ...parent.t, ...messages } : parent.t,
  }), [edition, enabled, messages, parent]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useEdition() {
  return useContext(I18nContext).edition;
}
