# Africa Live — Plan complet et backlog dashboard

Création : 30 septembre 2026 · Mise à jour : 1er octobre 2026 · Africa/Dakar.
Statut : L0–L4 implémentés, testés localement et déployés sur staging après
autorisation. Réception réelle limitée aux profils/appareils disponibles.
**Nouvelle session : [bilan, réserves et prochaine étape L5](dashboard-session-handoff.md).**
L5 / AL-T05 a été retenu par le propriétaire et réalisé/testé en local ;
recommandation **ajuster avant généralisation**, notamment la sortie VLC.
[Preuves et limites L5](anchored-player-validation.md). Aucun commit/push/déploiement L5.
L6 briefing reste différé, désactivé et non commencé dans cette session.

Clôture publiée à la demande du propriétaire : GitHub `main`, applicatif
`22dea98`, et Railway staging `4c8a82cc-5b3b-4a0e-86a1-bf922540869a` SUCCESS
le 1er octobre à 18:44 UTC ; 9 E2E distants repassés, santé processus/base 200.
Un commit documentaire final conserve ces preuves ; aucune nouvelle migration.

Mise à jour du 30 septembre 2026 : le propriétaire demande de laisser le bouton
de briefing inactif et de revenir sur cette fonctionnalité en toute dernière
implémentation. Cette décision remplace le renommage et la reprise immédiats.
AL-D00 est réalisé localement ; AL-D01 et AL-D04 sont différés au dernier lot L6.

## 1. Objectif et périmètre

Faire du dashboard l’espace principal d’Africa Live après la landing et la
connexion : choisir un pays, consulter des dépêches datées, comprendre les
sources et ouvrir la TV si nécessaire. La TV conserve un accès discret dans
l’en-tête, son catalogue autorisé complet et ses lecteurs existants.

Parcours cible : `/` → connexion/inscription → `/app/live` → bouton TV → `/app`.
Les liens existants vers `/app` et `/player/[channelId]` restent compatibles.
Le logo des espaces connectés revient au dashboard. Compte et administration
restent accessibles, cette dernière selon le rôle.

Ce plan couvre les recommandations de l’[audit du 30 septembre](audit-agencement-dashboard.md).
Il complète le [backlog production](production-backlog.md) et la
[feuille de route Radar](radar-afrique-roadmap.md), sans remplacer leurs
exigences d’exploitation, de provenance et d’accès. Leur description historique
doit être réconciliée avec le code actuel et le déploiement observé.

### Point de départ de l’audit — historique du 30 septembre

Les constats suivants précèdent les corrections L0–L4 ; pour l’état courant,
voir la fiche de reprise et le statut des lots ci-dessous.

- Les changements de landing, de destination principale et de bouton TV sont
  préparés localement ; ils ne sont pas déclarés déployés sur Railway.
- TypeScript, ESLint et deux parcours E2E ciblés ont réussi lors de l’audit.
- Le staging a été observé avec une session administrateur. Cela ne valide pas
  les droits d’un utilisateur standard, expiré ou sans session.
- Les erreurs de clés React et de worker cartographique sont des observations
  locales à reproduire ; leurs causes ne sont pas encore établies.
- Aucun paiement réel, webhook réel ou test complet d’accès expiré n’a été validé.

### Contraintes de réalisation

Conserver le projet source IPTV intact, les changements locaux existants,
`africa_live_dev` et le port 3001. Les vidéos sont téléchargées directement par
le navigateur/VLC depuis l’amont : aucun relais, conversion ou stockage média.
Ne pas assouplir les contrôles de lecture pour rendre les tests verts.
Lire les guides Next.js installés avant l’implémentation concernée.

Pas de migration prévue par défaut. Toute nécessité de persistance nouvelle
fait l’objet d’un ticket séparé et d’une réestimation. Tout déploiement futur
requiert l’autorisation du propriétaire ; une migration Railway requiert une
sauvegarde restaurable et `db:migrate:deploy`. Pas de commit/push implicite.

## 2. Décisions produit à consigner

Ces choix sont des propositions du plan, sauf D1 et l'accès au dashboard de D5,
explicitement décidés par le propriétaire le 30 septembre 2026.
L’exécution des tâches indépendantes peut avancer pendant leur clarification.

