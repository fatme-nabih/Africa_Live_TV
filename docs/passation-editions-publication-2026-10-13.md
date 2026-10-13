> **Suite Git autorisée le 13/10/2026 :** le propriétaire demande « commit et push sur github ». Le chantier E0–E9, les tests et les dossiers seront enregistrés sur main après contrôle des fichiers/secrets. La publication staging f4d85931 reste celle du paquet déjà reçu ; cette demande Git n’ouvre pas une nouvelle livraison distante. .claude, logs, sauvegardes et secrets restent hors Git. État avant commit conservé dans .local-logs/git-editions-2026-10-13/.

# Passation après publication EDI-903 — 13 octobre 2026

**43/43 tickets EDI reçus avec les limites documentées.** [Publication et preuves](publication-editions-edi903-2026-10-13.md), [tableau des 43 tickets](validation-editions-2026-10-11.md), [relectures acceptées](relectures-editions-2026-10-13/validation-proprietaire.md). Point d'entrée courant ; les passations fin E6/E9 décrivent les étapes antérieures.

## État courant

- Railway just-compassion reste **staging**, malgré le nom production du dashboard. **f4d85931-e353-422e-bbe6-aa1476ab360a SUCCESS**, EDITIONS=fr,en,ar au build/runtime, 18 pages publiques prérendues. **646/646 fichiers** identiques au paquet SHA-256 **543022ed6ea1dfa34b3a5fd76791fcf9880dc690f7aed07ff2dcdccfa5eba8b2**. Paquet issu du checkout actuel non committé ; HEAD de filiation ab9a6f72259c14c676bd1478337cacd5dbe62f80, aucun commit/push.
- Sauvegarde **backups/railway/railway-before-editions-0021-2026-10-13T21-32-17-491Z**, chiffrée et restaurée dans une base locale jetable : 25 tables, huit empreintes métier +journal identiques ; base et dumps temporaires supprimés. Migration additive **0021 reçue sur staging, 22 migrations**, colonne et contrainte vérifiées. Pré-déploiement db:migrate:deploy et healthcheck existants conservés.
- Staging : 14 505 chaînes, 15 646 sources, 6 comptes, 56 favoris ; huit empreintes identiques après réception, preferred_edition toujours NULL. Santé 200 sur staging.africatv.sn et domaine Railway. **28 E2E reçus +22 ignorés**, **45 captures reçues**, limites et adaptations du banc dans la publication.
- D7 et juridique : le propriétaire confirme **« Relectures validées, publier les textes actuels »** ; EDI-404 reçu. Dictionnaires et CSV canonique inchangés. Propositions juridiques A–D non appliquées ; faits/documents JUR non fournis ne sont pas inventés.

## Poste local à préserver

Même checkout **C:/Users/GAMER PC/Africa_Live_TV**, arbre volontairement sale, **index 27 renommages inchangé**. Aucun clone/worktree depuis HEAD, nettoyage ou opération Git de staging. Git : 236 entrées avant EDI-903, 238 après (deux nouveaux documents publication/passation), index 27 renommages identique. [Contrôle final](../.local-logs/publication-editions-2026-10-13/final-check.json). Consulter git status avant toute édition ; préserver .claude et toutes les sources non committées. Le paquet uploadé est une copie de livraison depuis le disque, pas un checkout HEAD.

Base africa_live_dev : **22 migrations, 14 505 chaînes, 15 646 sources, 3 comptes, 29 favoris**, preferred_edition NULL. Huit empreintes locales et .env inchangées. Aucun serveur local lancé par EDI-903 ; ports 3001/3002 libres. **.next reste le build FR seul Clerk d'E9** ; reconstruire explicitement avec les éditions/drapeaux voulus pour une prochaine réception locale.

EDI-604 déjà branché ; **run-cycle.cjs et tâche Windows inchangés**, prochaine exécution 19/10/2026 20:00. Ne pas les modifier ni lancer le cycle sans demande. IPTV reste intact.

## Outils privés et pièges

Traces **.local-logs/publication-editions-2026-10-13/** : release.json/manifest, authorization/review-source-proof, preflight/settings, backup-result, runtime/remote-source, health, e2e-remote +cookie adapté, captures, reception, états locaux et vérification documentaire. Helpers common/prepare/preflight/backup/deploy/verify-runtime/health/database-proof/receive sont relus et propres à cette livraison ; **ne pas les relancer aveuglément**. prepare refuse un paquet existant ; les futures opérations doivent figer un nouveau paquet et une nouvelle sauvegarde.

- Ne pas produire une livraison depuis HEAD : cela perdrait tout E0–E6/E9 non committé. La SHA de référence Git est une filiation ; **la SHA-256 du manifeste identifie le contenu publié**. Pas de CI GitHub du paquet non committé revendiquée.
- Migrations 0008/0017 : CRLF local contre LF canonique déjà appliqué. Normalisation **uniquement du paquet**, aucun changement SQL ; les hashes doivent correspondre au journal distant. Ne pas annoncer trois migrations en attente à partir des CRLF bruts.
- Cookie des tests : localhost ne s'applique pas à staging. Le seul scénario en défaut a été repris dans une copie privée avec son domaine adapté, assertions conservées. Les tests versionnés ne sont pas modifiés.
- Canonique racine : domaine nu et domaine/ sont la même URL. Le contrôle ajouté a été corrigé puis les trois cas FR relancés ; les rapports initiaux restent conservés.
- Pré-déploiement existant exécute db:migrate:deploy avant la mise en service. **Sauvegarde restaurable avant tout futur schéma**, jamais db:push. Une restauration de code n'annule pas 0021.
- PowerShell : citer 'fr,en,ar' ; les options npm peuvent être absorbées, préférer CLI directe ou cmd /d /c pour les bancs. Composants 3001 seuls ; ne pas arrêter un serveur du propriétaire.

## Suite, sans nouveau lot implicitement ouvert

Recevoir une session Clerk réelle AR (compte/profil/Radar/TV), puis préférence sur deux navigateurs, avec une session active : Edge a demandé la connexion, aucun identifiant manipulé. Lecture physique navigateur/VLC et paiement réel non effectués. R1–R5 demandent toujours les mesures/décisions de semaine ; sources FR conservées. Constats JUR et propositions restent disponibles pour une future demande de correction.

D1 à D8 conservées, D7 désormais validé par le propriétaire ; EDI-603 option A et cookie d'appareil prioritaire. Intermittences EN/AR, Try again à froid, pont uniquement caches valides, PWA/admin/image FR documentés en E9.

Aucun commit/push, promotion production, DNS, Clerk, OVHcloud, changement de tâche/cycle, plan/alerte ou coût supplémentaire autorisé pour la suite. Une nouvelle publication ou correction demande un nouveau périmètre ; ne pas rejouer EDI-901/902/903 déjà reçus. Retour préparé vers **9ac3d8de-0357-4e68-a13f-9aa4110ce40c**, migration additive conservée.
