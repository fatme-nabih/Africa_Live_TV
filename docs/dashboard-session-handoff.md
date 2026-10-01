# Dashboard — reprise de session au 1er octobre 2026

Cette fiche décrit l’état à la clôture de la session. Lire aussi
[contextellm.md](../contextellm.md), les règles `AGENTS.md` et le
[plan détaillé](plan-dashboard-backlog.md) avant de modifier le projet.

## Ce qui est terminé

| Lot | Tickets | Résultat |
|---|---|---|
| L0 | AL-C01, AL-C03, AL-C04 | Matrice d’accès décidée, clés/déduplication corrigées, worker MapLibre corrigé ; fil utilisable sans carte |
| L1 | AL-D00, AL-D02, AL-D03, AL-D05, AL-D06 | Briefing désactivé, fenêtre commune 24 h, dates fiables, états et fraîcheur par source, compteurs TV qualifiés, bandeau daté |
| L2 | AL-W01 à AL-W06 | En-tête/KPI compacts, pays accessible et conservé dans URL/historique, fil prioritaire sur mobile, carte à la demande, couches optionnelles et disponibilité des sources |
| L3 | AL-C02, AL-T01 à AL-T04 | Pages/API alignées sur les droits, navigation commune, catégories/langues normalisées à la lecture, filtres/raccourcis synchronisés, contexte pays transmis vers TV |
| L4 | AL-Q01, AL-C05, AL-Q02 | Régression locale, documentation et dossier de livraison ; déploiement staging autorisé et réception des parcours disponibles |

L0–L4 sont implémentés, testés localement et inclus dans le snapshot livré sur
staging. La réception conserve les réserves ci-dessous : « déployé » ne signifie
pas que tous les comptes et appareils ont été reçus.

Règle décidée : après expiration de l’essai ou de l’abonnement, accès au
dashboard et aux huit API Radar refusé, lecture refusée ; catalogue consultable.
Grâce active et exception administrateur préexistantes conservées. Un parcours
administrateur ne valide pas les droits d’un compte ordinaire.

## Preuves et environnement livré

**Publication de clôture — 1er octobre, 18:44 UTC :** code L0–L4 et dossier
publiés sur GitHub `main`, commit applicatif `22dea98`. Nouvelle livraison
Railway staging `4c8a82cc-5b3b-4a0e-86a1-bf922540869a` SUCCESS, santé
processus/base 200 et API Radar anonyme 401 ; **9 E2E distants repassés**.
Les 303 fichiers applicatifs sont identiques au snapshot précédemment reçu ;
paquet de clôture 336 fichiers incluant les Markdown, sans secrets/captures
privées, SHA-256 `d6a8d7d87f43e5f2cf19542d57d600d74fe795eb6a4c6e35603929971a9e3fd3`.
Dashboard connecté rechargé ; couverture partielle 14/19 au relevé, GDELT
indisponible signalé, autres dépêches consultables. [Capture finale](screenshots/session-closure-staging.jpg).
Un commit documentaire de clôture consigne ensuite ces preuves sur GitHub ;
aucun changement applicatif supplémentaire à déployer.

- Local : **219 tests unitaires + 14 intégrations PostgreSQL isolées + 57 E2E**
  réussis ; TypeScript, ESLint, build et cohérence des migrations réussis.
  [Réception intégrée](dashboard-release-validation.md).
- Catalogue local : 11 778 chaînes, 12 396 sources ; empreintes identiques
  avant/après, fixtures et schémas de test nettoyés.
- Staging : **9 E2E distants réussis**, santé publique processus/base 200,
  API Radar anonyme 401, navigation et session Clerk administrateur réelles
  reçues en local et staging. [Relevé détaillé](dashboard-auth-staging-reception.md).
- Zoom **natif Edge 200 % reçu en local** : DPR=2, viewport 937×477 CSS,
  largeur du document 932 px ; pays au clavier, navigation TV, filtres,
  Échap et retour du focus utilisables. Ne pas confondre cette preuve avec
  le reflow automatisé ni avec un test de zoom natif sur staging.