| ID | Proposition | Alternative / conséquence | Tickets concernés |
|---|---|---|---|
| D1 — décidé | Désactiver le bouton maintenant (« Briefing — bientôt ») ; reporter le briefing à la toute dernière implémentation | Nom, durée et traitement à redécider en L6. Aucune réactivation ou génération IA implicite | AL-D00, AL-D01, AL-D04 |
| D2 — retenu en L1 | Dépêches récentes sur 24 h, fenêtre glissante datée ; fenêtre du briefing à décider en L6 | Si les dates amont ne permettent pas de garantir une fenêtre, retirer sa durée plutôt que l’inférer | AL-D02, AL-D04 |
| D3 — retenu en L1 | Afrique par défaut dans le bandeau ; filtre « Monde » explicite | Un périmètre mondial par défaut conserverait le bruit observé et doit être annoncé | AL-D06 |
| D4 — retenu en L1 | Afficher « Chaînes référencées » ; compter séparément les candidates web/VLC selon le contrat de résolution | Ne jamais présenter un contrôle antérieur comme une garantie de lecture en temps réel | AL-D05 |
| D5 — dashboard décidé | Aucun accès au dashboard après expiration de l'essai ou de l'abonnement ; renouvellement requis | Page et API Radar alignées et déployées sur staging ; catalogue consultable selon DOC-006. Grâce active et exception administrateur existantes conservées : voir la matrice AL-C01 | AL-C01, AL-C02 |
| D6 | Liste de dépêches d’abord sur mobile ; carte accessible ensuite | Carte d’abord reste possible sur grand écran. Pas de grand titre marketing dans le dashboard | AL-W01, AL-W04 |
| D7 — décidé en L5 | Expérimentation locale du lecteur ancré explicitement retenue le 1er octobre ; prototype réalisé et évalué | Recommandation ajuster : conserver le parcours web expérimental, recevoir la limite VLC et l'ergonomie avant généralisation ; aucun remplacement/publication implicite | AL-T05 |

## 3. Contrats cibles

### Données temporelles et états des sources

Proposer un contrat commun aux réponses Radar, adapté aux capacités réelles de
chaque fournisseur : fournisseur, périmètre, `fetchedAt`, dernier succès,
expiration du cache, statut et nombre de résultats. Conserver séparément
`publishedAt` (publication), `indexedAt` (indexation), `occurredAt` (événement)
et `updatedAt` (mise à jour métier). Une collecte récente ne rajeunit pas un article.

États à distinguer : chargement, données disponibles, réponse valide vide,
disponibilité partielle, cache périmé, fournisseur indisponible, source non
configurée. Une réponse vide n’équivaut pas à une panne. « Aucun événement
recensé par les sources consultées » ne signifie pas « aucun risque ».

Calculer chaque fenêtre avec un instant de référence unique : intervalle
`[asOf - durée, asOf]`. Normaliser en UTC ; afficher en heure locale avec fuseau
explicite. Dates inconnues : section séparée, exclue des compteurs de fenêtre.
Dates futures ou invalides : exclues de la fenêtre et signalées au diagnostic.
Pour GDELT, annoncer une date d’indexation lorsqu’aucune publication fiable
n’existe. Les limites de volume amont empêchent de prétendre à l’exhaustivité.

Lors de sa reprise finale, le briefing devra porter les mêmes bornes sur les données utilisées, conserver
les liens des éléments retenus et déclarer les sources manquantes. Les marchés
et la météo gardent leurs dates métier : une cotation de dernière séance ou
une prévision n’est pas transformée en événement de la fenêtre retenue.

### Pays, couches et navigation

URL proposée : `/app/live?country=SN`, sans pays pour la vue Afrique.
Le code canonique est validé par le référentiel de pays existant. Un paramètre
invalide revient à la vue générale avec un comportement documenté. Carte et
sélecteur partagent le même état ; retour/précédent et lien partagé restaurent
le contexte. Préserver les paramètres non concernés, éviter les boucles et ne
pas confondre pays du média et lieu de l’événement.

Couches initiales : médias et TV. Risques et feux sont activés à la demande,
avec fournisseur, légende, date et périmètre propres. La liste reste utilisable
si le fond, le worker ou une couche ne se charge pas.

### Disponibilité TV et filtres

Séparer catalogue référencé, sources techniquement candidates web/VLC et droit
de lecture du compte. Réutiliser les règles du résolveur, sans lancer une sonde
pour chaque affichage du dashboard. Préserver le contrôle final au lancement.
Une chaîne ayant plusieurs sources se compte une seule fois dans son indicateur.

Les catégories composites deviennent des ensembles canoniques ; les langues
ont des codes stables et des libellés français. Conserver les valeurs brutes
pour diagnostic et ne pas inventer une catégorie lorsqu’elle est inconnue.
Recherche, filtres et raccourcis partagent un seul état, réinitialisent la
pagination et gèrent les réponses de requêtes arrivées dans le désordre.

## 4. Ordre de réalisation et portes de validation

État courant : **L0–L4 terminés en local et déployés staging**, avec les
réserves de réception réelle de la fiche de reprise. **L5 réalisé et évalué
localement**, recommandation ajuster et limite d'exclusivité VLC non reçue ;
**L6 différé**, briefing toujours désactivé, aucune reprise dans cette session.

