# Audit approfondi du code Africa Live — 4 octobre 2026

## Conclusion

L'application possède une base technique sérieuse : séparation des politiques métier, contrôles d'accès côté serveur, schémas de validation, migrations, contraintes PostgreSQL, quotas atomiques et tests nombreux. La lecture directe des médias par le navigateur ou VLC reste une bonne décision pour ce projet.

La robustesse est toutefois inégale. Deux incohérences prioritaires concernent le calcul des droits payants et l'éligibilité des sources. Plusieurs erreurs reproductibles apparaissent aussi lorsque les opérations arrivent dans le désordre, qu'un cache expire ou qu'un traitement externe se prolonge. Les contrôles généraux passent, mais ne couvrent pas suffisamment ces situations.

Je recommande de corriger les invariants métier et les problèmes de concurrence avant d'ajouter des fonctionnalités ou de préparer le lancement de production. Une réécriture générale n'est pas justifiée ; des corrections ciblées et quelques extractions de responsabilités suffisent.

| Critère demandé | Appréciation | Motif principal |
| --- | --- | --- |
| Cohérent | Globalement, avec deux exceptions importantes | L'accès est centralisé, mais les branches de lecture et le recalcul des abonnements contredisent leurs propres règles. |
| Logique | Bonne organisation générale | Les politiques pures et les contrats sont utiles ; certaines transitions temporelles et concurrentes restent incorrectes. |
| Robuste | Partiellement | Bonnes protections sur les entrées et la base ; faiblesses sur paiement, synchronisation, verrou de worker et délais réseau. |
| Simple | Moyen | Les couches métier sont lisibles ; le lecteur et la page TV concentrent beaucoup d'orchestration. |
| Efficace | Correct sur les mesures locales effectuées | Pagination, chargement différé et caches sont présents ; la tenue en charge et les parcours connectés complets restent à mesurer. |

## Périmètre et méthode

- Révision locale auditée : `2ab18b6`, avec les changements D-4/D-5 de `9b40d94` présents. L'arbre Git était propre au début de l'audit.
- Lecture du handoff, des règles du dépôt, des guides Next.js installés et des documents d'exploitation. Le contexte indique que D-4/D-5 ont été publiés sur staging ; cet état distant n'a pas été revérifié ici.
- Inventaire : 365 fichiers TypeScript/TSX sous `src`, dont 285 fichiers d'implémentation et 80 fichiers de tests ; 30 125 lignes d'implémentation ; 24 routes API ; 21 fichiers E2E.
- Revue orientée risques des parcours accès/administration, catalogue, résolution et lecteur, paiement, favoris/pays suivis, Radar, caches, tâches de fond, migrations et CI. Ce n'est pas une lecture exhaustive de chaque ligne ni une certification de sécurité.
- Reproductions PostgreSQL dans des schémas temporaires de `africa_live_dev`, supprimés à la fin. Comparaison des empreintes des tables publiques contrôlées avant/après : inchangées.
- Reproductions d'interface dans un navigateur isolé avec les composants réels et des API simulées. La navigation Next.js et quelques composants de coquille sont remplacés dans ce banc de test ; il ne remplace pas un parcours Clerk connecté complet.
- Aucun code applicatif corrigé, aucun paiement réel, aucune modification de Clerk/Railway/OVHcloud, aucun déploiement, commit ou push. Le projet source IPTV n'a pas été modifié.

### Vérifications exécutées

| Vérification | Résultat |
| --- | --- |
| `npm test` | 364 tests déclarés : 350 réussis, 14 intégrations ignorées, 0 échec. |
| `npm run test:integration` | 14/14 réussis, schéma isolé nettoyé, contrôles de préservation réussis. |
| `npx tsc --noEmit --incremental false` | Réussi. |
| `npm run lint` | Réussi. |
| `npm run build` | Réussi. |
| `npm run db:check:migrations` | Réussi. |
| Playwright `auth-entry` et `payment` sur le serveur local existant | 8/8 réussis ; opérations de paiement simulées. |
| `GET /api/health` sur localhost:3001 | HTTP 200, processus et base déclarés opérationnels. |
| `npm audit --omit=dev` | Une alerte critique sur la version installée de Next.js ; applicabilité détaillée dans F12. |
| Reproductions ciblées de cet audit | Défauts décrits ci-dessous confirmés selon le niveau de preuve indiqué. |

