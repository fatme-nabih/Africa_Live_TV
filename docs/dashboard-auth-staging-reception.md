# Complément de réception — Clerk, zoom et staging

Relevé du 1er octobre 2026, complément zoom à 18:29 UTC · Africa/Dakar.
Complète [la réception L4](dashboard-release-validation.md).

Publication de clôture demandée ensuite et reçue à 18:44 UTC : applicatif
GitHub `22dea98`, Railway staging `4c8a82cc-5b3b-4a0e-86a1-bf922540869a`
SUCCESS ; santé processus/base 200, API Radar anonyme 401, neuf E2E distants
repassés. Dashboard connecté rechargé, couverture partielle explicite. Code
identique au snapshot de 18:09 ; documents de reprise inclus dans le paquet.
Le [bilan courant et la suite](dashboard-session-handoff.md) font foi pour la
nouvelle session ; les observations précédentes ci-dessous restent datées.

## Constats avant la nouvelle livraison

| Contrôle | Environnement | Résultat |
|---|---|---|
| Connexion interactive Clerk | Local, MVP désactivé | Session administrateur réelle fournie par le propriétaire ; aucun mot de passe/OTP manipulé par l’assistant |
| Dashboard, pays et briefing | Local connecté | Dashboard accessible ; choix SN → URL `country=SN` et lien TV correspondant ; briefing désactivé |
| Compte et administration | Local connecté | Compte « Actif (Administrateur) », accès permanent ; page administration avec rôle confirmé, file visible sans mutation |
| Compte et administration | Staging connecté | Même parcours administrateur confirmé sur la version actuellement déployée |
| Santé | Staging, public | `GET /api/health` : 200, processus/base `ok` |
| API Radar anonyme | Staging, public | `GET /api/live/news` : 401 |
| E2E entrée publique | Staging actuel | Widgets Clerk et refus anonymes réussis ; nouvelle landing en échec car la version servie précède L4 |
| Configuration | Railway staging, lecture seule | Rôle staging ; modes MVP/public MVP/lecture locale/VLC desktop désactivés ; origine `https://staging.africatv.sn` |

Déploiement actif avant livraison : `e5ac6a4c-cdbb-469e-8847-54f8fe871e9c`,
créé le 30 septembre 2026 à 19:17 UTC ; état SUCCESS/Active. Message CLI :
« feat(radar): basemap satellite couleurs et selecteur 3 styles ». Ce relevé
remplace les anciennes suppositions sur le déploiement actif du 29 septembre.
Healthcheck `/api/health`, délai 120 s ; pré-déploiement `db:migrate:deploy`,
délai 300 s. Aucun nouveau déploiement pendant ces observations.

## Autorisation et limites de la réception

- Le compte administrateur n’est pas une preuve du parcours standard. Des
  sessions réelles distinctes essai/actif standard/expiré restent nécessaires.
  Aucun rôle ni abonnement réel n’a été altéré pour fabriquer ces états.
- Zoom natif : application manuelle de 200 % confirmée par le propriétaire,
  puis mesurée après suppression du viewport simulé de l’outil. Ce viewport
  masquait le zoom natif dans les premiers relevés DPR=1 ; ces relevés ne
  permettaient donc pas de conclure sur le réglage réel du navigateur.
- La réception staging de L4 a été exécutée après sa livraison. Le propriétaire
  a autorisé explicitement le déploiement du dossier préparé, sans commit/push,
  changement de plan ou migration nouvelle. Paquet isolé de 303 fichiers, sans
  secrets ni captures/logs privés ; empreinte SHA-256
  `c4893ddc43e965e13b23a4b46b886deeb9ab835ddf1dccfe17801767e61999e1`.
  Premier transfert expiré avant build (`81707de2-29e3-4b03-a3a1-fdb6c64f2007`) ;
  relance acceptée : `b0d52c0c-3bca-4600-8a3e-fb1f2709dada`.
  État final : **SUCCESS et actif**, vérifié à 18:09 UTC ; premier transfert
  marqué FAILED, sans activation. Aucune modification du schéma livrée ; la
  commande de migration préexistante s’est achevée normalement.

Le propriétaire confirme ne disposer que du compte administrateur. Les sessions
ordinaires essai/active/expirée ne sont donc pas disponibles pour cette réception.

## Après déploiement autorisé — réception des parcours disponibles

- **9 E2E staging réussis, zéro échec final** : nouvelle landing, widgets Clerk,
  refus anonymes des pages/API, worker ESM réel sous CSP et pages paiement avec
  création interceptée. Aucun paiement effectué.
- Santé publique 200 : processus et base `ok`. Rôle applicatif staging et modes
  locaux toujours désactivés ; aucune modification des variables nécessaire.
- Session Clerk administrateur réelle : dashboard, compte et administration
  accessibles, navigation commune présente. Sénégal sélectionné, conservé au
  rechargement et transmis vers TV ; filtre Actualités produit
  `/app?country=SN&group=News`. Briefing désactivé.
- Données réelles : couverture partielle 16/19 sources à jour au relevé de
  18:09 UTC ; ces valeurs décrivent le panneau courant, pas un engagement de
  disponibilité ni un inventaire du catalogue. Aucun inventaire DB staging complet
  n’a été effectué et aucun ancien effectif n’est reconduit.
- [Capture dashboard staging connecté](screenshots/l4-staging-connected-dashboard.jpg).
  Les données sont réelles ; aucune fixture Radar injectée dans cette session.

Retour arrière : révision précédente identifiée ci-dessus, mais elle ne possède
pas la nouvelle garde d’expiration dashboard. Ne pas y revenir aveuglément ;
conserver AL-C01/C02 dans une correction compatible reçue. Pas de restauration DB
pour ce lot sans changement de schéma. Production apex/`www` non activée.

## Zoom natif 200 % — validé localement

Le 1er octobre à 18:29 UTC : Edge, session Clerk administrateur réelle, aucune
fixture ni modification CSS de zoom. Après `viewport.reset()` de l’outil,
**DPR=2, viewport 937×477 CSS, scrollWidth=932** ; la surface native initiale
était 1874×955. Le zoom correspond donc à 200 % et ne déborde pas horizontalement.

- Dashboard : navigation lisible, KPI sur deux colonnes, fil prioritaire,
  carte à la demande ; pays utilisable au clavier, focus visible sur reset.
- Flèche haut dans le sélecteur puis sélection CI : pays et URL synchronisés,
  lien TV `/app?country=CI` ; briefing toujours désactivé.
- TV : catalogue réel visible, drawer de filtres accessible au breakpoint,
  pays CI conservé, Échap ferme le drawer et rend le focus au bouton Filtres.
  Même absence de débordement (932 ≤ 937).
- Captures : [dashboard revenu sur Sénégal](screenshots/l4-native-zoom-200-dashboard.jpg),
  [filtres TV](screenshots/l4-native-zoom-200-tv-filters.jpg).

Cette preuve couvre le bundle local identique à celui livré sur staging ;
le zoom du domaine staging n’a pas été modifié (DPR=1 sur ce domaine).
Restent non reçus : comptes ordinaires distincts, lecteur d’écran et
appareils/flux réels hors ce parcours. Les comptes ordinaires restent
indisponibles selon le propriétaire ; aucune mutation de rôle/abonnement.

Le défaut de correspondance de la landing est un écart de version constaté,
pas un test corrigé artificiellement pour faire passer l’ancien staging.
Le briefing reste désactivé localement jusqu’à L6.
