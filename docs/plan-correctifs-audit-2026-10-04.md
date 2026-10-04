# Plan des correctifs de l'audit — Africa Live

Date : 4 octobre 2026. Statut : correctifs reçus localement ; COR-506 partiel et COR-900 avec réserves. Publication GitHub et Railway staging expressément autorisée après le bilan, en cours. [Réception locale](correctifs-audit-validation-2026-10-04.md), [publication](publication-correctifs-2026-10-04.md).

Sources : [audit du code](<C:/Users/GAMER PC/Africa_Live_TV/docs/audit-code-2026-10-04.md>), [backlog de ce plan](<C:/Users/GAMER PC/Africa_Live_TV/docs/backlog-correctifs-audit-2026-10-04.md>), [checklist existante](<C:/Users/GAMER PC/Africa_Live_TV/docs/non-regression-checklist.md>), [runbook staging](<C:/Users/GAMER PC/Africa_Live_TV/docs/railway-preproduction-runbook.md>).

## 1. Résultat attendu et périmètre

Corriger les douze constats principaux F1–F12 et le comptage Radar, puis réduire la dette de tests, d'orchestration et de documentation. Les cinq lots constituent un ordre de correction ; chaque correctif comprend dès sa réalisation ses tests de non-régression. Le lot 5 consolide ces tests et la CI : il ne reporte pas la validation des lots précédents.

Le propriétaire a demandé l’implémentation de ce plan et du backlog. Les corrections locales et leurs contrôles sont réalisés ; les critères initiaux ci-dessous restent la référence. Les publications, modifications distantes et réparations de droits réels constituent des étapes distinctes. Le [dossier de réception](correctifs-audit-validation-2026-10-04.md) distingue les preuves actuelles des limites encore ouvertes.

Règles à conserver pendant l'exécution :

- Travailler dans `Africa_Live_TV`, préserver les changements existants et laisser le projet source IPTV inchangé.
- Utiliser `africa_live_dev` et le port 3001 ; données synthétiques dans des schémas de test isolés, nettoyés après les intégrations.
- Maintenir le catalogue complet prévu par le MVP et ses exclusions intentionnelles. Distinguer visibilité, état observé et possibilité de tentative locale.
- Télécharger les médias directement depuis l'amont ; aucun relais vidéo, conversion ou stockage serveur de média.
- Garder les règles strictes de lecture et l'authentification sur staging/production. La capacité locale ne s'active que dans le contexte local de confiance prévu par le code.
- Ne pas modifier les tarifs, durées de forfait, essai ou quotas dans un correctif technique.
- Ne pas modifier les secrets ou les drapeaux distants, ni activer les paiements pour effectuer des tests. Fournisseur simulé par défaut.
- Ne pas ajouter de service payant ou d'abonnement à une alerte. Aucun secret, URL sensible complète ou donnée personnelle dans les preuves.
- Relire les guides pertinents de `node_modules/next/dist/docs/` avant toute modification Next.js ; conserver les exclusions des fixtures dans TypeScript et ESLint.
- Aucun commit, push ou déploiement implicite. `just-compassion` conserve le rôle staging, même si le tableau de bord nomme son environnement `production`.

## 2. Découpage et dépendances

| Étape | Tickets | Résultat livrable | Dépendance principale |
| --- | --- | --- | --- |
| Préparation | COR-000 | Baseline, reproductions et environnement contrôlés | Aucune |
| Lot 1 | COR-101 à COR-105 | Droits déterministes et politique de lecture cohérente | COR-000 |
| Lot 2 | COR-201 à COR-206 | Délais fournisseur, reprise des jobs, verrou et Next corrigés | Lot 1 pour les parcours de paiement |
| Lot 3 | COR-301 à COR-304 | Préférences fiables et une seule chaîne audible | Lot 2 reçu ; politique de lecture du lot 1 |
| Lot 4 | COR-401 à COR-404 | Cache renouvelé, conversion juste, catalogue local et total Radar corrects | Lot 3 reçu ; COR-104/105 pour le local |
| Lot 5 | COR-501 à COR-507 | Tests déterministes, CI renforcée, code simplifié et mesures | Lots 1 à 4 reçus |
| Réception globale | COR-900 | Dossier local complet et limites restantes explicites | Les cinq lots |
| Publication facultative | COR-901 | Réception staging et procédures de récupération | Autorisation explicite et lot prêt |

Les tickets indépendants peuvent être réalisés séparément, mais leurs validations doivent rester isolées. COR-206 (mise à jour de sécurité) peut être avancé avant la fin du lot 1 si nécessaire, dans un changement distinct avec sa propre non-régression. Aucun changement métier ne doit être noyé dans la mise à jour des dépendances ou une extraction de composants.

### COR-000 — Figer les preuves de départ

**Travail :** vérifier `git status --short`, la révision et les versions, relire le handoff et confirmer l'environnement local sans afficher les secrets. Rejouer les reproductions utiles dans le runner isolé existant ; vérifier que les références de l'audit correspondent toujours au code. Inventorier les migrations déjà présentes.

**Acceptation :** pour chaque F1–F12, un test reproductible ou une preuve statique nommée, son résultat attendu et le périmètre de données contrôlé. Les preuves de l'audit restent historiques, les nouveaux résultats portent leur propre date.

