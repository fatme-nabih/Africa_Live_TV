# Africa Live — Plan de préparation à la production

Date de référence : 24 septembre 2026.
Statut : Railway sert la préproduction officielle sur `https://staging.africatv.sn` ;
lots opérationnels 0, 1, 2 (Phases A et B) et Lot 3 (UX de lecture et qualification des flux) terminés et validés en ligne.
Le garde-fou de lecture a été levé (`PLAYBACK_ELIGIBILITY_READY=true`), 6 825 flux sains certifiés
(4 385 BROWSER_OK et 2 440 VLC_ONLY) sont activés sur PostgreSQL Railway. L'ouverture de VLC
est 100 % automatique sur PC et mobile sans exposition d'URL, et les langues principales sont inférées.
Responsable d'exécution : assistant, avec décisions produit et infrastructure du propriétaire.

## État réel observé le 24 septembre 2026

Le projet Railway `just-compassion` héberge la préproduction sur `https://staging.africatv.sn`.
L'application y est configurée avec `DEPLOYMENT_ENV=staging`. Le service `Africa_Live_TV`
et PostgreSQL sont en ligne et sains.
Le domaine personnalisé `staging.africatv.sn` est certifié Let's Encrypt TLS (DNS OVHcloud).
Le catalogue complet est accessible et filtrable par langue, pays et catégorie.
La lecture streaming directe est ouverte (`PLAYBACK_ELIGIBILITY_READY=true`) et validée
sur PC et smartphone mobile. Les flux `OFFLINE` restent masqués du catalogue.
L'apex `africatv.sn` et `www` demeurent strictement réservés pour le lancement futur en production.

### Lot opérationnel 0 — suivi

| ID | Priorité | Travail | État au 23 septembre 2026 |
|---|---|---|---|
| DOC-001 | P0 | Aligner le backlog sur Railway | Terminé : service, DB, commit et limites consignés |
| DOC-002 | P0 | Matrice Local / Staging Railway / Production | Terminé : voir [environment-matrix.md](environment-matrix.md) |
| DOC-003 | P1 | Journal par ticket | Terminé : voir [production-progress.md](production-progress.md) |
| DOC-004 | P1 | Checklist de non-régression | Terminé : voir [non-regression-checklist.md](non-regression-checklist.md) |

### Lot opérationnel 1 — stabilisation locale

| ID | Priorité | Travail | État au 23 septembre 2026 |
|---|---|---|---|
| LOC-001 | P0 | Horloge Windows compatible Clerk | Terminé : service Running/Automatic, source NTP et dérive ~0,14 s |
| LOC-002 | P0 | Réinitialiser la session Clerk locale | Terminé : déconnexion/reconnexion interactive réussie |
| LOC-003 | P0 | Vérifier les trois API authentifiées | Terminé : filtres, chaînes et favoris répondent en JSON/200 |
| LOC-004 | P1 | Rendre les erreurs HTML/404 compréhensibles | Terminé : message de session expirée et tests ajoutés |
| LOC-005 | P1 | Parcours Clerk et lecture locale | Terminé : 30 chaînes, recherche, filtre, favori persistant et lecture validés |
| LOC-006 | P1 | Parcours MVP sans Clerk | Terminé : 13/13 E2E réussis |
| LOC-007 | P1 | Lancement VLC réel | Terminé : API 200 et nouveau processus VLC observé |
| LOC-008 | P2 | Diagnostic local expurgé | Terminé : commande `npm run diagnose:local` ajoutée et exécutée |

### Lot opérationnel 2 — Railway en préproduction fiable

