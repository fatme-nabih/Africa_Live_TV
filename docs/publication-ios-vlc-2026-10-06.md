# Publication VLC iPhone — 6 octobre 2026

Publication GitHub et Railway staging expressément demandée par le propriétaire
pour tester CNews sur iPhone. [Diagnostic et réception locale](ios-vlc-cnews-2026-10-06.md).

## Préparation

- Branche `main`, origine GitHub vérifiée au même HEAD avant publication.
- Typage/lint/build et sept tests de parcours reçus lors de la préparation du
  correctif. 398 unités : 375 réussies, 23 intégrations ignorées, aucun échec.
- La spec `mobile-vlc.spec.ts` est ajoutée à la réception des régressions UI en CI.
- Lecture seule Railway avant publication : rôle `staging`, runtime production,
  MVP/lecture locale/VLC desktop/anonyme CI désactivés ; 41 fichiers de migration
  identiques au Git existant, 20 migrations appliquées sur 20, aucune en attente.
  Aucun changement de schéma à livrer ; pas de nouvelle sauvegarde/migration.
- Cible explicite : projet `just-compassion`, service `Africa_Live_TV`,
  environnement du tableau de bord `production` avec rôle applicatif staging.
  Domaine de test : `https://staging.africatv.sn` ; domaine Railway conservé.

## Publication et réception

Premier commit applicatif `5eff6c0` poussé sur GitHub `main`, Railway
`50710166-de87-41f4-8bd4-4b7413a2af10` **SUCCESS**. Premier CI
[`37525287582`](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/37525287582)
arrêté sur l’audit obligatoire de deux dépendances de production indirectes :

- `sharp` 0.35.4 → **0.35.5**, et ses binaires/libvips associés :
  [avis du mainteneur](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w).
- `source-map-js` 1.2.1 → **1.2.2** :
  [avis de sécurité](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

Mise à jour ciblée via `npm update sharp source-map-js`, dans les plages déjà
acceptées par Next/PostCSS/Tailwind ; `package.json` et Next 16.3.8 conservés,
pas de `--force`. Audit production local reçu : **zéro vulnérabilité** ; build
et 398 unités (375 réussies, 23 intégrations ignorées) rejoués avec succès après
la mise à jour. Les alertes de l’audit incluant les dépendances de développement
ne sont pas comprises dans ce résultat de production.

### Livraison finale reçue

- Commit de livraison [`8fcfbda`](https://github.com/fatme-nabih/Africa_Live_TV/commit/8fcfbda973c669b274c9c7e01014d08bbb0e57cb)
  poussé sur `main`, contenant le correctif VLC `5eff6c0` et les dépendances corrigées.
- Railway **`738d71b8-3a05-45b5-8bb2-f9906d2610fa` SUCCESS**, actif.
  L’envoi CLI a perdu sa réponse réseau et renvoyé une erreur, mais Railway avait
  reçu l’archive : identité du message `VLC iPhone - Git 8fcfbda` retrouvée,
  compilation suivie jusqu’au succès, sans renvoyer un déploiement en double.
- **442/442 fichiers applicatifs identiques** au snapshot Git (SHA-256), aucun
  écart. Runtime confirmé : staging, Node production, Next 16.3.8, sharp 0.35.5,
  source-map-js 1.2.2 ; MVP/lecture locale/VLC desktop/anonyme CI désactivés.
- Migrations après livraison : **20/20, aucune en attente**, 41 fichiers Drizzle
  identiques. Aucun changement de schéma ou de configuration distante.
- Santé **HTTP 200** sur les domaines staging et Railway ; météo anonyme 401,
  `/app/live`, `/app/mur` et `/api/followed-countries` redirigent vers la connexion.
- **10/10 E2E distants réussis**, sans session authentifiée ni paiement réel.
- CI [`37526110709`](https://github.com/fatme-nabih/Africa_Live_TV/actions/runs/37526110709)
  **SUCCESS** : lint/typage/audit production/build, 375 unités (23 ignorées),
  23/23 intégrations, 9 E2E de build (10 ignorés), **66 E2E UI réussis** (1 ignoré),
  dont les **sept tests mobiles dans l’application Next**, puis nettoyage des
  fixtures. Snyk Code demeure indisponible dans l’organisation, avertissement
  conservé ; aucun scan SAST reçu.

Scripts et preuves privés sous `.local-logs/publication-ios-vlc/` ; upload
préparé à partir d’un snapshot Git, sans `.env*` privés, sauvegardes, journaux
locaux ni médias de test.

La lecture Safari/VLC sur le vrai iPhone reste à confirmer par le propriétaire :
choisir CNews, toucher **Ouvrir dans VLC**, puis tester le retour/relance. Aucun
changement de configuration Clerk/OVHcloud/DNS, aucun nouveau service/plan,
production future non activée, source IPTV conservée.
