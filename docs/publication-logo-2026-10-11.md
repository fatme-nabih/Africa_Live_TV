# Nouveau logo Africa Live — publié sur staging le 11 octobre 2026

Le propriétaire a fourni l’image de référence du logo (version sans couronne), demandé de supprimer les logos inutilisés de `public/` et d’en décliner tous les formats, puis « commite et pousse le changement de logo (github + railway) ». Cible : service Africa_Live_TV du projet `just-compassion`, rôle **staging**, domaine `staging.africatv.sn`.

## Ce qui est livré

- **Image de référence** : `public/africa-live-logo.png` (1254 × 1254, fond noir opaque, recompressée sans perte). Toutes les déclinaisons en sont tirées (sharp, lanczos3).
- **Déclinaisons** : `africa-live-logo.webp` 640 px (logo de l’interface, écran hors-ligne, service worker), `brand/backdrop-480.webp` 480 px WebP q55 (fond de marque, 19 Ko, recette UX-602 inchangée), icônes PWA `africa-live-icon-192/512.png`, `apple-touch-icon.png` et `src/app/apple-icon.png` 180 px, `src/app/icon.png` 512 px, `favicon-32x32.png`, `favicon.ico` (16/32/48, dans `public/` et `src/app/`), `og-image.png` 1200 × 630 (logo 500 px centré sur fond sombre).
- **Supprimés (aucune référence)** : `logo.png`, `logo-circle.png`, `logo-192.png`, `logo-512.png`, `africa-live-social.png`, `africa-live.svg`, `favicon-16x16.png`.
- **Service worker** : cache `al-offline-v1` → `al-offline-v2`, pour que les applications installées remplacent l’ancien logo mis en cache par l’écran hors-ligne.
- **Piège découvert en local** : les entrées PNG d’un `.ico` doivent être **RGBA** ; sinon Turbopack refuse `src/app/favicon.ico` (« The PNG is not in RGBA format ») et toutes les pages répondent 500. Les favicons sont générés avec `ensureAlpha()`.

## GitHub et CI

- Code [`ae4908c`](https://github.com/fatme-nabih/Africa_Live_TV/commit/ae4908cfeb536f6e64b939577b9b0379f2c2947e) (20 fichiers, images et `sw.js` seulement), poussé sur main.
- CI [38138572694](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/38138572694) **SUCCESS** au premier passage : 437 unités (41 intégrations ignorées dans ce mode), 41/41 intégrations PostgreSQL isolées, 16 E2E de build, 100 composants, 68 parcours d’interface. **Snyk Code indisponible pour l’organisation.**

## Railway et réception

- Runtime précédent `d522dd4b`. Préflight : rôle staging, modes locaux désactivés, **21/21 migrations**, aucune en attente. Aucun changement de schéma : pas de nouvelle sauvegarde nécessaire.
- Un seul envoi par CLI d’un snapshot de **626 fichiers Git** fondé sur `ae4908c`, fichiers privés et médias de test exclus.
- Railway **`c96187b6-dab4-494c-a5a5-883679e2e212` SUCCESS** ; **484/484 fichiers applicatifs SHA-256 identiques** au commit ; Next 16.3.8, rôle staging, NODE_ENV production, modes locaux désactivés, mur TV conservé.
- **Images servies** (34 contrôles, `staging.africatv.sn` et domaine Railway) : les 9 images de marque sont octet pour octet celles du commit, les 7 anciens logos répondent 404, `sw.js` sert le cache v2. Balises `icon`, `apple-touch-icon`, `manifest` et `og:image` présentes sur la page d’accueil.
- Santé **HTTP 200** sur les deux domaines ; routes protégées refusées aux anonymes ; **14/14 E2E distants**.

## Conservation et limites

Hors commit et conservés intacts : grille des pays à hauteur bornée (`CountryChannels.tsx`, `country-grid.spec.ts`, banc `many=1` de `entry.tsx`), météo collante de `LiveRadarDashboard.tsx`, `.claude/`.

Aucun changement de configuration Railway/Clerk/OVHcloud/DNS, de plan, de droits, de paiement ou de transport média. Les réseaux sociaux et navigateurs qui ont déjà mis en cache l’ancienne image de partage ou l’ancien favicon peuvent l’afficher encore quelque temps.

Preuves privées : `.local-logs/publication-logo-2026-10-11/` (`assets-proof.cjs` compare les images servies au commit). Le commit documentaire ne change aucun fichier applicatif ; aucun nouveau déploiement n’est nécessaire.
