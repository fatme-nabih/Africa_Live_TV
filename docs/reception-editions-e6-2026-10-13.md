# Réception E6 — ponts et finitions des éditions, 13 octobre 2026

**EDI-601 à EDI-604 implémentés et vérifiés localement après « Feu vert pour E6, option A pour EDI-603 ».** Aucun commit, push, déploiement ni changement distant.
E0 à E5 et l'arbre volontairement sale sont conservés ; l'index Git est identique avant et après le lot. **Une migration additive locale (0021) a été appliquée à `africa_live_dev` après sauvegarde restaurable vérifiée.** La tâche Windows n'a pas été modifiée. **E9 n'a pas commencé.**
Les 10 textes arabes ajoutés restent soumis à la relecture native (D7).

## Résultat par ticket

| Ticket | Livrable | État |
| --- | --- | --- |
| EDI-601 | **Pont entre éditions.** `editionBridgeCounts()` (`rss-collector.ts`) compte les dépêches des dernières 24 h par pays dans les **seuls caches encore valides** des autres éditions actives. C'est une lecture pure de la mémoire, sans aucune collecte lancée. La route `/api/live/rss` ajoute le champ `bridge` **seulement s'il n'est pas vide** : avec `EDITIONS=fr`, la réponse reste strictement identique. Côté client, `parseEditionBridge` contrôle le contrat et `pickEditionBridge` applique les seuils : **< 3** dans l'édition courante, **≥ 5** dans une autre, l'édition la plus fournie d'abord. La ligne « {Pays} se raconte surtout en {langue} : {n} dépêches dans l'édition {x} → » s'affiche sous le filtre pays du fil, avec le nom de l'édition en `<bdi lang dir>` et la flèche retournée en arabe. Le geste pose le cookie, la marque du halo et le compte connu (EDI-603), puis ouvre `/app/live?country=XX`. | Fait |
| EDI-602 | **Halo de la sphère.** Calques `land-sphere`/`borders-sphere` (fond sombre). Après un changement d'édition choisi (sélecteur ou pont), la carte allume **une fois** les pays de la sphère (`edition-affinity.ts` : FR 29, EN 31, AR 14). L'allumage dure 2,4 s, avec une transition d'opacité. La marque de session `al_edition_changed` est consommée à la première carte affichée. **Rien en Éco ni en mouvement réduit** : la marque est alors retirée sans animation. Les minuteries ne dépendent pas du double montage du mode strict de React. | Fait |
| EDI-603 | **Option A (décision du propriétaire).** Colonne additive `users.preferred_edition` (texte, vide autorisé, contrainte `fr`/`en`/`ar`), migration **0021** générée par drizzle-kit (deux instructions `ALTER TABLE … ADD`, aucune autre). Route `PUT /api/edition-preference` : tout compte connecté et non bloqué (comme les pays suivis), même vérification du propriétaire que les préférences (409 sinon), édition active seulement (400 sinon), corps strict de 256 octets au plus, quota de 20, route protégée par le proxy. **Seule la colonne change** : pas de modification de `updated_at` ni de l'identité. Écriture uniquement sur un geste explicite, envoyée en `keepalive` avant la navigation. Application : un appareil **sans cookie d'édition** reçoit l'édition du compte (cookie, puis navigation complète, une tentative par session) ; **un cookie présent garde toujours la main** (choix de cet appareil ou lien partagé). Note ajoutée sur la page Compte (affichée seulement avec plusieurs éditions). | Fait |
| EDI-604 | **Cycle de 15 jours.** `.local-logs/stream-cycle/feeds-verify-step.cjs` (lecture seule, non bloquant, comparaison au passage précédent, ligne « Résultats flux RSS … ») et note d'activation `feeds-verify-step.md` avec l'extrait à insérer dans `run-cycle.cjs`. **Branché le 13/10 au soir avec l'accord du propriétaire** dans `run-cycle.cjs` (non bloquant, `try/catch`, copie d'avant : `.local-logs/editions-e9/run-cycle.before-edi604.cjs`). La tâche Windows est inchangée : prochaine exécution le 19/10/2026 à 20:00, état Prêt. La comparaison au cycle précédent a été corrigée dans l'étape privée (voir `feeds-verify-step.md`). | Fait, branché |

## Migration 0021 et données

- **Sauvegarde restaurable avant migration** (`.local-logs/editions-e6/backup-before-0021.ts`, copie de la procédure 0020) :
  - `pg_dump` puis restauration dans une base jetable ;
  - inventaire identique (24 tables, 14 505 chaînes, 15 646 sources, 3 utilisateurs, 29 favoris, 21 migrations) ;
  - sauvegarde conservée dans `.local-logs/editions-e6/pre-0021.dump`.