| Lot | Résultat attendu | Tickets | Condition de sortie |
|---|---|---|---|
| L0 — cadrage et diagnostic | Contrats, preuves et causes reproductibles | AL-C01, AL-C03, AL-C04 | Matrice d’accès et inventaire datés ; diagnostics reproductibles |
| L1 — confiance dans les données | Briefing inactif, dates et erreurs explicites sur les données disponibles | AL-D00, AL-D02, AL-D03, AL-D05, AL-D06 | Fenêtre 24 h et pannes testées ; briefing toujours désactivé |
| L2 — dashboard de travail | Pays partageable, sources lisibles, mobile utile | AL-W01 à AL-W06 | Pays synchronisé et fil accessible sans carte ; navigation clavier/mobile validée |
| L3 — cohérence de l’app | Navigation, filtres et accès harmonisés | AL-C02, AL-T01 à AL-T04 | Matrice d’accès respectée ; filtres et raccourcis synchronisés |
| L4 — réception et préparation staging | Preuves locales et documentation réconciliée | AL-Q01, AL-Q02, AL-C05 | Critères obligatoires validés et limites consignées ; livraison reviewable |
| L5 — expérimentation optionnelle | Lecteur ancré évalué | AL-T05 | Décision conserver/ajuster/abandonner sur prototype testé |
| L6 — briefing, toute dernière implémentation | Fonctionnalité reconsidérée puis éventuellement réactivée | AL-D01, AL-D04 | Arbitrage final explicite, contrats et tests du briefing validés avant activation |

L0 précède les changements de contrats. Le travail visuel de L2 peut avancer
après fixation des contrats L1, mais sa réception dépend des données réelles.
L3 ne contourne pas une décision D5 manquante. L5 n’est pas une condition de
livraison des lots obligatoires.

L6 commence après réception de L0–L4 et clôture de L5, soit par réalisation,
soit par décision explicite de ne pas retenir le lecteur ancré. Le briefing
reste désactivé pendant tous les lots précédents. Sa reprise n’empêche pas la
livraison du dashboard sans briefing et ne doit pas devenir un chantier parallèle.

Échelle d’effort relative : S = changement ciblé, M = plusieurs composants ou
tests, L = contrat transversal ou diagnostic important. Ce ne sont pas des
jours garantis. Réestimer après L0 ; fixer un calendrier seulement après
connaissance de la capacité et des arbitrages. Responsables proposés : assistant
pour code/tests/documents ; propriétaire pour arbitrages et autorisations.

## 5. Backlog exécutable

Statut au 1er octobre 2026 : AL-C01 à AL-C05, AL-D00/AL-D02/AL-D03/AL-D05/AL-D06,
AL-W01 à AL-W06, AL-T01 à AL-T04 et AL-Q01 **validés localement**.
AL-Q02 **acceptation locale remplie, déployé staging et réception des parcours disponibles réussie** ; réserves réelles consignées.
Complément du 1er octobre à 18:09 UTC : déploiement staging ensuite autorisé et
réussi ; neuf E2E distants et parcours administrateur réel reçus.
[Relevé](dashboard-auth-staging-reception.md). Zoom natif 200 % local reçu à
18:29 UTC ; comptes ordinaires indisponibles : leur réception réelle reste ouverte.
Preuves et limites : [réception L4](dashboard-release-validation.md),
[dossier de livraison](dashboard-delivery-dossier.md). AL-T05 expérimenté/testé localement,
recommandation ajuster et limites dans [la réception L5](anchored-player-validation.md) ; AL-D01/AL-D04
(**différés au dernier lot L6**). « Décision requise » concerne
la partie dépendante de l’arbitrage ; les diagnostics restent réalisables.
Priorités : P1 = confiance et cohérence essentielles ; P2 = qualité du parcours ;
P3 = expérimentation. Les corrections de navigation ont été reçues en local et sur le parcours
administrateur staging ; les profils ordinaires restent à recevoir en session réelle.

### Cohérence technique et documentaire

**AL-C01 · P1 · M · Matrice d'accès et décision après expiration**
- État : validé localement le 30 septembre 2026 ; profils simulés et parcours
  anonyme réel. [Matrice, diagnostic et limites](dashboard-access-matrix.md).
- Dépendances : D5 pour la cible finale ; diagnostic indépendant.
- Travail : comparer layout `/app`, protections des routes Radar/catalogue,
  favoris et résolution avec la politique d’accès métier et DOC-006.
- Acceptation : matrice page/API pour anonyme, authentifié sans droit, essai
  actif, abonnement actif, expiré et administrateur ; comportement actuel et
  cible distingués. Tout compte de test dépendant de Clerk reste à préparer
  selon les règles existantes, sans nouveau changement distant implicite.
- Vérification : tests de politique et de routes avec rôles représentatifs,
  puis scénario interactif expiré si un compte autorisé existe.
- Zones : `src/app/app/layout.tsx`, `src/lib/access-policy.ts`,
  `src/lib/require-app-access.ts`, routes API et `src/proxy.ts`.

**AL-C02 · P1 · M · Aligner pages et API sur la matrice validée**
- État : validé localement le 30 septembre 2026 ; déployé sur staging le 1er octobre 2026. Page dashboard
  et huit API Radar exigent un droit actif, catalogue consultable après expiration.
  [Fichiers, preuves et limites](dashboard-access-matrix.md).
- Dépendances : AL-C01 et D5.
- Travail : corriger les divergences, retours de connexion et redirections ;
  séparer droit de consulter et droit de lire là où la décision le prévoit.
- Acceptation : aucune boucle ; accès catalogue conforme ; lecture refusée
  sans droit actif ; administration privée ; dashboard conforme à D5.
- Vérification : matrice complète en tests ciblés + E2E des parcours concernés.