| ID | Priorité | Travail | État au 23 septembre 2026 |
|---|---|---|---|
| RLY-001 | P0 | Qualifier Railway comme préproduction | Terminé : `DEPLOYMENT_ENV=staging` fait foi ; écart du nom d'interface documenté |
| RLY-002 | P0 | Route de santé processus + DB | Terminé : `/api/health` retourne 200 sur Railway avec processus et DB sains ; 503 et absence de fuite couvertes par les tests |
| RLY-003 | P0 | Healthcheck Railway | Terminé : `/api/health`, délai 120 s, révision saine acceptée et révision à chemin invalide rejetée sans couper la version saine |
| RLY-004 | P0 | Sauvegarde PostgreSQL | Terminé pour la preuve logique : dump Railway chiffré, déchiffré, restauré et comparé sur une base isolée ; sauvegarde native/PITR toujours dépendante du plan |
| RLY-005 | P0 | Migrations automatiques sûres | Terminé : `db:migrate:deploy`, délai 300 s et transaction validés sur Railway ; verrou concurrent refusé puis acquis après libération |
| RLY-006 | P1 | Rollback applicatif | Terminé : procédure documentée et rollback réel validé sur Railway (`6a13140b`, santé 200, Clerk 307, DB intacte) |
| RLY-007 | P1 | Région d'hébergement | Terminé pour la décision : EU West proposé ; déplacement différé jusqu'à sauvegarde et fenêtre de maintenance |
| RLY-008 | P1 | Alerte de budget | Terminé : décision A8 actée (Option 1 retenue, maintien plan sans surcoût, dump chiffré hors volume) |
| RLY-009 | P2 | Domaine personnalisé | Terminé pour staging : `staging.africatv.sn` actif en HTTPS, DNS OVHcloud, TLS Let's Encrypt, Clerk et application validés |

Runbook et séquence d'activation :
[railway-preproduction-runbook.md](railway-preproduction-runbook.md).

#### Décomposition RLY-009 — `africatv.sn`

| Sous-ticket | Priorité | Travail | État / critère de validation |
|---|---|---|---|
| RLY-009A | P2 | Confirmer propriété et gestion DNS | Terminé : domaine et zone DNS visibles chez OVHcloud le 22 septembre 2026 |
| RLY-009B | P1 | Réserver les noms par environnement | Terminé dans le plan : `staging.africatv.sn` pour Railway staging ; `africatv.sn` et `www.africatv.sn` réservés à la production future |
| RLY-009C | P1 | Lier le sous-domaine staging à Railway | Terminé le 23 septembre 2026 : domaine ajouté dans Railway (`8080`), CNAME (`1iew1zp0.up.railway.app.`) et TXT insérés chez OVHcloud (TTL 300 s) |
| RLY-009D | P1 | Valider DNS, certificat et repli | Terminé : propagation DNS immédiate, certificat Let's Encrypt émis, `/api/health` 200 en HTTPS, domaine de repli Railway préservé |
| RLY-009E | P1 | Aligner application et Clerk | Terminé : Clerk dynamique validé, `NEXT_PUBLIC_APP_URL` et `BROWSER_TEST_ORIGIN` mis à jour, redéploiement actif, checklist `/app` réussie avec barrière 503 |
| RLY-009F | P2 | Préparer le domaine de production | Différé : stratégie apex/`www`, redirection canonique et activation seulement lors du lot de lancement |

## Objectif et périmètre

Obtenir une version exploitable sur un domaine HTTPS public, avec accès authentifié,
abonnements fiables si activés, lecture directe et exploitation documentée.
Le build réussi est une condition nécessaire, pas une preuve de disponibilité en production.

Préserver les règles d'AGENTS.md :

- Ne modifier ni le projet IPTV ni sa base.
- Conserver le développement local sur localhost:3001 et africa_live_dev.
- Maintenir le catalogue complet visible et distinguer présence, disponibilité et éligibilité.
- Ne jamais présenter un échec historique ou un contrôle expiré comme un succès récent.
- Aucun relais de médias, conversion vidéo ou stockage de médias côté application.
- Le navigateur et VLC chargent les médias directement chez le fournisseur.
- Réserver le lancement automatique du processus VLC au poste local.
- Ne pas affaiblir l'authentification ou les règles de production pour faire passer un test.
- Exclure e2e/fixtures de TypeScript et ESLint.
- Préserver les modifications utilisateur déjà présentes. Aucun commit ou push sans demande.
- Lire les guides de la version Next.js installée avant de modifier le code concerné.

## Référence de l'audit

Contrôles exécutés pendant l'audit : 109 tests réussis, 4 intégrations ignorées,
ESLint, TypeScript, build et drizzle-kit check réussis.
L'audit npm des dépendances de production signale 5 paquets affectés
(1 critique, 3 élevés, 1 modéré). Ce résultat devra être actualisé au lot 1.

Non validés par cet audit : migrations sur base vierge, dérive de la base réelle,
parcours Clerk en production, paiement réel, tenue en charge, restauration,
disponibilité actuelle de tout le catalogue et configuration de l'hébergeur.