Les 21 suites E2E n'ont pas toutes été exécutées pendant cet audit. Aucun test de charge, de restauration distante, de paiement auprès du fournisseur ou de connexion au compte staging n'a été effectué.

## Constats prioritaires

P1 signifie ici « à corriger avant de considérer le parcours concerné fiable pour la production ». P2 correspond à un défaut réel de fonctionnement ou de résilience. P3 désigne une amélioration secondaire. Les priorités expriment l'impact dans cette application, pas la seule gravité d'une dépendance.

### F1 — P1 : un ancien paiement recrédite les jours déjà consommés

**Preuve : reproduit avec la fonction applicative et PostgreSQL isolé.**

Référence : [naboopay-payment.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/naboopay-payment.ts:111>).

À chaque mise à jour fournisseur acceptée, le code relit tous les achats `completed`. Pour chaque achat, il repart de `max(periodEnd, now)`, puis rajoute la durée complète. `paidAt` sert au tri, mais pas à conserver la période réellement acquise et déjà consommée. Même une nouvelle transaction `pending` ou `failed` déclenche ce recalcul.

Deux reproductions :

- Un ancien mois payé, dont il reste 10 jours après 20 jours consommés, repasse à 30 jours restants à la réception d'un nouvel état `pending`. Aucun nouveau paiement n'a réussi.
- Un ancien mois expiré depuis un jour repasse à 30 jours restants dans les mêmes conditions.

Une autre reproduction avec horloge contrôlée confirme qu'un renouvellement annuel après dix jours ajoute 375 jours à l'ancienne échéance au lieu de 365. Une tentative échouée après dix jours prolonge aussi l'ancienne échéance de dix jours.

**Impact :** accès recrédité sans nouvel encaissement, renouvellements surévalués et recalcul des remboursements peu fiable. La protection contre les doublons de webhook ne résout pas ce problème : il survient sur une nouvelle transaction ou une mise à jour fournisseur plus récente.

**Correction attendue :** rendre le calcul déterministe à partir des achats et de leurs dates effectives, ou enregistrer les périodes attribuées. Rejouer l'historique à une date ultérieure doit conserver l'échéance acquise. Définir explicitement la règle d'imputation des remboursements.

**Tests indispensables :** avance de plusieurs jours, abonnement expiré, nouvel état pending/failed, renouvellement, webhook tardif, doublon, remboursement partiel de l'historique. Les intégrations actuelles vérifient plusieurs transitions, mais pas la consommation du temps entre achats.

### F2 — P1 : la branche UNTESTED contourne la politique stricte de lecture

**Preuve : reproduit avec le résolveur réel, mode production et drapeaux locaux désactivés.**

Références : [playback-resolution.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/playback-resolution.ts:214>), [playback-resolution-policy.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/playback-resolution-policy.ts:39>).

Pour `BROWSER_OK`/`VLC_ONLY`, le résolveur utilise `isPlaybackSourceEligible`. Pour `UNTESTED`, il utilise une autre fonction, qui vérifie surtout le protocole et quelques propriétés de l'URL. Cette deuxième branche n'exige ni éligibilité directe approuvée, ni succès récent, ni CORS, et ne filtre pas les paramètres de jeton/expiration comme la politique stricte.

Source synthétique testée : HTTPS, `UNTESTED`, `REVIEW_REQUIRED`, `lastSuccessAt=null`, `corsAllowed=false`, paramètres `token` et `expires`. La politique stricte refuse ; le résolveur accepte et retourne la source lorsque `PLAYBACK_ELIGIBILITY_READY=true`.