**AL-C03 · P1 · M · Reproduire et corriger les clés dupliquées**
- État : livré et testé localement le 30 septembre 2026 ; déployé sur staging le 1er octobre 2026.
  [Contrats, preuves et limites de réception](dashboard-reliability-validation.md).
- Dépendances : aucune ; contrat de déduplication repris dans AL-D02.
- Travail : identifier la construction des IDs Ecofin, les copies de bandeau
  et les options de filtre. Éviter IDs tronqués collisionnants et clés vides ;
  préférer identifiant source/URL canonique, avec déduplication documentée.
- Acceptation : deux articles distincts ne partagent pas une clé ; un même
  article répété est traité explicitement ; options inconnues restent stables.
- Vérification : exemples collisionnants, doubles entrées et rafraîchissement ;
  aucun avertissement de clé sur les listes visées dans le scénario reproduit.
- Zones : collecteurs RSS, `LiveMarketTicker.tsx`, dashboard et filtres.

**AL-C04 · P1 · M · Diagnostiquer le worker de carte**
- État : livré et testé localement le 30 septembre 2026 ; déployé sur staging le 1er octobre 2026.
  [Contrats, preuves et limites de réception](dashboard-reliability-validation.md).
- Dépendances : aucune.
- Travail : reproduire en développement puis en build servi ; examiner URL du
  worker, chargement, CSP et configuration MapLibre sans supposer la cause.
- Acceptation : worker servi et fonctionnel dans les modes testés ; en cas
  d’échec réel, carte en état dégradé explicite et fil/pays toujours utilisables.
- Vérification : chargement normal, ressource bloquée, mobile et navigation
  répétée ; absence de réinitialisations ou erreurs répétées incontrôlées.
- Zones : `TacticalVectorMap.tsx`, configuration Next/CSP selon le diagnostic.

**AL-C05 · P1 · M · Réconcilier documentation, local et déployé**
- État : validé localement et mis à jour après livraison staging le 1er octobre
  2026 ; révisions, santé, tests distants et limites réelles consignés. Fiche
  de reprise ajoutée pour la session suivante ; effectifs staging non réinventoriés.
- Dépendances : inventaire L0 puis réception des lots livrés.
- Travail : mettre à jour handoff, roadmap Radar, backlog/progress production,
  matrice et checklist. Référencer ce plan par ses IDs sans dupliquer les tickets.
- Acceptation : chaque capacité a une date, un environnement et une preuve ;
  « implémenté local », « testé local », « observé staging » et « déployé » sont
  distincts. Pas de chiffres de catalogue reconduits sans mesure datée.
- Vérification : revue croisée des documents ; aucun secret ni URL média.

### Priorité 1 — Clarifier les données et les promesses

**AL-D00 · P1 · S · Désactiver temporairement le briefing**
- État : validé localement le 30 septembre 2026 ; déployé staging le 1er octobre.
- Dépendances : décision D1 du propriétaire.
- Travail réalisé : bouton natif désactivé, libellé « Briefing — bientôt »,
  retrait du branchement d’ouverture et de la modale du dashboard. Services et
  composant conservés pour la reprise ; aucune modification de l’API existante.
- Acceptation : bouton visible mais inactif ; aucune ouverture ni requête de
  briefing déclenchée depuis le dashboard ; aucune promesse IA ou 12 h sur le bouton.
- Vérification : TypeScript, ESLint ciblé et contrôle visuel de l’état désactivé.
- Preuve : [bouton inactif sur le dashboard local](screenshots/briefing-disabled-local.jpg).
  Contrôle navigateur : `isEnabled() = false`. Serveur remis ensuite en mode Clerk.

**AL-D01 · P3 · M · Redécider le nom et le traitement du briefing, en dernier**
- État : différé au lot L6.
- Dépendances : clôture L0–L5 et arbitrage du propriétaire sur la reprise.
- Travail : décider synthèse par règles ou lot génératif distinct ; fixer nom,
  durée et limites puis aligner bouton, modale, services et textes.
- Acceptation : libellé conforme au traitement livré ; aucune promesse Gemini/IA
  générative sans implémentation ; citations et limites visibles. Une IA réelle
  exige d’abord fournisseur, coût autorisé, confidentialité et évaluation.
- Vérification : revue du contrat et des libellés ; bouton maintenu désactivé
  jusqu’à réception AL-D04 et décision de réactivation.
- Zones : `live-briefing.ts`, `FlashBriefingModal.tsx`, dashboard.

**AL-D02 · P1 · L · Contrat temporel commun RSS/GDELT**
- État : livré et testé localement le 30 septembre 2026 ; déployé sur staging le 1er octobre 2026.
  [Contrats, preuves et limites de réception](dashboard-reliability-validation.md).
- Dépendances : D2 ; coordonner AL-C03.
- Travail : normaliser dates, provenance et déduplication ; appliquer la
  fenêtre commune aux listes et compteurs ; isoler les dates inconnues.
- Acceptation : liste et KPI 24 h portent sur le même ensemble ; borne exacte,
  source et type de date documentés ; filtre pays appliqué au bon périmètre.