Constats de code : parcours VLC desktop public incompatible avec l'API locale ;
ordre des événements Billing insuffisamment fiable ; pool PostgreSQL sans gestionnaire
d'erreur ni délais explicites ; réponse simulée E2E catalogue incompatible avec son contrat.
L'absence de configuration d'exploitation dans le dépôt ne prouve pas l'absence
d'une configuration externe : elle sera vérifiée avant de créer quoi que ce soit.

## Règles d'exécution

Statuts : À faire → En cours → À valider → Terminé ; Bloqué indique une dépendance précise.
P0 : sécurité bloquante. P1 : nécessaire avant ouverture publique ou fonction payante.
P2 : amélioration mesurable après le lancement, si elle ne compromet pas un critère de sortie.

PROD-001, PROD-002, PROD-003, PROD-010, PROD-011 et PROD-012 sont terminés.
Preuves et réserves : [production-progress.md](production-progress.md).
Les autres tickets sont « À faire ».
Exécuter les lots dans l'ordre. À l'intérieur d'un lot, respecter les dépendances indiquées.
Ne pas demander une confirmation à chaque correction locale réversible autorisée.
Demander seulement les décisions manquantes qui conditionnent réellement la suite.
Ce plan n'autorise pas à acheter une infrastructure, activer des paiements réels
ou publier le service. Préparer les preuves et le retour arrière avant ces actions.

Pour chaque ticket terminé, consigner dans docs/production-progress.md :

1. Identifiant, statut, date et résultat attendu.
2. Fichiers modifiés et comportement obtenu.
3. Commandes de vérification, résultats et tests ignorés avec leur motif.
4. Preuves reproductibles, sans secrets ni URL de flux sensible.
5. Risques résiduels, dépendances et méthode de retour arrière.

Un lot passe au suivant lorsque ses critères de sortie sont satisfaits.
Un échec de test ou une régression liée au lot reste dans le lot jusqu'à résolution.
Les tests doivent vérifier des comportements, notamment erreurs et concurrence,
et non recopier l'implémentation. Pas de recherche de couverture arbitraire à 100 %.

## Lot 0 — Établir une référence et sécuriser les essais

But : travailler sans perdre les modifications existantes ni altérer des données utiles.

| ID | Priorité | Travail | Critère d'acceptation | Dépendance |
|---|---|---|---|---|
| PROD-001 | P1 | Inventorier l'état Git, les versions, les commandes et les modifications existantes ; créer le journal de progression. | Référence datée, périmètre documenté ; aucun fichier utilisateur écrasé, aucun secret enregistré. | Aucune |
| PROD-002 | P1 | Sécuriser les tests d'intégration : cible explicitement autorisée, fixtures identifiables, nettoyage limité aux fixtures. Supprimer notamment la suppression globale de apiRateLimits dans le test d'identité. | Refus d'une cible non autorisée avant écriture ; des données témoins non liées aux essais survivent à leur exécution. | PROD-001 |
| PROD-003 | P1 | Exécuter la référence locale : tests, lint, types, build, migrations et E2E MVP adaptés à la session. | Résultats enregistrés ; régressions préexistantes séparées des nouvelles ; limites explicites. | PROD-002 |

Sortie : référence reproductible et environnement d'essai sûr. Les tests courants restent
sur la base dédiée autorisée ; toute base supplémentaire de test ou préproduction
est une décision explicite, jamais une substitution silencieuse à africa_live_dev.

## Lot 1 — Corriger les dépendances et valider la configuration

| ID | Priorité | Travail | Critère d'acceptation | Dépendance |
|---|---|---|---|---|
| PROD-010 | P0 | Actualiser les avis de sécurité ; mettre à jour Next.js et les dépendances affectées ; aligner les outils associés et le lockfile. Choisir une version corrigée supportée au moment du travail. | Aucune alerte critique/élevée non traitée dans les dépendances livrées ; audit complet archivé sous forme expurgée ; cas non applicables démontrés et documentés. | Lot 0 |
| PROD-011 | P1 | Définir le contrat de configuration local/test/production et une validation serveur centralisée. Rejeter les clés factices, secrets faibles connus et configurations incohérentes en production. Documenter Clerk, webhook, plan Billing, URL publique et proxy de confiance. | Une configuration invalide échoue explicitement ; aucune valeur secrète dans l'erreur ; aucun contournement local avec NODE_ENV=production. | PROD-010 |
| PROD-012 | P1 | Fixer la version Node supportée, documenter npm ci et les commandes de lancement dont le port local 3001 ; revalider les parcours après mise à jour. | Installation reproductible, lint/types/tests/build et E2E locaux réussis. | PROD-010, PROD-011 |

