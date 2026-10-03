import { STORAGE_KEYS } from './storage-keys';

// Mode « Éco data » : préférence locale pour les connexions payantes ou lentes (images, animations, lecture manuelle).
export const ECO_EVENT = 'al_eco_change';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Valeur effective : le choix de l'utilisateur prime ; sans choix, l'option « économiseur de données »
 * du navigateur (Save-Data) l'active par défaut.
 */
export function effectiveEco(stored: string | null, saveData: boolean): boolean {
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return saveData;
}

export function readSaveData(): boolean {
  try {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return connection?.saveData === true;
  } catch {
    return false;
  }
}

export function readEcoRaw(storage: Pick<Storage, 'getItem'> = window.localStorage): string | null {
  try {
    return storage.getItem(STORAGE_KEYS.ecoMode);
  } catch {
    return null;
  }
}

/** Enregistre le choix, l'applique à la page (attribut data-eco) et prévient les composants ouverts. */
export function writeEco(
  value: boolean,
  storage: StorageLike = window.localStorage,
  root: { dataset: DOMStringMap } = document.documentElement,
  notify: () => void = () => window.dispatchEvent(new Event(ECO_EVENT)),
) {
  try {
    storage.setItem(STORAGE_KEYS.ecoMode, String(value));
  } catch {
    // Stockage indisponible : le choix vaut pour la page en cours.
  }
  applyEco(value, root);
  notify();
}

export function applyEco(value: boolean, root: { dataset: DOMStringMap } = document.documentElement) {
  if (value) root.dataset.eco = 'true';
  else delete root.dataset.eco;
}

/** Script minimal exécuté avant l'affichage : évite un flash de contenu lourd quand le mode est actif. */
export const ECO_BOOT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(STORAGE_KEYS.ecoMode)});var c=navigator.connection;var on=s==='true'||(s!=='false'&&!!(c&&c.saveData));if(on)document.documentElement.dataset.eco='true';}catch(e){}})();`;
