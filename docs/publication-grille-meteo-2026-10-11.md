# Grille des pays bornée et météo collante — publiées sur staging le 11 octobre 2026

Le propriétaire a demandé « commite et pousse la grille des pays et la météo collante », puis « publie sur railway ». Cible : service Africa_Live_TV du projet `just-compassion`, rôle **staging**, domaine `staging.africatv.sn`.

## Ce qui est livré

- **Grille des pays bornée sur ordinateur** (`xl`) : la grille et la liste des chaînes d’un pays défilent dans leur panneau, à la hauteur du fil des dépêches (`xl:max-h-[515px]`). La recherche, les pastilles de région et l’en-tête du pays restent visibles. Sur téléphone, pas de défilement imbriqué : la page défile normalement.
- **Météo collante sur ordinateur** : la colonne météo du Radar est `xl:sticky xl:top-20` et accompagne le défilement au lieu de laisser un vide sous elle.
- **Tests composants** : « ordinateur : la grille complète défile dans le panneau, la recherche reste visible » (55 pays, banc `many=1` de `e2e/components/entry.tsx`) et « téléphone : pas de défilement imbriqué ».

## GitHub et CI

- Code [`2d6ac38`](https://github.com/fatme-nabih/Africa_Live_TV/commit/2d6ac38f8c694325b5711b9394a28d0e3e755892), poussé sur main ; le commit suivant `b19e3fa` ne touche que `contextellm.md`.
- Avant commit : types, lint, 437 unités, 9/9 composants de la grille.
- CI [38139802519](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/38139802519) **SUCCESS** au premier passage : 437 unités (41 intégrations ignorées dans ce mode), 41/41 intégrations PostgreSQL isolées, 16 E2E de build, **102 composants**, 68 parcours d’interface. **Snyk Code indisponible pour l’organisation.**

## Railway et réception

- Runtime précédent `c96187b6` (nouveau logo). Préflight : rôle staging, modes locaux désactivés, **21/21 migrations**, aucune en attente. Aucun changement de schéma.
- Un seul envoi par CLI d’un snapshot de **627 fichiers Git** fondé sur `2d6ac38` (dernier commit applicatif), fichiers privés et médias de test exclus.
- Railway **`60a3d3e9-8491-4ae8-bfcd-84fba4194627` SUCCESS** ; **484/484 fichiers applicatifs SHA-256 identiques** au commit ; Next 16.3.8, rôle staging, NODE_ENV production, modes locaux désactivés, mur TV conservé.
- Code client construit : classes `xl:max-h-[515px]` (`max-height:515px`), `xl:sticky` et `xl:top-20` présentes.
- Santé **HTTP 200** sur les deux domaines ; routes protégées refusées aux anonymes ; **14/14 E2E distants**.

## Limites

Non reçu en session connectée sur staging (connexion Clerk impossible dans le navigateur intégré) : le comportement est couvert par les tests composants et la présence du CSS construit. Aucun changement de configuration Railway/Clerk/OVHcloud/DNS, de plan, de droits, de paiement ou de transport média.

Preuves privées : `.local-logs/publication-grille-meteo-2026-10-11/`. Le commit documentaire ne change aucun fichier applicatif ; aucun nouveau déploiement n’est nécessaire.