Sortie : dépendances corrigées et configuration de production explicite.
Ne pas activer PLAYBACK_ELIGIBILITY_READY uniquement pour satisfaire les essais.

## Lot 2 — Fiabiliser les identités et les abonnements

| ID | Priorité | Travail | Critère d'acceptation | Dépendance |
|---|---|---|---|---|
| PROD-020 | P1 | Reproduire les défauts d'ordre Billing ; choisir une stratégie fondée sur les garanties du fournisseur, avec réconciliation de l'état courant si les événements ne fournissent pas de version fiable. | Tests : événement ancien après récent, dates égales, duplication, concurrence, annulation, fin d'abonnement, impayé puis régularisation. Aucun retour à un état périmé. | Lot 1 |
| PROD-021 | P1 | Vérifier le cycle identité/session et la politique d'accès : suppression, blocage, événements retardés, utilisateur inconnu et reprise webhook. | Matrice d'accès exécutée sur les API ; compte bloqué/supprimé refusé ; erreurs récupérables distinguées des événements définitivement ignorés. | PROD-020 |
| PROD-022 | P1 | Préparer la réconciliation et le diagnostic des écarts fournisseur/base ; rendre la page tarifaire exacte pour chaque environnement ; vérifier le rattachement des plans. | Paiement de test → accès → annulation/expiration vérifiés ; panne puis reprise webhook testées ; aucune promesse de paiement ou d'accès contraire à l'environnement. | PROD-020, PROD-021 |

Sortie : événements rejoués et désordonnés sans corruption des droits, preuves d'intégration.
Les paiements réels restent désactivés jusqu'à validation explicite de leur lancement.

## Lot 3 — Adapter la lecture au site public (Terminé et Déployé)

| ID | Priorité | Travail | Critère d'acceptation | État au 24 septembre 2026 |
|---|---|---|---|---|
| PROD-030 | P1 | Séparer les capacités web, VLC mobile et VLC desktop local dans l'interface ; masquer les éléments techniques et liens bruts. | Aucun affichage de lien M3U8, bouton de copie ou texte d'instruction technique. Lancement 100 % automatique de VLC sur desktop (`vlc://`) et mobile (`intent://` / `vlc-x-callback://`). | Terminé et validé en ligne (commit `3a325ab`) |
| PROD-031 | P1 | Harmoniser l'état annoncé par le catalogue et la décision du résolveur sans masquer les chaînes ; vérifier fraîcheur, HTTPS, CORS et éligibilité. | Scan exhaustif de 12 396 flux sur Railway, 6 825 flux sains certifiés (4 385 web direct, 2 440 VLC), activation exclusive des flux certifiés. | Terminé et validé en ligne |
| PROD-032 | P1 | Valider les transitions du lecteur : changement rapide de chaîne, résolution tardive, erreurs réseau, autoplay, nouvelle tentative, arrêt et nettoyage des ressources. | Assainissement URL (HTTP/HTTPS), aucun risque d'Open Redirect ou DOMXSS (Snyk 0 vulnérabilité), transition propre vers "VLC lancé", bouton "Relancer VLC". | Terminé et validé en ligne |

Sortie : comportement local préservé et parcours public honnête, fluide et utilisable.
La remise d'une URL publique ne permet pas d'en révoquer l'utilisation chez le fournisseur.
L'abonnement contrôle l'accès au service et à la résolution ; ne pas promettre une protection
DRM ou une révocation des liens déjà obtenus. Aucune proposition de relais pour contourner cela.

## Lot 4 — Résister aux pannes et maîtriser PostgreSQL