- Vérification : horloge fixe ; bornes, hors fenêtre, dates futures/inconnues,
  doublons RSS/GDELT, fuseaux et changements de jour.
- Zones : collecteurs, `live-osint.ts`, types et routes `/api/live/rss`, `/news`.

**AL-D03 · P1 · L · Exposer erreurs, données périmées et couverture partielle**
- État : livré et testé localement le 30 septembre 2026 ; déployé sur staging le 1er octobre 2026.
  [Contrats, preuves et limites de réception](dashboard-reliability-validation.md).
- Dépendances : contrat temporel AL-D02 pour les métadonnées de fraîcheur.
- Travail : réponse typée par source, délais bornés et métadonnées de cache ;
  distinguer réponse vide, panne, source absente et dernier succès périmé.
- Acceptation : une panne ne devient jamais un « aucun événement » ; dernier
  succès et donnée périmée sont visibles ; logs expurgés et erreurs bornées.
- Vérification : vide valide, timeout, HTTP erreur, payload invalide,
  indisponibilité partielle et reprise après erreur ; quotas inchangés.
- Zones : collecteurs `live-*`, routes `/api/live/*` ; adaptation du service
  de briefing différée à AL-D04, sans retarder les autres sources.

**AL-D04 · P3 · M · Implémenter et réceptionner le briefing en toute dernière étape**
- État : différé au lot L6 ; aucun travail de briefing dans L1–L5.
- Dépendances : AL-D01, AL-D02, AL-D03 et clôture L0–L5.
- Travail : sélectionner les éléments de la fenêtre finalement décidée, afficher bornes et instant de
  génération ; différencier veille récente, météo et cotations de dernière séance.
- Acceptation : aucune dépêche hors fenêtre utilisée comme récente ; sources
  manquantes signalées ; zéro résultat ne produit pas de conclusion de sécurité.
- Vérification : fixtures déterministes, source en panne, dates manquantes,
  toutes sources indisponibles et instant près d’une borne.
- Réactivation : seulement après tous ces contrôles et décision explicite de
  reprendre la fonctionnalité ; actualiser ensuite AL-D00 et les preuves.

**AL-D05 · P1 · M · Qualifier les compteurs de chaînes**
- État : livré et testé localement le 30 septembre 2026 ; déployé sur staging le 1er octobre 2026.
  [Contrats, preuves et limites de réception](dashboard-reliability-validation.md).
- Dépendances : D4.
- Travail : comparer `live-channels.ts` au résolveur et factoriser les prédicats
  nécessaires ; noms et définition des dénominateurs explicites.
- Acceptation : référencées et candidates web/VLC ne sont pas confondues ;
  sources désactivées, droits/éligibilité et contrôles expirés traités comme
  prévu par le contrat ; aucune garantie absolue « fonctionne maintenant ».
- Vérification : offline, untested, expiré, désactivé, web/VLC, plusieurs
  sources d’une chaîne ; pas de sondes amont massives à l’ouverture de la page.
- Zones : `live-channels.ts`, résolveur de lecture, KPI et carte.

**AL-D06 · P1 · M · Bandeau daté et périmètre explicite**
- État : livré et testé localement le 30 septembre 2026 ; déployé sur staging le 1er octobre 2026.
  [Contrats, preuves et limites de réception](dashboard-reliability-validation.md).
- Dépendances : D3, AL-D02, AL-D03 ; AL-C03 pour les IDs.
- Travail : Afrique par défaut ; date/âge, source et filtre de périmètre ;
  séparer lieu d’incident, pays du média et périmètre d’un indice financier.
- Acceptation : article ancien identifiable ; date inconnue annoncée ; événement
  hors périmètre absent ou clairement classé « Monde » ; pause accessible.
- Vérification : événement Yemen/Turquie, article Ecofin ancien, date absente,
  lien source, clavier et préférence de mouvement réduit.
- Zones : `LiveMarketTicker.tsx`, marchés, événements, RSS.

### Priorité 2 — Faire du dashboard un espace de travail

**AL-W01 · P2 · M · Compacter l’en-tête et les KPI**
- Statut : livré et testé localement, déployé staging le 1er octobre ; [réception L2](dashboard-workspace-validation.md).
- Dépendances : AL-D05 pour les libellés ; D6.
- Travail : titre court, description brève et indicateurs compacts ; déplacer
  l’explication longue vers un panneau d’aide. Garder le bouton TV discret.
- Acceptation : à 1366×768, début de la carte et du fil visibles sans défiler ;
  les KPI ne créent pas quatre grandes rangées à 390 px ; zoom 200 % utilisable.
- Vérification : captures desktop/mobile avec données réelles et états vides.
- Zones : `LiveRadarDashboard.tsx`.

**AL-W02 · P2 · M · Sélecteur de pays accessible**
- Statut : livré et testé localement, déployé staging le 1er octobre ; [réception L2](dashboard-workspace-validation.md).
- Dépendances : référentiel pays existant.
- Travail : contrôle utilisable au clavier, recherche si la liste le nécessite,
  option Afrique/tous pays ; même état que les interactions carte.