**Validation :** baseline typage/lint/unités/intégrations/build et liste des E2E concernés. Ne pas rejouer une commande sans motif si le même code vient d'être vérifié ; conserver les résultats utiles et les limites.

## 3. Lot 1 — Droits et éligibilité

Zone principale : [paiements](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/naboopay-payment.ts>), [résolveur](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/playback-resolution.ts>), [politique de lecture](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/playback-resolution-policy.ts>), [résumé Radar](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/live-channel-summary.ts>).

### COR-101 — Définir le calcul temporel des droits et les remboursements — F1

**Travail :** écrire une courte règle métier et des exemples datés avant de toucher au calcul. Définir la date effective d'achat, l'empilement mensuel/annuel, l'interaction avec l'essai, les achats séparés par une interruption et le traitement d'un remboursement.

**Proposition de base :** utiliser une date d'achat vérifiée et conservée, avec un ordre stable par date puis identifiant. Pour un achat valide, le début est le maximum entre l'échéance déjà acquise et la date effective de cet achat. La date du traitement actuel ne doit pas rajeunir les achats passés. Définir un repli explicite quand `paid_at` manque et ne jamais remplacer une date d'achat établie par la date d'un remboursement.

**Décision à documenter avant COR-102 :** un remboursement retire-t-il la période attribuée à cet achat ou provoque-t-il une reconstruction de l'historique ? Que faire des périodes déjà consommées ? Si cette règle n'est pas établie par les règles commerciales existantes, présenter les exemples et faire valider ce seul point métier avant son implémentation.