**Impact :** désaccord entre la politique annoncée, les compteurs de sources certifiées et la décision effective de lecture. Le drapeau global de validation ne suffit pas à certifier chaque source. Cela concerne également un build staging qui utilise `NODE_ENV=production`.

**Correction attendue :** appliquer la même politique stricte à toutes les sources hors mode local autorisé. Maintenir la visibilité du catalogue indépendamment de l'autorisation de lancer une source. Le repli permissif doit rester réservé au poste local conformément aux règles du projet.

**Tests indispensables :** matrice commune catalogue/résolveur/compteurs avec UNTESTED, REVIEW_REQUIRED, expiration, paramètres sensibles, CORS absent et succès ancien. Cette constatation ne démontre pas un contournement de l'authentification utilisateur ; elle concerne l'éligibilité de la source après autorisation d'accès.

## Autres défauts à corriger

### F3 — P2 : le délai NabooPay ne couvre pas le corps de la réponse

**Preuve : délai reproduit avec la fonction réelle et un fournisseur simulé ; classification des erreurs examinée statiquement.**

Références : [naboopay.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/naboopay.ts:137>), [checkout/naboopay](<C:/Users/GAMER PC/Africa_Live_TV/src/app/api/checkout/naboopay/route.ts:134>).

`providerFetch` annule son timer dès que `fetch` retourne les en-têtes. `readProviderJson` lit ensuite le corps sans délai restant. Une réponse immédiate dont le corps ne se termine pas laisse l'opération en attente. Le banc de test la laisse bloquée pendant plus de 10,15 secondes : signal non annulé, malgré le délai configuré de 10 secondes.

Par ailleurs, seule l'erreur de type `timeout` place une création en `reconciliation_required`. Une rupture réseau après acceptation potentielle par le fournisseur est classée `indisponibilite`, puis la commande locale devient `failed`. Cette issue peut aussi être ambiguë et nécessite une règle plus prudente avant une nouvelle création. Aucun doublon de paiement réel n'a été provoqué ni démontré.

**Correction :** appliquer un délai de bout en bout, jusqu'à la lecture/validation du corps ; classifier les créations à issue incertaine séparément des refus certains. Tester le corps bloqué, la coupure après envoi, la réponse malformée et la fermeture pendant la lecture.

### F4 — P2 : la réconciliation peut rester occupée par les mêmes commandes ambiguës

**Preuve : requête SQL du worker reproduite ; comportement de reprise déduit du code.**

Référence : [reconcile-naboopay.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/inngest/functions/reconcile-naboopay.ts:21>).

Le worker sélectionne au maximum 100 transactions, sans ordre ni curseur. Les créations ambiguës sans `providerOrderId` font partie de cette sélection puis sont ignorées, sans changement qui les fasse sortir du prochain lot. Un jeu de 100 commandes ambiguës suivi d'une commande ancienne identifiable a produit un lot de 100 commandes sans identifiant : la commande réconciliable n'était pas sélectionnée. Sans ordre explicite, le résultat n'est pas garanti identique dans toutes les bases ; le risque d'affamer les autres commandes reste réel.

Les commandes `creating` ne sont pas sélectionnées. Un arrêt entre l'insertion locale et la finalisation du résultat fournisseur peut donc les laisser durablement dans cet état.

**Correction :** traiter séparément les créations ambiguës, ordonner et parcourir équitablement les commandes réconciliables, enregistrer une échéance de prochaine vérification et définir une reprise pour les `creating` anciennes. Conserver l'interdiction de recréer aveuglément une commande sans connaître son issue fournisseur.

### F5 — P2 : deux modifications de favoris peuvent s'écraser dans l'interface

**Preuve : reproduit dans le navigateur avec la page TV réelle et réponses API simulées.**

Référence : [page TV](<C:/Users/GAMER PC/Africa_Live_TV/src/app/(clerk)/app/page.tsx:301>).