- Acceptation : pays sélectionnable sans carte ; code et nom cohérents ; pays
  sans dépêche conserve ses autres informations sans bloquer l’interface.
- Vérification : clavier, lecteur d’écran, pays vide et absence de carte.

**AL-W03 · P2 · M · Conserver le pays dans l’URL**
- Statut : livré et testé localement, déployé staging le 1er octobre ; [réception L2](dashboard-workspace-validation.md).
- Dépendances : AL-W02.
- Travail : lecture/écriture de `country`, validation, historique navigateur,
  lien partageable et protection contre les réponses périmées de requêtes.
- Acceptation : rechargement et retour/précédent restaurent le pays ; sélectionner
  la carte ou le contrôle donne la même URL ; code invalide géré sans crash.
- Vérification : lien direct, changement rapide SN→CI, réinitialisation,
  paramètres supplémentaires et rafraîchissement.

**AL-W04 · P2 · M · Fil prioritaire sur mobile**
- Statut : livré et testé localement, déployé staging le 1er octobre ; [réception L2](dashboard-workspace-validation.md).
- Dépendances : AL-W01, AL-W02 ; D6.
- Travail : ordre mobile pays → fil → carte à la demande ; chargement de carte
  différé si compatible avec le contrat existant ; ordre de focus cohérent.
- Acceptation : pays et au moins le début du fil accessibles dans la première
  vue 390×844 ; à 320 px aucun débordement horizontal ; aucun article masqué
  définitivement par un contrôle fixe ; tout fonctionne sans carte.
- Vérification : 320/390 px, clavier, paysage et connexion lente simulée.

**AL-W05 · P2 · L · Couches progressives, légendes et dates**
- Statut : livré et testé localement, déployé staging le 1er octobre ; [réception L2](dashboard-workspace-validation.md).
- Dépendances : AL-C04, AL-D03, AL-W02.
- Travail : médias/TV initiaux ; risques/feux opt-in, chargement contrôlé,
  attribution et métadonnées propres. Conserver 2D/3D si fonctionnels.
- Acceptation : aucune couche de risque active par défaut ; dates/légendes
  distinguées ; couches absentes ou indisponibles explicites ; pas de marqueur
  fabriqué pour géométrie invalide ni confusion média/incident.
- Vérification : activer/désactiver, panne d’une couche, coordonnées invalides,
  clics concurrents et retour à la vue médias ; aucune nouvelle API payante.
- Zones : `TacticalVectorMap.tsx`, événements et FIRMS.

**AL-W06 · P1 · M · Tableau de disponibilité des sources**
- Statut : livré et testé localement, déployé staging le 1er octobre ; [réception L2](dashboard-workspace-validation.md).
- Dépendances : AL-D03.
- Travail : remplacer l’indication globale ambiguë par résumé de couverture et
  détail par fournisseur : état, dernier succès, date des données, cache.
- Acceptation : horloge seule ne permet pas « veille active » ; état partiel
  lisible ; fraîcheur évaluée selon chaque cadence métier, pas un seuil unique.
- Vérification : panne unique/totale, cache périmé, source non configurée,
  retour au nominal ; contraste et annonces accessibles sans spam.

### Priorité 3 — Harmoniser la TV et la navigation

**AL-T01 · P2 · M · Navigation commune aux espaces connectés**
- Statut : livré et testé localement, déployé staging le 1er octobre ; [réception L3](tv-workspace-validation.md).
- Dépendances : AL-C01 ; cohérence des droits AL-C02 pour réception.
- Travail : Dashboard, TV, Compte et administration conditionnelle ; logo vers
  dashboard ; page active et retour explicites. TV compacte sur le dashboard.
- Acceptation : même destination par entrée ; aucun lien administratif pour
  rôle standard, contrôle serveur conservé ; accueil de connexion dashboard ;
  liens historiques catalogue et player fonctionnels.
- Vérification : desktop/mobile, rôle standard/admin, lien profond, succès
  abonnement simulé et retour de connexion dans un environnement autorisé.

**AL-T02 · P2 · L · Catégories et langues normalisées**
- Statut : livré et testé localement, déployé staging le 1er octobre ; [réception L3](tv-workspace-validation.md).
- Dépendances : inventaire des valeurs réelles et contrat de filtre décidé.
- Travail : catégories multivaluées, libellés français, codes canoniques,
  inconnus affichés honnêtement ; préférer normalisation à la lecture avant
  d’envisager une migration des données importées.
- Acceptation : filtre Actualités inclut `Business;News` ; `Undefined` devient
  un état inconnu lisible ; données brutes conservées ; facettes et résultats
  utilisent le même contrat sans réduire le catalogue autorisé.
- Vérification : composites, alias, accents, casse, codes langues inconnus,
  valeurs vides et pagination ; mesures de requête si la normalisation la modifie.
- Zones : API filtres/catalogue, `FilterSidebar.tsx`, catalogue et types.

