> **Actualisation du 13/10/2026 après E9 :** validation du propriétaire reçue dans le chat (« Relectures validées, publier les textes actuels »). D7 enregistré, EDI-404 reçu ; les propositions juridiques restent non appliquées. [Retour consigné](relectures-editions-2026-10-13/validation-proprietaire.md). Les mentions antérieures « en attente » ci-dessous sont historiques.

# Réception E4 — édition arabe, 12 octobre 2026

**EDI-401 à EDI-403 implémentés et vérifiés localement après « Feu vert pour E4 uniquement ». EDI-404 : contrôles techniques terminés, réception en attente de la relecture native (D7).**
Aucun commit, push, déploiement, migration ni changement distant. E0 à E3 et l'arbre volontairement sale sont conservés. **E5 n'a pas commencé.**

## Résultat par ticket

| Ticket | Livrable | État |
| --- | --- | --- |
| EDI-401 | Relevé exhaustif : **95 occurrences** physiques réelles dans 35 fichiers (et non les ~300 estimées : `space-x`/`divide-x` sont déjà logiques dans Tailwind 4.3.3). **73 converties dans 33 fichiers** (`ms/me/ps/pe/start/end/text-start/border-s`, `inset-x-0` pour les paires symétriques). Physiques et commentées : marqueurs de carte (pastille TV, infobulle centrée), centrages `left-1/2`, recentrage optique du triangle « lecture », boutons de défilement gauche/droite. Références FR/EN **avant** toute modification, données et horloge contrôlées : **30/30 captures identiques au pixel** après conversion. | Fait |
| EDI-402 | `<html lang="ar" dir="rtl">` côté serveur (FR/EN sans `dir`). Police **Cairo** variable, sous-ensemble arabe seul, `preload: false`, classe posée seulement sur `<html lang="ar">` ; mesurée en production et en mode Éco : **+31 Ko en arabe, 0 octet en FR/EN**. 32 icônes de direction retournées (`rtl:-scale-x-100`), bandeau `marquee-scroll-rtl` (avance vers la droite, arrêt au survol conservé), chatoiement inversé, interrupteur Éco, flèches clavier selon le sens (onglets, sélecteur d'édition, rangées TV), défilement des catégories mesuré en RTL. Barre média volontairement LTR (`dir="ltr"`, raccourcis ← → cohérents). `<bdi>` sur sources, origines et noms de chaînes ; `unicode-bidi: plaintext` sur les titres des rédactions ; espacement des lettres neutralisé en arabe ; pile monospace avec Cairo avant Courier New. `ar-u-nu-latn` (E1) vérifié. | Fait |
| EDI-403 | `src/i18n/ar.ts` complet (`satisfies Dictionary`), arabe standard moderne marqué **« À RELIRE (D7) »**, six formes de pluriel, gabarits conservés, chiffres occidentaux. Montants arabes avec espace fine insécable (`9\u202F900`) et formules monétaires isolées (`\u2066…\u2069`). Clerk `arSA` officiel + marque + 9 textes indicatifs absents d'`arSA` 4.9.0. Algérie puis Maroc (D2), « الصحراء الغربية » (D6), RT Arabic « روسيا · وسيلة إعلام حكومية » (D6), prix 990 et 9 900 FCFA et carte internationale d'abord (D5). `READY_EDITIONS = ['fr', 'en', 'ar']`. | Fait, **à relire** |
| EDI-404 | E2E arabes ajoutés à `e2e/editions.spec.ts` (désactivés sans `ar` dans `EDITIONS`), captures 360/768/1366, builds `fr,en,ar` puis `fr`, MVP et Clerk. Dossier de relecture : [notice](relecture-arabe-e4-2026-10-12.md) et [CSV de 993 textes](relecture-arabe-e4-2026-10-12.csv). | **Technique terminé ; réception en attente de D7** |

## Corrections hors du strict périmètre arabe, constatées pendant la réception

Ces écarts touchaient déjà l'anglais (restes d'E3). Ils ont été corrigés dans ce lot parce que l'arabe les rendait visibles. Aucun texte français n'a changé.

- Noms de pays des tuiles TV, du lecteur, du mur et du bouton « Suivre » : l'édition n'était pas transmise (« Sénégal » en anglais). Ce sont les **3 seules différences** de la comparaison visuelle finale : TV EN 360/768/1366, uniquement les lignes « Senegal » et « Morocco ».
- Origine des dépêches internationales (« Royaume-Uni » brut) : traduite par le dictionnaire, avec les origines des flux arabes ajoutées en FR (texte identique), EN et AR.
- Lieu météo : le contrat serveur reste français (« Point de référence · Algérie ») ; l'interface l'affiche dans la langue de l'édition (`weatherPlace`), avec les villes rapides traduites. Le français est inchangé.
- Titres des pages de connexion et d'inscription (hors widget Clerk) : ils étaient écrits en dur en français, ils passent par le dictionnaire (`shell.auth`).

