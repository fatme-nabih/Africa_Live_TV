# Correctifs de l’audit — réception locale du 4 octobre 2026

Implémentation demandée par le propriétaire, dans `Africa_Live_TV`. Base : HEAD `2ab18b6`, avec les modifications documentaires préexistantes conservées. Ce dossier décrit la réception locale avant publication ; [COR-901](publication-correctifs-2026-10-04.md) suit la demande explicite ultérieure de mise à jour GitHub/Railway staging. Le projet source IPTV, les fichiers `.env*`, les migrations et la configuration distante restent inchangés.

## Règle des droits et décision de remboursement

Décision explicite du propriétaire : **retirer l’achat remboursé et recalculer les autres achats à leurs dates d’origine**. Le remboursement ne déplace jamais une date d’achat.

- Achat effectif : premier `paidAt` vérifié, conservé ensuite. En historique sans ce champ : premier `fulfilledAt`, puis `providerCreatedAt`, puis `createdAt`. Le diagnostic signale une date vérifiée manquante avant toute réparation.
- Ordre : date effective puis identifiant. Début d’un achat : maximum entre l’échéance déjà acquise et sa date effective. L’essai initial constitue la première échéance. Durées conservées : 30 et 365 jours, prix 990 et 9 900 XOF.
- Pending/failed/canceled : aucune modification des droits. Achat ancien reçu tardivement : dates anciennes conservées ; si son échéance est passée, abonnement expiré.
- Remboursement : achat exclu, reconstruction des achats restants selon cette règle, même si une partie de leur période est déjà consommée. Aucun achat restant : abonnement NabooPay expiré, début nul, échéance ramenée à l’essai initial. Les autres fournisseurs et l’essai du compte sont préservés.
- Nouvelle acquisition face à une échéance historique supérieure au calcul : conserver le surplus déjà accordé et ajouter l’achat ; signaler cet historique au diagnostic. Aucun correctif automatique du surplus historique dans un webhook pending, au démarrage ou à l’occasion d’un nouvel achat.

Exemples UTC, essai terminé le 31 août 2026 :

| Historique | Échéance acquise |
|---|---|
| Mois acheté le 1er septembre | 1er octobre, même après un traitement le 20 octobre |
| Pending reçu le 21 septembre | Toujours 1er octobre : dix jours restants |
| Mois du 1er septembre + année du 15 septembre | 1er octobre 2027 |
| Remboursement du mois, année conservée du 15 septembre | 15 septembre 2027 |
| Mois du 1er septembre + mois après interruption le 1er décembre | 31 décembre 2026 |

Les verrous sont acquis compte puis commande. Attribution, dates et marqueur d’exécution sont dans la même transaction. Les doublons, événements anciens et achats concurrents sont testés.

## Preuves par ticket

« Reçu localement » concerne le code et les scénarios contrôlés ci-dessous. Cela ne vaut pas réception connectée sur staging, réparation d’historiques réels ou réception des appareils réels.

