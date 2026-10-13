# EDI-903 — publication Railway staging reçue, 13 octobre 2026

**FR · EN · AR publiées sur [staging.africatv.sn](https://staging.africatv.sn). 43/43 tickets EDI reçus avec les limites ci-dessous.** Le propriétaire a demandé « go pour EDI-903 », puis confirmé « Relectures validées, publier les textes actuels ». [Validation D7/juridique](relectures-editions-2026-10-13/validation-proprietaire.md) : EDI-404 reçu, sources actuelles acceptées, propositions juridiques A–D non appliquées. Les neuf constats JUR restent documentés ; aucune qualification réglementaire ou donnée d'exploitant supplémentaire n'est inventée.

## Livraison et identification

| Élément | Preuve reçue |
| --- | --- |
| Cible | Railway just-compassion, environnement nommé production, rôle applicatif **staging** |
| Déploiement | **f4d85931-e353-422e-bbe6-aa1476ab360a — SUCCESS** |
| Configuration | **EDITIONS=fr,en,ar**, identique au build et au runtime ; seul changement de variable |
| Origines | [Staging](https://staging.africatv.sn), [diagnostic Railway](https://africalivetv-production.up.railway.app) |
| Origine du paquet | Fichiers actuels du checkout volontairement non committé ; HEAD de filiation **ab9a6f72259c14c676bd1478337cacd5dbe62f80** |
| Empreinte du paquet | SHA-256 **543022ed6ea1dfa34b3a5fd76791fcf9880dc690f7aed07ff2dcdccfa5eba8b2** ; cette empreinte identifie la livraison, la SHA HEAD ne décrit pas les changements non committés |
| Concordance | **646/646 fichiers du paquet** présents et identiques sur le runtime |
| Build | Next 16.3.8, compilation/types/pages réussis ; 6 pages publiques prérendues par édition, soit 18 |
| Schéma | **22/22 migrations** et hashes/timestamps correspondants ; nouvelle colonne nullable preferred_edition et contrainte fr/en/ar présentes |
| Santé | **200** processus/base sur les deux domaines ; aucun détail de connexion exposé |

L'upload CLI utilise un paquet préparé depuis les fichiers du disque, incluant les nouvelles sources, dictionnaires, assets et migration 0021. Aucun clone/worktree depuis HEAD. Aucun commit/push ni opération de staging Git ; **index de 27 renommages conservé**. Pas de CI GitHub attachée à un commit de cette livraison : elle n'est pas présentée comme reçue pour le paquet non committé. La [réception locale E9](reception-editions-e9-2026-10-13.md) et ses limites restent la preuve locale, et la compilation Railway ainsi que les contrôles ci-dessous prouvent la livraison.

Les chemins privés, secrets, sauvegardes, .claude et médias synthétiques e2e/fixtures sont exclus. Deux migrations historiques (0008 et 0017) ont uniquement leurs fins de ligne CRLF converties en LF **dans le paquet** : hashes exactement identiques à ceux déjà appliqués et à Git HEAD. Les fichiers du checkout sont intacts. [Manifeste](../.local-logs/publication-editions-2026-10-13/release.json), [porte de livraison](../.local-logs/publication-editions-2026-10-13/delivery-gate.json), [fichiers distants](../.local-logs/publication-editions-2026-10-13/remote-source.json).

## Sauvegarde puis migration

Sauvegarde privée **backups/railway/railway-before-editions-0021-2026-10-13T21-32-17-491Z**, avant toute migration distante. Dump custom AES-256-GCM, clé protégée par DPAPI Windows ; déchiffrement/SHA-256 puis restauration isolée locale vérifiés. **25 tables restaurées** ; empreintes des huit tables métier et du journal des 21 migrations identiques. La base temporaire et les dumps temporaires en clair ont été supprimés ; dump chiffré, clé protégée et métadonnées restent hors Git. [Preuve de restauration](../.local-logs/publication-editions-2026-10-13/backup-result.json).

Le pré-déploiement existant **npm run db:migrate:deploy** (300 s) a appliqué uniquement **0021** avant de servir le nouveau code. Aucun db:push, backfill, autre migration ou changement de configuration de déploiement. La santé /api/health (120 s) et les repoTriggers vides sont conservés. [Préflight](../.local-logs/publication-editions-2026-10-13/preflight.json), [configuration](../.local-logs/publication-editions-2026-10-13/settings.json), [runtime/schéma](../.local-logs/publication-editions-2026-10-13/runtime.json).

Après migration puis après réception : **14 505 chaînes, 15 646 sources, 6 comptes, 56 favoris**, aucune préférence d'édition renseignée. **Huit empreintes métier identiques** (projection users sans la nouvelle colonne nullable), zéro transaction/abonnement/pays suivi/requête de support. [Avant](../.local-logs/publication-editions-2026-10-13/database-before.json), [après réception](../.local-logs/publication-editions-2026-10-13/database-after-reception.json). La base locale africa_live_dev reste à 22 migrations, 3 comptes et 29 favoris.

## Réception distante

- **28 scénarios reçus, 22 ignorés, aucun échec applicatif restant** : pages publiques, authentification/refus anonymes, widgets Clerk réels anonymes, paiement simulé, worker réellement servi, ressources PWA, contrat HTTP et pages d'édition, prix/carte, textes juridiques, contact sans envoi et suggestion de langue. [Rapport initial](../.local-logs/publication-editions-2026-10-13/e2e-remote.json), [cas ignorés et raisons](../.local-logs/publication-editions-2026-10-13/e2e-skipped.json), [synthèse](../.local-logs/publication-editions-2026-10-13/reception.json).
- Le rapport initial comporte 27 réussis et un échec : le test déposait son cookie sur localhost. Une copie **privée** du seul scénario, avec uniquement le domaine staging à la place, passe **1/1**, mêmes assertions. Le test versionné reste identique. [Adaptation](../.local-logs/publication-editions-2026-10-13/cookie-reception-adaptation.json), [réception](../.local-logs/publication-editions-2026-10-13/cookie-result.json).
- **45 captures reçues** : FR/EN/AR × accueil/tarifs/CGU/confidentialité/contact ×360/768/1366 ; lang/dir, URL canonique, quatre hreflang, absence de débordement et d'erreur JavaScript vérifiés. [Galerie](../.local-logs/publication-editions-2026-10-13/captures.md), [preuve des 45 cas](../.local-logs/publication-editions-2026-10-13/captures/receipt.json). Premier banc : 42 passés et 3 écarts dans l'assertion ajoutée par l'agent qui comparait le domaine nu à sa forme avec barre finale. Comparaison corrigée par équivalence URL, puis les trois accueils FR reçus **3/3**. [Premier rapport](../.local-logs/publication-editions-2026-10-13/captures-initial-result.json), [recontrôle](../.local-logs/publication-editions-2026-10-13/captures-root-recheck.json). Tous les PNG sont conservés ; le rapport partagé de mesures brutes ayant redémarré avec les workers échoués, la preuve complète s'appuie sur les résultats JSON par cas et les images.
- GET /api/health **200** sur les deux origines ; météo anonyme 401, app/compte/admin/préférence redirigent vers la connexion ; préfixes EN/AR posent le cookie et conservent le pays. [Santé et refus](../.local-logs/publication-editions-2026-10-13/health.json).
- Page arabe publiée inspectée dans Edge : rendu RTL, textes/prix attendus. La session existante demande une connexion sur accounts.africatv.sn ; **aucune connexion, modification de compte ou paiement réel tenté**. [Constat](../.local-logs/publication-editions-2026-10-13/browser-reception.json).

## Limites conservées

Les 22 cas ignorés demandent le MVP local, la base privée ou les parcours Radar/connectés ; leurs preuves locales sont E4/E6/E9, pas une réception authentifiée distante. La préférence au compte sur deux navigateurs, compte/profil/Radar/TV AR connectés et lecture réelle navigateur/VLC restent à recevoir avec une session active. Aucun paiement réel ni média amont lu dans les bancs de publication. Les contrôles de lecture/favoris/droits reçus localement sont simulés ou en MVP selon le dossier E9 ; la concordance du code n'est pas présentée comme une lecture physique distante.

Relectures acceptées par le propriétaire pour les textes actuels ; aucune certification juridique indépendante revendiquée. Les propositions juridiques restent séparées du code. Sources FR inchangées ; intermittences RSS et R1–R5 encore ouverts, EN à froid peut proposer Try again après 15 s. Pont entre seuls caches valides <5 min de la même instance ; PWA/administration et image d'accueil FR restent des limites connues.

Modes MVP, lecture locale, VLC desktop et mode CI anonyme désactivés ; éligibilité et mur TV conservés, authentification et NabooPay inchangés. Aucune action Clerk, DNS, OVHcloud, production, plan/alerte/coût supplémentaire, tâche Windows ou run-cycle.cjs. IPTV intact. État local final et liens : [passation](passation-editions-publication-2026-10-13.md).

## Retour au code précédent

Référence saine avant livraison : **9ac3d8de-0357-4e68-a13f-9aa4110ce40c**. En cas d'incident applicatif, revenir à cette image avec la procédure du runbook, puis recevoir santé/auth/catalogue. **La migration additive 0021 reste en place** et est compatible avec le code précédent ; un retour de code ne l'annule pas. La sauvegarde restaurable reste disponible hors volume. Ce plan est préparé, aucun rollback exécuté. [Runbook](railway-preproduction-runbook.md).
