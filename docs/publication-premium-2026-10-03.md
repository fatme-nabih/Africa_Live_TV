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

Les résultats finaux de build, push, déploiement et réception distante sont
consignés à la clôture. Preuves locales ignorées :
`.local-logs/publication-2026-10-03/`.

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
