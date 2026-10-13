> **État après EDI-903, 13/10/2026 : 43/43 tickets reçus.** D7/juridique validés par le propriétaire sur les textes actuels ; publication FR/EN/AR **f4d85931-e353-422e-bbe6-aa1476ab360a SUCCESS** sur Railway staging, 22 migrations, 646/646 fichiers, santé 200, 28 E2E +22 ignorés, 45 captures. Aucun commit/push ; index, sources FR, données, .env, tâche et cycle conservés. [Publication](publication-editions-edi903-2026-10-13.md), [passation actuelle](passation-editions-publication-2026-10-13.md). Les bilans « en attente/non autorisé » ci-dessous décrivent les états antérieurs.

# Dossier global final des éditions — E9, 13 octobre 2026

> **Suite après réception E9, 13/10 :** [relectures préparées](relectures-editions-2026-10-13/README.md), validation attendue du propriétaire. Accord conditionnel reçu pour **EDI-903 après validation, avec `EDITIONS=fr,en,ar` sur staging** ; aucune publication exécutée, 41/43 faits. Le tableau conserve les preuves et états de clôture E9 ; le [backlog](backlog-editions-2026-10-11.md) porte l'état courant de l'autorisation. Le CSV D7, les dictionnaires et les données restent intacts.

**41/43 tickets faits.** EDI-901 et EDI-902 terminés après le feu vert ; EDI-404 attend D7, EDI-903 conditionnel et non autorisé. [Réception E9](reception-editions-e9-2026-10-13.md) et [passation](passation-editions-fin-e9-2026-10-13.md).

Contrôles E9 : TypeScript/ESLint verts ; 519 unités +44 ignorées, 44 intégrations, 4 invariants, 104 composants, 21 bandeau/monde, 45/45 pixels contrôlés et 45 captures publiques sans débordement/erreur de page. 187 réussis, 18 ignorés, 4 échecs connus en MVP ; Clerk 30 + 16 ignorés, FR seul 23 + 23 ignorés ; API FR seule 5/5. Builds Clerk FR/EN/AR puis FR seul réussis. Les 4 échecs MVP sont analysés dans la réception : 3 cas Clerk inapplicables et 1 écart local-mvp préexistant. Aucune régression nouvelle constatée dans ces bancs.

FR avant E1 : public 12/18 textes et 17/18 pixels identiques ; données réelles MVP évolutives, écarts documentés sans prétendre une égalité globale. Voir l'[analyse détaillée](../.local-logs/editions-e9/identity-analysis.md). Huit empreintes SQL, `.env*`, index Git (27 entrées, contenu indexé inclus), 22 migrations, `run-cycle.cjs` et définition de la tâche Windows inchangés. Aucune valeur `preferred_edition` renseignée. Ports 3001/3002 libres ; dernier `.next` reconstruit en FR seul, mode Clerk.

## Tableau ticket → preuve (43 tickets)

Les preuves privées ci-dessous sont des fichiers locaux non publiés. Les résultats des lots reçus restent leurs preuves historiques ; ils ne sont pas présentés comme une nouvelle exécution en E9. EDI-903 a uniquement une check-list, aucune preuve de publication.