| Tickets | Résultat et preuve principale |
|---|---|
| COR-000 | État Git inspecté ; baseline 350 unités, 14 intégrations, tsc/lint/build ; guides Next installés lus. Logs `corrections-baseline-*`. |
| COR-101/102 | Calcul pur daté, remboursements décidés, événements sans acquisition neutres, verrou compte/commande. `payment-entitlements.test.ts`, `naboopay-payment.integration.test.ts` : dates exactes, concurrence, récupération d’un completed non attribué, autres fournisseurs. |
| COR-103 | `npm run diagnose:entitlements` local, lecture seule ; identifiants internes et écarts. Diagnostic pur sans mutation testé ; procédure de réparation ci-dessous. Aucune réparation effectuée. |
| COR-104/105 | Politique stricte commune ; matrice locale/staging/production et requêtes non fiables. `local-playback-request.test.ts`, politique/résumé existants, intégration du résolveur, E2E accès anonyme sur build. Session Clerk membre/admin non reçue. |
| COR-201 | Délai unique fetch/corps/validation, lecteur annulé et taille limitée. `correction-resilience.test.ts` : corps vide/partiel bloqué, absent, malformé, trop grand et succès ; un seul POST. |
| COR-202 | Réservation sérialisée par compte et clé ; erreurs incertaines conservées, clé persistée par onglet et lien de suivi. Intégration de créations concurrentes et E2E paiement/rechargement simulé. Aucun encaissement. |
| COR-203 | Lots identifiables distincts des créations ambiguës, `FOR UPDATE SKIP LOCKED`, bail opérationnel d’une heure via `updatedAt`, date fournisseur distincte. 121 ambiguës + 121 identifiables, deux prises concurrentes, rotation et expiration testées. |
| COR-204/205 | Connexion réservée pendant le verrou, annulation lors de sa perte ; écritures supervisées, lot échoué conservé, reprises SQL bornées, bilan vérifié/écrit/restant. Intégration de verrou et test d’échec du writer ; aucun sondage de flux réel pour ces tests. |
| COR-206 | `next`, `@next/env`, `eslint-config-next` alignés à **16.3.8**, lockfile ciblé ; tsc/lint/build/E2E reçus, audit production sans vulnérabilité. |
| COR-301 | GET/migration/PATCH coordonnés, intentions par chaîne/révision persistées, réponse ancienne protégée, reprise réseau. Test pur et E2E GET tardif/deux clics/PATCH échoué/reprise/rechargement. |
| COR-302/303 | PUT verrouillé par utilisateur, transaction atomique et snapshot propre ; client sérialisé, regroupement, délai 15 s et reprise bornée. Intégration concurrence/rollback ; E2E GET échoué/PUT lent/dernier choix. |
| COR-304 | Identifiant sonore stable, autorité du mur, commandes contrôlées et révocation du son avant nouvelle attribution. E2E son d’en-tête et commandes internes, silence total et troisième lecteur ; décalage de libellé trouvé puis corrigé. |
| COR-401/402 | Recherche : TTL réel, requête partagée, réponse vide valide, échec non mis en cache. Tests contrôlés + E2E après six minutes. USD/XOF : multiplication EUR × 655,957 et taux direct prioritaire, exemple 0,9 → 590,3613 testé. |
| COR-403 | Catalogue et résolveur autorisent OFFLINE actif uniquement pour une requête locale de confiance ; filtres frontend retirés. Intégration + API réelle : aucune mutation santé/éligibilité/date de succès. Exclusions publiques conservées. |
| COR-404 | Liste SQL bornée et total exact avec même prédicat ; cache par pays/mode/limite, `canPlay` par requête. 121 chaînes, limites 10/40/80, accès distinct, unités et PostgreSQL. |
| COR-501/502 | Briefing avec fournisseurs/horloge injectés ; `npm test` refuse le réseau externe et PostgreSQL réels. CI exige audit production, intégrations, build, accès/paiement stricts et E2E sensibles sur fixtures locales ; nettoyage du compte synthétique détenu. Réception distante ultérieure réussie : run 37226297937, détail dans le dossier de publication. |
| COR-503/504 | Résolution et annulations dans `usePlaybackResolution`, HLS/native et nettoyage dans `useMediaLifecycle` ; catalogue et favoris dans `useCatalog`/`useFavorites`. Machine de lecture unique conservée ; suites lecture, reprise, remplacement, lecteur réduit, mur et préférences. |
| COR-505 | Météo : LRU 256, expiration maximale 60 min, 256 requêtes en vol au plus ; cardinalité 10 000 testée. Résolveur relit toujours les sources actives même après un listing en cache (intégration retrait). Contrats d’invalidation ci-dessous. |
| COR-506 | Protocole et premiers profils implémentés ; **réception partielle** : SQL/health sur build local et lectures synthétiques en dev. Comparaison complète avant/après HTTP/mur sur build connecté et budget de performance non établis. |
| COR-507 | État courant court, handoff, backlog et preuves mis à jour ; historique de publication conservé et daté. |
| COR-900 | Dossier local consolidé avec réserves explicites sur COR-506, sessions connectées et appareils. Réception complète encore ouverte. |
| COR-901 | Publication autorisée après le bilan local et reçue : `6dad01c`, Railway `4319e870` SUCCESS, 438/438 fichiers, 10/10 E2E distants, CI réussie. Dossier de publication séparé ; réserves COR-506/COR-900 maintenues. |

## Vérifications finales

