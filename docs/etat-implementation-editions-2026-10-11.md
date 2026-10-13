> **État après EDI-903, 13/10/2026 : 43/43 tickets reçus.** D7/juridique validés par le propriétaire sur les textes actuels ; publication FR/EN/AR **f4d85931-e353-422e-bbe6-aa1476ab360a SUCCESS** sur Railway staging, 22 migrations, 646/646 fichiers, santé 200, 28 E2E +22 ignorés, 45 captures. Aucun commit/push ; index, sources FR, données, .env, tâche et cycle conservés. [Publication](publication-editions-edi903-2026-10-13.md), [passation actuelle](passation-editions-publication-2026-10-13.md). Les bilans « en attente/non autorisé » ci-dessous décrivent les états antérieurs.

# Africa Live — état réel de l'implémentation des éditions

**État courant au 12 octobre 2026 : E0 à E3 terminés et vérifiés localement, 27/43 tickets.** Les lacunes E1 de l'audit initial ont toutes été corrigées et réceptionnées ; E2 et l'interface EN d'E3 sont reçus. Aucun commit ni déploiement du chantier éditions.

| Lot | État courant | Suite |
| --- | --- | --- |
| E0 | Vérifié localement | Conserver outil et fixtures ; annotations AR à relire avec D7 |
| E1 | Vérifié localement | Conserver pluriels, fournisseurs, formats et routage reçus |
| E2 | Vérifié localement | Moteur FR/EN/AR disponible ; flux FR conservés, R1–R5 reportés |
| E3 | Vérifié localement | EN prête, 891 textes uniques ; AR masquée |
| E4 | **Non commencé** | RTL/classes logiques/police/bidi/AR/Clerk `arSA` au feu vert ; réception conditionnée par D7 |
| E5 | À faire | Pages publiques, SEO/OG, partage, suggestion et juridique |
| E6 | À faire, avec décisions | Pont/halo ; choix persistant après décision EDI-603, tâche Windows après accord distinct |
| E9 | À faire | Réception globale/passation ; publication staging conditionnelle, non autorisée |

Contrôles finaux E3 : **501 unités réussies +41 ignorées, 104/104 composants, 4/4 invariants**, TypeScript/ESLint et builds FR/EN et FR seul réussis. Parcours FR/EN/MVP/Clerk et dernier banc FR complémentaire **34/34** reçus ; limites et simulations détaillées dans la [réception E3](reception-editions-e3-2026-10-12.md). Données métier et `.env*` préservées, serveurs de réception arrêtés.

Points ouverts : **D7 relecture arabe native**, décision R1–R5 après mesures de semaine, décision EDI-603. EN à froid a nécessité une reprise explicite avant de charger 300 dépêches/60 rédactions ; le grand corps public `/en` reste FR jusqu'à E5. Pas de dictionnaire AR, de conversion RTL, de pont, de préférence d'édition dans le compte ni de publication déjà réalisée.