| Ticket | Objet | État | Réception | Trace / preuve |
| --- | --- | --- | --- | --- |
| EDI-000 | Relever la référence | Fait / vérifié localement | [E0](validation-editions-2026-10-11.md#lot-e0--préparation-11-octobre-2026) | [preuve](../.local-logs/editions-e1/baseline/build-before.txt) |
| EDI-001 | Vérification des flux versionnée | Fait / vérifié localement | [E0](validation-editions-2026-10-11.md#lot-e0--préparation-11-octobre-2026) | [preuve](../.local-logs/feeds-verify/2026-10-11/result-en.json) |
| EDI-002 | Échantillons de test | Fait / vérifié localement | [E0](validation-editions-2026-10-11.md#lot-e0--préparation-11-octobre-2026) | [preuve](../.local-logs/feeds-verify/2026-10-11/titles-ar.json) |
| EDI-101 | Registre des éditions | Fait / vérifié localement | [E1](reception-editions-e1-2026-10-11.md) | [preuve](../.local-logs/editions-e1/reception/unit-final.txt) |
| EDI-102 | Preuve technique `app/[edition]` | Fait / vérifié localement | [E1](reception-editions-e1-2026-10-11.md) | [preuve](../.local-logs/editions-e1/reception/build-fr.txt) |
| EDI-103 | Proxy et cookie | Fait / vérifié localement | [E1](reception-editions-e1-2026-10-11.md) | [preuve](../.local-logs/editions-e1/reception/routing-green.txt) |
| EDI-104 | Infrastructure i18n | Fait / vérifié localement | [E1](reception-editions-e1-2026-10-11.md) | [preuve](../.local-logs/editions-e1/reception/unit-final.txt) |
| EDI-105 | Extraction FR du shell et du Radar | Fait / vérifié localement | [E1](reception-editions-e1-2026-10-11.md) | [preuve](../.local-logs/editions-e1/reception/public-comparison.json) |
| EDI-106 | Locales en dur | Fait / vérifié localement | [E1](reception-editions-e1-2026-10-11.md) | [preuve](../.local-logs/editions-e1/reception/unit-final.txt) |
| EDI-107 | Réception E1 | Fait / vérifié localement | [E1](reception-editions-e1-2026-10-11.md) | [preuve](../.local-logs/editions-e1/reception/e2e-mvp-final.txt) |
| EDI-201 | Registres de flux | Fait / vérifié localement | [E2](reception-editions-e2-2026-10-11.md) | [preuve](../.local-logs/editions-e2/tests-final-registry.txt) |
| EDI-202 | Collecteurs par édition | Fait / vérifié localement | [E2](reception-editions-e2-2026-10-11.md) | [preuve](../.local-logs/editions-e2/unit-final.txt) |
| EDI-203 | Paramètre `edition` des API | Fait / vérifié localement | [E2](reception-editions-e2-2026-10-11.md) | [preuve](../.local-logs/editions-e2/e2e-mvp.txt) |
| EDI-204 | Adaptateurs de dates | Fait / vérifié localement | [E2](reception-editions-e2-2026-10-11.md) | [preuve](../.local-logs/editions-e2/tests-final-registry.txt) |
| EDI-205 | Encodage | Fait / vérifié localement | [E2](reception-editions-e2-2026-10-11.md) | [preuve](../.local-logs/editions-e2/unit-final.txt) |
| EDI-206 | Normalisation et lexiques des pays | Fait / vérifié localement | [E2](reception-editions-e2-2026-10-11.md) | [preuve](../.local-logs/editions-e2/lexicon-final.json) |
| EDI-207 | Rubriques et recherche par langue | Fait / vérifié localement | [E2](reception-editions-e2-2026-10-11.md) | [preuve](../.local-logs/editions-e2/tests-lexicon.txt) |
| EDI-208 | Régions du monde par langue | Fait / vérifié localement | [E2](reception-editions-e2-2026-10-11.md) | [preuve](../.local-logs/editions-e2/lexicon-final.json) |
| EDI-209 | Réception E2 | Fait / vérifié localement | [E2](reception-editions-e2-2026-10-11.md) | [preuve](../.local-logs/editions-e2/profile-feeds.json) |
| EDI-301 | Édition côté client | Fait / vérifié localement | [E3](reception-editions-e3-2026-10-12.md) | [preuve](../.local-logs/editions-e3/changed-fr-en.txt) |
| EDI-302 | Sélecteur d'édition | Fait / vérifié localement | [E3](reception-editions-e3-2026-10-12.md) | [preuve](../.local-logs/editions-e3/editions-first.txt) |
| EDI-303 | Traduction anglaise | Fait / vérifié localement | [E3](reception-editions-e3-2026-10-12.md) | [preuve](../.local-logs/editions-e3/unit-final.txt) |
| EDI-304 | Pays, langues et TV par édition | Fait / vérifié localement | [E3](reception-editions-e3-2026-10-12.md) | [preuve](../.local-logs/editions-e3/catalog-pagination.json) |
| EDI-305 | Marchés et météo | Fait / vérifié localement | [E3](reception-editions-e3-2026-10-12.md) | [preuve](../.local-logs/editions-e3/unit-final.txt) |
| EDI-306 | Briefing multilingue | Fait / vérifié localement | [E3](reception-editions-e3-2026-10-12.md) | [preuve](../.local-logs/editions-e3/unit-final.txt) |
| EDI-307 | Message de paiement (D5) | Fait / vérifié localement | [E3](reception-editions-e3-2026-10-12.md) | [preuve](../.local-logs/editions-e3/changed-fr-en.txt) |
| EDI-308 | Réception E3 | Fait / vérifié localement | [E3](reception-editions-e3-2026-10-12.md) | [preuve](../.local-logs/editions-e3/e2e-extra-final.txt) |
| EDI-401 | Classes logiques | Fait / vérifié localement | [E4](reception-editions-e4-2026-10-12.md) | [preuve](../.local-logs/editions-e4/visual-after-401.txt) |
| EDI-402 | Sens, police et bidi | Fait / vérifié localement | [E4](reception-editions-e4-2026-10-12.md) | [preuve](../.local-logs/editions-e4/fonts-weight.json) |
| EDI-403 | Traduction arabe | Fait techniquement ; textes à relire D7 | [E4](reception-editions-e4-2026-10-12.md) | [preuve](../.local-logs/editions-e4/captures-ar/report-public-ar.json) |
| EDI-404 | Réception E4 | Reçu, D7 validé par le propriétaire le 13/10 sur les textes actuels | [E4](reception-editions-e4-2026-10-12.md) et [validation](relectures-editions-2026-10-13/validation-proprietaire.md) | [preuve D7](relectures-editions-2026-10-13/manifest.json) et [technique](../.local-logs/editions-e4/captures-ar/report-ar.json) |
| EDI-501 | Pages publiques par édition | Fait / vérifié localement | [E5](reception-editions-e5-2026-10-13.md) | [preuve](../.local-logs/editions-e5/captures/report.json) |
| EDI-502 | Textes de partage | Fait / vérifié localement | [E5](reception-editions-e5-2026-10-13.md) | [preuve](../.local-logs/editions-e5/unit-final.txt) |
| EDI-503 | Suggestion de langue | Fait / vérifié localement | [E5](reception-editions-e5-2026-10-13.md) | [preuve](../.local-logs/editions-e5/e2e-clerk.txt) |
| EDI-504 | Textes juridiques | Fait ; relectures juridique/AR en attente | [E5](reception-editions-e5-2026-10-13.md) | [preuve](../.local-logs/editions-e5/captures/report.json) |
| EDI-505 | Réception E5 | Fait / vérifié localement | [E5](reception-editions-e5-2026-10-13.md) | [preuve](../.local-logs/editions-e5/visual-fr-final.txt) |
| EDI-601 | Pont entre éditions | Fait / vérifié localement | [E6](reception-editions-e6-2026-10-13.md) | [preuve](../.local-logs/editions-e6/e2e-e6-second.txt) |
| EDI-602 | Halo de la sphère sur la carte | Fait / vérifié localement | [E6](reception-editions-e6-2026-10-13.md) | [preuve](../.local-logs/editions-e6/captures/report.json) |
| EDI-603 | Choix mémorisé dans le compte | Fait / vérifié localement | [E6](reception-editions-e6-2026-10-13.md) | [preuve](../.local-logs/editions-e6/account-sync.txt) |
| EDI-604 | Flux dans le cycle de 15 jours | Fait / vérifié localement | [E6](reception-editions-e6-2026-10-13.md) | [preuve](../.local-logs/editions-e9/feeds-seed-3.txt) |
| EDI-901 | Réception globale locale | Fait / vérifié localement | [E9](reception-editions-e9-2026-10-13.md) | [preuve](../.local-logs/editions-e9/e2e-mvp-all.json) |
| EDI-902 | Dossier et passation | Fait / vérifié localement | [E9](reception-editions-e9-2026-10-13.md) | [preuve](../.local-logs/editions-e9/documentation-check.json) |
| EDI-903 | Publication staging | Publié/reçu, FR/EN/AR, 22 migrations, santé 200, 28 +22 ignorés, 45 captures | [Publication](publication-editions-edi903-2026-10-13.md) | [preuve](../.local-logs/publication-editions-2026-10-13/reception.json) |

## Limites et suite

- **D7 reste en attente** : EDI-404 n'est pas reçu. [Notice arabe](relecture-arabe-e4-2026-10-12.md), CSV de **1 175 textes**, plus les **228 titres annotés** de `src/lib/fixtures/editions/titles-ar.json`.
- **Relecture juridique à faire** : traductions EN/AR des CGU/confidentialité et décision sur les mentions FR de `al_edition`, de la mémorisation locale de la suggestion et de `users.preferred_edition`. Le texte FR n'est pas modifié dans E9.
- **Vraie session Clerk à recevoir** : compte/profil/Radar/TV arabes et préférence d'édition sur deux navigateurs. E9 reçoit des widgets réels anonymes et des parcours MVP/simulés, sans piloter le profil Edge du propriétaire. La preuve réelle EDI-603 au compte MVP reste celle d'E6 (valeur d'origine remise).
- **R1–R5** restent à décider après les mesures de semaine ; sources FR conservées. EN à froid peut demander « Try again » après 15 s. Nation et Eye Radio restent désactivés ; les autres intermittences restent signalées.
- Le pont lit uniquement les autres caches valides depuis moins de 5 minutes, sur la même instance ; aucune collecte supplémentaire. Manifeste PWA et administration FR, image d'accueil montrant l'interface FR : limites conservées.
- Aucun paiement réel ni lecture d'un média amont pendant les bancs synthétiques. Aucun commit, push, déploiement, migration supplémentaire, action Railway/Clerk/DNS/OVHcloud ou modification de la tâche Windows.

La [check-list de publication](checklist-publication-editions-e9-2026-10-13.md) est préparée seulement. **Arrêt avant EDI-903.**

---

## Archives des validations E0 à E6

Les états « prochain lot » ci-dessous sont historiques ; le point de reprise courant est celui d'E9 ci-dessus.

# État fin E6 — 13 octobre 2026 au soir

EDI-604 branché dans le cycle de 15 jours (tâche Windows inchangée). 39/43 tickets faits. Le dossier final avec le tableau ticket → preuve des 43 tickets reste à écrire en EDI-902 (E9, feu vert reçu), dans la prochaine session : [passation fin E6](passation-editions-fin-e6-2026-10-13.md).

# Réception E6 — 13 octobre 2026

EDI-601 à EDI-604 vérifiés localement après « Feu vert pour E6, option A pour EDI-603 ». [Dossier complet](reception-editions-e6-2026-10-13.md) : pont entre éditions (caches valides seulement), halo de la sphère, édition mémorisée au compte (migration additive 0021 locale après sauvegarde restaurable), étape `feeds:verify` préparée sans toucher la tâche Windows. 519 unités + 44 ignorées, 44 intégrations, 4 invariants, 104 composants, 45/45 captures identiques au pixel, E2E MVP 130 + 8 ignorés (1 écart préexistant), Clerk 30 + 16 ignorés, FR seul 23 + 23 ignorés ; empreintes et `.env*` identiques.

# Réception E5 — 13 octobre 2026

EDI-501 à EDI-505 vérifiés localement après « feu vert pour E5 ». [Dossier complet](reception-editions-e5-2026-10-13.md). Pages publiques statiques par édition, métadonnées/aperçus EN/AR, canonique et `hreflang` seulement avec plusieurs éditions, partage et suggestion de langue, juridique EN/AR « la version française fait foi ». tsc/lint verts ; 512/553 unités (41 ignorées), invariants 4/4, composants 104/104 ; FR 15/15 identiques au pixel ; E2E Clerk 30 + 11 ignorés, FR seul 23 + 18 ignorés, MVP 93 + 7 ignorés (écart `local-mvp` préexistant). Défaut corrigé : préchargement de `/en/sign-in` qui posait le cookie d'édition. Huit empreintes SQL et `.env*` identiques. Relectures : arabe (D7, 1 165 textes) et juridique. E6 attend son feu vert. Aucun commit/déploiement.

---

# Réception E4 — 12 octobre 2026 (technique ; D7 en attente)

EDI-401 à EDI-403 faits, EDI-404 contrôles techniques terminés après « Feu vert pour E4 uniquement ». [Dossier complet](reception-editions-e4-2026-10-12.md), [relecture native à faire](relecture-arabe-e4-2026-10-12.md). tsc/lint verts ; 507/548 unités (41 ignorées), invariants 4/4, composants 104/104 ; FR/EN 30/30 identiques au pixel après conversion ; E2E MVP des zones touchées 74 + 2 ignorés, Clerk `fr,en,ar` 25 + 11 ignorés, FR seul 23 + 13 ignorés ; builds `fr,en,ar` et `fr`. Arabe : `rtl`, Cairo +31 Ko, 30 captures sans débordement ni erreur, Clerk `arSA` réel sur connexion/inscription, flux AR 41/41. Huit empreintes SQL et `.env*` identiques. **E4 non reçu tant que D7 manque** ; E5 attend son feu vert. Aucun commit/déploiement.

---

# Réception E3 — 12 octobre 2026

**Reprise :** [passation fait/restant du 12/10](passation-editions-2026-10-12.md), [prompt codeur](prompt-agent-editions-2026-10-11.md). E0–E3 conservés, E4 non commencé ; mise à jour Markdown seulement, les résultats applicatifs ci-dessous sont ceux de la réception E3 et n'ont pas été relancés pour cette passation.

EDI-301 à EDI-308 vérifiés localement. [Dossier complet](reception-editions-e3-2026-10-12.md). EN activable, AR masquée. tsc/lint/builds FR/EN et FR seul verts ; 501/542 unités (41 ignorées), invariants4/4, composants104/104 (dont deux parcours EN de préférences). Parcours et captures FR/EN/Clerk reçus ; chiffres, cas ignorés, premières erreurs et corrections documentés. SQL en lecture : 50 chaînes NG identiques entre éditions, 46 eng en tête ; huit empreintes métier et `.env*` identiques. FR conservé hors D5 explicitement demandé. E4 attend son feu vert ; D7 attend sa relecture native. Aucun commit/déploiement.

---

# Réception E2 — 11 octobre 2026

EDI-201 à EDI-209 vérifiés localement. [Dossier complet](reception-editions-e2-2026-10-11.md). tsc/lint/builds FR et `fr,en` verts ; 496/537 unités (41 ignorées), invariants 4/4, composants 102/102, E2E MVP 59 + 1 ignoré, Clerk 23 + 1 ignoré. 162 flux réels remesurés, formats/encodage/304/caches/lexiques reçus ; comparaison exacte FR simulée et captures après changement. Huit empreintes métier SQL identiques. EN/AR non exposés avant leurs dictionnaires ; E3 attend son feu vert. Flux FR conservés conformément au choix du propriétaire ; mesures de semaine et R1–R5 ultérieurs. Aucun commit/déploiement.

---

# Africa Live — dossier de validation des éditions linguistiques (FR · EN · AR)

Journal des contrôles du chantier « éditions » ([plan technique](plan-technique-editions-2026-10-11.md), [backlog EDI](backlog-editions-2026-10-11.md)).
Chaque lot y consigne ses commandes, ses modes, ses résultats réels, les cas ignorés et ses limites. Fuseau : Africa/Dakar (= UTC).

## Lot E1 — terminé et vérifié localement (11 octobre 2026)

[Dossier de réception complet](reception-editions-e1-2026-10-11.md) : EDI-101 à EDI-107 vérifiés après le feu vert du propriétaire.
Pluriels arabes et fournisseur applicatif corrigés ; formats et configuration testés ; routage via `next.config.ts` reçu.
Contrôles finaux : **469/510 unités (41 ignorées)**, **4/4 invariants**, **102/102 composants**, **20/20 E2E Clerk**,
**107 E2E MVP + 1 ignoré**, **20 E2E anonyme sur `fr,en` + 10 ignorés** ; TypeScript/ESLint sans erreur, builds `fr` et `fr,en` réussis.
Clerk connecté réellement dans Edge ; captures 360/768/1366, avec comparaison et limites détaillées dans le dossier.
Empreintes SQL des chaînes/sources/utilisateurs/favoris/pays suivis identiques. Aucun compte local existant remplacé, aucune migration ou action distante.
Traces privées `.local-logs/editions-e1/reception/`. **E2 non commencé, en attente du feu vert explicite.**

## Audit de reprise — état historique avant les corrections E1 (11 octobre 2026)

[Évaluation détaillée, preuves et reste à faire](etat-implementation-editions-2026-10-11.md). Les sections E0 ci-dessous restent le journal historique.
Contrôles relancés sur le code laissé par la session interrompue : TypeScript et ESLint sans erreur ; **464/505 unités (41 ignorées)** ;
**4/4 invariants**, **102/102 composants**, build réussi (landing `/fr` ISR 600 s, espace connecté dynamique),
**16 E2E réussis et 10 ignorés** sur la sélection CI, en mode anonyme et avec paiement intercepté.
Preuves : `.local-logs/editions-audit-2026-10-11/` (`types.txt`, `lint.txt`, `unit.txt`, `invariants.txt`, `build-fr.txt`, `components.txt`, `e2e-anonymous.txt`).

EDI-104 incomplet : sonde TypeScript TS2353 sur les formes arabes supplémentaires du pluriel ; fournisseur racine limité à `shell`, fournisseur applicatif absent ;
tests de pluriels/formats du plan à ajouter. EDI-101 : documentation de `EDITIONS` et intégration au validateur partagé à compléter.
EDI-103 : réécritures via `next.config.ts`, écart au plan à documenter et réceptionner.

**Aucune réception connectée MVP/Clerk, nouvelle capture après E1 ou reconstruction avec `EDITIONS=fr,en` pendant cet audit.**
Les références avant E1 sont dans `.local-logs/editions-e1/baseline/`. Le français normalisé de la landing, confidentialité, contact et tarifs est identique au HTML de référence ;
CGU et 404 présentent des différences techniques de balises/enveloppes, à distinguer d'une comparaison visuelle.
Le widget Clerk réel et les parcours connectés sont ignorés dans le banc anonyme ; son succès ne clôt pas EDI-107.
Ports 3001/3002 libres après les essais ; aucun correctif applicatif ou action distante pendant l'audit.

---

## Lot E0 — préparation (11 octobre 2026)

### EDI-000 — Référence avant tout changement

| Élément | Relevé |
|---|---|
| Branche, commit | `main` à `ab9a6f7` |
| `git status --short` | ` M contextellm.md`, ` M docs/production-backlog.md`, `?? .claude/`, `?? docs/backlog-editions-2026-10-11.md`, `?? docs/plan-editions-linguistiques-2026-10-11.md`, `?? docs/plan-technique-editions-2026-10-11.md`, `?? docs/prompt-agent-editions-2026-10-11.md` — tout conservé |
| Écoute sur `localhost:3001` | **Aucune** (serveur du propriétaire arrêté au moment du relevé ; rien n'a été arrêté ni lancé sur ce port) |
| Outils | Node 22.16.0, npm 11.12.0, ICU 77.1, base de fuseaux 2025b |
| `npx tsc --noEmit --incremental false` | 0 erreur (32 s) |
| `npm run lint` | 0 problème (66 s) |
| `npm test` | 478 tests : **437 réussis, 0 échec, 41 ignorés** (intégrations PostgreSQL, ignorées par conception sans base de test) |
| `npm run test:invariants` | 4/4 |

### EDI-001 — Vérification des flux versionnée

Livrables :
- `src/lib/feed-verify.ts` : fonctions pures (listes, annexes de l'étude, encodage, langue réelle, dates brutes, fuseaux déclarés, verdict, écarts) ; réutilise `parseFeedXml` et `normalizeRadarDate` pour mesurer **ce que voit l'application**.
- `src/scripts/verify-feeds.ts` et `npm run feeds:verify -- --edition en|ar|fr|all [--list f] [--study md] [--compare json] [--out dossier] [--timeout ms] [--concurrency 1-8] [--dump-titles]`.
- `src/lib/rss-collector.ts` : seule modification applicative du lot, `RSS_FEED_HEADERS` et `RSS_FEED_TIMEOUT_MS` exportés (mêmes valeurs qu'avant) pour que le script envoie exactement le même User-Agent et le même délai (8 s) que l'application.
- `src/lib/feed-verify.test.ts` : 10 tests sans réseau.

Sources lues : registre français actuel (`RSS_FEEDS` + `WORLD_FEEDS`, 36 flux) ; anglais et arabe lus dans les annexes A et B de l'étude tant que `src/lib/feeds/*` n'existe pas (EDI-201 remplacera cette lecture). Le parseur d'annexes retrouve les 126 flux (85 EN, 41 AR dont les 2 récupérables). Au plus 8 flux en parallèle. Sortie dans `.local-logs/feeds-verify/2026-10-11/` (hors Git) : `result-*.json`, `summary-*.md`, `titles-*.json`, et `retry/` pour la relance à 20 s.

Garde-fous : jamais appelé par la CI ni par `npm test` (`npm test` ne lit que `src/lib/*.test.ts`, qui n'exercent que les fonctions pures sous `scripts/unit-network-guard.cjs`).

**Relance réelle, 11/10/2026 vers 18 h 30 UTC (dimanche)** — deux passages complets de 162 flux, puis une relance à 20 s, un flux à la fois, des échecs :

| Édition | Noyau | Complément | Ancien / dates illisibles | Échec | Avance d'horloge | `ETag`/`Last-Modified` |
|---|---|---|---|---|---|---|
| FR (registre actuel, 36) | 30 | 1 | 2 anciens | 3 | 1 (Actu Cameroun +0,7 h) | 12 |
| EN (annexe A, 85) | 57 | 27 | — | 1 | 2 | 62 |
| AR (annexe B, 41) | 34 | 5 | 2 dates illisibles (attendu) | 0 | 3 | 30 |

Écarts avec l'étude du 11/10 (signalés par le script) :
- **Nation (Kenya)** `https://nation.africa/kenya/rss.xml` : **404** aux trois passages. À retirer ou remplacer en EDI-201.
- **Nairametrics** : délai dépassé à 8 s puis à 20 s au premier passage, réponse correcte au second. **Leadership, Eye Radio, Anadolu (arabe)** : 8 s dépassées au premier passage, réponses en 3,7 s, 6,2 s et 19,3 s à la relance. Ces flux sont **lents ou intermittents** : à garder seulement avec le « dernier bon relevé » et les requêtes conditionnelles, ou en complément.
- Rangs revus à la baisse (rythme d'un dimanche soir) : Somali Guardian, Guardian Africa, DW Africa, Guardian Asie-Pacifique, Asharq Al-Awsat Afrique passent de noyau à complément. Masrawy et Cairo24 remontent en noyau une fois l'avance corrigée.
- Langue : aucun flux EN/AR dans une autre langue. Deux titres en français dans le flux arabe de **Nawaat**, un titre en oshiwambo dans **New Era** (anglais).
- Aucun flux au-delà de la limite d'1 Mo du collecteur (le plus gros : The Citizen ZA, 679 Ko ; MyJoyOnline 455 Ko ; Asharq Al-Awsat 294 Ko).

**Formats de date remesurés** (avant de coder EDI-204, comme demandé) :

| Flux | Date brute observée | Fuseau déclaré | Mesure | Correction prévue |
|---|---|---|---|---|
| Punch (NG) | `Sun, 11 Oct 2026 19:16:09 +0000` | `+0000` | avance 0,6–0,7 h | `wallClockTimeZone: 'Africa/Lagos'` |
| Daily Maverick (ZA) | `Sun, 11 Oct 2026 20:32:06 GMT` | `GMT` | avance 1,9–2 h | `Africa/Johannesburg` |
| Cairo24 (EG) | `Sun, 11 Oct 2026 21:30:22 GMT` | `GMT` | toutes les dates +2,9 h | `Africa/Cairo` |
| Arabi21 | `Sun, 11 Oct 2026 19:25:28 GMT` | `GMT` | avance 0,7–0,8 h | `Europe/London` (heure d'été jusqu'au 25/10) |
| Masrawy (EG) | `10/11/2026 9:18:17 PM` | aucun | +2,6–2,7 h (lu aujourd'hui dans le fuseau du poste) | `us-12h` + `Africa/Cairo` |
| Youm7 (EG) | `الأحد، 11 أكتوبر 2026 09:33 م` | aucun | illisible par l'application | `arabic-long` + `Africa/Cairo` |
| El Bilad (DZ) | `17:24 \| 11-10-2026` | aucun | illisible par l'application | `hm-pipe-dmy` + `Africa/Algiers` |
| Actu Cameroun (**FR**) | `Sun, 11 Oct 2026 19:25:17 +0000` | `+0000` | une dépêche +0,7 h | garde générique de 3 h (EDI-204) |

Constat annexe pour Masrawy : `normalizeRadarDate` passe une date sans fuseau à `Date.parse`, qui l'interprète dans le fuseau du processus. Le résultat est juste par hasard quand ce fuseau est UTC (poste à Dakar, Railway). L'adaptateur d'EDI-204 doit traiter ce cas explicitement.

Fuseaux vérifiés dans l'ICU de Node : Le Caire UTC+3 jusqu'au jeudi 29/10/2026, puis UTC+2 ; Londres UTC+1 jusqu'au 25/10, puis UTC ; Alger et Lagos UTC+1 ; Johannesburg UTC+2.

**Registre français actuel (information, hors périmètre E0, rien de modifié)** : Agence Ecofin ne publie plus de dates récentes (plus récent article à ~13 700 h, environ 19 mois) ; Radio Okapi à ~297 h ; Jeune Afrique 403 ; AIP (8 s dépassées aux deux passages, 14,3 s à la relance) et Financial Afrik (8 s dépassées au second passage) sont lents. Candidat Défi Media (Maurice) : sain, 132 articles dont 40 en 24 h (non activé, à proposer au propriétaire en EDI-201).

### EDI-002 — Échantillons de test

Livrables, dans `src/lib/fixtures/editions/` (hors `e2e/fixtures`, donc couverts par TypeScript et ESLint) :
- `titles-en.json` : **229 titres réels** d'environ 80 flux (125 nationaux, 67 panafricains, 37 « monde »), plus **20 pièges synthétiques**.
- `titles-ar.json` : **228 titres réels** des 41 flux (136 nationaux, 22 panafricains, 70 « monde »), plus **28 pièges synthétiques**.
- `xml/` : 7 flux synthétiques de formats de date (arabe long égyptien, US 12 h, `HH:mm | JJ-MM-AAAA`, heure locale étiquetée UTC sur 4 rédactions, mois levantins, mois maghrébins, avance de +2 h / +5 h), 2 flux `windows-1256` (déclaré dans le prologue / seulement dans l'en-tête HTTP), et `expected.json` (UTC attendus, calculés avec l'ICU, heure d'été comprise ; relevé de référence `2026-10-11T18:00:00Z`).
- `src/lib/edition-fixtures.test.ts` : 6 tests d'intégrité (codes ISO valides, cohérence `basis`/`country`, rôles et flux représentés, pièges du § 1.5 présents, langue des titres, XML conformes à `expected.json`).

Méthode : titres pris dans `titles-*.json` du relevé du jour (`--dump-titles`), échantillon déterministe par flux (EN : 2 par flux national, 4 par flux panafricain, 2 par flux « monde » ; AR : 4, 6 et 5), puis titres réels contenant un piège. **Chaque titre a été relu et annoté à la main** : pays attendu (repli sur le pays du média compris), base (`title`/`media`/`none`), pays acceptables pour un titre multi-pays, région et pays africains pour les flux « monde ». Titres seulement : ni lien, ni texte d'article, ni image.

Pièges réels trouvés dans les flux du jour (en plus de ceux du plan) : « Gulf of Guinea », « Niger State », « Congo Basin », « Pretorius » (≠ Pretoria), « Central Africa » (≠ Centrafrique), « Somaliland » ; « مصرع » (décès) qui contient « مصر », « المصارف المصرية », « مالية »/« مالياً » (financier) et « الصومالية » qui contiennent « مالي », « المالكي » (nom propre), « الرباط الصليبي » (ligament croisé ≠ Rabat), « الصحراء » au sens de désert, le club « المغرب الفاسي », « جنوب كردفان » (≠ Soudan du Sud), « 6 أكتوبر » (ville). Pièges absents des flux du jour, ajoutés en phrases construites : Equatorial Guinea, Papua New Guinea, Niger Delta, Chad (prénom), Congo seul, مصرف, صلاة المغرب, المغرب العربي, الصحراء الغربية, النيجر, غينيا الاستوائية, الماليزي, proclitiques (وبالـ, للـ), voyelles, hamza, chiffres orientaux.

**Mesure de départ (information pour E2, détecteur français actuel, aucun code modifié)** :

| | Pays exacts (avec repli) | Pays nommés par le titre | Régions « monde » | Pièges en erreur |
|---|---|---|---|---|
| EN | 217/229 (94,8 %) | 94/105 | 17/37 | 12/60 |
| AR | 195/228 (85,5 %) | 66/85 | 19/70 | 33/64 |

Le critère de 90 % « avec repli » est flatteur : le repli sur le pays du média donne la bonne réponse pour la plupart des titres de presse nationale. Pour E2, suivre aussi le score « nommés par le titre », les régions et les pièges (objectif : zéro erreur sur les pièges).

### Contrôles de fin de lot E0

| Commande | Résultat |
|---|---|
| `npx tsc --noEmit --incremental false` | 0 erreur (une erreur de type dans le script, corrigée avant ce relevé) |
| `npm run lint` | 0 problème |
| `npm test` | 494 tests : **453 réussis, 0 échec, 41 ignorés** (+16 : 10 `feed-verify`, 6 `edition-fixtures`) |
| `npm run test:invariants` | 4/4 |
| `npm run build` | réussi ; table des routes inchangée, `/` statique avec régénération 10 min |
| E2E, captures 360/768/1366 | **Non lancés, volontairement** : aucune page, aucun composant, aucune route ni l'authentification ne changent en E0 ; la seule ligne applicative touchée exporte deux constantes inchangées. Ils reprennent en E1. |

Limites E0 :
- Les relevés de flux datent d'un dimanche soir : rythmes et rangs à revérifier un jour de semaine avant d'activer un flux (EDI-201/209).
- Les annotations arabes sont de l'agent ; elles doivent être relues par le relecteur natif (D7) avant de servir de vérité définitive au critère de 90 %.
- Le fichier `windows-1256.xml` est un texte non UTF-8 : avec `core.autocrlf=true`, Git peut convertir ses fins de ligne au checkout, sans effet sur le décodage ni sur les tests.