| Contrôle | Résultat |
|---|---|
| Unités sans réseau | 364 réussies, 23 ignorées (intégrations désactivées dans ce runner), 0 échec |
| PostgreSQL isolé | 23 réussies, aucun échec ; rollback migration témoin, quotas tiers et empreintes du catalogue public préservés |
| Typage / lint / migrations | Succès ; aucune migration ajoutée |
| Build | Next 16.3.8, build strict : flags MVP/lecture locale/VLC desktop à false, mur à true |
| Audit production | 0 vulnérabilité (`npm audit --omit=dev --audit-level=moderate`) |
| UI locale contrôlée | 56 scénarios uniques reçus, 1 contrôle réservé au build ignoré ; échec du libellé sonore corrigé et fichier mur rejoué 2/2 |
| Catalogue local réel | 3/3 reçus : filtres/favoris/lecteur, réponse tardive et erreur/reprise ; média de lecteur simulé |
| Profil navigateur | 1 scénario reçu, neuf configurations mesurées (trois chacune à 1/2/4 lectures) |
| Build servi | 10 réussis, 9 ignorés : trois scénarios catalogue demandant une session Clerk et six scénarios UI Radar reçus séparément en dev ; accès, widgets Clerk, paiement simulé et worker reçus |

Logs détaillés ignorés par Git dans `.local-logs/` : `corrections-unit-final.log`, `corrections-integration-final.log`, `corrections-types-final.log`, `corrections-lint-final.log`, `corrections-migrations-final.log`, `corrections-build-final.log`, `corrections-audit-final.log`, `corrections-e2e-ui-final.log`, `corrections-e2e-wall-final.log`, `corrections-e2e-catalogue-final.log`, `corrections-e2e-build-final.log`, `corrections-e2e-profile-final.log` et les deux profils JSON. Les premiers essais échoués restent historiques ; seuls leurs scénarios corrigés et rejoués sont reçus.

L’audit avec les dépendances de développement conservait 9 alertes (4 modérées, 5 élevées) lors de la mise à jour. Aucun `audit fix --force`. L’audit production est obligatoire en CI. Snyk reste bloquant pour une vulnérabilité ou une erreur de scan ; l’absence de token et `SNYK-CODE-0005` (fonction non activée pour l’organisation) produisent un avertissement explicite de scan non exécuté. Cette indisponibilité a été constatée pendant la publication ; aucun abonnement ou état Snyk n’a été modifié.

## Mesures locales et limites de COR-506

Machine : Windows, Node 22.16.0, i9-12900F, 24 processeurs logiques, environ 128 Gio de RAM. Catalogue : 14 505 chaînes, 15 646 sources. SQL : 30 échantillons après chauffe par requête. API : `GET /api/health` public sur build compilé, cinq vagues par concurrence, corps consommé, délai 10 s. Aucun trafic staging ni média amont.

| Mesure | Échantillons | p50 | p95 |
|---|---:|---:|---:|
| Forme de requête d’échantillonnage historique (120 chaînes SN) | 30 | 0,70 ms | 1,42 ms |
| Liste exacte visible SN, limite 40 | 30 | 1,52 ms | 1,91 ms |
| Total exact visible SN | 30 | 1,52 ms | 1,70 ms |
| Health, concurrence 1 | 5 | 11,27 ms | 22,26 ms |
| Health, concurrence 5 | 25 | 21,63 ms | 90,53 ms |
| Health, concurrence 10 | 50 | 38,47 ms | 211,15 ms |
| Première lecture synthétique, 1 vidéo | 3 | 1 672 ms | 1 991 ms |
| Première lecture synthétique, 2 vidéos | 3 | 1 409 ms | 1 435 ms |
| Première lecture synthétique, 4 vidéos | 3 | 1 100 ms | 1 345 ms |

Health : 80 réponses sans erreur. Navigateur Edge/Chromium, viewport 1366×900, contexte neuf par mesure, fixtures HLS directes et résolutions simulées, serveur dev local. 5/10/20 requêtes médias pour 1/2/4 lecteurs ; heap JavaScript observé environ 17–25 Mo, sans mesure de mémoire totale navigateur/GPU. Au plus une vidéo audible dans les configurations observées.

La requête historique et le nouveau total ont des sémantiques différentes : ce tableau compare leur coût sur les mêmes données, **pas un gain de performance avant/après du parcours complet**. Trois échantillons navigateur donnent un maximum observé en colonne p95 et ne permettent pas une estimation robuste du percentile. Le cas à une vidéo comprend le clic du catalogue ; les autres ouvrent directement le mur et ne sont pas comparables comme un benchmark de montée en charge.

