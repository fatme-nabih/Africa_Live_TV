# Africa Live — passation des éditions FR · EN · AR, fin E6 (13 octobre 2026 au soir)

État arrêté le **13 octobre 2026 au soir (Africa/Dakar)**, après la réception E6 et le branchement d'EDI-604. C'est le **point d'entrée** d'une nouvelle conversation dans **le même dossier local** `C:/Users/GAMER PC/Africa_Live_TV`. Il remplace la [passation du 13/10](passation-editions-2026-10-13.md), qui décrit l'état d'avant E6.

**Bilan des tickets**
- **39 tickets sur 43 sont faits.** E0 à E3, E5 et E6 sont reçus. E4 (arabe) est terminé techniquement, mais la réception d'EDI-404 attend la relecture native (D7).
- **Il en reste 4** : la réception EDI-404 (D7), **EDI-901 et EDI-902 (E9), avec feu vert reçu du propriétaire (« Vert pour E9 », 13/10) mais pas commencés**, et EDI-903 (publication, conditionnelle et non autorisée).

**État Git et distant**
- Le chantier n'est ni committé, ni poussé, ni déployé.
- Staging (Railway `just-compassion`) n'a pas changé.
- La migration **0021** existe seulement dans la base locale.

## Ce qui est fait

| Lot | Tickets | Résultat | Preuve |
| --- | --- | --- | --- |
| E0 | EDI-000 à 002 | Référence, outil `npm run feeds:verify`, titres réels annotés, fixtures de dates et d'encodage | [Validation](validation-editions-2026-10-11.md) |
| E1 | EDI-101 à 107 | Routage `app/[edition]`, cookie `al_edition`, registre `EDITIONS`, dictionnaires typés, pluriels arabes, formats | [Réception E1](reception-editions-e1-2026-10-11.md) |
| E2 | EDI-201 à 209 | Six registres de flux, caches et collectes par édition, API `?edition=`, dates/encodage, lexiques, rubriques, recherche, régions | [Réception E2](reception-editions-e2-2026-10-11.md) |
| E3 | EDI-301 à 308 | Interface anglaise complète, sélecteur, tri TV SQL, devises et météo par édition, briefing, Clerk `enGB`, D5 | [Réception E3](reception-editions-e3-2026-10-12.md) |
| E4 | EDI-401 à 404 | Classes logiques, RTL, police Cairo (+31 Ko en arabe seulement), bidi, `ar.ts` complet, Clerk `arSA`. **EDI-404 : technique fait, réception suspendue à D7** | [Réception E4](reception-editions-e4-2026-10-12.md) |
| E5 | EDI-501 à 505 | Pages publiques par édition (statiques), métadonnées/aperçus/`hreflang`, partage, suggestion de langue, juridique EN/AR « la version française fait foi » | [Réception E5](reception-editions-e5-2026-10-13.md) |
| E6 | EDI-601 à 604 | Pont entre éditions (seuls caches valides, < 3 / ≥ 5), halo de la sphère (rien en Éco/mouvement réduit), **édition mémorisée au compte (option A : colonne `users.preferred_edition`, migration 0021 locale)**, étape `feeds:verify` du cycle de 15 jours **branchée** | [Réception E6](reception-editions-e6-2026-10-13.md) |

**Derniers contrôles (fin E6, 13/10)**

| Contrôle | Résultat |
| --- | --- |
| Tests unitaires | 563 : 519 réussis, 44 ignorés, 0 échec |
| Intégrations PostgreSQL | 44/44 |
| Invariants | 4/4 |
| Composants | 104/104 |
| TypeScript, ESLint | Verts |
| Pixel MVP (FR, EN, AR × Radar, TV, landing, tarifs, compte × 360/768/1366), contre des références prises avant E6 | 45/45 identiques |
| E2E MVP `fr,en,ar` | 130 réussis, 8 ignorés, 1 échec (`local-mvp`, préexistant) |
| E2E Clerk `fr,en,ar` | 30 réussis, 16 ignorés |
| E2E Clerk FR seul | 23 réussis, 23 ignorés |
| Empreintes SQL (8 tables), `.env*`, index Git | Identiques |

### EDI-604, branché le 13/10 au soir avec l'accord du propriétaire