**Décision obtenue et implémentée :** retirer l’achat remboursé et recalculer les achats restants à leurs dates d’origine. [Règles et exemples datés](correctifs-audit-validation-2026-10-04.md#règle-des-droits-et-décision-de-remboursement).

**Acceptation :** les exemples donnent une échéance précise ; un historique identique rejoué un mois plus tard produit la même échéance acquise. Pending/failed ne donnent aucun jour. Les droits hérités d'un autre fournisseur ne sont pas écrasés.

**Tests :** horloge injectée et jeux de dates pour achat pendant l'essai, renouvellement, interruption, webhook tardif, remboursement et achats à la même date. Les prix et durées actuels sont conservés.

### COR-102 — Corriger l'attribution atomique et idempotente des droits — F1

**Dépendance :** COR-101.

**Travail :** extraire le calcul déterministe dans une fonction pure ; adapter la transaction applicative pour appliquer le résultat et conserver les dates acquises. Réserver le changement de droits aux événements qui le justifient. Maintenir les verrous, signatures, vérifications montant/devise/produit et protections contre les événements anciens. Employer un ordre de verrouillage compatible avec tous les traitements de paiement concernés.

**Acceptation :** 10 jours restants restent 10 après pending/failed ; un mois expiré reste expiré ; un renouvellement annuel ajoute exactement 365 jours selon la règle retenue. Doublons et événements dans le désordre ne changent pas deux fois les droits. Deux achats concurrents du même compte sont cumulés correctement.

**Tests :** unité sur le calcul et PostgreSQL sur mutation, concurrence, rollback et abonnements d'autres fournisseurs. Vérifier aussi `currentPeriodStart`, `currentPeriodEnd`, le statut effectif et l'expiration réelle du droit d'accès.

**Schéma :** commencer avec les champs existants. Ajouter une migration additive uniquement si la conservation de périodes attribuées s'avère nécessaire pour la règle retenue ; pas de transformation irréversible cachée dans le correctif.

### COR-103 — Préparer le diagnostic des droits historiques — F1

**Dépendance :** COR-102.

**Travail :** produire un diagnostic en lecture seule comparant les échéances enregistrées et calculées, avec catégories : cohérent, date manquante, écart explicable, écart à examiner. Rédiger la procédure de réparation et de compensation ; aucune réparation automatique à l'exécution d'un webhook ou au démarrage.

**Acceptation :** sortie minimisée, identifiants internes et écarts, sans secret ni coordonnées clients. En mode par défaut, le diagnostic ne modifie rien. Les historiques ambigus sont signalés au lieu d'être reconstruits par supposition.

**Tests :** jeux synthétiques comprenant les deux erreurs de l'audit et des historiques légitimes ; preuve de non-mutation. Toute éventuelle commande de réparation doit être idempotente, bornée à une sélection explicite et disposer d'une simulation avant application.

**Limite de réception :** code et diagnostic peuvent être reçus localement. Lecture ou réparation des comptes distants nécessite une demande appropriée ; toute réduction de droits réels demande une décision explicite et une sauvegarde préalable. Aucune réduction silencieuse d'échéance.

### COR-104 — Unifier la politique stricte de sources — F2

**Travail :** supprimer l'acceptation permissive des UNTESTED hors contexte local autorisé. Utiliser une politique pure commune pour les capacités web/VLC, le résolveur et les compteurs de sources certifiées. Conserver la distinction entre chaîne référencée, source certifiée et tentative locale.

**Acceptation :** une source REVIEW_REQUIRED, non contrôlée récemment, à paramètres sensibles ou sans CORS ne devient pas lisible sur le web par sa seule appartenance à UNTESTED. Aucune lecture externe non approuvée. `PLAYBACK_ELIGIBILITY_READY` reste une barrière globale, sans remplacer le contrôle par source. Les chaînes restent consultables conformément à la politique de visibilité.

**Tests :** matrice par destination, statut, éligibilité, fraîcheur, HTTPS/CORS, credentials, jeton et expiration ; date future ; source inactive ; source retirée. Assertions explicites sur le résolveur et le résumé Radar, pas uniquement sur le nom de la fonction appelée.

### COR-105 — Vérifier les frontières local/staging/production — F2

**Dépendance :** COR-104.

**Travail :** tester l'autorisation d'accès et le choix de politique dans les modes Clerk local, MVP local, lecture locale de confiance et build strict. Aligner la présentation des capacités sans élargir prématurément le catalogue local OFFLINE, traité au lot 4.

**Acceptation :** les drapeaux locaux ne permettent pas d'affaiblir un build staging/production ; une requête externe ou avec origine/proxy non fiable ne déclenche pas le repli local. Refus 401/403/429 sans récupération permissive côté interface. Le lancement VLC desktop reste spécifique au poste local.

**Tests :** intégrations API et E2E existants `auth-entry`, `local-playback-api`, `local-playback`, `catalogue`, plus la matrice du résolveur. Essai expiré, compte bloqué et quotas atteints doivent rester refusés pour la lecture.

**Sortie du lot 1 :** règles datées, F1/F2 non reproductibles sur les nouveaux tests, diagnostic historique sans mutation et frontières d'accès intactes. Un historique distant non examiné reste une limite de réception explicite.

## 4. Lot 2 — Fournisseur, reprises, workers et dépendances

Zone principale : [client NabooPay](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/naboopay.ts>), [checkout](<C:/Users/GAMER PC/Africa_Live_TV/src/app/api/checkout/naboopay/route.ts>), [réconciliation](<C:/Users/GAMER PC/Africa_Live_TV/src/inngest/functions/reconcile-naboopay.ts>), [worker de vérification](<C:/Users/GAMER PC/Africa_Live_TV/src/scripts/verify-streams.ts>).

### COR-201 — Appliquer un délai fournisseur de bout en bout — F3

**Travail :** couvrir connexion, en-têtes, lecture bornée du corps et validation par un même délai ; libérer lecteur et timer dans toutes les sorties. Garder la limite actuelle de taille de réponse. Mapper correctement l'annulation pendant la lecture vers l'erreur de délai.

**Acceptation :** un corps qui n'arrive jamais est interrompu au délai configuré. Une lecture partielle bloquée, une réponse trop grande ou un JSON invalide ne conserve aucune ressource active. Un POST n'est jamais automatiquement rejoué à la suite d'un délai.

**Tests :** réponses simulées avec en-têtes immédiats/corps lent, corps partiel puis blocage, erreur pendant lecture, absence de corps, taille excessive et succès juste avant limite. Utiliser un délai injectable court ; un test ne doit pas réellement patienter dix secondes pour chaque cas.

### COR-202 — Conserver les issues de création incertaines — F3/F4

**Dépendances :** COR-102 et COR-201.

**Travail :** formaliser la machine d'états des commandes et distinguer refus certain, traitement en cours, confirmation obtenue et issue inconnue. Une coupure après envoi, un succès fournisseur inexploitable ou un arrêt avant persistance du résultat ne doivent pas être considérés arbitrairement comme un refus définitif. Stabiliser le comportement du client et de `/api/checkout/status` face à ces états.

**Acceptation :** même clé d'idempotence = même tentative ; état incertain = aucune recréation automatique. La réutilisation ou création d'une nouvelle clé par l'interface ne masque pas une tentative ambiguë. L'interface indique une vérification en cours et permet un suivi compréhensible sans exposer de détail technique sensible.

**Tests :** arrêt après insertion `creating`, interruption après réponse fournisseur, coupure après envoi, réponse malformée, doublon HTTP, tentatives concurrentes et reprise de la page de paiement. Aucun test n'effectue d'encaissement réel.

**Schéma :** réutiliser les états existants si possible. Toute évolution de contraintes ou métadonnées de reprise doit être additive, documentée et compatible avec un retour au code précédent.

### COR-203 — Rendre la réconciliation équitable et reprenable — F4

**Dépendance :** COR-202.

**Travail :** séparer les commandes identifiables des créations sans identifiant fournisseur ; parcourir les commandes dues selon un ordre stable et une limite. Enregistrer une prochaine échéance de vérification ou un mécanisme durable équivalent, indépendamment de la date métier du fournisseur. Traiter les `creating` anciennes comme des issues à examiner, sans inventer un endpoint de recherche fournisseur.

**Acceptation :** 100 créations ambiguës n'empêchent pas la commande identifiable suivante d'être traitée. Plusieurs lots et plusieurs exécutions finissent par couvrir toutes les commandes dues. Une commande toujours pending ne monopolise pas les premiers lots. Un arrêt n'abandonne pas définitivement les commandes prises en charge.

**Concurrence :** éviter qu'une prise en charge parallèle déclenche des appels non bornés ou perde la progression ; si un bail est utilisé, il expire après interruption. Ne pas maintenir une transaction SQL ouverte pendant un appel HTTP. Le calcul de droits demeure idempotent.

**Tests :** plus de 100 candidats, candidats ambiguës en tête, échec fournisseur puis reprise, crash au milieu d'un lot, deux exécutions concurrentes et payload fournisseur inchangé.

**Schéma possible :** échéance de prochaine vérification, compteur et résultat de la dernière tentative, avec index approprié. Arrêter le choix précis après revue de la requête et des règles de reprise. Les commandes sans identifiant sont visibles dans un diagnostic interne ; aucune alerte externe n'est souscrite par ce ticket.

### COR-204 — Garder une connexion dédiée pour le verrou du worker — F10

**Travail :** acquérir le verrou de session sur une connexion réservée et la conserver jusqu'à la fin du job. Libérer le verrou sur cette même connexion dans un `finally`, puis rendre la connexion. Prendre en charge verrou refusé, liste vide, erreur, annulation et interruption ; vérifier les autres points d'acquisition du dépôt.

**Acceptation :** un deuxième worker ne démarre pas pendant un intervalle sans requête SQL plus long que le délai d'inactivité du pool. La fin normale ou anormale rend le verrou disponible. Un verrou refusé ne laisse pas le processus ou la connexion en attente.

**Tests :** intégration PostgreSQL avec deux clients, délai de pool réduit et scénario de tâche réseau simulée. Le vrai worker ne sonde pas les flux amont pour démontrer ce correctif. Aucune migration attendue.

### COR-205 — Superviser les écritures asynchrones du worker

**Dépendance :** COR-204.

**Travail :** rattacher les promesses d'écriture au traitement principal et gérer l'épuisement des tentatives SQL. Définir le devenir d'un lot retiré de la file avant échec et l'arrêt du job. Conserver le nombre limité de tentatives et empêcher une boucle d'écriture concurrente non supervisée.

**Acceptation :** aucune rejection non gérée ; erreur remontée et sortie en échec ; bilan qui distingue lignes vérifiées, écrites et restantes. Relancer le job retrouve les lignes non persistées sans les déclarer saines artificiellement.

**Tests :** panne SQL injectée après plusieurs succès, épuisement des reprises, flush final et nettoyage du verrou. Les données publiques restent inchangées par le test.

### COR-206 — Mettre Next.js à une version corrigée — F12

**Travail :** revérifier l'avis et les versions disponibles au moment de l'implémentation ; choisir une version corrigée compatible, aligner `next`, `@next/env` et `eslint-config-next`, mettre à jour le lockfile de façon ciblée. Lire les guides installés après la mise à jour.

**Référence vérifiée lors de l'audit :** GHSA-vcvr-r3jv-pc5j affecte la version 16.3.5 du dépôt et annonce une correction à partir de 16.3.6. Le choix final ne présume pas que cette version est toujours la cible appropriée. [Avis officiel](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).

**Acceptation :** la dépendance installée sort de la plage affectée ; audit des dépendances consigné ; modifications de lockfile expliquées ; aucune mise à niveau majeure ou migration de framework non nécessaire dans ce ticket. L'audit initial n'a pas démontré de chemin ImageResponse exploitable dans l'application.

**Tests :** installation reproductible, typage, lint, unités, intégrations, build, contrôle des pages publiques, entrée Clerk, catalogue et lecteur/PWA pertinents. Pas de `npm audit fix --force`.

**Sortie du lot 2 :** temps réseau borné, issues incertaines suivies, lots équitables, verrou conservé, écritures supervisées et version Next corrigée. Toute migration éventuelle a sa preuve sur schéma isolé et sa stratégie de compatibilité.

## 5. Lot 3 — Préférences et mur TV

Zone principale : [page TV](<C:/Users/GAMER PC/Africa_Live_TV/src/app/(clerk)/app/page.tsx>), [API pays suivis](<C:/Users/GAMER PC/Africa_Live_TV/src/app/api/followed-countries/route.ts>), [synchronisation](<C:/Users/GAMER PC/Africa_Live_TV/src/components/shell/FollowedCountriesSync.tsx>), [mur TV](<C:/Users/GAMER PC/Africa_Live_TV/src/app/(clerk)/app/mur/TvWall.tsx>), [Player](<C:/Users/GAMER PC/Africa_Live_TV/src/components/Player.tsx>).

### COR-301 — Sérialiser les snapshots de favoris — F5

**Travail :** remplacer les files par chaîne par une coordination de toutes les mutations de favoris d'un même client. Conserver l'intention optimiste et les changements non confirmés. Protéger aussi la lecture initiale et la synchronisation de démarrage contre les réponses anciennes. Une révision serveur n'est ajoutée que si les cas multi-appareils la justifient.

**Acceptation :** ajouter A puis B donne `[A,B]` dans l'interface, la base et le stockage local quel que soit le délai des réponses. Une confirmation ancienne ne supprime pas une intention plus récente ; une erreur ne la fait pas passer pour confirmée.

**Tests :** A/B avec délais inversés, ajout puis retrait, plusieurs changements de la même chaîne, GET initial tardif, erreur réseau puis reprise et rechargement avec mutations non confirmées. Étendre les scénarios catalogue/TV existants plutôt que créer un doublon de parcours.

### COR-302 — Sérialiser le remplacement des pays côté base — F6

**Travail :** verrouiller la ligne utilisateur avant DELETE/INSERT, dans la même transaction, et retourner le résultat correspondant au remplacement validé. Garder les contraintes d'unicité, de position et la validation des codes.

**Acceptation :** deux remplacements concurrents d'une liste vide réussissent sans `23505` ; la liste finale est l'une des listes validées, jamais un mélange. Les écritures de comptes distincts restent indépendantes. Un échec entre suppression et insertion restaure la liste précédente.

**Tests :** PostgreSQL avec entrelacement forcé, listes vides/non vides, rollback, positions et comptes différents. Aucune migration attendue pour ce correctif minimal.

### COR-303 — Reprendre et regrouper les synchronisations de pays — F6

**Dépendance :** COR-302.

**Travail :** conserver une seule requête d'écriture en vol et regrouper les modifications suivantes selon la dernière intention locale. Reprendre après échec initial de lecture, reconnexion ou échec d'envoi, avec nombre de reprises borné et délai. Ne pas faire d'une annulation client la preuve que le serveur n'a rien enregistré.

**Acceptation :** une modification survenant pendant un PUT est envoyée ensuite ; une réponse ancienne ne devient pas l'état de référence récent. Après GET initial en échec puis retour réseau, la synchronisation reprend sans remonter le composant. Le stockage local conserve l'intention hors ligne.

**Règle multi-appareils de base :** sans révision serveur, la dernière écriture validée par le serveur fait foi. Ne pas promettre un ordre global des clics entre appareils. Si une exigence plus forte est retenue, prévoir explicitement une révision et la gestion des conflits dans un changement séparé.

**Tests :** debounce avec réseau lent, réponses inversées, GET/PUT en erreur, reprise, démontage et double montage des effets. Vérifier que 401/403/429 ne déclenchent pas de boucle de reprises.

### COR-304 — Donner au mur l'autorité sur le son — F7

**Travail :** lorsque le lecteur est contrôlé, faire remonter une demande d'écoute au parent ou empêcher la modification locale non autorisée. Harmoniser boutons, raccourcis, volume, autoplay et reprise. Utiliser une identité stable de chaîne pour le choix audible si le mur se réorganise.

**Acceptation :** au plus une vidéo non muette, et le libellé « son actif » correspond à cette vidéo. Passer le son à B coupe A. Enlever ou remplacer la chaîne audible conserve un état cohérent. Un lecteur autonome garde ses contrôles habituels.

**Tests :** 1 à 4 vidéos, clic interne, bouton du mur, clavier, variation du volume, pause/reprise, changement de chaîne et erreur de lecture. Éco data et fermeture du lecteur unique restent conformes ; aucun lancement externe multiple inattendu lors du test du mur.

**Sortie du lot 3 :** préférences cohérentes après erreurs/réponses inversées, remplacements SQL sûrs et contrôle sonore unique réellement respecté.

## 6. Lot 4 — Cache, conversion et catalogue

Zone principale : [recherche](<C:/Users/GAMER PC/Africa_Live_TV/src/components/search/UniversalSearch.tsx>), [marchés](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/live-markets.ts>), [visibilité](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/catalog-visibility.ts>), [catalogue Radar](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/live-channels.ts>).

### COR-401 — Renouveler réellement le cache des dépêches — F8

**Travail :** partager la règle de validité du cache entre initialisation et chargement. Séparer réponse vide valide et erreur ; gérer une requête en cours et sa fin, sans mémoriser un échec comme un succès. Prévoir le rafraîchissement lorsque la recherche reste ouverte au-delà du TTL.

**Acceptation :** une réouverture après expiration peut obtenir de nouvelles dépêches ; deux consommateurs simultanés ne doublent pas inutilement la requête. Après erreur puis succès, le contenu se recharge. Un résultat vide valide respecte le TTL, sans rafale d'appels.

**Tests :** horloge contrôlée avant/après cinq minutes, recherche ouverte et remontée, HTTP 500/403, JSON invalide, résultat vide, annulation et succès suivant. Une annulation ne doit pas figer un état « requête en cours ».

### COR-402 — Corriger les unités du taux dérivé — F9

**Travail :** calculer USD/XOF par multiplication des EUR par USD et des XOF par EUR. Conserver le taux XOF direct quand il est fourni et valide ; conserver provenance, fraîcheur et caractère indicatif.

**Acceptation :** avec `rates.EUR=0,9`, soit « EUR pour un USD » dans le payload, le résultat est `655,957 × 0,9 = 590,3613`. Le taux direct n'est pas remplacé par le taux dérivé. Les valeurs nulles, négatives ou non finies restent refusées.

**Tests :** payloads simulés avec et sans XOF, plusieurs valeurs EUR, erreur de fournisseur et précision/arrondi d'affichage. Aucun test ne dépend du taux réel du jour.

### COR-403 — Retenter localement les échecs historiques sans les certifier — F11

**Dépendances :** COR-104 et COR-105.

**Travail :** adapter le filtrage SQL et l'interface afin qu'une source active historiquement OFFLINE puisse être visible et atteigne la politique de tentative locale. Appliquer la même frontière de confiance côté serveur que pour la résolution ; ne pas prendre un paramètre client comme autorisation suffisante. Couvrir filtres, pagination, disponibilité affichée et sous-catalogues concernés.

**Acceptation :** sur le poste local autorisé, une chaîne active avec seulement un ancien échec reste consultable et peut être retentée. La tentative ne change ni la santé ni l'éligibilité stockées. En mode strict, la même source reste refusée pour la lecture. Chaîne inactive ou retirée reste exclue conformément aux règles intentionnelles.

**Tests :** OFFLINE historique, contrôle expiré, échec temporaire, flux VLC uniquement, flags/origines/proxies non fiables, chaîne retirée, pagination et filtrage. Vérifier les empreintes des statuts/éligibilités avant et après tentative.

### COR-404 — Donner un total Radar exact et un cache compatible avec la pagination

**Dépendance :** COR-403.

**Travail :** éliminer le total calculé sur un échantillon `limit × 3`. Calculer le total avec le même prédicat de visibilité que la liste. Séparer liste bornée et comptage, puis stocker dans le cache les paramètres qui changent réellement le résultat. Si une estimation était retenue, elle demanderait un contrat/affichage explicite ; la cible de ce plan est un total exact.

**Acceptation :** 121 chaînes visibles avec limite 40 retournent 40 éléments et total 121. Passer successivement les limites 10/40/80 ne pollue pas les résultats en cache. Une forte proportion de chaînes sans source visible n'arrête pas la sélection après un échantillon insuffisant. `canPlay` demeure propre à la requête et au compte.

**Tests :** 0/1/40/121 chaînes, plusieurs sources par chaîne, sources inactives, limites différentes, cache renouvelé, droit de lecture différent entre comptes et cohérence avec le résumé. Mesurer la requête corrigée plutôt que charger tout le pays sans borne.

**Sortie du lot 4 :** F8/F9/F11 et total Radar non reproductibles ; échecs historiques visibles en local sans propagation d'une politique permissive à staging/production.

## 7. Lot 5 — Simplicité, CI et profilage

### COR-501 — Rendre les tests déterministes

**Travail :** injecter horloge et fournisseurs lorsque nécessaire ; isoler les tests du briefing des appels réels RSS/marchés/alertes et de la base publique. Intégrer les reproductions retenues à la suite normale, avec les garde-fous du runner PostgreSQL. Les sondes externes deviennent une vérification séparée et facultative.

**Acceptation :** la suite unitaire peut passer sans réseau ni fournisseur réel ; les intégrations utilisent exclusivement leur schéma et prouvent leur nettoyage. Aucun délai arbitraire long utilisé pour cacher une course. Les scénarios F1–F12 sont identifiés par leurs assertions de comportement.

**Tests :** exécution sans réseau externe, répétition ciblée des scénarios concurrents et preuve de préservation des données publiques. Les répétitions s'arrêtent lorsque les courses concernées sont couvertes et stables.

### COR-502 — Rendre les parcours sensibles obligatoires en CI

**Dépendance :** COR-501 ; tests de chaque lot déjà écrits auparavant.

**Travail :** compléter la CI avec l'audit des dépendances et une sélection explicite des E2E sensibles : accès, catalogue, paiement simulé, reprise de lecture, favoris, pays suivis, mur, recherche et cohérence Radar. Conserver les protections strictes et circonscrire les modes synthétiques aux environnements de test prévus.

**Acceptation :** une régression des droits, de l'éligibilité, de la concurrence ou du délai réseau bloque la CI. Un résultat partiel/suite ignorée n'est pas affiché comme une réception complète. Distinguer indisponibilité du service d'audit, vulnérabilité documentée et éventuelle exception temporaire datée ; aucun `continue-on-error` qui masque un échec obligatoire.

**Validation :** exécuter le workflow sur l'environnement local/CI contrôlé, vérifier les rapports/traces sans secrets et une installation propre. Le parcours Clerk réellement connecté conserve sa réception séparée si aucun compte de test approprié n'est disponible ; ne pas ouvrir l'authentification pour le simuler en production.

### COR-503 — Extraire le cycle de vie du lecteur

**Dépendances :** COR-104/105, COR-304 et leurs tests.

**Travail :** extraire progressivement résolution/tentatives, attachement/destruction HLS et écoute d'événements, en gardant la machine de lecture comme référence. Documenter quelles fonctions possèdent la vidéo, les timers et les annulations. Une extraction par changement reviewable ; pas de machine supplémentaire concurrente.

**Acceptation :** Player se concentre sur la composition et les interactions ; les ressources sont détruites une seule fois. Chaîne remplacée rapidement, résolution tardive, autoplay refusé et fallback produisent le même comportement validé. Aucun objectif arbitraire de nombre de lignes ne remplace ces critères.

**Tests :** suites de lecteur existantes, changement TV/Radar, mode ancré, reprise, VLC simulé, mur, PiP/plein écran selon le navigateur de test et absence d'erreur après démontage. Les contraintes d'appareils réels restent consignées.

### COR-504 — Réduire l'orchestration de la page TV et des préférences

**Dépendances :** COR-301/302/303 et leurs tests.

**Travail :** sortir favoris/synchronisation et chargement catalogue dans des hooks ciblés. Garder les règles serveur, les contrats et le stockage local explicitement séparés. Mutualiser uniquement les mécanismes réellement communs de reprise/ordre, sans créer un framework générique de synchronisation.

**Acceptation :** la page assemble recherche, filtres, catalogue et lecteur ; elle ne possède plus directement les files de mutations et leur reprise. Résultats, URL des filtres, pagination, intentions hors ligne et reprise restent identiques.

**Tests :** catalogue, espace TV, favoris/pays, recherche et rechargement. Vérifier qu'une extraction ne réintroduit pas de GET tardif écrasant un état récent.

### COR-505 — Borner les caches et définir leur invalidation

**Travail :** donner une capacité maximale et une éviction au cache météo, purger les expirations et borner les clés. Documenter l'invalidation des caches de métadonnées après import/retrait et le comportement par processus. Garder la coalescence des appels en cours et les règles de fraîcheur/provenance.

**Acceptation :** des milliers de coordonnées synthétiques ne produisent pas une Map croissante sans borne. Une entrée expirée est évincée. Un retrait ne permet jamais de résoudre une source désactivée, même si un listing est encore en cache. Le délai de visibilité des changements de métadonnées est documenté.

**Tests :** cardinalité, éviction, expirations, panne fournisseur, requêtes simultanées, retrait après mise en cache et redémarrage. Aucune nouvelle infrastructure de cache n'est requise sans mesure qui la justifie ; aucun média mis en cache.

### COR-506 — Mesurer les performances représentatives

**Dépendance :** COR-503/504/505 ; possibilité de recueillir un état initial plus tôt pour comparaison.

**Travail :** fixer un protocole reproductible sur build servi localement, avec mêmes données et scénarios avant/après. Mesurer temps SQL et API séparément, p50/p95, nombre d'appels, mémoire, latence de première interaction et coût du mur à 1/2/4 lecteurs. Utiliser des médias synthétiques pour éviter une rafale sur les amonts.

**Acceptation :** tableau de mesures, configuration machine/build/données, nombre d'échantillons, limites et comparaison. Tester une montée contrôlée de concurrence locale et l'application des quotas ; définir le budget acceptable après baseline, avant optimisation. Optimiser uniquement un coût mesuré, puis vérifier le gain.

**Limite :** les 38–39 ms de SQL observés dans l'audit ne sont ni une mesure HTTP ni une promesse de charge. Lighthouse et les mesures locales ne remplacent pas les appareils réels ou la latence staging. Les mesures distantes nécessitent une demande distincte et un budget de trafic adapté.

### COR-507 — Consolider l'état opérationnel actuel

**Travail :** conserver une page courte d'état actuel et faire pointer le handoff vers elle. Distinguer état local, publié sur staging et futur lancement de production. Lier chaque ticket au résultat, aux tests et aux limites ; conserver les anciennes preuves dans un historique lisible.

**Acceptation :** versions, migrations, rôle des environnements, drapeaux, date des mesures, correctifs reçus et étapes restantes identifiables sans interpréter des paragraphes contradictoires. Un ticket « reçu localement » n'est jamais marqué « publié ».

**Validation :** revue documentaire et liens ; les champs distants non revérifiés sont explicitement datés. Aucune réécriture des preuves historiques ni exposition de secret.

**Sortie du lot 5 :** tests déterministes, contrôles sensibles obligatoires, responsabilités identifiables et profilage reproductible ; pas de nouvelle abstraction ou infrastructure sans besoin démontré.

## 8. Réception, migrations et publication

### COR-900 — Recevoir l'ensemble des correctifs localement

**Dépendance :** tous les tickets des cinq lots. Les critères des lots 1–4 peuvent être reçus auparavant sans attendre les extractions du lot 5.

Un correctif est reçu lorsque son comportement attendu est démontré, ses tests passent, son diff est expliqué et les limites sont consignées. Une compilation réussie ne clôt pas à elle seule un défaut métier.

Contrôles communs, à exécuter aux étapes appropriées :

```text
npx tsc --noEmit --incremental false
npm run lint
npm test
npm run test:integration
npm run db:check:migrations
npm run build
npm audit --omit=dev
```

Ces commandes constituaient la checklist du plan initial ; leurs exécutions actuelles sont consignées dans le dossier de réception. Les intégrations et l'audit ne remplacent pas les scénarios E2E ciblés. Les compteurs actuels sont 364 unités réussies et 23 intégrations PostgreSQL, distincts des preuves historiques de l’audit.

Checklist de réception locale :

- [ ] Tous les constats F1–F12 disposent d'un résultat ou d'une limite résiduelle explicitement acceptée.
- [ ] Calcul des droits stable avec le temps, doublons, erreurs et concurrence ; autres fournisseurs préservés.
- [ ] Sources non éligibles refusées hors local ; catalogue et tentatives locales conformes.
- [ ] Aucun nouvel appel fournisseur de paiement réel ; issues ambiguës conservées et reprenables.
- [ ] Préférences et son corrects avec réseau lent, réponse tardive, erreur et rechargement.
- [ ] Caches, conversion, comptage et pagination conformes avec données synthétiques.
- [ ] Migration éventuelle rejouée sur base/schéma isolé, rollback d'échec démontré, données publiques préservées.
- [ ] Typage, lint, suites pertinentes, build et contrôle de dépendances sans échec inexpliqué.
- [ ] E2E sur build servi ; contrôles visuels pertinents et accès Clerk anonyme strict.
- [ ] Réception avec session membre/admin et appareils réels effectuée ou indiquée comme non reçue, sans contournement d'authentification.
- [ ] Diff, preuves, versions et limites enregistrés dans la documentation ; état Git préservé.

### COR-901 — Préparer une publication et sa réception staging — conditionnel

**Dépendances :** lot candidat reçu, demande explicite de publication/commit/push selon les actions souhaitées. La réception complète COR-900 est requise pour publier l'ensemble ; un lot correctif isolé peut être candidat après sa propre réception. Ce ticket n'autorise aucune action distante par lui-même.

Étapes de la future publication :

1. Réexaminer le diff exact, les tickets inclus, la révision candidate et l'environnement ciblé. Maintenir `DEPLOYMENT_ENV=staging`, les domaines prévus et le domaine Railway de diagnostic.
2. Si le schéma change, obtenir une sauvegarde restaurable récente et en vérifier la restauration avant de déployer. Préparer la compatibilité entre ancien et nouveau code ; utiliser `npm run db:migrate:deploy`, jamais `db:push`.
3. Traiter toute réparation de droits historiques dans une opération distincte, sur une sélection validée après simulation ; ne pas coupler cette opération au démarrage ou à la migration.
4. Publier seulement les actions autorisées, sans modifier les paramètres Clerk/OVHcloud, activer les paiements ou changer un drapeau par supposition. Ne pas recréer `railway.json`.
5. Vérifier santé sur domaine Railway puis staging, routes publiques/protégées, parcours du lot, versions et migrations appliquées. Effectuer les réceptions connectées prévues avec les comptes adaptés.
6. Consigner succès/échec et preuves. Retourner à une version connue uniquement si elle est compatible avec le schéma et les données et ne réintroduit pas un défaut critique corrigé. Prévoir une correction supplémentaire si le retour arrière est impropre ; un rollback du code n'annule aucune migration ni réparation.

**Acceptation :** réception staging datée, contrôles comparables au local, aucun changement externe imprévu et procédure de récupération concrète. Le lancement sur `africatv.sn`/`www.africatv.sn` reste une décision future distincte.

## 9. Pilotage du backlog

Les 29 tickets sont suivis dans le backlog associé : 26 tickets de lots, un ticket de préparation, une réception globale et une publication conditionnelle. Aucun n'est déclaré implémenté par la préparation de ce document.

Statuts conseillés : **À faire → En cours → À recevoir → Reçu localement → Publié staging**, avec **Conditionnel** pour une action non autorisée ou dépendant d'une décision. Un statut conditionnel indique son prérequis ; il ne dispense pas d'avancer les tâches indépendantes.

Charges relatives : **S** = correction localisée, **M** = plusieurs chemins et tests, **L** = règle métier/concurrence/refonte ciblée avec reprise ou compatibilité. Elles servent à ordonner la charge et ne sont pas des délais calendaires promis. Réestimer après COR-000 et COR-101, particulièrement si une migration ou une réparation historique est nécessaire.

À chaque ticket, noter : révision de départ, fichiers modifiés, comportement avant/après, tests et compteurs, migration éventuelle, risque résiduel, état local/staging. Mettre à jour le backlog à la réception réelle, pas après la seule rédaction du code.

### Risques à surveiller et décisions à fermer

| Risque ou décision | Ticket | Mesure prévue |
| --- | --- | --- |
| Date effective manquante, essai et remboursement mal définis | COR-101/102 | Exemples datés, règle validée et conservation des dates ; aucun ancrage sur la date du rejeu. |
| Échéance historique possiblement surévaluée | COR-103 | Diagnostic sans mutation, dossiers ambigus séparés, réparation réelle autorisée et sauvegardée. |
| Création acceptée par le fournisseur mais résultat inconnu | COR-202/203 | État incertain conservé, suivi borné, aucune recréation automatique sans preuve de refus. |
| Migration ou reprise incompatible avec une ancienne version | COR-102/203/901 | Évolution additive, test de compatibilité, procédure concrète ; ne pas revenir à un code réintroduisant F1/F2. |
| Ordre des clics entre plusieurs appareils non établi | COR-301/303 | Dernière écriture serveur comme règle minimale ; révision/conflit explicites si un contrat plus fort est requis. |
| Comportement réel Clerk/VLC/mobile non couvert par simulation | COR-105/304/900 | Réception distincte avec session/appareil ; limite visible tant qu'elle n'est pas effectuée. |
| Profilage provoquant des appels externes ou des changements réels | COR-506 | Charge locale bornée, médias/fournisseurs synthétiques, mesures distantes uniquement sur demande. |