| ID | Priorité | Travail | Critère d'acceptation | Dépendance |
|---|---|---|---|---|
| PROD-040 | P1 | Gérer les erreurs du pool, borner connexion/requêtes et régler le nombre de connexions selon le budget DB et le nombre d'instances. | Coupure et reprise simulées dans l'environnement d'essai : pas de crash non géré, attente bornée, récupération démontrée. | Lot 3 |
| PROD-041 | P1 | Unifier les erreurs API et leur journalisation ; distinguer indisponibilité temporaire, refus d'accès et données invalides. | Pas de secret/URL amont dans les logs ; identifiant de corrélation ; erreurs prévisibles traitées y compris avant la résolution de lecture. | PROD-040 |
| PROD-042 | P1 | Vérifier les requêtes catalogue/filtres/quotas, plans SQL et indexes ; mesurer avant d'optimiser. | Mesures sur un volume représentatif ; pas de nouvelle contention ou requête non bornée critique ; budget de connexions respecté. | PROD-040 |
| PROD-043 | P1 | Valider migrations sur cible d'essai explicitement autorisée, évolution depuis l'existant et contrôle de dérive réellement non destructif. | Migration reproductible ; contrôle sans modification de schéma ; stratégie compatible avec retour à la version précédente ou restauration testée. | PROD-002, PROD-040 |

Sortie : comportement connu lors d'une panne DB et migrations maîtrisées.
Ne pas lancer db:push sur la production. Le script db:check actuel appelle push :
son caractère non destructif doit être établi ou son mécanisme remplacé avant cet usage.

## Lot 5 — Organiser l'exploitation et le renouvellement des flux

| ID | Priorité | Travail | Critère d'acceptation | Dépendance |
|---|---|---|---|---|
| PROD-050 | P1 | Préparer la vérification périodique : fréquence, concurrence bornée, exclusion des chevauchements, reprise et compte rendu d'exécution. Installer la planification seulement après choix de l'hébergement. | Cycle complet mesuré et renouvellement avant les 72 h de fraîcheur ; un job bloqué/absent est détecté ; aucun statut rendu sain sans contrôle. | Lot 4 |
| PROD-051 | P1 | Rendre rétention et nettoyage exploitables sans interaction : politique explicite, dry-run, lots bornés, verrou, délais et fermeture des connexions. | Deux exécutions sûres ; arrêt/reprise testés ; aucune donnée récente supprimée ; actions destructives limitées à une cible et une politique autorisées. | PROD-050 |
| PROD-052 | P1 | Ajouter disponibilité du processus, capacité à servir les requêtes, métriques et alertes : erreurs API, pool DB, webhooks, fraîcheur, jobs et lectures. | Simulation d'incident visible ; sondes sans information sensible ; panne fournisseur distinguée de panne applicative ; destinataire et procédure définis avant activation externe. | PROD-041, PROD-050 |
| PROD-053 | P1 | Documenter et tester sauvegarde/restauration et rollback applicatif ; définir les objectifs de perte de données et de reprise. | Restauration réellement réalisée sur cible isolée autorisée ; durée et intégrité mesurées ; procédure reproductible et accès aux sauvegardes protégés. | PROD-043 |

Sortie : jobs et exploitation prêts, puis effectivement testés sur la cible de préproduction.
Une ligne de commande présente dans package.json ne vaut pas preuve d'une tâche planifiée.

## Lot 6 — Valider en préproduction et automatiser les contrôles

| ID | Priorité | Travail | Critère d'acceptation | Dépendance |
|---|---|---|---|---|
| PROD-060 | P1 | Corriger les mocks E2E obsolètes ; exécuter les intégrations critiques et les parcours authentifiés sur un build production en préproduction. | Contrat catalogue actuel respecté ; aucun test critique ignoré ; données et identités d'essai séparées des utilisateurs réels. | Lots 0 à 5, cible préproduction choisie |
| PROD-061 | P1 | Préparer une CI : installation figée, lint, types, tests, invariants, migrations, build, audit et E2E adaptés. | Pipeline reproductible et bloquant sur échec ; secrets absents des logs ; succès démontré sur la plateforme avant sortie du lot. | PROD-060, plateforme Git choisie |
| PROD-062 | P1 | Configurer et vérifier HTTPS, en-têtes, politique de contenu compatible Clerk/HLS, limites de requêtes et confiance des en-têtes proxy. | Contrôles sur la cible réelle ; authentification et médias directs fonctionnent ; en-têtes proxy forgés non utilisés pour contourner les protections. | PROD-011, PROD-060 |
| PROD-063 | P1 | Exécuter charge et endurance sur catalogue, filtres, favoris, résolution et télémétrie ; ne pas générer une charge média chez les diffuseurs. | Rapport latence p50/p95, erreurs, CPU/mémoire, DB et contention ; objectifs de lancement atteints, pas de croissance continue anormale. | PROD-042, PROD-052, PROD-060 |

