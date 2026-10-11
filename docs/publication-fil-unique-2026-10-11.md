# Fil unique Afrique + Monde, drapeaux et planète — publié sur staging le 11 octobre 2026

Le propriétaire a demandé de fusionner les deux défilements du bandeau (sélecteur « Afrique / Monde » devenu inutile), d’afficher le mini-drapeau du pays au lieu du code, et une planète pour les dépêches internationales ; puis « commit, mets à jour les .md, puis publie sur staging ». Cible : service Africa_Live_TV du projet `just-compassion`, rôle **staging**, domaine `staging.africatv.sn`.

## Ce qui est livré

- **Un seul fil** : le sélecteur « Périmètre du fil » est supprimé. `marketTickerItems(snapshot)` ne prend plus de périmètre : dépêches africaines, internationales et à localiser, dans l’ordre chronologique du relevé (le serveur garde toujours 12 dépêches au plus par périmètre), puis tous les cours et taux, sans doublon d’URL canonique. Texte de « Voir tout » unifié.
- **Drapeau du pays** devant une dépêche africaine (`CountryFlag`, module de drapeaux déjà utilisé par la grille) : il reste un bouton « Voir le pays : … », nom du pays en info-bulle. **Planète** (`Earth`, info-bulle et libellé accessible « Monde ») devant une dépêche internationale. Badge « Touche l’Afrique » conservé. Une dépêche sans lieu connu n’a ni l’un ni l’autre (« Localisation à préciser » dans « Voir tout »).
- **Correctif découvert pendant la réception** : sur mobile, les libellés pour lecteurs d’écran (`.sr-only`, absolus) des boutons du panier sortaient de leur ligne défilante et élargissaient la page à 2 033 px avec un panier complet. `.marquee` devient `position: relative`. Nouveau test composant qui échoue sans le correctif.
- **Test `radar-live` corrigé** : il attendait un lien « Partager », devenu bouton de menu en `b3b1e51` ; il vérifie maintenant le bouton et son `aria-haspopup="menu"`.

## Réception locale

Types, lint, build, 437 unités ; 21/21 composants bandeau + Regards sur le monde (port 3002) ; `radar-live` 26/26 et `radar-reliability` en mode MVP. Captures de la vraie page `/app/live` (mode MVP, données collectées en direct) : `docs/screenshots/bandeau-fil-unique-radar-{360,768,1366,1366-drapeaux}.png`, 0 débordement, 0 texte < 12 px, 0 erreur de page. Ligne technique MVP retirée ensuite.

## GitHub et CI

- Code [`dc369b0`](https://github.com/fatme-nabih/Africa_Live_TV/commit/dc369b099f93485b738ad6dca0a15bdfe902e9c2), poussé sur main.
- CI [38136502980](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/38136502980) **SUCCESS** au premier passage : 437 unités (41 intégrations ignorées dans ce mode), **41/41 intégrations PostgreSQL isolées**, 16 E2E de build, **100 composants**, **68 parcours d’interface**. Types, lint, build et audit des dépendances de production réussis. **Snyk Code indisponible pour l’organisation.**

## Railway et réception

- Runtime précédent `b0d948f5`. Un seul envoi par CLI d’un snapshot de **632 fichiers Git** fondé sur `dc369b0`, fichiers privés et médias de test exclus.
- Railway **`d522dd4b-3049-4a76-a59c-c6ef5008e3c5` SUCCESS** ; **484/484 fichiers applicatifs SHA-256 identiques** au commit. Le code client construit contient le fil unique et le bouton drapeau ; le sélecteur « Périmètre du fil » et l’ancien message « pour ce périmètre » en sont absents ; panier et « Regards sur le monde » présents.
- Next 16.3.8, rôle **staging**, NODE_ENV production ; modes locaux, lecture locale, VLC desktop et accès anonyme CI désactivés ; mur TV conservé.
- **21/21 migrations**, aucune en attente, aucun ajout SQL. Sauvegarde chiffrée restaurable du 10/10 revérifiée (chiffrement/déchiffrement et empreintes, sans dump en clair).
- Santé **HTTP 200** sur `staging.africatv.sn` et le domaine Railway ; routes protégées refusées aux anonymes ; **14/14 E2E distants**.
- Inventaire en lecture seule identique avant/après : **14 505 chaînes, 15 646 sources, 56 favoris, 0 pays suivi**.

## Conservation et limites

Hors commit et conservés intacts (empreintes vérifiées) : grille des pays à hauteur bornée (`CountryChannels.tsx`, `country-grid.spec.ts`, banc `many=1` de `entry.tsx`), météo collante de `LiveRadarDashboard.tsx`, `.claude/`. Aucun fichier de la livraison n’était mélangé avec ces changements.

Aucun changement de configuration Railway/Clerk/OVHcloud/DNS, de plan, de droits, de paiement ou de transport média.

Non reçu en session connectée sur staging : la connexion Clerk du propriétaire n’aboutissait pas dans le navigateur intégré (page blanche sur `accounts.dev`, boucle de redirection signalée par le serveur local). Au moment de la réception, le fil réel comptait 14 dépêches dont une seule internationale : c’est l’état réel des flux.

Preuves privées : `.local-logs/publication-fil-unique-2026-10-11/`. Le commit documentaire ne change aucun fichier applicatif ; aucun nouveau déploiement n’est nécessaire.