## Contrôles et preuves

Traces privées : `.local-logs/editions-e4/`. Les nombres suivants sont des résultats réels.

| Vérification | Résultat | Trace |
| --- | --- | --- |
| `npx tsc --noEmit --incremental false` | Sans erreur | `types-final.txt` |
| `npm run lint` | Sans erreur ni avertissement | `lint-final.txt` |
| `npm test`, garde réseau | **548 : 507 réussis, 41 ignorés, 0 échec** (+6 tests arabes dans `edition-arabic.test.ts`) | `unit-final.txt` |
| `npm run test:invariants` | **4/4** | `invariants-final.txt` |
| Banc des composants (3001, seul) | **104/104**, avant et après les dernières retouches | `components.txt`, `components-final.txt` |
| Comparaison visuelle FR/EN avant/après EDI-401 (MVP, données et horloge fixes, 2 relevés de stabilité) | **30/30 identiques au pixel** | `visual-after-401.txt`, `visual/baseline/` |
| Comparaison visuelle finale FR/EN | **FR 15/15 identiques** ; EN 12/15, les 3 écarts étant les noms de pays TV corrigés | `visual-final.txt`, `visual-final-diffs/` |
| Suite E2E complète, MVP `fr,en,ar` | 199 : **175 réussis, 13 ignorés, 11 échecs**, analysés ci-dessous | `e2e-mvp-all.txt` |
| Reprise des échecs E2E | 5 tests d'édition corrigés → **8/8** ; `correction-profile` 1/1 seul ; `anchored-player` volume **3/3** répété | `e2e-rerun.txt` |
| E2E MVP final des zones touchées (éditions, routage, API, Radar, météo, coquille, TV, recherche, a11y) | **74 réussis, 2 ignorés (pages publiques Clerk), 0 échec** | `e2e-mvp-final.txt` |
| Build de production Clerk `EDITIONS=fr,en,ar` | Réussi ; pages `fr`, `en`, `ar` prérendues | `build-fr-en-ar.txt` |
| Sélection E2E Clerk (`fr,en,ar`) | **25 réussis, 11 ignorés (scénarios MVP), 0 échec** | `e2e-clerk.txt` |
| Build Clerk `EDITIONS=fr` + même sélection | Build réussi, seule `fr` prérendue ; **23 réussis, 13 ignorés, 0 échec** ; `<html lang="fr">` sans `dir`, `/ar` en 404 | `build-fr-only.txt`, `e2e-clerk-fr-only.txt` |
| Captures arabes MVP (Radar, TV, landing, tarifs, compte, mur) | 18 captures : `dir="rtl"`, débordement 0, 0 erreur de page | `captures-ar/report-ar.json` |
| Captures arabes publiques et Clerk (production) | 12 captures : `rtl`, débordement 0, 0 erreur | `captures-ar/report-public-ar.json` |
| Poids des polices (production, Éco) | FR/EN : 2 fichiers, 76 Ko ; AR : 3 fichiers, **107 Ko (+31 Ko Cairo)** | `fonts-weight.json` |
| Flux arabes réels, `npm run feeds:verify -- --edition ar` (lundi 12/10) | **41/41 en 200**, 39 noyau + 2 compléments, 0 langue erronée, 0 date future ; Nawaat sans article depuis 54 h | `feeds-ar-before-activation.txt` |
| Empreintes métier SQL (8 tables) et `.env*` | **Identiques** avant/après | `before.json`, `after.json`, `env-*.txt` |

### Échecs de la suite complète MVP, analysés

| Test | Cause | Suite donnée |
| --- | --- | --- |
| `edition-api` ×3, `edition-routing` ×2 | Ces tests désignaient l'arabe comme édition « inactive » | Rendus génériques : édition inactive = toute édition non activée, sinon valeur inconnue ; aucune assertion retirée ; **8/8** en `fr,en,ar`, aussi verts en FR seul |
| `auth-entry` ×3 | Tests du mode Clerk lancés en MVP (la landing MVP redirige vers le Radar) | **Verts dans la sélection Clerk** |
| `correction-profile` | Mesure de performance vidéo sous charge du serveur de développement | **1/1** seul |
| `anchored-player` volume | Aléa préexistant : le test change de chaîne avant l'événement `volumechange` asynchrone | **3/3** répété ; réussite constatée en E3 ; test non modifié |
| `local-mvp` chaînes indisponibles | Dépend des statuts réels `OFFLINE` de la base ; aucune API ni requête modifiée en E4 | Écart préexistant consigné, hors périmètre |