- **Ce qui a été branché.** `.local-logs/stream-cycle/run-cycle.cjs` appelle `feeds-verify-step.cjs` après le bilan des flux TV et avant la sauvegarde Railway, dans un `try/catch` : l'étape est non bloquante et en lecture seule. Le relevé va dans `stream-cycle/feeds/<horodatage>` et il est comparé au cycle précédent.
- **Copies et contrôles.** Copie d'avant modification : `.local-logs/editions-e9/run-cycle.before-edi604.cjs`. `node --check` réussi.
- **Tâche Windows « Africa Live - verification des flux » inchangée.** Prochaine exécution le **19/10/2026 à 20:00**, statut Prêt.
- **Relevés de départ.** Deux passages le 13/10 dans `stream-cycle/feeds/` : la référence du cycle du 19/10, puis un contrôle de la comparaison. Résultats dans `.local-logs/editions-e9/feeds-seed-*.txt`.
- **Correctif de l'étape privée.** `verify-feeds --compare` relisait mal ses propres relevés (faux « ko → core » sur presque tous les flux). L'étape calcule désormais elle-même les changements depuis le cycle précédent ; code de l'application non modifié. Détails dans `.local-logs/stream-cycle/feeds-verify-step.md`. Point à corriger plus tard, avec accord : `compareMeasures` dans `src/lib/feed-verify.ts`.
- **Après le cycle du 19/10.** Lire `runs/<horodatage>/cycle.log` (ligne `feeds-verify: … Résultats flux RSS …`) et `feeds/<horodatage>/step-summary.json`.

## Ce qui reste à faire

