# Publication GitHub et Railway staging — 10 octobre 2026

Publication explicitement demandée par le propriétaire après les corrections
B01–B20/A1 et BUG-905 (hydratation Clerk). Périmètre : code/tests/documentation
reçus localement, migration additive 0020. Railway `just-compassion` reste staging.

## Préparation reçue avant publication

- Référence GitHub/main et checkout : `e4ff28f`, aucune divergence distante.
- Service : `Africa_Live_TV`, projet `9df8bf76-5198-475d-a2db-9c72d0912b60`,
  environnement `f2fe6411-f8ca-47fd-991a-81fcfb1db585` nommé `production` dans
  l'interface, rôle applicatif **staging**. Déploiement précédent `738d71b8`.
- Runtime revérifié : Next 16.3.8, NODE_ENV production ; MVP, public MVP,
  lecture locale et VLC desktop false, mode CI anonyme absent. Pré-déploiement
  `npm run db:migrate:deploy` (300 s), santé `/api/health` (120 s).
- Aucun repoTrigger Railway : le push GitHub ne déclenche pas une seconde
  livraison ; upload CLI d'un snapshot Git prévu. Configurations conservées.
- Les vingt migrations distantes correspondent aux anciennes locales ;
  migration 0020 prête, additive, sans backfill ni changement de droits.
- Réception locale : 404 unités, 40 intégrations isolées, 53 composants, E2E
  applicatifs ciblés, trois SSR/hydratation ; types/lint/build/migrations/invariants
  et audit production reçus. [Dossier](validation-correctifs-bugs-2026-10-09.md),
  [complément Clerk](hydratation-clerk-2026-10-10.md). Réserves physiques maintenues.
- Vérification des chemins/secret avant commit : aucun fichier privé ni secret
  détecté dans les fichiers destinés à Git ; `.env*`, backups, logs et états
  d'authentification privés restent exclus. Sources IPTV inchangées.

## Sauvegarde pré-migration reçue

Préfixe privé :
`backups/railway/railway-before-bugs-0020-2026-10-10T13-56-23-053Z`.
Dump custom chiffré AES-256-GCM, clé DPAPI Windows. Déchiffrement et SHA-256
reçus, restauration dans une base locale temporaire unique, puis comparaison des
empreintes de huit tables métier et du journal de migrations : **identiques**.
24 tables public/drizzle restaurées, 20 migrations, 14 505 chaînes,
15 646 sources, six comptes, 56 favoris ; zéro achat/abonnement/pays suivi/retrait.
Base temporaire et dumps temporaires en clair supprimés ; trois fichiers de
sauvegarde chiffrée/métadonnées/clé protégée conservés hors Git.

## Livraison et réception

En cours : commit/push du code reçu, upload d'un snapshot Git sans fichiers privés,
migration pré-déploiement, santé/auth/E2E distants et empreintes des sources.
Preuves de passage privées : `.local-logs/publication-bugs-2026-10-10/`.

Les anciens clients checkout sans protocole 2 et préférences sans propriétaire
ou version sont refusés 409 avant mutation ; recharger l'application pour recevoir
le nouveau client. Les réserves d'appareils/profils réels restent distinctes.

Rollback : le retour à l'image précédente conserve l'ajout SQL mais réouvre les
anciens défauts d'identité/synchronisation. La migration est additive ; aucune
restauration par-dessus des comptes ou droits réels n'est incluse dans la livraison.
Les qualifications historiques n'ont pas été recontrôlées ; aucune tâche Windows,
copie du catalogue, activation des paiements, configuration Clerk/DNS ou
promotion en production n'est incluse.
