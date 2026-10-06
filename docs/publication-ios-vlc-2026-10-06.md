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

En cours. Les identifiants de commit/déploiement et les contrôles distants seront
consignés après réception. Scripts et preuves privés sous
`.local-logs/publication-ios-vlc/` ; upload préparé à partir d’un snapshot Git,
sans `.env*` privés, sauvegardes, journaux locaux ni médias de test.

La lecture Safari/VLC sur le vrai iPhone reste à confirmer par le propriétaire :
choisir CNews, toucher **Ouvrir dans VLC**, puis tester le retour/relance. Aucun
changement de configuration Clerk/OVHcloud/DNS, aucun nouveau service/plan,
production future non activée, source IPTV conservée.
