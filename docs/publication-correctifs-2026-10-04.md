# Publication des correctifs COR — 4 octobre 2026

Le propriétaire a expressément demandé la mise à jour GitHub et Railway après le bilan de réception locale. Publication du candidat reçu localement sur `main` et le staging existant `just-compassion`, sans promotion en production. COR-506 reste partiel ; COR-900 conserve les réserves sur profilage authentifié, sessions connectées et appareils réels.

## Préparation vérifiée

- Git local et `origin/main` alignés sur `2ab18b6` avant publication ; modifications documentaires préexistantes conservées.
- 364 unités réussies (23 intégrations ignorées dans cette commande), puis 23/23 intégrations PostgreSQL isolées ; typage, lint, migrations, build Next 16.3.8 et audit production reçus. E2E et limites : [dossier local](correctifs-audit-validation-2026-10-04.md).
- Railway : rôle `DEPLOYMENT_ENV=staging`, MVP/public MVP/lecture locale/VLC desktop à `false`. Configuration conservée : `db:migrate:deploy`, délai 300 s ; `/api/health`, délai 120 s.
- 20 migrations locales et 20 appliquées sur Railway, aucun hash différent, aucune migration en attente. Aucune modification de schéma dans COR. La sauvegarde chiffrée et restaurée avant D-4 reste disponible sous le préfixe `backups/railway/railway-2026-10-04T14-32-53-630Z` (fichiers `.json`, `.dump.aes256gcm`, `.key.dpapi`, hors Git).
- Aucun déclencheur de déploiement GitHub automatique sur le service : livraison par Railway CLI d’un instantané Git isolé, sans `.env`, sauvegarde, log privé ou média synthétique.
- Déploiement précédent sain : `490d48be-6c86-4157-ba1e-29f642c13f66` ; rollback applicatif possible. Aucune nouvelle migration à inverser.

## Réception distante

Première livraison reçue : commit [`5e97ce8`](https://github.com/fatme-nabih/Africa_Live_TV/commit/5e97ce8), Railway `8ef029d4-5b95-4480-9d04-8cca4fdd7a91` SUCCESS actif. 438/438 fichiers applicatifs identiques par SHA-256, Next 16.3.8 installé, rôle staging et modes locaux désactivés. Santé processus/base 200 sur les deux domaines ; météo anonyme 401, Radar/mur/pays suivis 307 vers connexion. Pré-déploiement reçu ; 20 migrations inchangées. **10/10 E2E distants**, dont rechargement d’une création de paiement incertaine simulée, widgets Clerk réels et module worker ; aucune session membre/admin ni paiement réel.

Publication finale en cours : compléments CI du commit `73b685d`, après validation distante de la première livraison. Aucune réparation d’abonnement réel, activation de paiement ou modification Clerk/DNS/OVHcloud/plan d’hébergement n’est incluse.

Premier passage CI du candidat `5e97ce8` : installation, lint, typage et audit production réussis, arrêt avant les tests sur `SNYK-CODE-0005` (Snyk Code non activé pour l’organisation). Le workflow distingue désormais cette indisponibilité explicite d’une vulnérabilité ou d’une erreur de scan : avertissement pour ce seul code ou jeton absent, échec conservé pour les autres issues. Aucun changement d’abonnement ou d’état Snyk. Audit production et suites de validation restent obligatoires ; aucun scan SAST reçu n’est revendiqué.

Le passage suivant reçoit unités, intégrations et build, puis révèle des lacunes du harnais CI anonyme : les API Radar n’étaient pas refusées avant leurs appels Clerk, et la page d’erreur de paiement appelait Clerk même sans identifiant de commande. Refus explicite du Radar dans le mode anonyme **local CI seulement** ; message public générique sans lookup, accès aux commandes conservant Clerk et le propriétaire. La préparation UI reçoit aussi une chaîne/source synthétique détenue, nécessaire dans la base CI vide, et son nettoyage exact : inventaires locaux identiques avant/après (2 utilisateurs, 14 505 chaînes, 15 646 sources, 445 sessions). Ces compléments ne changent aucun drapeau distant.

Reproduction du blocage des fixtures : avec le même serveur MVP sur 3001, `/app` répond 200 à `localhost` et 403 à `127.0.0.1`, car Next normalise l’URL serveur et la vérification locale exige une origine cohérente. La CI utilise désormais `localhost:3001` pour toutes ses origines, sans affaiblir le contrôle de confiance. Le passage obsolète sur l’alias numérique est annulé pour éviter les reprises inutiles.

Le passage sur l’origine corrigée reçoit 9 E2E de build (10 ignorés, dont widgets Clerk sans vraie clé et parcours connectés), puis 58 tests d’interface (1 ignoré et 1 échec). Le seul échec attendait 400 alors que `ENABLE_LOCAL_VLC=false` impose 501 avant la validation du corps. Le test exige désormais le statut **et le code exacts** du mode configuré : 501 / `LOCAL_VLC_DISABLED` si désactivé, 400 / `INVALID_CHANNEL_ID` si activé, puis rejet 403 de l’origine étrangère. Le lancement desktop reste désactivé en CI ; aucune modification de l’API VLC.
