/**
 * Indice de session lisible sans charger Clerk : le cookie `__client_uat` (et sa variante suffixée `__client_uat_<id>`), non
 * HttpOnly, posé par Clerk sur le domaine de l'application, vaut `0` hors session et l'horodatage de connexion sinon.
 * Ce n'est jamais une preuve d'authentification : seulement le choix entre « Se connecter » et « Ouvrir le dashboard ».
 */
export function hasClerkSessionHint(cookieHeader: string) {
  return cookieHeader.split(';').some(part => /^__client_uat(?:_[A-Za-z0-9-]+)?=[1-9]\d*$/.test(part.trim()));
}