**AL-T03 · P2 · M · État unique des filtres et raccourcis**
- Statut : livré et testé localement, déployé staging le 1er octobre ; [réception L3](tv-workspace-validation.md).
- Dépendances : AL-T02.
- Travail : retirer les états contradictoires ; reducer/hook commun adapté au
  code actuel ; reset clair et annulation/ignorance des réponses obsolètes.
- Acceptation : raccourci Actualités met à jour sidebar et requête ; reset
  réinitialise tous les contrôles ; curseur/pagination repart au changement ;
  nombre affiché correspond au même ensemble que la liste.
- Vérification : recherche + pays + langue + catégories, changement rapide,
  reset et navigation entre favoris/catalogue ; aucune duplication d’options.

**AL-T04 · P2 · M · Entrées Afrique, Sénégal et favoris**
- Statut : livré et testé localement, déployé staging le 1er octobre ; [réception L3](tv-workspace-validation.md).
- Dépendances : AL-T03, AL-W03 pour transmission du contexte pays.
- Travail : raccourcis explicites et « Tout le catalogue » ; lien dashboard
  vers TV qui transmet le pays par un contrat accepté par le catalogue.
- Acceptation : raccourcis n’effacent aucune donnée ; revenir à Tout montre
  l’ensemble autorisé ; favoris persistants conservés ; pays transmis cohérent ;
  favori indisponible respecte la politique de disponibilité définie.
- Vérification : Sénégal→TV, Afrique→Tout, favoris vides/non vides,
  droits expirés selon D5 et filtres combinés.

**AL-T05 · P3 · L · Prototype de lecteur ancré et zapping**
- État : prototype réalisé et évalué localement le 1er octobre 2026, après
  accord produit ; **recommandation ajuster avant généralisation**.
  [Preuves, activation, fichiers et limites](anchored-player-validation.md).
  Exclusivité des lecteurs web gérés reçue ; arrêt/exclusivité VLC global non
  reçus, sortie explicite vers le lecteur existant. Aucune publication de L5.
- Dépendances : AL-T03, AL-T04 et accord de retenir l’expérimentation D7.
- Travail : prototype local désactivable, lecteur persistant et liste filtrée ;
  tester ergonomie avant décision de généralisation.
- Acceptation : un seul flux lu ; ancien player détruit au changement ; arrêt
  et volume accessibles ; modale/fenêtre séparée conservées ; lecture/quotas
  et contrôle d’éligibilité inchangés ; aucun relais média ni autoplay forcé.
- Vérification : zapping rapide, HLS/VLC/indisponible, plein écran, pause,
  changement de filtre, mobile et démontage du lecteur. Documenter résultat
  et décision : conserver, ajuster ou abandonner.

### Réception et préparation de livraison

**AL-Q01 · P1 · M · Régression intégrée et réception produit**
- État : validé localement le 1er octobre 2026 : 233 tests unitaires/intégration,
  57 E2E, TypeScript/ESLint/build ; complément staging 9 E2E, session réelle
  administrateur et zoom natif 200 % local reçus. Comptes ordinaires non reçus.
- Dépendances : lots obligatoires L1–L3, AL-C03, AL-C04.
- Travail : vérifier les critères ci-dessous avec fixtures datées et erreurs
  simulées, puis une observation locale réelle sans prétendre valider l’amont.
- Acceptation : critères obligatoires réussis ; anomalies restantes identifiées
  avec impact ; captures 1366×768 et 390×844 ; TypeScript/ESLint et build réussis.
- Vérification : tests unitaires des contrats modifiés, routes d’accès et E2E
  ciblés ; pas de tests miroirs pour les seuls changements de texte.

**AL-Q02 · P1 · S · Dossier de livraison et validation staging conditionnelle**
- Complément : snapshot L0–L4 déployé le 1er octobre après autorisation,
  `b0d52c0c-3bca-4600-8a3e-fb1f2709dada` SUCCESS/actif ; preuves et limites ci-dessus.
- État : acceptation locale remplie, staging déployé et parcours disponibles
  reçus le 1er octobre 2026 ; comptes ordinaires, lecteur d’écran, appareils
  physiques et inventaire staging actuel restent non reçus.
- Dépendances : AL-Q01, AL-C05 remplis ; toute livraison suivante nécessite
  une nouvelle demande autorisant le déploiement.
- Travail : préparer liste des fichiers/tickets, preuves, limites, changements
  de configuration éventuels et retour arrière compatible avec le schéma.
- Acceptation locale : dossier reviewable sans action distante. Après un éventuel
  déploiement autorisé : enregistrer révision, date, environnement et contrôles
  santé/auth/navigation/données ; ne pas marquer livré avant preuve.
- Vérification : staging reste staging ; mode MVP désactivé ; secrets absents ;
  si migration requise, sauvegarde restaurable et plan de migration avant action.

## 6. Matrice de tests et critères de réception

