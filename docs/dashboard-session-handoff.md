# Dashboard — reprise de session au 2 octobre 2026

Cette fiche décrit l’état à la clôture de la session. Lire aussi
[contextellm.md](../contextellm.md), les règles `AGENTS.md` et le
[plan détaillé](plan-dashboard-backlog.md) avant de modifier le projet.

## Reprise courante — publication CLI reçue, 2 octobre 2026

Revue du diff effectuée ; six clés des overlays du lecteur corrigées et rejet
d'annulation de corps HTTP météo géré. Validation actuelle : 244 unitaires
réussis, 14 ignorés, invariants 4/4, TypeScript/lint/migrations/build réussis.
Le propriétaire a explicitement autorisé GitHub et Railway par CLI. Applicatif
publié sur `main` au commit `51c0bc8` ; Railway staging
`f0816583-e6a0-4115-bd54-d4cb0709acb1` **SUCCESS**, instance RUNNING à 19:22 UTC.
[Dossier de publication](publication-cli-2026-10-02.md) : 287 fichiers identiques
par SSH, **9 E2E distants réussis**, santé 200 sur les deux domaines, météo
anonyme 401, dashboard 307. Les migrations distantes 19/19 ont été vérifiées
avant/après par SSH CLI, sans migration en attente ni différence.
Le brouillon premium indépendant reste local. Aucune modification `.env`,
variable distante, DNS ou plan. Serveur dev conservé sur 3001, santé 200.
Un commit documentaire de clôture publie les preuves sans nouveau code à livrer.
Les profils connectés, amonts et appareils non reçus restent consignés.

## Reprise historique — RW reçu localement, 1er octobre 2026

**Déconnexion du propriétaire : point d'arrêt enregistré.** La prochaine
session doit inspecter le diff local, sans recommencer les lots déjà reçus.
Lire AGENTS.md, contextellm.md et le dossier RW ; exécuter `git status --short`.
HEAD `54e5696`, aucune publication, arbre sale à préserver. Vérifier le port
3001/checkout et sa santé : serveur Clerk laissé actif à la clôture, mais une
déconnexion peut l'arrêter. Si absent, `npm run dev` dans ce projet, sans
drapeaux MVP ajoutés ni modification de `.env.local`. Les preuves finales sont
les journaux `unit-received`, `e2e-dev-received`, `e2e-weather-final`,
`e2e-build-clerk`, `types-received`, `lint-received`, `build` et `restoration`
sous `.local-logs/rw/`. Aucun ticket RW restant ; revue puis suite explicitement
demandée, jamais publication automatique. L5/L6 ne sont pas à reprendre ici.

**RW-001 à RW-010 clos localement**, lots A/B/C/D. HEAD reste `54e5696` ;
changements précédents préservés, diff non committé pour revue. Lire d'abord
le [dossier de réception RW](radar-weather-remediation-validation.md) et son
journal par ticket ; le backlog RW et la checklist sont actualisés.

256 unitaires = 242 réussis + 14 intégrations ignorées ; invariants 4/4,
TypeScript/ESLint/migrations/build verts. E2E dev 51 réussis + 1 réservé build ;
ce dernier reçu séparément 1/1 avec worker réel et Clerk anonyme (météo 401,
dashboard redirigé). Aucun profil Clerk connecté ni amont vivant reçu pour RW.

Serveur final `npm run dev`, configuration Clerk initiale sur localhost:3001,
base africa_live_dev, `.env.local` inchangé. Aucun commit/push/déploiement,
changement distant ou coût. Captures nouvelles ignorées dans `.local-logs/rw/`,
captures historiques suivies préservées. Les prochaines actions sont la revue
du diff puis, seulement sur demande, publication/réception staging authentifiée.
Ne pas recevoir les handlers Radar via `E2E_ANONYMOUS_MODE=true` : ce mode
omet le middleware Clerk requis par `auth()`. Ne pas lancer L5/L6 implicitement.

## Historique — revue Gemini Radar/météo, 1er octobre 2026