| Lot | Tickets | Travail | Condition |
| --- | --- | --- | --- |
| **E9, prochain** | **EDI-901** | Réception globale locale : tous les contrôles du § 0.3 du plan technique avec `EDITIONS=fr,en,ar`, puis `EDITIONS=fr` (identité avec l'existant) | **Feu vert reçu le 13/10** (« Vert pour E9 ») ; non commencé |
| E9 | **EDI-902** | Dossier de validation final, tableau ticket → preuve, limites, `contextellm.md`, backlog, prompt et passation | Après EDI-901 |
| E9 | EDI-903 | Publication staging | **Conditionnelle, non autorisée** sans demande explicite. Activer `EDITIONS` sur Railway est une configuration distante qui exige un accord distinct. **Migration 0021 : sauvegarde Railway restaurable puis `npm run db:migrate:deploy` avant de servir le code** (les pages connectées lisent la colonne) |
| E4 | EDI-404 (réception) | Relecture native arabe | D7 : [notice et CSV de 1 175 textes](relecture-arabe-e4-2026-10-12.md), plus les 228 titres annotés de `src/lib/fixtures/editions/titles-ar.json` |

**Relectures et décisions humaines en attente**
1. **D7** : relecture arabe native (interface, Clerk, juridique, annotations, 10 textes E6).
2. **Relecture juridique** des CGU et de la confidentialité traduites. Le texte français ne mentionne encore ni le cookie fonctionnel `al_edition`, ni la mémorisation locale de la suggestion, ni l'édition mémorisée au compte (`preferred_edition`).
3. **R1–R5** : remplacement éventuel de sources FR, après mesures de semaine. Les sources FR sont conservées d'ici là ; les relevés automatiques du cycle de 15 jours alimenteront cette décision.
4. **Contrôles avec une vraie session Clerk** (Edge du propriétaire, sans modifier le profil), jamais pilotés faute d'outils :
   - compte, profil, Radar et TV en arabe ;
   - édition mémorisée au compte sur deux navigateurs.

## Décisions à conserver (ne pas les redemander)

- **D1, D2, D3** : éditions `fr`, `en` et `ar` uniquement ; pays par défaut SN (FR), NG (EN), puis DZ et MA (AR) ; arabe en chiffres occidentaux (`ar-u-nu-latn`).
- **D4** : éditions strictes, avec pont entre éditions (fait en E6).
- **D5** : 990 et 9 900 FCFA. XOF, NabooPay et l'éligibilité sont inchangés. La carte internationale est mise en avant.
- **D6** : RT Arabic inclus (« Russie · média d'État ») ; « Sahara occidental » au nom neutre.
- **D7** : relecture arabe en attente ; elle bloque seulement la réception d'EDI-404.
- **D8** : ordre E0 → E6, puis E9.
- **EDI-603, option A (13/10)** : colonne additive `users.preferred_edition`, et non les métadonnées Clerk. Le cookie de l'appareil (ou un lien partagé) prime ; le compte sert de défaut aux appareils sans cookie.
- **EDI-604 (13/10)** : étape des flux RSS branchée dans `run-cycle.cjs` ; la tâche Windows elle-même reste inchangée.

## Limites connues

- **EN à froid** : au premier chargement Clerk, « Signal interrupted » puis reprise. Délai navigateur de 15 s conservé.
- **Sources** :
  - EN : Nation et Eye Radio désactivés, SABC et Daily News intermittents ;
  - FR (relevé du 13/10) : Jeune Afrique 403, AIP et Gabon Review hors délai, Radio Okapi et Ecofin anciens.
- **Pont entre éditions** : la ligne n'apparaît que si l'autre édition a été chargée dans les 5 dernières minutes sur la même instance. C'est voulu : aucune collecte n'est déclenchée.
- **E2E connus** :
  - `anchored-player`, volume : aléa de rythme préexistant ;
  - `local-mvp`, chaînes indisponibles : dépend des statuts `OFFLINE` de la base réelle.
- **Restés en français** : le manifeste PWA, l'administration et l'image d'accueil (capture FR, légende EN/AR).

## État du poste et précautions

- **Checkout et Git**
  - Reprendre **ce checkout** avec son arbre volontairement sale : **232 entrées** `git status`, dont 27 renommages/ajouts déjà indexés.
  - Index Git inchangé depuis E5 (référence : `.local-logs/editions-e6/index-before.txt`).
  - Ne jamais créer de clone ni de worktree depuis `HEAD`, ne jamais nettoyer l'arbre. Garder `.claude/`.
- **Build et ports** : dernier `.next` = **build FR seul, mode Clerk**. Ports 3001 et 3002 libres. Le banc des composants utilise 3001 en dur et doit tourner seul.
- **Base `africa_live_dev`**
  - **22 migrations**, dont **0021** (`users.preferred_edition`) appliquée par `npm run db:migrate` après sauvegarde vérifiée (`.local-logs/editions-e6/pre-0021.dump`).
  - Aucune ligne n'a `preferred_edition` renseigné.
  - `db:migrate:deploy` refuse la base locale, c'est normal : il est réservé au déploiement.
  - `C:/Users/GAMER PC/IPTV` est intact. Ne pas lancer `setup:local` ni les anciens scripts d'utilisateur local. Le compte local MVP appartient au propriétaire.
- **Outils privés réutilisables** (`.local-logs/`, non publiés)
  - Lanceurs : `editions-e6/server.cjs mvp|clerk <EDITIONS>` et `editions-e6/restart.sh <EDITIONS> <mvp|clerk>`. Ils n'arrêtent que leur propre serveur ; la ligne de commande et le parent sont vérifiés.
  - Empreintes : `editions-e6/fingerprint.cjs before|after`. Il exclut `preferred_edition` pour comparer l'existant ; vérifier à part qu'aucune ligne n'a cette colonne renseignée.
  - Bancs au pixel :
    - `editions-e6/visual/` (MVP, 45 références FR/EN/AR prises avant E6) ;
    - `editions-e5/visual/` (pages publiques en Clerk) ;
    - **référence d'avant E1** : `editions-e1/baseline/{public,mvp,html}`, avec la méthode de comparaison au seuil 12/255 de `editions-e2/shots.cjs` et `editions-e3/compare-fr-only.cjs`. Écart FR volontaire connu : tarifs, D5.
  - Banc réel EDI-603 : `editions-e6/account/` (remet la valeur d'origine). Captures du pont et du halo : `editions-e6/captures/`.
  - Export de relecture arabe : `editions-e4/review-export.ts`.
- **Pièges**
  - **Git Bash** : les heredocs altèrent les antislashs et cassent sur certaines citations. Écrire les scripts dans un fichier (outil d'écriture), puis les exécuter.
  - **E2E** : beaucoup interceptent l'adresse exacte `**/api/live/rss`, donc ne pas y ajouter de paramètre. `fixtureRadar` intercepte `PUT /api/edition-preference` : aucun E2E n'écrit dans le compte local.
  - **Tests `radar-access`** : ils chargent les vraies routes et layouts avec des simulations. Un nouvel import serveur (base de données) dans un layout les casse.

## Première action du prochain agent

1. Lire [AGENTS.md](../AGENTS.md), `contextellm.md`, cette passation, la [réception E6](reception-editions-e6-2026-10-13.md), le [prompt](prompt-agent-editions-2026-10-11.md), le plan technique (§ 0.3, § 4, § 5, § E9) et le backlog.
2. Vérifier `git status`, l'index, les ports, le build en place et les 22 migrations locales.
3. Résumer l'état en quelques lignes, annoncer le plan d'E9 en 5 lignes, puis exécuter **EDI-901 puis EDI-902**. Le feu vert E9 a été donné le 13/10.
4. S'arrêter avant EDI-903.

## Vérification de cette passation

Mise à jour documentaire du 13/10 au soir. Seule action hors documents : le branchement EDI-604 dans `run-cycle.cjs` (fichier privé, non suivi par Git), avec son contrôle de syntaxe et deux passages réels de l'étape. Aucun code applicatif, commit, migration supplémentaire ni action distante.
