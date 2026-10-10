**Africa Live — backlog des correctifs du 9 octobre 2026**

Ce backlog contient **39 tickets**, couvrant les **20 bugs B01–B20** et **A1**, soit 21 défauts à corriger. A1 est décidé : conserver les jours d'essai encore disponibles après remboursement intégral, à l'échéance d'origine. Le [plan technique détaillé](<C:/Users/GAMER PC/Africa_Live_TV/docs/plan-correctifs-bugs-2026-10-09.md>) explique pour chaque défaut la reproduction, la cause, l'implémentation attendue et les tests. Le [rapport d'audit](<C:/Users/GAMER PC/Africa_Live_TV/docs/audit-bugs-2026-10-09.md>) reste le relevé historique des preuves avant correction.

Implémentation locale L0→L7 reçue le 10 octobre, puis **publication GitHub/Railway staging explicitement demandée et reçue** : 37 tickets locaux + BUG-904 livré, **38 tickets initiaux reçus sur 39** ; BUG-903 garde ses réserves. Les 21 défauts sont couverts individuellement. [Fiches locales](validation-correctifs-bugs-2026-10-09.md), [publication et CI réussie](publication-bugs-2026-10-10.md) : 404 unités, 40 intégrations, composants/E2E, 21 migrations et 467 fichiers déployés reçus. BUG-905 est un complément distinct, également corrigé/publié. Ce suivi reste distinct des anciens COR et des preuves d'audit avant correction.

Utilise les états `À faire`, `En cours`, `À vérifier`, `Vérifié localement`, `À recevoir sur appareil/profil`, `Conditionnel — non autorisé`. Une dépendance technique interdit de fermer un ticket avant sa réception, mais n'empêche pas une préparation indépendante. Taille S = modification localisée ; M = plusieurs consommateurs/tests ; L = contrat, concurrence ou schéma. Ce sont des indications de complexité, pas des engagements de durée.

| Ticket | Lot | Priorité / taille | Défaut ou objectif | Dépendances | Livrable et critère d'acceptation | État |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-000 | L0 | P1 / S | Préserver et relever la référence | — | État Git/serveur/env sans secrets, journal de validation initial, données et changements existants identifiés ; aucune remise à zéro | Vérifié localement |
| BUG-010 | L0 | P1 / M | Rendre les preuves exécutables hors du poste d'audit | BUG-000 | Bancs/fixtures/emplacements portables préparés ; aucun import de `.local-logs` ni banc public ; scénarios identifiés, tests rouges ajoutés au début de chaque ticket | Vérifié localement |
| BUG-101 | L1 | P1 / S | B01 — politique des états de commande | BUG-010 | Politique pure et matrice des sept statuts ; terminal traité avant URL ; incertitude conservée ; idempotence serveur intacte | Vérifié localement |
| BUG-102 | L1 | P1 / M | B01 — cycle de clé, formulaire et confirmation | BUG-101 | Ancienne caisse terminale non suivie ; prochain clic crée une nouvelle clé ; nettoyage ciblé ; reload incertain et double clic reçus | Vérifié localement |
| BUG-103 | L1 | P2 / M | A1 — essai après remboursement intégral | BUG-010 | Repli uniquement après remboursement vérifié sans achat restant ; `trialEndsAt` inchangé ; comptes bloqués/supprimés et droits prioritaires conservés | Vérifié localement |
| BUG-104 | L1 | P1 / M | Réception paiement et accès | BUG-102, BUG-103 | Unités, intégrations isolées et E2E ; statuts terminaux avec/sans URL, renouvellement, remboursement à J1/J5, replay et refus reçus ; zéro paiement réel | Vérifié localement |
| BUG-201 | L2 | P1 / M | B02 — manifeste fatal et budgets de préparation | BUG-010 | Un 404 fatal termine la tentative ; délais en mode public ; callbacks tardifs neutralisés ; secours bornés et télémétrie dédupliquée | Vérifié localement |
| BUG-202 | L2 | P2 / M | B06 — chargement natif différé en Éco | BUG-201 | Aucun fetch média natif avant clic ; affectation source/lecture sous geste ; timeout commence au chargement ; hls.js sans segments conservé | Vérifié localement |
| BUG-203 | L2 | P2 / M | B12 — transfert vers fenêtre séparée | BUG-010 | Résultat de lancement propagé par les callbacks ; refus/exception gardent la même vidéo en lecture ; succès transfère sans double lecture | Vérifié localement |
| BUG-204 | L2 | P1 / M | Réception lecteurs/dock/mobile | BUG-201, BUG-202, BUG-203 | Production sans drapeaux locaux, zapping, Éco, pause/reprise, iOS/iPadOS et Android simulés reçus ; limites physiques consignées | Vérifié localement |
| BUG-301 | L3 | P2 / L | B03–B05 — modèle des ressources et sonde bornée | BUG-010 | URI relative/finale, variante/segment/clé/init représentés ; attributs HLS corrects ; tailles/deadlines/corps/SSRF protégés | Vérifié localement |
| BUG-302 | L3 | P2 / M | B03 — HTTPS/CORS effectifs | BUG-301 | Toute ressource ou redirection HTTP interdit la qualification web ; VLC reste possible seulement si preuve valide ; chaîne HTTPS positive reçue | Vérifié localement |
| BUG-303 | L3 | P2 / M | B04 — échantillon média positif | BUG-301 | JSON/HTML/XML/texte/vide rejetés même avec MIME trompeur ; TS/fMP4 valides reçus ; octet-stream/chiffrement traités explicitement ; lecture plafonnée | Vérifié localement |
| BUG-304 | L3 | P2 / M | B05 — clé et initialisation indispensables | BUG-301 | Clé AES-128 valide, accès/CORS/protocole/taille/init contrôlés ; refus/non-support ne deviennent pas succès ; aucune clé persistée/exposée | Vérifié localement |
| BUG-305 | L3 | P2 / M | B03–B05 — propagation vers worker et résolveur | BUG-302, BUG-303, BUG-304 | Aucun faux succès neuf ni `lastSuccessAt` rajeuni ; invalidité web retire qualification appropriée ; historique/local et pannes transitoires conservés | Vérifié localement |
| BUG-306 | L3 | P2 / M | Réception flux et reprise des classifications existantes | BUG-305 | Positifs/négatifs et persistance isolée reçus ; limites réseau documentées ; procédure de recontrôle ciblé rédigée, aucun scan réel global lancé | Vérifié localement |
| BUG-401 | L4 | P2 / M | B15 — révision fournisseur cohérente | BUG-403 | SDK/webhook/profil de session comparés dans la même horloge ; historique ambigu géré conservativement ; dates d'essai non modifiées | Vérifié localement |
| BUG-402 | L4 | P2 / L | B16 — suppression terminale et concurrence | BUG-403, BUG-401 | Suppression sans ligne locale enregistrée ; create/update/session anciennes ignorées ; création/delete sérialisés sur l'identifiant absent | Vérifié localement |
| BUG-403 | L4 | P2 / M | Schéma additif et stratégie historique | BUG-010 | Migration(s) générée(s), journal intact, colonne de révision fiable et trace terminale ou équivalent justifié ; installation/compatibilité/rollback reçus en schéma isolé | Vérifié localement |
| BUG-404 | L4 | P2 / S | B17 — transitions de retrait côté serveur | BUG-010 | `sources_disabled → in_review` refusée atomiquement ; erreur 409 ; levée explicite reste distincte ; rôle admin vérifié comme avant | Vérifié localement |
| BUG-405 | L4 | P2 / M | B17 — sérialisation import/retrait | BUG-404 | Invariant « retrait actif ⇒ aucune réactivation par import » reçu dans les deux ordres de concurrence ; verrouillage commun sans réseau sous verrou | Vérifié localement |
| BUG-406 | L4 | P2 / L | Réception identité/migrations/retraits | BUG-401, BUG-402, BUG-403, BUG-404, BUG-405 | Intégrations isolées, événements authentifiés simulés, ordre/replay/concurrence/admin refusés reçus ; aucun profil ou retrait réel réparé | Vérifié localement |
| BUG-501 | L5 | P2 / M | B08/B10 — stockage sûr et contexte propriétaire | BUG-010 | Lectures/écritures/getter Storage peuvent échouer ; repli mémoire réel ; propriétaire connu avant écriture ; autorisation API exclusivement serveur | Vérifié localement |
| BUG-502 | L5 | P2 / M | B09/B10 — migration des anciennes clés | BUG-501 | Stores pays/favoris par compte ; inconnus conservés sans attribution automatique ; import explicite récupérable ; aucun transfert A→B | Vérifié localement |
| BUG-503 | L5 | P2 / L | B09 — intentions pays et précondition de version | BUG-502 | GET versionné, PUT comparé sous verrou, conflit contrôlé/rebase limité ; cache seul n'écrit pas ; suppression/principal/limite de cinq reçus | Vérifié localement |
| BUG-504 | L5 | P2 / M | B11 — Retry-After et reprise | BUG-503 | Zéro appel avant échéance 429, reprise après ; identité/quota séparés ; échéance et intentions survivent au remontage sans fuite entre comptes | Vérifié localement |
| BUG-505 | L5 | P2 / M | B07 — lots de favoris et révisions | BUG-501, BUG-502 | Lots ≤100 ajouts/retraits ; toutes les intentions conservées ; seuls succès acquittés ; inversion concurrente/échec partiel/quota reçus | Vérifié localement |
| BUG-506 | L5 | P2 / M | B08–B10 — raccordement des consommateurs | BUG-502, BUG-503, BUG-504, BUG-505 | Shell/TV/pays/favoris/notice lisent le store courant ; ancien fetch ignoré ; interface et ordre/principal cohérents ; messages de persistance exacts | Vérifié localement |
| BUG-507 | L5 | P2 / L | Réception synchronisation et appareils multiples | BUG-506 | 101/250 intentions, A→B→A, deux onglets, suppression distante, CAS/conflits, quota, offline, Storage refusé et identité inconnue reçus | Vérifié localement |
| BUG-601 | L6 | P2 / M | B13 — dernier résultat RSS et timeout | BUG-010 | Une réponse/erreur/finally dépassé(e) ne remplace pas la demande courante ; pas d'accumulation ; délai couvre le corps ; rafraîchissement doux conservé | Vérifié localement |
| BUG-602 | L6 | P2 / M | B14 — erreurs de chaînes par pays | BUG-601 | Erreur de SN ignorée pour CI ; lecture CI démarre sur sa réponse ; abandon/erreur/liste vide du vrai pays gérés sans lecture tardive | Vérifié localement |
| BUG-603 | L6 | P2 / S | B18 — pays spécifiques et ponctuation | BUG-010 | GW/GQ/SS/CI correctement détectés ; Nigeria≠Niger ; apostrophes/tirets normalisés ; politique multi-pays et repli rédaction documentés | Vérifié localement |
| BUG-604 | L6 | P3 / M | B19 — lien humain Atom | BUG-010 | Alternate HTML choisi indépendamment de l'ordre ; self/enclosure ignorés ; relatif/base et schémas non sûrs contrôlés ; RSS inchangé | Vérifié localement |
| BUG-605 | L6 | P3 / S | B20 — entités Unicode | BUG-010 | `fromCodePoint` validé, décimal/hexadécimal cohérents ; surrogates/invalides maîtrisés ; nettoyage/rendu échappé conservés | Vérifié localement |
| BUG-606 | L6 | P2 / M | Réception Radar/parsing | BUG-601, BUG-602, BUG-603, BUG-604, BUG-605 | Les cinq reproductions reçues, hooks/composants réels, fixtures et E2E utiles intégrés ; fraîcheur/URL/source/fil/dock sans régression | Vérifié localement |
| BUG-901 | L7 | P1 / L | Réception globale locale | BUG-104, BUG-204, BUG-306, BUG-406, BUG-507, BUG-606 | Unités/intégrations/invariants/types/lint/migrations/build/audit/E2E pertinents verts ; nouvelles preuves pour 21 défauts ; données existantes préservées | Vérifié localement |
| BUG-902 | L7 | P1 / M | Dossier, diff et handoff final | BUG-901 | Journal complet, tableau bug→correctif→preuve, changements de contrat/schéma/risques et limites explicites ; backlog/handoff à jour | Vérifié localement |
| BUG-903 | L7 | P2 / M | Réception réelle sur profils et appareils | BUG-901, BUG-902 | iOS/Android/Safari/compte changé/essai vus selon accès autorisé ; distinguer mocks et appareils ; réserves éventuelles identifiées | À recevoir sur appareil/profil |
| BUG-904 | L7 | P1 / M | Publication autorisée et reçue le 10 octobre | BUG-902 ; réserves BUG-903 prises en compte | Sauvegarde/restauration, GitHub, Railway SUCCESS, 21 migrations, 467 fichiers, santé/E2E/CI reçus ; dossier de publication à jour | Vérifié localement |

**Complément signalé pendant l'essai local du 10 octobre**

| Ticket | Défaut / cause | État / preuve |
|---|---|---|
| BUG-905 | HTML initial différent pour UserButton Clerk dans une session navigateur déjà prête ; montage différé après hydratation | Vérifié localement : 3 E2E SSR/hydratation, lint/types, vraie session locale et rechargement sans erreur. [Dossier](hydratation-clerk-2026-10-10.md). Hors des 21 défauts et 39 tickets initiaux. |

**Ordre exécuté pour la réception locale**

1. BUG-000 → BUG-010.
2. BUG-101 → BUG-102, puis BUG-103 → BUG-104.
3. BUG-201 → BUG-202 ; BUG-203 → BUG-204.
4. BUG-301 → BUG-302 → BUG-303 → BUG-304 → BUG-305 → BUG-306.
5. **BUG-403 avant BUG-401/BUG-402**, puis BUG-404 → BUG-405 → BUG-406. Le schéma cible décrit au plan sert de base ; vérifier le journal avant de générer la migration.
6. BUG-501 → BUG-502 → BUG-503 → BUG-504 → BUG-505 → BUG-506 → BUG-507.
7. BUG-601 → BUG-602 → BUG-603 → BUG-604 → BUG-605 → BUG-606.
8. BUG-901 → BUG-902. BUG-903 garde ses preuves humaines séparées ; BUG-904 ne déclenche aucune action distante.

Le travail local comporte 37 tickets de préparation/code/réception automatisée/documentation ; deux tickets identifient explicitement la réception humaine et la publication conditionnelle. Ce découpage n'affirme pas que les 21 symptômes sont indépendants : plusieurs sont corrigés par un même contrat ou une même couche, mais chacun conserve son test d'acceptation.

**Exigences transversales que l'agent ne doit pas perdre**

- B01 : conserver une tentative incertaine ; ne créer une nouvelle commande terminée que sur un nouveau geste. L'ancienne clé doit rester idempotente côté serveur.
- A1 : conserver l'essai original, sans nouveau départ à cinq jours, ni droits payants attribués par un échec/pending. Aucun déblocage de compte supprimé/bloqué.
- B02/B06 : terminer les vraies attentes de réseau, mais pas l'attente volontaire du clic Éco ; conserver les protections d'autoplay et le lien iOS préparé.
- B03–B05 : une réponse HTTP seule n'est pas une preuve média ; ne corriger ni contourner les fournisseurs réels, ajouter un relais, ni exécuter une requalification globale.
- B15/B16 : ne confondre ni dates fournisseur/traitement, ni absence d'utilisateur/absence de suppression. Aucun backfill historique approximatif.
- B17 : API et import doivent préserver le retrait même sous concurrence ; masquer un bouton ne suffit pas.
- B07–B11 : ne perdre aucune intention valide, ne copier aucune intention entre comptes, ne ressusciter aucune suppression depuis un cache et ne marteler aucun quota.
- B13/B14 : génération de requête et pays doivent gouverner succès, erreurs et fin de chargement, pas seulement le début du fetch.
- B18–B20 : conserver une URL sûre, des dates/source/countryBasis cohérentes et un titre échappé après parsing.

**Fiche de suivi à remplir pour chaque ticket**

```text
Ticket : BUG-...
Défaut(s) : B... / A1
État : ...
Dépendances reçues : ...
Cause constatée / reproduction avant : ...
Fichiers modifiés : ...
Décision technique et compatibilité : ...
Test(s) de non-régression ajouté(s) : ...
Commandes exécutées / mode / résultat / cas ignorés : ...
Preuve du scénario corrigé et du contrôle positif : ...
Données/fixtures créées puis nettoyées : ...
Risques ou réception réelle non obtenue : ...
Date de validation (Africa/Dakar) : ...
```

Écrire ces fiches dans le dossier de validation créé au début de l'implémentation. Les commandes ne doivent jamais contenir un secret ; les identifiants de fixtures doivent permettre de nettoyer uniquement les données détenues par le passage. Un test ignoré reste une limite. Si une nouvelle cause apparaît, ouvre un nouveau ticket identifié sans réécrire arbitrairement la liste de 21 défauts.

**Risques à traiter pendant l'implémentation**

| Risque | Ticket qui le reçoit | Mesure attendue |
| --- | --- | --- |
| Achat en double après renouvellement de clé | BUG-104 | Idempotence serveur, tentatives incertaines et clic concurrent testés |
| Essai ou grâce élargis involontairement | BUG-104 | Repli de remboursement prouvé, refus/expiration/fournisseurs conservés |
| Timer de préparation invalide le mode Éco | BUG-204 | Deadline liée au chargement effectif, génération de tentative vérifiée |
| Fixtures HLS anciennes techniquement fausses | BUG-306 | Remplacer les faux corps par structures synthétiques positives, sans affaiblir la validation |
| Nouvelle sonde déqualifie les formats chiffrés par une mauvaise signature | BUG-306 | Chemin de preuve spécifique au chiffrement ; revue si preuve incomplète, pas OFFLINE arbitraire |
| Retrait d'authentification causé par une réparation historique hasardeuse | BUG-406 | Champs fiables séparés, traces terminales, historique ambigu conservateur, aucune réparation réelle automatique |
| Appel réseau Clerk sous verrou ou deadlock import/retrait | BUG-406 | Réseau avant transaction, ordre de verrous commun, concurrence déterministe reçue |
| Anciennes clés partagées importées sous le mauvais compte | BUG-507 | Mise à l'écart récupérable, import explicite, propriétaire de file stable |
| Ancien onglet contourne le nouveau contrat versionné | BUG-507, BUG-904 | Écriture sans version refusée de façon contrôlée, reload conservant les intentions |
| Boucle de conflit, quota ou file trop grande | BUG-507 | Budget de retry, révisions acquittées par lot, erreur et reprise explicites |
| Témoignage appareil simulé présenté comme réel | BUG-902, BUG-903 | Type de preuve et limites séparés dans le bilan |
| Données amont déjà mal qualifiées restent en base | BUG-306, BUG-904 | Procédure de recontrôle ciblé préparée ; aucune affirmation de réparation historique par le seul code |
| Rollback applicatif laissant une migration active | BUG-403, BUG-904 | Compatibilité additive et sauvegarde restaurable ; procédure de reprise documentée |

**Clôture locale attendue**

Les 21 défauts doivent disposer de tests de non-régression et de preuves de résultat. BUG-901 et BUG-902 sont obligatoires pour déclarer la remédiation locale reçue. BUG-903 peut conserver des réserves réelles clairement nommées ; BUG-904 reste conditionnel tant que le propriétaire ne demande pas de publier. Aucun nombre de tests ou statut CI ne remplace la réception individuelle de B01–B20/A1.
