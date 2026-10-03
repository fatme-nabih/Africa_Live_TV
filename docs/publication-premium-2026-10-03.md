# Publication Premium P0–P2 — 3 octobre 2026

Le propriétaire a explicitement demandé de vérifier les changements non
committés, puis de committer, pousser sur GitHub et publier sur Railway.

## Périmètre

- Lots Premium P0, P1 et P2 : identité visuelle, composants UI, coquille
  commune, navigation/pays/horloge, rangées TV, catalogue Afrique d'abord,
  commandes du lecteur, zapping, partage et mode Éco data.
- Tests, captures de réception Premium et documentation de reprise associés.
- Retrait des anciens visuels Lumina et du manifeste statique redondant ;
  les ressources Africa Live et le manifeste Next restent présents.
- Fiche de synchronisation locale du 2 octobre incluse dans la documentation.

GitHub : `fatme-nabih/Africa_Live_TV`, branche `main`. Railway : projet
`just-compassion`, service `Africa_Live_TV`, environnement nommé `production`
dans le dashboard, rôle applicatif **staging**. Pas de promotion en production.

## Contrôles avant publication

- GitHub et HEAD initial `1aa85b5` synchronisés avant les commits.
- Unitaires : 307 réussis, 14 intégrations PostgreSQL ignorées, zéro échec.
- Invariants : 4/4 ; TypeScript et ESLint sans erreur ni avertissement.
- Contrôle Drizzle local réussi ; aucun changement de schéma ou dépendance.
- Lecture SSH Railway : 19 migrations appliquées, 19 fichiers, zéro en
  attente et aucune différence d'empreinte. Aucun changement de schéma à
  appliquer ; pré-déploiement existant `npm run db:migrate:deploy` conservé.
- Rôle staging et quatre drapeaux locaux à `false` vérifiés sans exposer
  les secrets. Variables, DNS et plans conservés.
- Build dans un snapshot ignoré séparé pour préserver le serveur dev 3001.
- Build optimisé réussi : Next.js 16.3.5, TypeScript et 26 pages générées.
- Contrôle des fichiers publiables : aucun secret détecté ; seules les
  valeurs synthétiques de trois fichiers de tests préexistants ont été signalées.
- E2E Clerk locaux : 8/8 réussis, test réservé au build ignoré. Le premier
  essai était injoignable (serveur arrêté) ; serveur relancé sur 3001 et
  passage final réussi. Santé locale 200, météo anonyme 401, dashboard 307.

Preuves locales ignorées : `.local-logs/publication-2026-10-03/`.

## Livraison et réception finale

- Commit applicatif et dossier initial :
  [`1ef60b54fd39acfe7b490ba04581234c8736486b`](https://github.com/fatme-nabih/Africa_Live_TV/commit/1ef60b54fd39acfe7b490ba04581234c8736486b),
  poussé sur `main` et confirmé par `git ls-remote`. 226 fichiers dans le commit.
- Upload CLI extrait de ce commit, 430 fichiers sans captures ni fixtures ;
  empreinte SHA-256 du manifeste :
  `830892c9e035e3635cbb15cc7b733700b6e5b367b5779f99a6a04b58282c4f2a`.
- Railway : **`117f35ed-2c1a-474f-ad72-dd0cea974a4f` SUCCESS** le 3 octobre
  2026, instance active RUNNING. Build, pré-déploiement et démarrage réussis.
- Vérification SHA-256 SSH : **343 fichiers applicatifs identiques**, zéro
  différence ; rôle `staging`, runtime Node en production.
- `staging.africatv.sn` et `africalivetv-production.up.railway.app` : santé
  HTTP 200, processus et base `ok`, météo anonyme HTTP 401 avec
  `AUTHENTICATION_REQUIRED`, dashboard HTTP 307 vers connexion.
- **9/9 E2E distants réussis**, zéro ignoré, 33,5 secondes : landing,
  widgets Clerk, accès anonymes protégés, paiement simulé sans transaction,
  worker MapLibre réel et protection météo/dashboard.
- Migrations après publication : toujours 19/19, zéro en attente et aucune
  différence d'empreinte ; variables de sécurité inchangées.
- Serveur local relancé en mode Clerk sur 3001, santé 200, météo 401,
  dashboard 307. Aucun changement de fichier d'environnement.

Un commit documentaire de clôture publie ces preuves et le contexte de
reprise. Il ne change aucun fichier applicatif reçu sur Railway.

## Limites

La réception complète MVP de P2 (108 réussis, un test réservé au build
ignoré) est une preuve historique du 2 octobre, détaillée dans
`production-progress.md`. Elle ne constitue pas un nouveau passage aujourd'hui.
P3–P5 et les reliquats UX restent à faire selon le plan Premium.
Profils Clerk connectés, amonts actuels, appareils physiques et VLC réel
restent hors réception de cette publication. Aucun paiement réel effectué.
Les fichiers d'environnement, sessions privées, sauvegardes et journaux
restent ignorés. Captures et fixtures synthétiques sont exclues du paquet
Railway. Le projet source IPTV demeure inchangé.
