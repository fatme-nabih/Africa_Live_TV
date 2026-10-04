# Backlog des correctifs de l'audit — Africa Live

Date : 4 octobre 2026. **Correctifs publiés sur GitHub et Railway staging sur demande ; CI réussie.** [Publication](publication-correctifs-2026-10-04.md), [dossier de réception locale](correctifs-audit-validation-2026-10-04.md), [état courant](etat-courant.md).

[Plan détaillé et critères d'acceptation](plan-correctifs-audit-2026-10-04.md) · [Audit et preuves](audit-code-2026-10-04.md) · [Backlog de production](production-backlog.md).

29 tickets : 26 répartis dans les cinq lots, 1 préparation, 1 réception globale, 1 publication conditionnelle. Statut actuel : **26 reçus localement, COR-506 partiel, COR-900 avec réserves, COR-901 publication staging reçue**. Chaque correctif inclut ses tests ; COR-501/502 consolident la couverture et la CI. Les statuts initiaux du plan étaient 28 à faire et 1 conditionnel.

P1 : préalable à la fiabilité d'un parcours critique. P2 : fonctionnement/résilience. P3 : amélioration secondaire. Charge indicative : S localisée, M plusieurs chemins, L règle métier ou orchestration complexe ; aucun engagement de date.

## Vue exécutable

| ID | Lot / priorité | Référence | Travail | Dépendances | Charge | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| COR-000 | Préparation / P1 | Audit | Figer environnement, baseline et preuves reproductibles | — | S | Reçu localement |
| COR-101 | 1 / P1 | F1 | Définir dates d'achat, empilement, essai et règle de remboursement | COR-000 | M | Reçu localement |
| COR-102 | 1 / P1 | F1 | Corriger calcul et attribution atomique/idempotente des droits | COR-101 | L | Reçu localement |
| COR-103 | 1 / P1 | F1 | Diagnostic historique en lecture seule et procédure de réparation | COR-102 | M | Reçu localement |
| COR-104 | 1 / P1 | F2 | Même politique stricte pour résolveur et capacités certifiées | COR-000 | M | Reçu localement |
| COR-105 | 1 / P1 | F2 | Vérifier accès et frontières local/staging/production | COR-104 | M | Reçu localement |
| COR-201 | 2 / P2 | F3 | Délai NabooPay couvrant en-têtes et corps ; nettoyage | COR-000 | M | Reçu localement |
| COR-202 | 2 / P2 | F3/F4 | Machine d'états des créations incertaines et suivi client | COR-102, COR-201 | L | Reçu localement |
| COR-203 | 2 / P2 | F4 | Réconciliation équitable, échéances, reprise des creating anciennes | COR-202 | L | Reçu localement |
| COR-204 | 2 / P2 | F10 | Connexion dédiée conservant le verrou pendant tout le job | COR-000 | M | Reçu localement |
| COR-205 | 2 / P2 | Dette worker | Superviser les écritures et l'échec après reprises SQL | COR-204 | M | Reçu localement |
| COR-206 | 2 / P2 | F12 | Mise à jour Next ciblée, paquets alignés et non-régression | COR-000 | M | Reçu localement |
| COR-301 | 3 / P2 | F5 | Coordination globale des favoris et protection des snapshots anciens | COR-000 | M | Reçu localement |
| COR-302 | 3 / P2 | F6 | Verrou utilisateur et remplacement atomique des pays suivis | COR-000 | S | Reçu localement |
| COR-303 | 3 / P2 | F6 | Un envoi en vol, regroupement et reprise réseau des pays | COR-302 | M | Reçu localement |
| COR-304 | 3 / P2 | F7 | Autorité sonore au mur, contrôles cohérents et identité stable | COR-105 | M | Reçu localement |
| COR-401 | 4 / P2 | F8 | Cache de recherche valide, rafraîchissement et reprise après erreur | COR-000 | M | Reçu localement |
| COR-402 | 4 / P2 | F9 | Conversion USD/XOF correcte et tests d'unités | COR-000 | S | Reçu localement |
| COR-403 | 4 / P2 | F11 | Visibilité et retentative locale OFFLINE sans certification | COR-104, COR-105 | M | Reçu localement |
| COR-404 | 4 / P3 | Comptage Radar | Total exact, liste bornée et cache indépendant des limites erronées | COR-403 | M | Reçu localement |
| COR-501 | 5 / P2 | Tests | Unités sans réseau ; reproductions intégrées et horloge contrôlée | Lots 1–4 reçus | M | Reçu localement |
| COR-502 | 5 / P2 | CI | Audit dépendances et parcours sensibles obligatoires | COR-501 | M | Reçu localement |
| COR-503 | 5 / P3 | Simplicité | Extraire le cycle de vie/résolution HLS de Player | COR-105, COR-304 | L | Reçu localement |
| COR-504 | 5 / P3 | Simplicité | Extraire l'orchestration catalogue et préférences de la page TV | COR-301, COR-303 | M | Reçu localement |
| COR-505 | 5 / P3 | Mémoire/cache | Borner météo, évincer et documenter invalidation des métadonnées | Lots 1–4 reçus | M | Reçu localement |
| COR-506 | 5 / P3 | Performance | Baseline/comparaison SQL, API, mémoire et mur sous charge locale | COR-503, COR-504, COR-505 | M | Partiel |
| COR-507 | 5 / P3 | Documentation | État courant concis, historique conservé, preuves par ticket | Lots 1–4 reçus | S | Reçu localement |
| COR-900 | Réception / P1 | Ensemble | Dossier local final, contrôles globaux et limites restantes | Lots 1–5 reçus | M | Réception avec réserves |
| COR-901 | Publication / P1 | Ensemble ou lot candidat | Préparation et réception staging, sauvegarde/compatibilité si migration | Lot reçu + autorisation explicite | M | Reçu sur staging |

Les dépendances du tableau sont techniques. L'ordre opérationnel reste **préparation → lot 1 → lot 2 → lot 3 → lot 4 → lot 5 → réception globale**. Les tâches indépendantes ne nécessitent pas toutes le code du lot précédent ; l'exception possible COR-206 est décrite dans le plan. Une publication isolée de correctif suit sa propre réception et une autorisation explicite.

## Correspondance avec les constats

| Constat | Tickets | Preuve de clôture principale |
| --- | --- | --- |
| F1 : droits recrédités | COR-101/102/103 | Échéance stable malgré temps, pending/failed, doublons, renouvellement et remboursement selon règle ; diagnostic sans mutation. |
| F2 : UNTESTED permissif | COR-104/105 | Source refusée par la politique stricte également refusée par le résolveur hors local autorisé. |
| F3 : délai/issue incertaine | COR-201/202 | Corps interrompu au délai ; coupure après envoi ne devient pas un refus certain ni une recréation automatique. |
| F4 : réconciliation | COR-202/203 | Plus de 100 ambiguïtés n'affament pas les commandes identifiables ; creating anciennes suivies. |
| F5 : favoris | COR-301 | Liste serveur/interface/stockage cohérente avec réponses tardives et erreur puis reprise. |
| F6 : pays suivis | COR-302/303 | PUT concurrents sans erreur d'unicité ; reprise après GET/PUT défaillant. |
| F7 : mur TV | COR-304 | Au plus une vidéo non muette dans toutes les interactions testées. |
| F8 : cache recherche | COR-401 | Nouvelles dépêches après TTL ; reprise après erreur ; pas de doublons inutiles d'appel. |
| F9 : USD/XOF | COR-402 | Payload EUR=0,9 → XOF=590,3613 en calcul dérivé ; taux direct préservé. |
| F10 : verrou worker | COR-204 | Deuxième worker exclu même pendant une longue période sans SQL ; verrou libéré à la fin. |
| F11 : OFFLINE local | COR-403 | Tentative locale possible sans modifier santé/éligibilité ; refus strict ailleurs. |
| F12 : dépendance Next | COR-206 | Version corrigée vérifiée, paquets alignés, audit et non-régression consignés. |
| Total Radar | COR-404 | 121 visibles, limite 40 → 40 éléments et total 121 ; limites/cache cohérents. |

## Préparation des migrations et actions conditionnelles

| Ticket | Migration prévue au stade du plan | Action à distinguer de la correction locale |
| --- | --- | --- |
| COR-102 | Possible si des périodes attribuées doivent être persistées ; privilégier les champs existants si suffisants. | Réparation d'échéances historiques après diagnostic et décision explicite. |
| COR-202/203 | Possible pour métadonnées/échéances de reprise et index ; choix précis après revue. | Examen de commandes ambiguës chez le fournisseur ou dans les comptes distants. |
| COR-301/303 | Non attendue pour file client/verrou ; révision serveur éventuelle dans un changement distinct. | Règle plus forte de conflit entre appareils, si demandée. |
| Autres correctifs | Pas de migration identifiée ; à confirmer lors du diff. | Publication staging autorisée séparément. |

Toute migration distante exige une sauvegarde restaurable, `db:migrate:deploy` et une stratégie de compatibilité. Un retour au code précédent n'annule pas une migration ni une réparation de données. Aucun `db:push`, aucune activation de paiement, aucun changement Clerk/DNS/plan d'hébergement par ce backlog.

**Choix réalisé : aucune migration supplémentaire.** COR-102 utilise les dates existantes ; COR-202/203 réutilisent les états et `updatedAt` comme bail opérationnel d’une heure, indépendant de `providerUpdatedAt`. La décision de remboursement validée retire l’achat et reconstruit les achats restants à leurs dates d’origine. Aucune réparation de données réelles.

## Réception et suivi

Réception locale du 4 octobre 2026, base HEAD `2ab18b6` : [résultats par ticket, versions, tests et limites](correctifs-audit-validation-2026-10-04.md). Publication expressément demandée après ce bilan ; [suivi COR-901](publication-correctifs-2026-10-04.md). Les anciennes réussites de l'audit ne valent pas validation de ces correctifs.

- [x] COR-000 reçu.
- [x] Lot 1 reçu localement : droits et éligibilité ; session Clerk connectée à recevoir séparément.
- [x] Lot 2 reçu localement : réseau, reprise, workers et Next.
- [x] Lot 3 reçu localement : préférences et mur.
- [x] Lot 4 reçu localement : cache, taux et catalogue.
- [ ] Lot 5 : code, tests, CI et extractions reçus localement ; COR-506 reste partiel (avant/après authentifié sur build, budget).
- [ ] COR-900 : dossier local établi, réception complète avec réserves de profilage, sessions et appareils.
- [x] COR-901 : publication demandée et reçue (`6dad01c`, `4319e870`, 438/438 fichiers, 10/10 E2E distants) ; CI réussie, réserves COR-506/COR-900 maintenues.