Budgets initiaux proposés, à confirmer avant la mesure : 50 sessions actives simulées,
20 requêtes API/s pendant 30 min, p95 inférieur à 1 s pour catalogue/résolution et moins
de 1 % de réponses 5xx. Distinguer 401/403/429 attendus des erreurs de disponibilité.
Ajouter un essai d'endurance de 2 h à charge nominale. Ces nombres sont des objectifs
de départ, pas une capacité démontrée ni une promesse de disponibilité.

Sortie : dossier de preuves obtenu sur la configuration réellement destinée au lancement.

## Lot 7 — Décider et réaliser le lancement

| ID | Priorité | Travail | Critère d'acceptation | Dépendance |
|---|---|---|---|---|
| PROD-070 | P1 | Réunir le dossier de lancement : version, config, résultats, risques résiduels, restauration, rollback et responsabilités. | Tous les P0/P1 applicables terminés ; aucune réserve critique dissimulée par un test ignoré ; décisions manquantes résolues. | Lot 6 |
| PROD-071 | P1 | Après autorisation de publication, déployer sur la cible choisie puis effectuer les smoke tests. | Connexion, droits, catalogue, favoris, lecture directe et webhooks vérifiés ; rollback exécuté si critères d'arrêt atteints. | PROD-070, autorisation de déploiement |
| PROD-072 | P1 | Organiser une observation de lancement de 24 à 48 h et un bilan. Une surveillance persistante doit être effectivement configurée si demandée. | Alertes actives, jobs exécutés, aucune régression majeure ; incidents documentés et backlog mis à jour. | PROD-071 |

Arrêt immédiat du lancement en cas de contournement d'accès, corruption des droits,
fuite de secrets ou migration non maîtrisée. Retour arrière applicatif si une régression
de disponibilité dépasse durablement les seuils convenus ; ne pas annuler aveuglément
une migration destructive. Suivre la procédure de restauration validée.

## Décisions à prendre au bon moment

| Décision | Proposition de départ | Échéance |
|---|---|---|
| Offre publique | Préproduction authentifiée, paiements de test jusqu'à validation Billing. | Avant PROD-022 |
| VLC desktop public | Masquer l'ouverture locale ; documenter la limite. | Avant PROD-030 |
| Hébergement, région, budget, domaine et proxy | Choisir une plateforme après avoir établi les besoins Node, PostgreSQL et jobs. Aucun achat présumé. | Avant installation PROD-050 et lot 6 |
| Cibles DB d'essai/préproduction | Isoler les essais ; conserver africa_live_dev pour le développement autorisé. | Avant toute création de cible supplémentaire et PROD-043 |
| Charge attendue et objectifs de reprise | Confirmer trafic de lancement, perte de données acceptable et délai de rétablissement. | Avant PROD-053 et PROD-063 |
| Périmètre du catalogue public | Identifier les sources autorisées et éligibles ; conserver la distinction entre catalogue et lecture disponible. | Avant activation de la lecture publique |
| Responsable des alertes et plateforme CI | Désigner une destination existante et autorisée. | Avant activation PROD-052 et PROD-061 |

## Après le lancement

P2 à prioriser sur mesures : découpage du composant Player, réduction du coût des filtres,
amélioration de l'accessibilité, extension des navigateurs testés, simplification des scripts
hérités et harmonisation des noms Lumina/Africa Live. Un défaut bloquant découvert dans
ces domaines remonte en P1 ; aucun grand refactoring cosmétique avant les corrections critiques.

## Prochaine action

Phases A, B et Lot 3 (UX de lecture et qualification des flux) entièrement validés, déployés et en ligne au 24 septembre 2026.
Le staging `https://staging.africatv.sn` est en ligne, sécurisé en TLS, authentifié avec Clerk et opère avec 6 825 flux sains certifiés et ouverture VLC 100 % automatique sans affichage d'URL ni bouton de copie.
Prochaine étape : Aborder les travaux applicatifs du **Lot 2 (PROD-020 à PROD-022 : identités, sessions, webhooks Clerk et gestion des abonnements Billing)**.
L'apex `africatv.sn` et `www` restent réservés pour le lot de lancement en production (Lot 7).
