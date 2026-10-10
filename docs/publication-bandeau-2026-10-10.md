# Publication du bandeau Radar — 10 octobre 2026

Le propriétaire a explicitement demandé commit, push et déploiement sur Railway après la réception locale. La cible reste le service Africa_Live_TV du projet `just-compassion`, au rôle **staging**, sur `staging.africatv.sn`.

## Périmètre et préparation

- Bandeau et collecte des marchés : pause/reprise, boucle mesurée, lecteur mobile/Éco/mouvement réduit, liens stables, filtres Afrique/Monde, variation depuis la séance précédente, dates, validation des données et actualisation bornée. [Réception détaillée](bandeau-correctifs-2026-10-10.md).
- La présentation Radar déjà présente localement accompagne cette livraison : bandeau dans l’en-tête, retrait des anciens panneaux marchés/sources, libellés simplifiés du fil, des tuiles et de la météo ; les tests associés sont adaptés. Les modifications locales de récupération des pays/favoris (`FollowedCountriesSync` et son test) restent hors du commit.
- Réception avant publication : **413 tests unitaires réussis**, 40 intégrations ignorées par le runner unitaire et réservées au runner isolé ; types et lint complets réussis, contrôle des migrations réussi, audit des dépendances production sans vulnérabilité. Build et neuf tests Edge du bandeau reçus lors de la réception locale finale.
- Une tentative supplémentaire de tests Radar sur le serveur du propriétaire exigeait une session authentifiée et le mode de test local ; arrêt du seul processus de tests après le constat des redirections de connexion. Aucun changement de configuration du serveur. La CI exerce ces parcours avec sa fixture et son environnement local dédiés.
- GitHub/main et HEAD identiques avant publication. Aucun repoTrigger Railway : le push ne produit pas de déploiement automatique concurrent.
- Runtime staging revérifié : NODE_ENV production, modes MVP/local/playback/VLC désactivés, CI anonyme absent ; healthcheck public `/api/health` (120 s), pré-déploiement `npm run db:migrate:deploy` (300 s).
- **21 migrations identiques**, aucune en attente et aucune modification SQL dans cette livraison. La sauvegarde chiffrée pré-migration du même jour, déjà restaurée et comparée, est disponible : empreintes du fichier chiffré et du dump déchiffré revérifiées sans créer de dump en clair. Clé protégée par DPAPI Windows, fichiers privés hors Git.
- Un snapshot des fichiers Git du commit sera utilisé pour l’upload CLI. Les secrets, logs, sauvegardes, états d’authentification, captures privées et médias de tests synthétiques restent exclus.

## Livraison

En préparation. Le commit, la CI, le déploiement et la réception distante seront consignés après vérification.

Preuves privées : `.local-logs/publication-bandeau-2026-10-10/`. Le serveur utilisateur sur 3001 reste actif. Aucun changement de DNS, de plan, de Clerk, de rôle d’environnement ou de droits ; aucune copie du catalogue ni vérification globale des flux.