## Réception réelle

**Clerk `arSA`** : vérifié en vrai dans le navigateur intégré, avec l'instance Clerk de développement, sans session ni saisie. Connexion et inscription en arabe, de droite à gauche, avec la marque et les chiffres occidentaux (« 5 أيام »). Un premier passage montrait le titre de page français et le texte indicatif « Enter your email address » ; les deux sont corrigés et revérifiés. Captures : `captures-ar/clerk-ar-sign-in.jpg`, `clerk-ar-sign-up.jpg`, avant correction `clerk-ar-sign-in-before-fix.jpg`. Le cookie posé dans le navigateur intégré a été retiré.

**Non fait :** la session Edge déjà connectée du propriétaire (compte, profil Clerk, TV/Radar connectés) **n'a pas pu être pilotée**. Le contrôle de l'ordinateur n'était pas disponible dans cette session et aucun navigateur Claude in Chrome n'était connecté. Le parcours connecté est couvert par le mode MVP (Radar, TV, compte, mur) et par la sélection Clerk anonyme. Le contrôle visuel du compte connecté en arabe reste à faire par le propriétaire, ou dans une session disposant de ces outils, sans modifier le profil.

**Bidi des montants** : en RTL, « 9 900 » s'affichait « 900 9 » et le numéro « 221771234567+ ». Corrigé (espace fine insécable, champ téléphone `dir="ltr"`) et protégé par un test unitaire (aucune espace ordinaire entre deux chiffres dans `ar.ts`).

## Écarts au plan

1. **Police** : le plan suggérait Noto Kufi Arabic + IBM Plex Sans Arabic, soit environ 210 Ko mesurés sur Google Fonts le 12/10. Cairo seule (variable 200–1000) coûte **31 Ko** pour tous les poids, ce qui convient mieux à la priorité « faible consommation de données ». Les faces de repli de next/font couvrent tous les caractères : Cairo est donc placée avant elles, et un E2E vérifie qu'elle est réellement chargée.
2. **Bandeau** : `animation-direction: reverse` aurait laissé un vide. Une animation `marquee-scroll-rtl` (de 0 à +distance) garde la copie à gauche ; vérifié en mouvement.
3. **Barre média** : gardée LTR plutôt que retournée, pour rester cohérente avec les raccourcis ← → et le volume.
4. **Volume de conversion** : 95 occurrences réelles au lieu des ~300 estimées.

## Limites

- **D7** : textes, écrans Clerk et annotations des 228 titres arabes de `titles-ar.json` attendent la relecture native. Formes les plus fragiles : fragments concaténés à un nombre (« قناة معروضة », jauge « من أصل … يوم ») et libellés neutres (« الأيام المتبقية: {v0} »).
- Les grandes pages publiques (landing, CGU, confidentialité, contact) restent en français jusqu'à E5. `/ar` a son document arabe, sa ligne d'édition et le sélecteur. L'administration reste en français.
- Les retours à la ligne au milieu d'un passage latin entre parenthèses suivent l'algorithme bidi standard ; c'est à vérifier lors de la relecture.
- La limite de l'anglais à froid (« Signal interrupted » puis reprise) n'a pas été rejouée en session Clerk réelle dans ce lot ; elle reste ouverte.
- Le contrôle connecté en Edge n'a pas été fait (voir ci-dessus).

## Fichiers et reprise

Code : `src/i18n/ar.ts` (nouveau), `src/lib/direction.ts` (nouveau), `src/lib/edition-arabic.test.ts` (nouveau), `e2e/helpers/arabic-fixture.ts` (nouveau) ; `src/app/root-document.tsx`, `src/app/globals.css`, `src/lib/{editions,clerk-theme,weather-text}.ts`, `src/i18n/{dictionary,fr,en}.ts`, 47 composants ou pages (classes logiques, icônes, bidi, clavier, pays par édition, titres de connexion) ; E2E `editions`, `edition-api`, `edition-routing` ; tests `editions`, `server-environment`.
Les captures historiques `docs/screenshots/l5-anchored-*.png`, réécrites par l'E2E `anchored-player`, ont été restaurées depuis `HEAD` selon la procédure documentée. Ports 3001/3002 libres, serveurs de ce lot arrêtés. **Le dernier `.next` est un build FR seul (mode Clerk).**