| Axe | Scénarios minimum | Preuve attendue |
|---|---|---|
| Temps | Bornes 24 h, UTC/fuseau, future, absente, indexation distincte ; fenêtre briefing uniquement en L6 | Tests à horloge figée + libellés revus |
| Briefing en attente | Bouton désactivé, aucune modale ni requête au clic | Contrôle UI pendant L1–L5 ; réception complète seulement en L6 |
| Sources | Vide, timeout, erreur, cache périmé, données partielles, reprise | Tests de service/route + état UI |
| Pays | Sélecteur, carte, lien direct, historique, pays sans données, code invalide | E2E et contrôle clavier |
| Disponibilité TV | Web/VLC, offline, contrôle ancien, désactivation, plusieurs sources | Tests du contrat partagé et contrôle au lancement |
| Accès | Anonyme, sans droit, essai, actif, expiré, administrateur | Matrice AL-C01 approuvée + tests AL-C02 |
| TV | Catégories composites, langues inconnues, recherche/filtres/reset/pagination | Tests de normalisation + parcours E2E |
| Lecteurs existants | Modale, fenêtre séparée, source incompatible, bascule VLC autorisée | Régression ciblée, aucun relais média |
| Responsive et accessibilité | 320/390 px, desktop, zoom 200 %, clavier, focus, mouvement réduit | Captures et vérifications manuelles |
| Cartographie | Worker/fond/couche bloqués, changement de pays, 2D/3D si présent | Fil utilisable malgré panne + absence d’erreur répétée |
| Navigation | Landing/auth→dashboard, TV secondaire, logo, compte, administration | E2E et contrôles par rôle |
| Livraison | TypeScript, ESLint, build ; docs et environnement cohérents | Résultats enregistrés et limites explicites |

Critères de fin du périmètre obligatoire :

- Chaque durée et compteur a une définition vérifiable ; provenance et limites
  visibles. Les pannes ne sont pas présentées comme une absence d’événements.
- Le briefing reste visible mais désactivé jusqu’à la dernière implémentation ;
  sa reprise n’est pas un critère de livraison du dashboard des lots L0–L4.
- Le pays peut être choisi et partagé sans carte ; mobile donne rapidement
  accès au fil. Les couches optionnelles ne bloquent pas ce parcours.
- TV discrète depuis le dashboard ; navigation et filtres cohérents ; totalité
  du catalogue autorisé accessible ; contrôles de lecture conservés.
- Clés dupliquées et worker corrigés sur les scénarios reproduits, ou blocage
  documenté empêchant de déclarer le ticket terminé.
- Matrice d’accès décidée, implémentée et testée. Aucun test administrateur
  n’est pris comme preuve du parcours standard.
- Documentation décrit séparément état local et état déployé. Toute limite
  non testée demeure explicitement indiquée.

## 7. Risques et stratégie de maîtrise

| Risque | Réponse prévue |
|---|---|
| Dates amont incomplètes ou sémantiques différentes | Garder le type de date, isoler inconnus ; retirer une promesse temporelle impossible |
| Couverture fournisseur incomplète ou retardée | Afficher périmètre, limites de volume, dernier succès et cache ; pas de promesse d’exhaustivité |
| Normalisation TV coûteuse en base | Mesurer requêtes/facettes, privilégier modification ciblée ; migration séparée si nécessaire |
| Changement d’accès interprété comme gratuité du dashboard | Décision D5 explicite avant modification ; lecture et administration restent contrôlées |
| Carte lourde ou instable sur mobile | Chargement progressif et fil indépendant ; diagnostiquer worker avant ajouts |
| Nombre de requêtes amont accru par les couches | Réutiliser caches et quotas, charger à la demande, pas de rafraîchissement massif |
| Cache mémoire différent entre réplicas | Exposer horodatage par réponse ; ne pas ajouter un service partagé sans besoin mesuré |
| Nouveau lecteur fragilise les parcours existants | Lot optionnel isolé et désactivable ; régression avant généralisation |
| Documentation ancienne prise pour état courant | Inventaire daté, preuves par environnement et journal de livraison |

Hors périmètre : véritable génération IA, nouveaux fournisseurs payants,
surveillance programmée, refonte des paiements, refonte du modèle d’abonnement,
mise en production, migration de domaine et infrastructure de cache externe.
Un besoin dans ces domaines ouvre un nouveau lot avec ses propres critères.

## 8. Suivi du backlog

Utiliser les statuts : à faire → en cours → en revue → validé localement →
déployé staging (seulement si autorisé et prouvé). « Bloqué » nécessite une
cause et l’action attendue. Un diagnostic ou une PR ne suffit pas à déclarer
une fonctionnalité déployée.
Le statut « différé » indique une reprise ordonnée ultérieurement, notamment
AL-D01/AL-D04 en L6 ; ce n’est ni un blocage technique ni une livraison.

Pour chaque ticket, consigner : décision liée, fichiers touchés, preuve de
test, limites, environnement, date et prochaine action. À la fin de chaque lot,
mettre à jour ce document et le journal production sans effacer l’historique.

Prochaine étape : décider de l'ajustement/réception humaine **L5 / AL-T05**
sur le prototype testé et sa limite VLC. **Ne pas commencer L6 dans cette session** ;
AL-D01/AL-D04 et le briefing restent différés, toute reprise exigeant une nouvelle
demande. Les réserves de réception réelles et les preuves
à conserver sont détaillées dans la [fiche de reprise](dashboard-session-handoff.md).