- **Application locale** par `npm run db:migrate`. `db:migrate:deploy` refuse volontairement la base locale ; il reste la commande des déploiements.
- **Résultat** : 22 migrations, empreintes SHA-256 des 21 anciennes inchangées, `db:check` et `db:check:migrations` sans dérive.
- **Empreintes métier (8 tables)** identiques avant, après la migration et en fin de lot. La nouvelle colonne est exclue du calcul pour comparer l'existant.
- **En fin de lot**, aucune ligne n'a `preferred_edition` renseigné. Le contrôle réel a écrit puis remis à NULL la valeur du compte local MVP.
- **Publication future (EDI-903, non autorisée)** :
  - le code lit `users.preferred_edition` sur chaque page connectée : la migration 0021 doit être appliquée **avant** de servir ce code ;
  - il faut une sauvegarde restaurable Railway avant `db:migrate:deploy` ;
  - un retour arrière du code n'annule pas la migration, mais la colonne additive et vide est sans effet sur l'ancien code.

## Contrôles et preuves

Traces privées : `.local-logs/editions-e6/`.

| Vérification | Résultat | Trace |
| --- | --- | --- |
| `npx tsc --noEmit --incremental false` | Sans erreur | `types-final.txt` |
| `npm run lint` | Sans erreur ni avertissement | `lint-final.txt` |
| `npm test`, garde réseau | **563 : 519 réussis, 44 ignorés, 0 échec** (+7 tests unitaires `edition-e6.test.ts` ; +3 intégrations ignorées par `npm test`) | `unit-final.txt` |
| `npm run test:integration` (schéma jetable, migrations 0000 → 0021 rejouées) | **44/44**, dont 3 EDI-603 : écriture du seul propriétaire, refus 409/400, contrainte SQL ; catalogue public inchangé | `integration.txt` |
| `npm run test:invariants` | **4/4** | `invariants-final.txt` |
| Banc des composants (3001, seul) | **104/104** | `components.txt` |
| Comparaison au pixel MVP `fr,en,ar` : références prises **avant** toute modification, 2ᵉ relevé de stabilité 44/45 (seul écart : l'indicateur « Compiling » de Next pendant l'écriture d'un fichier) | **45/45 identiques** (Radar, TV, landing, tarifs, compte × FR/EN/AR × 360/768/1366) | `visual-final.txt`, `visual/baseline/` |
| E2E du lot (MVP) | **4/4** : pont et geste (cookie, adresse, envoi au compte, halo réellement dessiné sur 31 pays puis éteint, pas de second halo au rechargement) ; seuils 3 et 4 sans pont ; aucun halo en mouvement réduit ni en Éco | `e2e-e6-second.txt` |
| Sélection E2E MVP `fr,en,ar` (a11y, coquille, API et routage d'édition, éditions, MVP, Radar météo/espace/direct/fiabilité, TV, recherche) | **130 réussis, 8 ignorés, 1 échec** : `local-mvp`, chaînes `OFFLINE` de la base réelle, écart préexistant consigné en E4/E5. Le pont réel de l'API (cache EN valide → champ `bridge` du FR) est inclus | `e2e-mvp.txt` |
| EDI-603 réel (MVP, base locale, route non simulée) | Choix EN enregistré, appliqué à un nouvel appareil sans cookie, ignoré par un appareil au cookie FR ; retour FR enregistré ; valeur d'origine NULL remise | `account-sync.txt`, `account/` |
| Build de production Clerk `EDITIONS=fr,en,ar` + sélection Clerk | Build réussi (`ƒ /api/edition-preference`) ; **30 réussis, 16 ignorés (scénarios MVP), 0 échec** ; PUT anonyme 307 vers la connexion, aucune écriture | `build-fr-en-ar.txt`, `e2e-clerk.txt` |
| Build Clerk `EDITIONS=fr` + même sélection | **23 réussis, 23 ignorés, 0 échec** ; `<html lang="fr">` sans `dir`, `/en` en 404 | `build-fr.txt`, `e2e-clerk-fr-only.txt` |
| Captures 360/768/1366 du pont (FR → English, EN → Français, AR → English) et du halo arabe | Texte et `lang`/`dir` corrects, débordement 0 | `captures/report.json`, `captures/*.png` |
| `feeds-verify-step.cjs` réel | FR 31/36 sains (AIP, Gabon Review hors délai ; Jeune Afrique 403 ; Radio Okapi, Ecofin anciens), EN 83/85 (Eye Radio désactivé, Daily News hors délai), AR 41/41 | `feeds-step-run1/` |
| Empreintes SQL (8 tables) et `.env*` | **Identiques** | `before.json`, `after-migration.json`, `after.json`, `env-*.txt` |

## Écarts au plan et choix

1. **Champ `bridge` ajouté sans paramètre de requête.** J'ai d'abord prévu un paramètre `bridge=1`, puis je l'ai écarté avant les tests : de nombreux E2E interceptent l'adresse exacte `**/api/live/rss`. Le champ est donc additif et n'apparaît que si une autre édition active a un cache valide. Avec `EDITIONS=fr`, la réponse reste identique.
2. **Préférence appliquée seulement aux appareils sans cookie.** Le choix de l'appareil, ou un lien partagé, prime. Le compte sert de défaut aux nouveaux appareils, sans écraser un choix local.
3. **Halo déclenché par le geste, pas par l'application automatique du compte.** Un nouvel appareil qui reçoit l'édition du compte n'allume pas la carte.
4. **E2E sans écriture réelle.** `fixtureRadar` intercepte désormais `PUT /api/edition-preference` : un E2E qui change d'édition n'écrit jamais dans le compte local. L'écriture réelle est vérifiée par le banc privé, qui remet la valeur d'origine.
5. **Tests existants ajustés à la nouvelle dépendance, sans retrait d'assertion.**
   - La simulation de `rss-collector` de `radar-access.test.ts` reçoit `editionBridgeCounts`.
   - `auth-entry` vérifie aussi le refus anonyme de `/api/edition-preference`.
   - Les layouts lisent la préférence avec `isEdition`, et non par un module de base de données, pour garder leurs simulations.

## Limites

- **D7** : 10 nouveaux textes arabes (pont, langues, note du compte). CSV régénéré : **1 175 textes** à relire, aucune correction de relecteur écrasée (il n'y en avait aucune).
- **Session Clerk réelle** : la préférence au compte est vérifiée en MVP (compte local) et par les intégrations ; le parcours avec une vraie session Clerk (deux navigateurs) n'a pas été piloté, faute de session Clerk fiable dans le navigateur intégré. À faire par le propriétaire, sans modifier son profil.
- **Pont et cache** : la ligne n'apparaît que si quelqu'un a chargé l'autre édition dans les 5 dernières minutes, sur la même instance. Par construction, aucune collecte n'est déclenchée pour la produire.
- **Halo sur mobile** : la carte se charge à la demande ; le halo se joue à sa première ouverture dans la session.
- **PUT anonyme** : répond 307 vers la connexion (protection Clerk du proxy), comme les autres préférences.
- **EDI-604** : l'activation dans `run-cycle.cjs` demande l'accord du propriétaire.
- La réponse FR seule en MVP (`EDITIONS=fr`, sans champ `bridge`) n'a pas été rejouée en E2E. Elle est couverte par le test unitaire `editionBridgeCounts('fr', ['fr'])`, et en Clerk par le build FR seul.

## Fichiers et reprise

Nouveaux :
- migration et métadonnées : `drizzle/0021_user_preferred_edition.sql`, `drizzle/meta/0021_snapshot.json` ;
- route : `src/app/api/edition-preference/route.ts` ;
- bibliothèque : `src/lib/edition-bridge.ts`, `src/lib/edition-halo.ts`, `src/lib/edition-preference-store.ts` ;
- tests : `src/lib/edition-e6.test.ts`, `src/lib/edition-preference.integration.test.ts` ;
- composant : `src/components/radar/EditionBridgeLine.tsx`.

Modifiés :
- base et proxy : `src/db/schema.ts`, `drizzle/meta/_journal.json`, `src/proxy.ts` ;
- API et collecteur : `src/lib/{api-contracts,edition-client,rss-collector,rss-collector-types}.ts`, `src/app/api/live/rss/route.ts` ;
- Radar : `src/components/radar/{NewsFeed,TacticalVectorMap,useRadarData}.tsx/.ts`, `LiveRadarDashboard.tsx` ;
- coquille et compte : `src/components/shell/{EditionSwitcher,AccountPreferences}.tsx`, `src/app/[edition]/(clerk)/app/layout.tsx`, `account/page.tsx` ;
- dictionnaires : `src/i18n/{fr,en,ar}.ts` ;
- tests : `src/lib/radar-access.test.ts`, `e2e/{editions,edition-api,auth-entry}.spec.ts`, `e2e/helpers/radar-fixture.ts` ;
- relecture arabe : `docs/relecture-arabe-e4-2026-10-12.csv`.

Hors dépôt : `.local-logs/stream-cycle/feeds-verify-step.{cjs,md}`, bancs et traces `.local-logs/editions-e6/`.

Ports 3001/3002 libres, serveurs du lot arrêtés. **Le dernier `.next` est un build FR seul (mode Clerk).**