Les mutations sont sérialisées par chaîne, alors que chaque réponse contient la liste complète des favoris. Deux chaînes différentes peuvent être modifiées en parallèle. Si l'ajout A produit la liste `[A]`, puis B produit `[A,B]`, mais que la réponse A arrive en dernier, elle remplace l'état plus récent.

Reproduction : serveur simulé `[A,B]`, interface et stockage local `[A]` après retour des deux réponses. Le serveur conserve B, mais l'affichage et la copie locale le perdent.

**Correction :** sérialiser l'ensemble des mutations de favoris, ou utiliser une révision serveur et ignorer les snapshots anciens. Tester deux chaînes différentes et une alternance ajout/suppression avec réponses inversées.

### F6 — P2 : le remplacement des pays suivis n'est pas sûr en concurrence

**Preuve : entrelacement DELETE/INSERT réel reproduit dans PostgreSQL ; absence de reprise côté client examinée statiquement.**

Références : [API pays suivis](<C:/Users/GAMER PC/Africa_Live_TV/src/app/api/followed-countries/route.ts:41>), [FollowedCountriesSync](<C:/Users/GAMER PC/Africa_Live_TV/src/components/shell/FollowedCountriesSync.tsx:41>).

Deux PUT simultanés peuvent supprimer une liste initialement vide puis insérer chacun un pays à la position zéro. Les transactions ne verrouillent pas une ligne commune de l'utilisateur. La contrainte d'unicité sur la position fait échouer l'une avec `23505` ; elle protège la base, mais la synchronisation échoue.

Le debounce de 800 ms côté client ne garantit pas qu'une précédente requête est terminée. Les erreurs d'envoi sont absorbées sans nouvelle tentative. Si le premier GET échoue, `accountCountries` reste null et les modifications ultérieures ne sont pas envoyées pendant ce montage.

**Correction :** verrouiller l'utilisateur avant remplacement et sérialiser/regrouper les envois client, avec reprise après erreur réseau. Pour plusieurs appareils, décider explicitement comment une révision plus ancienne est gérée.

### F7 — P2 : le mur TV permet plusieurs vidéos audibles

**Preuve : reproduit avec TvWall et Player réels, dans un navigateur isolé.**

Références : [TvWall](<C:/Users/GAMER PC/Africa_Live_TV/src/app/(clerk)/app/mur/TvWall.tsx:75>), [Player](<C:/Users/GAMER PC/Africa_Live_TV/src/components/Player.tsx:816>).

Le mur passe `forceMuted` aux lecteurs pour garantir une seule chaîne audible. L'effet l'applique au changement de propriété ou de phase ; les contrôles internes peuvent ensuite modifier `video.muted` directement. Le changement de volume peut aussi réactiver le son.

Reproduction : trois vidéos démarrent avec les valeurs muted `[false,true,true]`. Le bouton de son du deuxième lecteur conduit à `[false,false,true]`, alors que le mur annonce toujours uniquement le premier comme actif.

**Correction :** confier l'autorité sonore au mur lorsque le lecteur est contrôlé par `forceMuted`, et faire remonter une demande d'écoute au parent. Tester boutons, clavier, volume, reprise et remplacement de chaîne.

### F8 — P2 : le cache des dépêches de recherche ne se recharge plus après expiration

**Preuve : reproduit dans le navigateur avec UniversalSearch réel.**

Référence : [UniversalSearch](<C:/Users/GAMER PC/Africa_Live_TV/src/components/search/UniversalSearch.tsx:103>).

L'initialisation respecte la durée de cinq minutes, mais l'effet refuse de charger dès que `articlesCache` existe, même périmé. Après fermeture, avance de six minutes et réouverture, le nombre de requêtes reste à un. Le composant peut alors présenter des données anciennes ou aucune dépêche selon son cycle de montage.

Une réponse HTTP en erreur contenant du JSON est également transformée en tableau vide puis mémorisée, ce qui empêche la reprise pendant la session.

**Correction :** utiliser la même condition de validité du cache à l'initialisation et au chargement ; ne mémoriser que les réponses réussies et valides ; gérer le rafraîchissement et les requêtes en cours. Tester expiration et retour à la normale après une erreur.