Les changements Radar/RSS `6f7e384` et météo `54e5696` ont été revus après
les réceptions L0–L5 ci-dessous. HEAD local : `54e5696`.
Défauts confirmés : recours navigateur après refus d'accès, mesures/dates
météo inventées, fuseau/jour-nuit arbitraires, provenance/disponibilité incohérentes,
classement International dépendant de category et requêtes sans échéance.

À la demande du propriétaire, le
[plan de correction RW-001 à RW-010](radar-weather-remediation-backlog.md)
et le [prompt Gemini](gemini-radar-weather-prompt.md) sont préparés.
**Tous les tickets restent À faire ; seule la documentation est modifiée.**
Pour une reprise de ces corrections, utiliser ce plan en priorité ; les
recommandations historiques L5 n'impliquent pas de lancer L5/L6 dans ce travail.
Les gardes d'accès et le transport direct média restent obligatoires.

L'audit passe 221 tests unitaires (14 ignorés), TypeScript et ESLint. Ses essais
navigateur sont des tests de composant avec API simulées, sans réception Clerk
authentifiée staging ni build/E2E complets nouveaux. Le déploiement météo
`19a9a9ae-6746-4652-b16d-996e4d48aaa9` est déclaré par Gemini, non revérifié.
Le plan ne donne aucune autorisation de commit/push/déploiement ou de coût.

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

Complément de reprise L5, 1er octobre 2026 : le propriétaire a explicitement
retenu l'expérimentation. AL-T05 est maintenant réalisé/testé **localement**,
désactivé par défaut et absent du build de production. Recommandation **ajuster**,
notamment l'exclusivité avec VLC qui n'est pas piloté par l'ancré.
[Activation, preuves et limites](anchored-player-validation.md).
Publication L5 autorisée ensuite et reçue le 1er octobre à 20:08 UTC :
commit applicatif `9326fc0` poussé sur GitHub `main`, Railway staging
`dc557ad8-8288-4872-863d-7a2b6396014c` SUCCESS/actif. Santé processus/base 200
sur les deux domaines, **9 E2E distants réussis**. Le contrôle d'activation
ancré reste absent du build production ; le prototype reste local et opt-in.
Briefing inactif, L6 non commencé. [Preuves de publication](anchored-player-validation.md#publication-github-et-railway-staging).

| Travail | État / prochaine action |
|---|---|
| L5 — AL-T05, lecteur ancré et zapping | **Prototype réalisé, testé et évalué localement. Recommandation ajuster avant généralisation.** Réception web gérée réussie ; exclusivité/arrêt VLC global non reçus, sortie explicite vers le parcours historique. Décider de l'ajustement et de la réception humaine |
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
La publication L5 de cette session a ensuite été autorisée et reçue ci-dessus.
Cette autorisation ne vaut pas pour une publication future ni pour L6.

1. Lire les documents de reprise et `git status --short`. Préserver l’arbre
   existant, y compris les fichiers non suivis. Arbre propre après publication ;
   tout prochain commit/push exige une nouvelle demande, aucun nettoyage destructif.
2. Relire la [réception L5](anchored-player-validation.md) : le prototype est
   disponible en développement local, opt-in ; son code est publié mais
   son activation reste exclue du build de staging.
   L'accord produit de cette session autorisait sa réalisation et ses tests.
3. Suite proposée : réception humaine et arbitrage de l'ajustement VLC/mobile.
   Ne pas traiter la déclaration d'arrêt de VLC comme un contrôle du processus.
   Aucun zapping VLC ni contrôle de son volume/arrêt n'a été reçu.
4. **Ne pas commencer L6 dans cette session**, ni le déduire de la réalisation
   de L5. Le bouton « Briefing — bientôt » reste désactivé ; toute reprise du
   briefing et toute publication nécessitent une nouvelle demande.

Le projet source `C:/Users/GAMER PC/IPTV` reste intact. Travailler sur
`africa_live_dev` et localhost:3001 ; médias téléchargés directement depuis
l’amont, aucun relais/conversion/stockage. Lire les guides Next.js installés
avant le code concerné. Ne pas supposer les sessions navigateur encore ouvertes.
Tout futur rollback doit conserver le refus d’accès au dashboard après expiration.
