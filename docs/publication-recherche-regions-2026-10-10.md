# Publication recherche et régions de la grille des pays — 10 octobre 2026

Le propriétaire a explicitement demandé commit, push et mise à jour de Railway, en CLI si le déploiement automatique ne se faisait pas. Cible : service Africa_Live_TV du projet `just-compassion`, rôle **staging**, `staging.africatv.sn`.

## Périmètre

- Grille des pays du Radar (Chaînes TV › Tous les pays) : champ « Rechercher un pays… » sans accents ni casse, codes pays et noms d’usage (« rdc », « ivory coast », nouvel alias « centrafrique / rca ») ; Entrée ouvre le premier pays trouvé.
- Pastilles de région Ouest, Centre, Est, Nord, Australe avec nombre de pays ; second clic = Toutes. Filtres appliqués aussi à « Vos pays » ; cas vide avec « Effacer les filtres » ; nombre de pays annoncé aux lecteurs d’écran.
- Banc de composants : script servi en UTF-8 (les expressions de suppression des accents n’étaient pas lisibles en Latin-1 ; le site réel servait déjà en UTF-8).
- Les modifications locales de `FollowedCountriesSync` et de son test restent hors commit, empreintes identiques avant et après.

## Livraison

- Commit [`7ad55d0`](https://github.com/fatme-nabih/Africa_Live_TV/commit/7ad55d0f057ba462d77856bc1fc981fb35e608b0). Réception locale : 422 unités, types, lint, build de production, `drizzle-kit check` verts ; 12/12 tests de composants grille + partage.
- CI [38079655538](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/38079655538) **SUCCESS** : 422 unités, 40/40 intégrations isolées, 16 E2E de build, 74 composants, 67 parcours d’interface. Snyk Code indisponible pour l’organisation.
- Aucun déploiement automatique après le push (dernier déploiement resté `93abbc27`) : déploiement par CLI.
- **Première tentative `66386c93` FAILED** : le CLI a reçu une erreur réseau pendant l’envoi ; Railway a créé le déploiement (message identifié) sans build associé. Aucun code construit, staging resté sain sur l’ancienne version. **Une seule relance**, même snapshot de 616 fichiers Git (474 applicatifs) : Railway **`474301eb-a3ae-41e7-ac47-6e4abed9e85d` SUCCESS**.
- **474/474 fichiers applicatifs SHA-256 identiques** sur le runtime ; bundle servi : recherche, filtre par région, grille, menu de partage et module de drapeaux séparé présents. Next 16.3.8, rôle staging, modes locaux désactivés.
- **21/21 migrations**, aucune en attente, aucun ajout SQL ; sauvegarde restaurable du jour revérifiée.
- Santé **200** sur les deux domaines, refus anonymes conservés, **14/14 E2E distants**. Aucun achat réel ni session authentifiée de test sur staging.

## Limites

- Grille reçue en banc de composants (vrai CSS) et par la CI ; pas de session connectée sur staging pendant la publication.
- Reste proposé : mise en page bureau (point 5), aperçu Facebook des chaînes.

Preuves privées : `.local-logs/publication-recherche-regions-2026-10-10/`. Aucun changement de DNS, de plan, de Clerk, de configuration Railway, de rôle d’environnement ou de droits.
