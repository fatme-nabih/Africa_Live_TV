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

Publication en cours. Commit, déploiement, état de CI, preuves SHA-256, santé et E2E distants seront consignés après vérification. Aucune réparation d’abonnement réel, activation de paiement ou modification Clerk/DNS/OVHcloud/plan d’hébergement n’est incluse.

Premier passage CI du candidat `5e97ce8` : installation, lint, typage et audit production réussis, arrêt avant les tests sur `SNYK-CODE-0005` (Snyk Code non activé pour l’organisation). Le workflow distingue désormais cette indisponibilité explicite d’une vulnérabilité ou d’une erreur de scan : avertissement pour ce seul code ou jeton absent, échec conservé pour les autres issues. Aucun changement d’abonnement ou d’état Snyk. Audit production et suites de validation restent obligatoires ; aucun scan SAST reçu n’est revendiqué.