### F9 — P2 : le taux USD/XOF dérivé utilise l'opération inverse

**Preuve : reproduit avec getLiveMarkets et réponses fournisseur simulées.**

Référence : [live-markets.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/live-markets.ts:75>).

Lorsque le fournisseur ne fournit pas XOF, le code divise la parité EUR/XOF par `rates.EUR`. Or `rates.EUR` représente ici les EUR pour un USD. La conversion doit multiplier ces deux valeurs.

Avec `rates.EUR=0,9`, le résultat actuel est 728,8411 XOF pour un USD ; la formule correcte avec la constante du code est `655,957 × 0,9 = 590,3613`. Ce scénario porte sur le calcul dérivé, pas sur une cotation réelle au jour de l'audit.

**Correction :** multiplier et ajouter un test qui vérifie les unités ainsi que le cas où le taux XOF existe déjà.

### F10 — P2 : le verrou du worker peut être perdu avant la fin du traitement

**Preuve : mécanisme PostgreSQL/pool reproduit ; worker réseau complet non lancé.**

Références : [verify-streams.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/scripts/verify-streams.ts:456>), [pool PostgreSQL](<C:/Users/GAMER PC/Africa_Live_TV/src/db/index.ts:47>).

Le verrou consultatif de session est acquis avec `db.execute`, qui utilise une connexion du pool et la remet à disposition. La connexion n'est pas conservée jusqu'à la fin du job. Si elle reste inactive assez longtemps, le pool la ferme et PostgreSQL libère le verrou, même si les vérifications réseau continuent.

Le test utilise un nom de verrou propre à l'audit et un délai d'inactivité réduit : un second client ne peut pas acquérir le verrou immédiatement, mais le peut après fermeture de la connexion inactive. Le pool applicatif utilise 30 secondes. La fréquence des écritures et la durée des sondes conditionnent l'occurrence réelle.

**Correction :** réserver une connexion pendant tout le job, acquérir/libérer le verrou sur cette même connexion dans un `try/finally`, puis la rendre au pool. Tester un intervalle de travail sans requête SQL plus long que le délai d'inactivité.

### F11 — P2 : les anciens OFFLINE sont exclus avant le repli local

**Preuve : résolveur local reproduit ; exclusion catalogue vérifiée dans le code.**

Références : [catalog-visibility.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/catalog-visibility.ts:3>), [playback-resolution.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/playback-resolution.ts:206>), [local-playback-policy.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/local-playback-policy.ts:12>).

La politique locale autorise explicitement une nouvelle tentative sur des échecs historiques, sans les déclarer sains. Mais les requêtes catalogue et résolution filtrent d'abord les sources sur BROWSER_OK/VLC_ONLY/UNTESTED. Une source active avec ancien statut OFFLINE n'arrive jamais jusqu'à cette politique locale.

Reproduction avec une source active HTTPS OFFLINE : la politique locale accepte une tentative, mais le résolveur retourne `WEB_PLAYBACK_UNAVAILABLE`. Cela contredit la règle du MVP sur la visibilité complète et la possibilité de retenter localement les échecs historiques.

**Correction :** séparer visibilité locale, état observé et autorisation de tentative. Conserver OFFLINE comme information, sans promouvoir la santé de la source. Maintenir les exclusions intentionnelles de chaînes inactives/retraits et la politique stricte hors poste local.

### F12 — P2 préventif : Next.js installé appartient à une plage vulnérable

**Preuve : npm audit et avis officiel du mainteneur consulté le 4 octobre 2026.**

Le dépôt fixe `next`, `@next/env` et `eslint-config-next` à 16.3.5. `npm audit --omit=dev` remonte une alerte critique : GHSA-vcvr-r3jv-pc5j, corrigée à partir de 16.3.6. Elle concerne l'implémentation Node de `next/og` ImageResponse avec des valeurs contrôlées par un attaquant injectées dans du SVG. [Avis officiel Vercel/Next.js](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).

