'use client';
import { createContext, useContext, type ReactNode } from 'react';
const OwnerContext = createContext<string|null>(null);
export function PreferenceOwnerProvider({ owner, children }: { owner: string|null; children: ReactNode }) {
  return <OwnerContext.Provider value={owner}>{children}</OwnerContext.Provider>;
}
export const usePreferenceOwner = () => useContext(OwnerContext);
