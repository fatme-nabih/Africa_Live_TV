# Publication Premium P3–P4 — 3 octobre 2026

Le propriétaire a explicitement demandé de committer P4, puis de pousser et publier P3 et P4 sur staging.

## Périmètre

- P3 « Radar vivant » (UX-301 → 308) : commit `412574d` et sa documentation `1ff0e53`.
- P4 « Landing, tarifs, compte » (UX-401 → 407, UX-212, UX-214) : commit applicatif
  [`06b662f`](https://github.com/fatme-nabih/Africa_Live_TV/commit/06b662f17f12fb5e9f8f5270a4460c70e36d74a9), 74 fichiers.
- Seule nouvelle dépendance : `@clerk/localizations` 4.9.0 (décision du propriétaire ; `@clerk/shared` reste en 4.20.0).

GitHub : `fatme-nabih/Africa_Live_TV`, branche `main`. Railway : projet `just-compassion`, service `Africa_Live_TV`,
environnement nommé `production` dans le tableau de bord, rôle applicatif **staging**. Pas de promotion en production.

## Contrôles avant publication

- GitHub synchronisé (`origin/main` = `01279c0`) avant le push ; local en avance de P3 + documentation.
- Code final de P4 : `tsc` 0, `lint` 0, `npm test` 348 (334 réussis, 14 ignorés, 0 échec), invariants 4/4, build réussi,
  E2E mode MVP 132 + 1 ignoré (2 échecs corrigés, specs rejoués 67/67), E2E mode Clerk 8/8 (détail : `production-progress.md`, « Lot P4 »).
- Aucun changement de schéma depuis la publication vérifiée du 3 octobre (`drizzle/` et `src/db` inchangés, 19/19) ; contrôle
  Drizzle local réussi ; pré-déploiement `npm run db:migrate:deploy` conservé (sans effet). Pas de sauvegarde requise (aucune migration).
- Recherche de secrets sur les 74 fichiers du commit : aucun ; aucun fichier privé (`.env*`, sessions, sauvegardes, journaux).
- Captures `/account` et `/admin` : e-mails et noms masqués avant capture.

## Livraison et réception

- Push `01279c0..06b662f` sur `main`, confirmé par `git ls-remote`. Aucun déploiement automatique déclenché par le push.
- Paquet CLI extrait du commit `06b662f` : 483 fichiers (sans captures ni fixtures), 391 fichiers applicatifs ; empreinte du manifeste
  `d07dc23366d74e4a6051ef50b5a1b4bb05dd1324056d565aaabdf1143bb67c44`.
- Railway : **`990745ba-1fe3-4ebc-82cf-23acc5736f17` SUCCESS** (build ≈ 2 min, déploiement ≈ 30 s).
- Preuve SHA-256 par SSH : **391/391 fichiers applicatifs identiques**, 0 différence ; rôle `staging`, Node en production.
  (La vérification se fait par lots de 30 : en un seul envoi, la commande était tronquée par le relais SSH.)
- `staging.africatv.sn` et `africalivetv-production.up.railway.app` : santé 200 (processus et base `ok`), météo anonyme 401
  `AUTHENTICATION_REQUIRED`, dashboard 307 vers la connexion.
- **9/9 E2E distants** (34 s) : landing, widgets Clerk, accès anonymes protégés, paiement simulé sans transaction (CTA « Activer pour
  990 FCFA »), build servi (worker MapLibre réel).
- Landing de staging : chiffres lus dans la base Railway (11 771 chaînes, 371 africaines, 36 pays) ; image du hero servie (42 Ko).

## Limites

- Profils Clerk connectés sur staging, paiement réel, amonts à l'instant T, appareils Android et VLC réel : hors réception.
- Le nom d'application du tableau de bord Clerk reste « Afrika_Live » (visible sur des écrans secondaires) : correction côté Clerk
  par le propriétaire.
- Variables, DNS, plans et schéma inchangés ; source IPTV inchangée. Preuves locales ignorées par Git : `.local-logs/publication-p3p4/`.