Aucun usage de `ImageResponse`, `next/og` ou `opengraph-image` n'a été trouvé sous `src`. L'audit ne démontre donc pas que l'application expose le chemin exploitable décrit par cet avis. La gravité critique du paquet ne doit pas être présentée comme une exploitation confirmée de cette application.

**Correction :** mettre à jour vers une version corrigée validée, garder les paquets Next alignés et rejouer les non-régressions. Ajouter une vérification des dépendances en CI. Éviter une correction automatique indiscriminée du lockfile.

## Constats secondaires et simplifications

### Comptage du catalogue Radar — P3, reproduit

[live-channels.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/live-channels.ts:136>) ne lit que `limit × 3` chaînes, filtre ensuite leurs sources, puis annonce la taille de cette sélection comme `total`. Avec 121 chaînes visibles et `limit=40`, le test obtient 40 chaînes et un total de 120. Le cache par pays conserve également cette sélection partielle sans inclure la limite dans sa clé.

Il faut annoncer explicitement une estimation ou calculer le total réel, et séparer cache de métadonnées et pagination. Ce problème concerne le sous-catalogue Radar ; il ne prouve pas une perte de données dans le catalogue TV principal.

### Responsabilités trop concentrées

Le lecteur contient 1 047 lignes, la page TV 755, la vérification de sources 731 et le collecteur RSS 628. Le nombre de lignes ne suffit pas à établir un défaut, mais les défauts de favoris et d'audio montrent que l'orchestration est difficile à suivre.

Extractions utiles, par étapes :

- Gestion de résolution/tentatives et cycle de vie HLS dans des hooks dédiés, avec événements de lecteur explicites.
- Synchronisation des préférences dans une couche commune qui gère ordre, reprise et révision.
- Une seule politique de source pour résolveur, compteurs et présentation des capacités.
- Autorité sonore définie au niveau du lecteur unique ou du mur selon le contexte.

Éviter de créer de nouvelles abstractions génériques avant ces corrections. Les politiques pures existantes sont une bonne base à conserver.

### Résilience et mémoire des tâches/caches

- Le cache météo est une Map de coordonnées sans limite de taille ni purge des entrées expirées. Le TTL limite leur réutilisation, mais pas leur accumulation. Une capacité bornée et une éviction suffiraient. Aucun épuisement mémoire n'a été provoqué pendant l'audit.
- Le worker de vérification lance certaines écritures avec `void flushWriteQueue()` sans rattacher leur rejet au traitement principal. Après épuisement des tentatives SQL, l'erreur peut devenir un rejet non géré. Conserver une promesse d'écriture supervisée et arrêter proprement le job en cas d'échec ; scénario non injecté ici.
- Les caches mémoire sont propres à chaque processus. Prévoir explicitement l'invalidation des métadonnées après retrait de source et le comportement lors d'un redémarrage ou de plusieurs instances, sans jamais mettre en cache les médias.

### Couverture des tests et CI

La CI lance typage, lint, migrations, unités, intégrations et build : c'est une bonne base. Sa commande E2E n'exécute que `auth-entry` et `catalogue`. Le scan Snyk est conditionnel et tolère l'échec ; la CI ne contient pas de commande `npm audit` explicite.

Les tests structurels et les invariants par recherche de texte ne garantissent pas les transitions métier. Les cas F1/F2 doivent devenir des tests sémantiques obligatoires, suivis des réponses inversées, caches expirés, délais sur le corps et reprise de jobs.

[live-briefing.test.ts](<C:/Users/GAMER PC/Africa_Live_TV/src/lib/live-briefing.test.ts:5>) appelle le service complet sans substituer ses fournisseurs RSS, alertes et marchés. Ces tests classés dans la suite unitaire dépendent donc de services externes et de lectures de base. Les séparer des tests unitaires déterministes ou injecter les fournisseurs. Le briefing reste un chantier identifié comme différé dans le handoff ; ses formules de « données vérifiées » demandent une validation sémantique avant activation de l'interface.