**Pour la nouvelle session :** [passation complète du 12/10](passation-editions-2026-10-12.md), [prompt adressé à l'agent codeur](prompt-agent-editions-2026-10-11.md), [backlog actuel](backlog-editions-2026-10-11.md). Reprendre le même checkout avec l'arbre sale ; ne refaire aucun lot E0 à E3. E4 attend toujours son feu vert ; la demande de mise à jour documentaire ne démarre pas ce lot.

---

## Archive — audit initial du 11 octobre, avant correction d'E1

**Les conclusions et consignes de reprise ci-dessous décrivent uniquement l'état historique après l'interruption par quota. Elles ne sont plus les instructions de la prochaine session.** Les conserver comme preuves, sans rouvrir leurs lacunes déjà corrigées.

Audit demandé après interruption de la session précédente par le quota, le 11 octobre 2026 (Africa/Dakar).
Référence : prompt joint du propriétaire, plan technique, backlog, sources présentes et contrôles relancés sur l'arbre existant.
**Cette session évalue et documente : aucun correctif applicatif, commit, push ou déploiement effectué.**

## Conclusion

**E0 est terminé ; E1 est largement codé, mais incomplet et non réceptionné. E2 à E6 et E9 restent à faire.**
Le dernier feedback (« composants 102/102, passage à EDI-107 ») correspond aux sources présentes. Les documents étaient restés à l'état de fin E0 :
ils ne permettaient pas de connaître l'avancement réel. Il faut reprendre les lacunes d'E1 puis sa réception, sans recommencer E0.

Il n'existe encore ni `src/i18n/en.ts`, ni `ar.ts`, ni sélecteur d'édition, ni registres `src/lib/feeds/`, ni lexiques multilingues.
`READY_EDITIONS = ['fr']` masque volontairement l'anglais et l'arabe même si `EDITIONS` les demande. C'est une décision permise par EDI-107,
pas une édition anglaise ou arabe fonctionnelle.

## État ticket par ticket du travail commencé

| Ticket | Présent et vérifié | Reste avant réception |
|---|---|---|
| EDI-000 à 002 | Référence, outil `feeds:verify`, fixtures : 229 titres réels EN et 228 AR, pièges et XML. Preuves E0 dans le dossier de validation. Tests actuels verts. | Relecture des annotations AR par D7 ; remesurer les flux avant activation. Aucun nouveau relevé réseau pendant cet audit. |
| EDI-101 | Registre FR/EN/AR, D2/D3, cookie, analyse des éditions actives, masquage des dictionnaires absents ; 3 tests unitaires passent. CLI `check-environment` adaptée. | `EDITIONS` manque dans `docs/environment-matrix.md` et dans l'intégration au validateur partagé `server-environment.ts` demandée par le plan. |
| EDI-102 | Pages déplacées sous `[edition]`, accès par `next/root-params`, `dynamicParams=false`, génération statique, document commun, 404 global. Build réussi ; landing `/fr` en ISR 600 s ; `/app/*` dynamiques. | Comparaison visuelle FR après le lot ; preuves finales en MVP et en session Clerk authentifiée. La preuve de build est positive ; rien ne justifie de refaire le déplacement. |
| EDI-103 | Résolveur pur, cookie, redirections dans le proxy et réécritures dans `next.config.ts` ; 8 tests unitaires passent ; refus anonymes dans les E2E relancés. | Documenter et réceptionner l'écart de réécriture ; compléter les parcours MVP/Clerk et les assertions HTTP spécifiques aux éditions et aux fichiers statiques. |
| EDI-104 | `fr.ts`, type `Dictionary`, messages sérialisables, formats Intl, fournisseur client et repli FR ; les composants sans fournisseur passent. | Corriger le type des pluriels ; poser le fournisseur des espaces applicatifs ; ajouter les tests de pluriels et de formats prévus. |
| EDI-105 | Extraction des textes du shell, du Radar et de nombreux helpers vers `fr.ts`. Analyse de l'AST des dossiers shell/Radar : aucune chaîne littérale ou texte JSX accentué restant. 102 composants passent. | Régressions E2E connectées et comparaison visuelle FR. Les noms de pays et textes reçus du serveur seront traités dans leurs lots respectifs. |
| EDI-106 | Locales des formats remplacées par les helpers d'édition. Administration et validation des fuseaux encore en FR ; manifeste et erreurs globales également FR. | Consigner les exceptions explicitement et vérifier les sorties FR au caractère près et les futurs appels par édition. Le manifeste FR est une limite prévue par E5. |
| EDI-107 | Contrôles globaux et sélection E2E anonyme relancés ci-dessous ; captures de référence présentes dans `.local-logs/editions-e1/baseline/`. | Lacunes ci-dessus, E2E MVP/Clerk, captures après lot à 360/768/1366 et comparaison ; build/réception avec `EDITIONS=fr,en` ; bilan final et feu vert pour E2. |

## Lacunes concrètes à traiter dans E1

1. **Le type du dictionnaire ne permet pas les six pluriels arabes.** `Dictionary = Widen<typeof fr>` ; `Widen` conserve uniquement les clés françaises
   `one` et `other`. Une sonde TypeScript en mémoire, avec `zero/one/two/few/many/other` sur `shell.legacy.favorites` et `satisfies Dictionary`,
   produit **TS2353 : `'zero' does not exist in type '{ readonly one: string; readonly other: string; }'`**.
   `PluralMessage` permet ces clés, mais ce type n'est pas utilisé pour élargir les objets de pluriel dans `Dictionary`.
   Prévoir un type adapté et un test qui impose à la fois les clés du dictionnaire et les formes arabes.

2. **Le fournisseur applicatif prévu n'est pas posé.** `[edition]/layout.tsx` transmet seulement `clientMessages(edition, ['shell'])`.
   `(clerk)/app/layout.tsx` est déplacé sans changement et ne fournit pas les espaces `radar`, `time`, `weather`, `markets`, etc.
   Ajouter un dictionnaire anglais seul laisserait ces espaces en français par repli. Compléter la frontière serveur/client dans EDI-104.

3. **Les tests i18n du plan sont incomplets.** Les 11 nouveaux tests E1 concernent le registre (3) et le routage (8), avec notamment un contrôle
   de chiffres occidentaux. Il manque les six cas de pluriel arabe 0/1/2/3/11/100, le format EN jour/mois et les comparaisons exactes des formats FR.

4. **L'écart de routage doit rester explicite.** Le plan prescrivait `NextResponse.rewrite()` depuis les trois branches du proxy.
   L'implémentation utilise `rewrites()` dans `next.config.ts` et réserve le proxy aux redirections et à l'authentification.
   Le commentaire de `edition-routing.ts` invoque une normalisation 127.0.0.1/localhost mesurée lors de la session précédente.
   Cet audit confirme le build et le fonctionnement anonyme, mais ne reproduit pas ce diagnostic ni une session Clerk connectée.
   Ne pas déclarer l'écart reçu sans ces preuves. Les liens connectés d'une édition inactive redirigent aussi vers l'adresse courte en FR.

## Contrôles relancés pendant l'audit

Preuves privées : `.local-logs/editions-audit-2026-10-11/`.

| Commande / contrôle | Résultat réel |
|---|---|
| `npx tsc --noEmit --incremental false` | Succès, 0 erreur (`types.txt`). |
| `npm run lint` | Succès, 0 problème (`lint.txt`). |
| `npm test` | 505 tests : **464 réussis, 41 ignorés, 0 échec** (`unit.txt`). Les intégrations PostgreSQL conditionnelles restent ignorées. |
| `npm run test:invariants` | **4/4**, 0 échec (`invariants.txt`). |
| `npm run build` | Succès Next 16.3.8 (`build-fr.txt`) ; manifeste de pré-rendu : `/fr` régénéré toutes les 600 s. |
| `npx playwright test -c playwright.components.config.ts` | **102/102**, 0 ignoré, 0 échec (`components.txt`). Port 3001 libre avant démarrage du banc. |
| Sélection CI : `auth-entry`, `catalogue`, `payment`, `radar-reliability`, `account-controls-hydration` | **16 réussis, 10 ignorés, 0 échec** (`e2e-anonymous.txt`), build servi, `CI=true`, `E2E_ANONYMOUS_MODE=true`, `RADAR_BUILD_TEST=true`, une seule tentative. |
| Comparaison du HTML pré-rendu avec le script existant `html-compare.cjs` | Landing, confidentialité, contact, tarifs identiques après la normalisation du script. CGU : balise technique `next-size-adjust` supplémentaire ; 404 : enveloppe Suspense différente. Ce n'est pas une comparaison de pixels. |
| Sonde de typage des pluriels | TS2353 reproduit en mémoire sur les sources actuelles ; aucun fichier applicatif modifié. |

**Limites des E2E relancés :** Clerk est simulé pour les contrôles d'hydratation ; le widget réel et les 3 parcours catalogue sont ignorés.
Six scénarios Radar réservés au MVP sont également ignorés. Le paiement est intercepté : aucune transaction réelle.
Le build servi a été produit avec la configuration locale existante, pas reconstruit avec des clés Clerk factices comme en CI.
Ces 16 succès ne prouvent donc ni une connexion Clerk réelle ni l'ensemble du parcours connecté.

Les captures présentes avant audit sont des **références avant E1** (public et MVP), pas une réception après E1.
Certaines références contiennent déjà des erreurs console, notamment autour de Clerk ; les comparer en tenant compte du mode et du contenu réellement affiché.
Aucune nouvelle capture ou session connectée créée pendant l'audit. Les ports 3001 et 3002 sont libres après les bancs.

## Suite du chantier

1. Terminer EDI-101/104/106 et la réception EDI-102/103/105/107. **Rester dans E1** ; la demande actuelle d'évaluation n'autorise pas à commencer E2.
2. Après réception et feu vert E2 : registres FR/EN/AR, caches isolés, API `?edition=`, dates, charset, lexiques, recherche et régions ; remesures des flux.
   Les décisions R1–R5 sur les sources françaises restent à obtenir avant leur remplacement.
3. E3 : édition anglaise complète, sélecteur, appels et stockage par édition, ordre des pays/TV, météo, marchés, briefing, message de paiement.
4. E4 : édition arabe, classes logiques, police, bidi et réception RTL ; D7 bloque sa réception tant que la relecture native manque.
5. E5 : pages publiques, référencement, partage, suggestion et textes juridiques.
6. E6 : pont entre éditions, halo, choix mémorisé après décision EDI-603, préparation du cycle des flux.
7. E9 : réception globale, passation, puis publication staging uniquement sur demande explicite.

Pas de nouvelle dépendance, de migration, de modification `.env`, de paiement réel ou d'action distante pendant l'audit.
Les modifications antérieures et `.claude/` sont conservées. Les tests n'ont pas été affaiblis.
