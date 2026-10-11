# Bouton pause du bandeau — supprimé sur staging le 11 octobre 2026

Le propriétaire a demandé de supprimer le bouton pause du bandeau sans affecter les autres fonctions, puis « commit et push sur github et update railway ». Cible : service Africa_Live_TV du projet `just-compassion`, rôle **staging**, domaine `staging.africatv.sn`.

## Ce qui est livré

Le bouton pause/reprise de `LiveMarketTicker.tsx`, son état interne et ses deux icônes sont retirés. Le défilement des deux lignes, les arrêts au survol/focus et à l'ouverture de « Voir tout », la navigation mobile, les modes Éco/mouvement réduit, les sources, l'actualisation et la sélection des produits sur la carte sont conservés. Les tests existants du bandeau sont adaptés ; le CSS ne change que dans son commentaire.

## GitHub et CI

- Code [`c52818a`](https://github.com/fatme-nabih/Africa_Live_TV/commit/c52818a2d9219a52a3bbd7233b0e8b53b0fd91d8), poussé sur main. `.claude/` reste hors commit.
- Avant commit : TypeScript, ESLint ciblé et **15/15 composants du bandeau** réussis dans Edge sur le banc isolé 3002.
- CI [38141775034](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/38141775034) **SUCCESS** au premier passage : 437 unités (41 intégrations ignorées dans ce mode), 41/41 intégrations PostgreSQL isolées, 16 E2E de build, 102 composants et 68 parcours d'interface. Types, lint, build et audit production réussis. **Snyk Code indisponible pour l'organisation.**

## Railway et réception

- Runtime précédent `60a3d3e9`. Avant et après publication : rôle staging, modes locaux désactivés, **21/21 migrations**, aucune en attente, fichiers de migration identiques. Aucun changement de schéma ; aucune nouvelle sauvegarde nécessaire pour cette livraison.
- Un seul envoi par CLI d'un snapshot de **628 fichiers Git** fondé sur `c52818a`, fichiers privés et médias de test exclus.
- Railway **`9ac3d8de-0357-4e68-a13f-9aa4110ce40c` SUCCESS** ; **484/484 fichiers applicatifs SHA-256 identiques** au commit ; Next 16.3.8, rôle staging, NODE_ENV production, modes locaux désactivés, mur TV conservé.
- Scripts clients construits : libellés pause/reprise absents ; fil, lecteur mobile, détails, animation et arrêts automatiques présents.
- Santé **HTTP 200** sur les domaines staging et Railway ; routes protégées refusées aux anonymes ; **14/14 E2E distants**.
- Réception réelle dans l'onglet Edge connecté après rechargement : aucun bouton pause/reprise, 31 liens de source présents, les deux lignes défilent ; « Voir tout » ouvert arrête les deux lignes, sa fermeture les relance. Capture privée `radar-staging.jpg` dans le dossier de preuves.

Aucun changement d'API, SQL, authentification, configuration Railway/Clerk/OVHcloud/DNS, de plan ou de transport média. Le projet source IPTV est inchangé. Preuves privées : `.local-logs/publication-pause-2026-10-11/`. Le commit documentaire de clôture ne modifie aucun fichier applicatif et ne nécessite aucun nouveau déploiement.
