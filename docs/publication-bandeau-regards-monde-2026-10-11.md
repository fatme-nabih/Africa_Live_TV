# Bandeau sur deux lignes, carte des produits et « Regards sur le monde » — publiés sur staging le 11 octobre 2026

Le propriétaire a demandé commit, push et mise à jour de Railway par CLI après la réception locale des lots A, B et C. Cible : service Africa_Live_TV du projet `just-compassion`, rôle **staging**, domaine `staging.africatv.sn`.

## Ce qui est livré

- **Lot A, bandeau** : sur ordinateur, deux lignes qui défilent à vitesse constante. La première porte les dépêches économiques (Afrique/Monde), la seconde le panier : riz, blé, Brent, or, cacao, coton, café, cuivre dans leur devise de cotation d’origine (cents US affichés tels quels), puis 1 USD en FCFA (indicatif) et 1 EUR en FCFA (parité fixe). Un seul bouton pause pour les deux lignes ; pause aussi au survol, au focus et quand « Voir tout » est ouvert. Sur mobile, en mouvement réduit ou en mode Éco : une dépêche à la fois avec précédent/suivant, panier à faire glisser au doigt. La conversion des cours en FCFA, essayée pendant la réception, a été retirée à la demande du propriétaire.
- **Lot B** : mini-courbe des cinq dernières séances, de couleur neutre (seule la variation est colorée). Un produit du panier allume sur la carte ses principaux pays producteurs ou importateurs, avec un encadré texte accessible qui fonctionne aussi sans la carte. Liste indicative, non vérifiée pays par pays sur une source chiffrée : `src/lib/market-geography.ts`.
- **Lot C, « Regards sur le monde »** : rubrique sous la grille du Radar, filtres Europe / Amériques / Moyen-Orient / Asie-Pacifique / L’Afrique dans le monde. Collecteur séparé du fil africain (`src/lib/world-desk.ts`, route authentifiée `/api/live/world`) : 15 flux en français vérifiés un par un le 11/10 (France 24, RFI, Le Monde par rubrique régionale ; Radio-Canada, Euronews, Courrier international classés d’après le titre). Titres et liens seulement, chargement à l’approche de la rubrique. Détection stricte des pays africains ; badge « Touche l’Afrique » dans la rubrique et sur les dépêches internationales du bandeau. Écartés : DW (flux vide), TRT (404), Swissinfo (pas de RSS), La Presse (format non standard).

## GitHub et CI

- Code [`47eb841`](https://github.com/fatme-nabih/Africa_Live_TV/commit/47eb8414437ffb2ef70c2c04ef55bd71063fd71c) puis test [`42e5be7`](https://github.com/fatme-nabih/Africa_Live_TV/commit/42e5be7730c698723626db12f30247c08aa0439f), poussés sur main.
- La première CI [38100425510](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/38100425510) a échoué sur trois parcours `radar-reliability` : le groupe Afrique/Monde s’appelle désormais « Périmètre du fil » et le bandeau a une copie de boucle par ligne. Les tests de l’application complète n’avaient pas été relus pendant le renommage. `42e5be7` met à jour ces assertions (et `radar-live`) sans les affaiblir : tout élément inerte de la page doit être une copie de boucle du bandeau, une par ligne. Un test `followed-countries` instable (réussi au second essai) est sans rapport. Aucun déploiement n’a eu lieu avant la CI verte.
- CI finale [38102171188](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/38102171188) **SUCCESS** : 437 unités (41 intégrations ignorées dans ce mode), **41/41 intégrations PostgreSQL isolées**, 16 E2E de build, **99 composants**, **68 parcours d’interface**. Types, lint, build et audit des dépendances de production réussis. **Snyk Code indisponible pour l’organisation.**

## Railway et réception

- Runtime précédent `7c44e966`. Un seul envoi par CLI d’un snapshot de **631 fichiers Git** fondé sur `42e5be7`, fichiers privés et médias de test exclus.
- Railway **`b0d948f5-047c-4eb5-a657-b28215e1aae9` SUCCESS** ; **484/484 fichiers applicatifs SHA-256 identiques** au commit. Le code client construit contient la rubrique, le badge, le panier, le bouton pause commun et l’encadré des produits ; la conversion FCFA et l’ancien bouton « Reprendre le défilement » en sont absents.
- Next 16.3.8, rôle **staging**, NODE_ENV production ; modes locaux, lecture locale, VLC desktop et accès anonyme CI désactivés ; mur TV conservé.
- **21/21 migrations**, aucune en attente, aucun ajout SQL. Sauvegarde chiffrée restaurable du 10/10 revérifiée (chiffrement/déchiffrement et empreintes, sans dump en clair).
- Santé **HTTP 200** sur `staging.africatv.sn` et le domaine Railway ; `/api/live/world` refusé aux anonymes (401 `AUTHENTICATION_REQUIRED`), comme les autres routes protégées ; **14/14 E2E distants**.
- Inventaire en lecture seule identique avant/après : **14 505 chaînes, 15 646 sources, 56 favoris, 0 pays suivi** côté serveur.

## Conservation et limites

Hors commits et conservés intacts : grille des pays à hauteur bornée (`CountryChannels.tsx`, `country-grid.spec.ts`, banc `many=1` de `entry.tsx`), météo collante de `LiveRadarDashboard.tsx`, `.claude/`. Les deux fichiers mixtes ont été indexés sans les changements du propriétaire.

Aucun changement de configuration Railway/Clerk/OVHcloud/DNS, de plan, de droits, de paiement ou de transport média. Le collecteur international lit des flux publics et ne stocke rien en base.

Non reçu en session connectée sur staging ni sur `localhost:3001` (compte du propriétaire requis) ; les parcours de l’application complète ont été validés par la CI. Pendant la réception locale, le serveur du propriétaire sur 3001 s’est arrêté deux fois ; la seconde fois, une suite de composants lancée sur 3002 contenait des tests (`payment.spec.ts`, `player.spec.ts`) qui visent `127.0.0.1:3001` en dur et ont donc interrogé ce serveur : rôle non établi, configuration privée supprimée. « L’Afrique dans le monde » ne comptait que trois dépêches au moment de la réception : c’est l’état réel des flux.

Preuves privées : `.local-logs/publication-regards-2026-10-11/`. Le commit documentaire ne change aucun fichier applicatif ; aucun nouveau déploiement n’est nécessaire.