- Première livraison L0–L4 observée SUCCESS/actif le 1er octobre à 18:09 UTC :
  `b0d52c0c-3bca-4600-8a3e-fb1f2709dada`, sur `https://staging.africatv.sn`,
  projet Railway `just-compassion`, rôle applicatif `DEPLOYMENT_ENV=staging`.
  Snapshot sans commit/push, SHA-256
  `c4893ddc43e965e13b23a4b46b886deeb9ab835ddf1dccfe17801767e61999e1`.
- Aucun nouveau schéma/migration, variable, plan, DNS, rôle ou abonnement
  modifié. Pas de paiement réel ni de lancement de production. Les effectifs
  staging historiques ne constituent pas un inventaire actuel.

## Ce qui reste à faire

| Travail | État / prochaine action |
|---|---|
| L5 — AL-T05, lecteur ancré et zapping | **Non commencé, optionnel.** Faire décider au propriétaire s’il retient le prototype ou clôture L5 sans expérimentation |
| L6 — AL-D01 et AL-D04, briefing | **Différé, non implémenté.** Après clôture de L5, décider nom/fenêtre/traitement ; implémenter et tester avant toute activation explicite |
| Comptes Clerk ordinaires essai/actif/expiré | **Non reçus en session réelle.** Le propriétaire n’a que le compte administrateur. Gardes testées automatiquement ; ne pas modifier son rôle/abonnement pour fabriquer les profils |
| Lecteur d’écran, appareils mobiles physiques et lecture réelle d’un échantillon autorisé sur cette livraison | **Non reçus dans cette réception.** Les E2E responsive et réceptions de lecture historiques ne les remplacent pas |
| Inventaire staging daté et qualification actuelle des sources | **Non réalisés dans cette réception.** Santé DB et panneau de disponibilité reçus ; pas de garantie de santé universelle des flux |
| Production et opérations futures | Hors lots dashboard : suivre le backlog production ; nouvelle autorisation pour déploiement, infrastructure, coût ou modification distante |

Ces réserves sont consignées ; elles ne remettent pas les lots implémentés à
« à faire ». Ne pas déclarer pour autant une réception réelle des comptes indisponibles.

## Démarrage conseillé pour la nouvelle session

Publication de clôture demandée ensuite par le propriétaire et exécutée :
GitHub et Railway staging mis à jour avec L0–L4 et les documents réconciliés.
Le relevé final est aussi dans [le journal](production-progress.md).
Cette autorisation porte sur la publication de clôture ; elle n’autorise pas
implicitement un déploiement futur de L5/L6.

1. Lire les documents de reprise et `git status --short`. Préserver l’arbre
   volontairement sale, y compris les fichiers non suivis ; aucun commit/push
   ni nettoyage destructif autorisé.
2. Reprendre **l’arbitrage L5**, AL-T05. Cette fiche n’autorise pas à commencer
   le prototype ni à activer le briefing : attendre la demande produit du propriétaire.
3. Si L5 est retenu : prototype local désactivable, un seul flux à la fois,
   destruction de l’ancien player au zapping, arrêt/volume accessibles,
   modale/fenêtre séparée conservées, contrôle d’éligibilité inchangé. Vérifier
   HLS/VLC/indisponible, zapping rapide, plein écran, pause, filtres, mobile et
   démontage ; consigner conserver/ajuster/abandonner.
4. Après réalisation ou abandon explicite de L5, reprendre L6 en dernier.
   Le bouton « Briefing — bientôt » reste désactivé jusque-là.

Le projet source `C:/Users/GAMER PC/IPTV` reste intact. Travailler sur
`africa_live_dev` et localhost:3001 ; médias téléchargés directement depuis
l’amont, aucun relais/conversion/stockage. Lire les guides Next.js installés
avant le code concerné. Ne pas supposer les sessions navigateur encore ouvertes.
Tout futur rollback doit conserver le refus d’accès au dashboard après expiration.