### Documentation opérationnelle

Le handoff et les journaux sont détaillés et datés, mais mêlent état courant et nombreuses décisions historiques. Des tableaux et chiffres anciens subsistent dans les runbooks/backlogs. Conserver une page courte d'état actuel — drapeaux, rôle staging, migrations, dépendances, vérifications et étapes restantes — et déplacer le récit ancien dans un historique faciliterait les interventions.

## Points solides à conserver

- Autorisation au niveau des API, avec distinction entre consultation du catalogue et droit de lecture ; refus des comptes bloqués et contrôle d'administration.
- Schémas Zod, lecture de corps bornée, erreurs structurées, contraintes et migrations PostgreSQL.
- Quotas mis à jour atomiquement en base, avec ordre stable des opérations concurrentes.
- Sessions/tentatives de lecture enregistrées, limites de tentatives et contrôle d'appartenance lors des reprises.
- Protection des requêtes amont contre les adresses privées, validation des redirections et connexion DNS épinglée dans `safe-upstream-fetch`.
- Contrôles de signature et de cohérence des montants/produits sur la confirmation des paiements ; leur existence ne corrige pas F1.
- Retraits catalogue persistants et mutations administratives auditées/transactionnelles.
- Cloisonnement des capacités locales et garde-fous de configuration ; fixtures binaires exclues du typage et du lint.
- Médias chargés directement auprès de l'amont, lecteur chargé à la demande, pagination et service worker limité aux ressources prévues pour le mode hors ligne.

## Efficacité : ce qui est mesuré et ce qui reste inconnu

La base locale contient 14 505 chaînes et 15 646 sources. Une requête SQL représentative du premier lot de 120 candidats, avec priorité africaine et filtrage des sources visibles, s'exécute en environ 38–39 ms dans les mesures locales de cet audit. Il s'agit du temps SQL, pas du délai HTTP ou du temps d'affichage.

Ces mesures ne montrent pas de problème immédiat imposant une refonte du catalogue. Elles ne prouvent pas la capacité sous charge : accès Clerk, latence Railway, quotas, requêtes simultanées, collecte RSS et coût mémoire doivent être mesurés séparément. Le tri par expression de priorité peut imposer un tri supplémentaire ; l'optimiser uniquement après profilage réel.

Le mur TV additionne les téléchargements directs et les décodages de plusieurs flux. Le serveur ne transporte pas les médias, mais le coût réseau et CPU côté utilisateur reste à vérifier, notamment avec quatre chaînes et l'activation/désactivation du son. Aucun chiffre de consommation réel n'est inventé dans cet audit.

## Ordre de correction recommandé

| Lot | Objectif | Critère de sortie |
| --- | --- | --- |
| 1 | F1 et F2 : droits et éligibilité | Historique de paiements stable dans le temps ; même décision stricte pour toutes les sources hors local. |
| 2 | F3/F4/F10 : appels fournisseur et reprise des workers ; mise à jour F12 | Corps réseau borné dans le temps, commandes parcourues équitablement, verrou conservé jusqu'à la fin, dépendances corrigées et non-régressions réussies. |
| 3 | F5/F6/F7 : synchronisation et mur TV | Réponses inversées sans perte d'intention, pays repris après erreur, une seule vidéo audible dans toutes les interactions. |
| 4 | F8/F9/F11 et comptage Radar | Cache réellement renouvelé, unités de conversion justes, retentative locale des échecs historiques, total correctement annoncé. |
| 5 | Extraction des responsabilités, CI et profilage | Tests déterministes, scénarios sensibles obligatoires, composants plus faciles à suivre, mesures de charge représentatives. |

Les scripts de reproduction sont conservés localement sous `.local-logs/audit-2026-10-04/`, ignorés par Git. Ils utilisent des données synthétiques et les schémas de test ; ce sont des preuves d'audit, pas une nouvelle suite de non-régression intégrée au projet.