À compléter pour recevoir COR-506 : baseline avant/après du parcours authentifié sur build servi, mêmes fixtures/conditions, davantage d’échantillons, charge sur les API protégées et quotas, mémoire totale, budget fixé avant une optimisation. Aucun gain de capacité production ou réception mobile réelle n’est revendiqué.

Reproduction : `npm run profile:corrections` sur build strict local à 3001 ; `e2e/correction-profile.spec.ts` sur serveur dev local avec le compte synthétique détenu. Le script profilage refuse une autre base ou un hôte distant.

## Invalidation des caches

- Météo : fraîcheur du contrat conservée, repli périmé admissible borné à 60 min ; stockage LRU 256 par processus, expiration purgée à chaque accès/écriture. Requêtes concurrentes coalescées et plafonnées. Redémarrage vide le cache.
- Radar pays : métadonnées cinq minutes, maximum 256 clés pays/mode/limite ; total et liste partagent la clé. Résumé : dix minutes, repli de panne six heures marqué périmé. Les entrées en mémoire ne sont pas partagées entre processus.
- Rangées TV : cinq minutes par session navigateur, clé de pays/rangée ; changements de favoris font varier la requête. Recherche dépêches : cinq minutes par contexte JavaScript, requête en vol partagée ; rafraîchissement à l’ouverture et pendant une recherche active.
- Un import/retrait peut donc rester affiché jusqu’au TTL du listing. Redémarrer les processus invalide immédiatement leurs métadonnées ; une invalidation ciblée doit toucher chaque processus et les caches navigateur. **La résolution ne se sert jamais de ce listing pour autoriser un média : retrait de chaîne/source vérifié en SQL à chaque tentative.** Aucun média mis en cache.

## Diagnostic et réparation des historiques

`npm run diagnose:entitlements` refuse les bases distantes, n’exécute que des SELECT et imprime les identifiants internes, catégorie, échéance calculée et écart. `consistent` : échéance identique ; `date_missing` : date vérifiée absente ou historique ambigu ; `legacy_formula_candidate` : écart compatible avec l’ancienne formule ancrée au début enregistré, examen obligatoire ; `review_required` : autre différence à examiner. La compatibilité avec l’ancienne formule est une explication possible, pas une preuve de provenance ni une validation automatique du surplus.

Procédure de réparation future, distincte de cette livraison :

1. Obtenir une sauvegarde restaurable et sélectionner explicitement les identifiants internes concernés. Exporter dates/achats/droits minimisés ; examiner les dates manquantes chez le fournisseur sans inventer un endpoint de recherche.
2. Produire une simulation avant/après selon la règle validée, identifier les périodes consommées et les écarts historiques légitimes (compensation, autre fournisseur, essai). Aucun historique ambigu ne doit être modifié sur la seule base d’un repli.
3. Décider explicitement toute réduction et compensation éventuelle ; faire approuver la sélection et ses échéances simulées. Conserver une trace minimale sans coordonnées clients ou secret.
4. Si un outil d’application est demandé, le borner aux identifiants approuvés, vérifier le snapshot attendu, verrouiller le compte, rendre l’exécution idempotente et conserver les valeurs précédentes dans la sauvegarde. Aucune commande de réparation fournie ou exécutée ici.
5. Vérifier l’accès effectif et le diagnostic après application. Restaurer ou compenser selon la décision ; un rollback du code ne restaure pas des droits modifiés.

## Limites de réception et publication

Staging demeure le déploiement D-4/D-5 documenté précédemment, non revérifié durant ces corrections ; aucune publication COR. Le code de CI a été vérifié par ses commandes locales, pas par une exécution GitHub. Les interfaces Clerk de connexion/inscription et refus anonymes sont vérifiés ; catalogue membre/admin sur build, conflits entre deux appareils réels, VLC desktop effectif, PiP/plein écran selon matériels et médias réels restent à recevoir. Les tests utilisent des providers et médias synthétiques.

Environnement rendu : serveur dev habituel avec Clerk sur localhost:3001, santé 200, `/app` et `/api/channels` anonymes 307. Compte technique détenu supprimé ; 2 utilisateurs conservés, 0 compte technique, 0 schéma d’intégration résiduel. Les fichiers `.env*` n’ont pas été édités.

La mise à jour ciblée sort Next de la plage affectée par l’[avis officiel GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), corrigée à partir de 16.3.6. Le chemin ImageResponse vulnérable n’avait pas été trouvé dans l’audit applicatif ; la mise à jour reste requise comme mesure de dépendance.
