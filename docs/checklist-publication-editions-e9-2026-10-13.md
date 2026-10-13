# EDI-903 — check-list exécutée, 13 octobre 2026

**Publication staging reçue : f4d85931-e353-422e-bbe6-aa1476ab360a SUCCESS.** [Dossier final](publication-editions-edi903-2026-10-13.md), [passation](passation-editions-publication-2026-10-13.md).

1. Relectures validées par le propriétaire sur les textes actuels ; D7/EDI-404 reçus. Propositions juridiques non appliquées. Autorisations EDI-903 et EDITIONS=fr,en,ar enregistrées ; aucun commit/push demandé ni exécuté.
2. État local/distant et rôle staging revérifiés ;21 migrations avant livraison,22 locales. Modes locaux/authentification/éligibilité conservés.
3. Paquet figé depuis le disque non committé, secrets/privés/médias synthétiques exclus ; index 27 renommages préservé. Preuve SHA-256 du paquet et646/646 fichiers distants. Pas de CI GitHub du paquet non committé revendiquée ; réception locale E9 conservée.
4. Sauvegarde chiffrée hors volume puis déchiffrement et restauration isolée locale :25 tables, huit empreintes +journal identiques, scratch nettoyé. Référence dans le dossier.
5. Pré-déploiement existant npm run db:migrate:deploy : uniquement 0021 avant nouveau service, 22 migrations correspondantes, colonne/contrainte reçues. Aucun db:push.
6. Seul changement de variable : EDITIONS=fr,en,ar, sans déploiement automatique supplémentaire, puis upload unique. Build/runtime identiques ; autres garde-fous/configurations conservés.
7. Scripts relus/adaptés, paquet manifesté, compilation/types/pages Railway reçus ; étatSUCCESS et empreintes distantes. Deux SQL historiques normalisés CRLF→LF uniquement dans le paquet.
8. Santé 200 sur les deux domaines ;28 E2E reçus +22 ignorés, 45 captures. Les parcours connectés réels, préférence sur deux navigateurs, achat et lecture amont restent distincts et non effectués ; preuves locales/simulations conservées.
9. Sauvegarde, schéma, hashes, santé, résultats, limites et retour au code précédent consignés. Retour applicatif préparé vers 9ac3d8de-0357-4e68-a13f-9aa4110ce40c, migration additive conservée ; aucun rollback exécuté.

Production/apex/www non publiés ; aucune action DNS/Clerk/OVHcloud/plan/alerte/coût supplémentaire. Tâche Windows et run-cycle.cjs inchangés.
