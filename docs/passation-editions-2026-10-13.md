# Africa Live — passation des éditions FR · EN · AR, 13 octobre 2026

État arrêté le **13 octobre 2026 (Africa/Dakar)**, après la réception E5. Ce document est le point d'entrée d'une nouvelle conversation dans **le même dossier local** `C:/Users/GAMER PC/Africa_Live_TV`. Il remplace la [passation du 12/10](passation-editions-2026-10-12.md), qui décrit l'état d'avant E4.

> **Remplacée par la [passation fin E6](passation-editions-fin-e6-2026-10-13.md)**, point d'entrée actuel (EDI-604 branché, E9 avec feu vert à reprendre en nouvelle session).
>
> **Mise à jour du 13/10 au soir : E6 reçu** (« Feu vert pour E6, option A pour EDI-603 ») — [réception E6](reception-editions-e6-2026-10-13.md). **39/43 tickets faits ; restent EDI-404 (D7), EDI-901, EDI-902, EDI-903 (conditionnel).** Migration additive **0021** (`users.preferred_edition`) appliquée **seulement en local** après sauvegarde restaurable ; une publication exigera sauvegarde Railway puis `db:migrate:deploy` avant le code. Étape `feeds:verify` préparée, tâche Windows inchangée. Prochain lot : E9, après « vert pour E9 ». Le reste de ce document décrit l'état d'avant E6 ; outils du lot : `.local-logs/editions-e6/` (lanceur, empreintes excluant la nouvelle colonne, bancs visuel/compte/captures).

**E0 à E3 et E5 sont reçus ; E4 (arabe) est terminé techniquement, mais EDI-404 attend la relecture native (D7). 35 tickets sur 43 sont faits ; 8 restent. E6 est le prochain lot et n'a pas reçu son feu vert.**
Le chantier éditions n'est ni committé, ni poussé, ni déployé. Staging (Railway `just-compassion`) est inchangé.

## Ce qui est fait

| Lot | Tickets | Résultat | Preuve |
| --- | --- | --- | --- |
| E0 | EDI-000 à 002 | Référence, outil `npm run feeds:verify`, titres réels annotés, fixtures de dates et d'encodage | [Validation](validation-editions-2026-10-11.md) |
| E1 | EDI-101 à 107 | Routage `app/[edition]`, cookie `al_edition`, registre `EDITIONS`, dictionnaires typés, pluriels arabes, formats | [Réception E1](reception-editions-e1-2026-10-11.md) |
| E2 | EDI-201 à 209 | Six registres de flux, caches et collectes par édition, API `?edition=`, dates/encodage, lexiques, rubriques, recherche et régions FR/EN/AR | [Réception E2](reception-editions-e2-2026-10-11.md) |
| E3 | EDI-301 à 308 | Interface anglaise complète, sélecteur, tri TV SQL, devises et météo par édition, briefing, Clerk `enGB`, D5 | [Réception E3](reception-editions-e3-2026-10-12.md) |
| E4 | EDI-401 à 404 | Classes logiques, RTL, police Cairo (+31 Ko en arabe seulement), bidi, `ar.ts` complet, Clerk `arSA`. **EDI-404 : contrôles techniques faits, réception suspendue à D7** | [Réception E4](reception-editions-e4-2026-10-12.md) |
| E5 | EDI-501 à 505 | Landing, CGU, confidentialité, contact et tarifs par édition (statiques) ; métadonnées, aperçus et `hreflang` ; partage de l'édition ; suggestion de langue sans redirection ; juridique EN/AR « la version française fait foi » | [Réception E5](reception-editions-e5-2026-10-13.md) |

**Derniers contrôles (fin E5, 13/10) :**
- tests : 553 unités, dont 512 réussies, 41 ignorées et 0 échec ; 4/4 invariants ; 104/104 composants ; TypeScript et ESLint verts ;
- pixel : pages publiques FR 15/15 identiques au pixel ; Radar et TV FR identiques au pixel depuis E4 ;
- E2E Clerk `fr,en,ar` : 30 réussis, 11 ignorés ;
- E2E FR seul : 23 réussis, 18 ignorés ;
- E2E MVP : 93 réussis, 7 ignorés, 1 échec. Ce test `local-mvp` dépend des chaînes `OFFLINE` réelles de la base et échouait déjà avant E4 ;
- empreintes SQL (8 tables) et `.env*` identiques ;
- flux arabes réels : 41/41 en HTTP 200 le 12/10.

## Ce qui reste à faire

| Lot | Tickets | Travail | Condition |
| --- | --- | --- | --- |
| **E6, prochain** | EDI-601, 602, 604 | Pont entre éditions (seuls caches valides des autres éditions, seuils < 3 / ≥ 5), halo de la sphère sur la carte (rien en Éco ni en mouvement réduit), ajout préparé de `feeds:verify` au cycle de 15 jours | « Feu vert pour E6 » ; **aucune tâche Windows modifiée** sans accord explicite |
| E6 | EDI-603 | Choix d'édition mémorisé dans le compte | **Décision du propriétaire d'abord** : colonne additive `users.preferred_edition` (sauvegarde, migration isolée, `db:migrate:deploy`) ou métadonnées Clerk. Rien avant la décision |
| E4 | EDI-404 (réception) | Relecture native arabe | D7 : [notice et CSV de 1 165 textes](relecture-arabe-e4-2026-10-12.md), plus les 228 titres annotés de `src/lib/fixtures/editions/titles-ar.json` |
| E9 | EDI-901, 902 | Réception globale `EDITIONS=fr,en,ar` puis `fr` seul, dossier final et passation | Après E6 |
| E9 | EDI-903 | Publication staging | **Conditionnelle, non autorisée** ; activer `EDITIONS` sur Railway est une configuration distante qui exige un accord distinct |

**Relectures et décisions humaines en attente :**
1. **D7** : relecture arabe native (interface, Clerk, juridique, annotations).
2. **Relecture juridique** des CGU et de la confidentialité traduites. Le texte français ne mentionne pas encore le cookie fonctionnel `al_edition` ni la mémorisation locale de la suggestion de langue.
3. **EDI-603** : choix du stockage persistant de l'édition.
4. **R1–R5** : remplacement éventuel de sources FR, après mesures de semaine. Les sources FR sont conservées d'ici là.
5. **Contrôle Edge connecté** : compte, profil, Radar et TV en arabe dans la session Clerk réelle du propriétaire. Il n'a jamais pu être piloté : pas de contrôle de l'ordinateur ni de Claude in Chrome connecté. À faire par le propriétaire, ou dans une session disposant de ces outils, sans modifier le profil.

## Décisions à conserver (ne pas les redemander)

- **D1, D2, D3** :
  - éditions `fr`, `en` et `ar` uniquement ;
  - pays par défaut SN (FR), NG (EN), puis DZ et MA (AR) ;
  - arabe en chiffres occidentaux (`ar-u-nu-latn`).
- **D4** : éditions strictes, avec un pont entre éditions (E6).
- **D5** : 990 et 9 900 FCFA. XOF, NabooPay et l'éligibilité sont inchangés. La carte internationale est mise en avant ; Wave et Orange Money sont présentés comme valables au Sénégal et dans l'UEMOA.
- **D6** :
  - RT Arabic inclus, avec l'origine « Russie · média d'État » ;
  - « Sahara occidental », « Western Sahara » et « الصحراء الغربية » au nom neutre.
- **D7** : relecture arabe en attente ; elle bloque seulement la réception d'EDI-404.
- **D8** : ordre E0 → E6, puis E9.

## Limites connues

- **EN à froid** : au premier chargement Clerk, « Signal interrupted » puis reprise ; diagnostic non instrumenté. Le délai navigateur de 15 s est conservé.
- **Sources EN** : Nation et Eye Radio sont désactivés ; SABC est intermittent. En AR, Nawaat n'avait pas d'article récent le 12/10.
- **E2E non couverts par les sélections** :
  - `anchored-player`, volume : aléa de rythme préexistant, qui passe quand on le relance seul ;
  - `local-mvp`, chaînes indisponibles : dépend de l'état de la base.
- **Restés en français** : le manifeste PWA, l'administration et l'image d'accueil (capture de l'interface FR ; la légende EN/AR le précise).
- **Contact** : les erreurs renvoyées en français par l'API sont remplacées, en EN/AR, par un message générique traduit.

## État du poste et précautions

- **Checkout** : reprendre **ce checkout** avec son arbre volontairement sale (environ 217 entrées `git status`, dont des renommages déjà indexés). Ne jamais créer de clone ni de worktree depuis `HEAD`, ne jamais nettoyer l'arbre. Garder `.claude/`.
- **Build** : dernier `.next` = **build FR seul, mode Clerk**. Reconstruire avec les éditions et les drapeaux voulus avant tout `next start`.
- **Ports** : 3001/3002 libres à la clôture. Le banc des composants utilise 3001 en dur et doit tourner seul.
- **Base et compte** : PostgreSQL `africa_live_dev` ; `C:/Users/GAMER PC/IPTV` intact. Ne pas lancer `setup:local` ni les anciens scripts d'utilisateur local. Le compte local appartient au propriétaire.
- **Outils privés réutilisables**, dans `.local-logs/` (non publiés) :
  - lanceurs : `editions-e5/server.cjs mvp|clerk <EDITIONS>` et `editions-e5/restart.sh <EDITIONS> <mvp|clerk>` (arrêt de son seul serveur, build, démarrage) ;
  - bancs de comparaison au pixel : `editions-e4/visual/` (Radar, TV, compte en MVP) et `editions-e5/visual/` (pages publiques en Clerk) ;
  - empreintes de données : `editions-e5/fingerprint.cjs` ;
  - export de relecture arabe : `editions-e4/review-export.ts`.
- **Git Bash** : les heredocs altèrent les antislashs. Écrire les scripts dans un fichier, ou utiliser l'outil d'édition.

## Première action du prochain agent

Lire [AGENTS.md](../AGENTS.md), `contextellm.md`, cette passation, puis les réceptions E5 et E4, le [prompt complet](prompt-agent-editions-2026-10-11.md), le plan technique (§ E6) et le backlog. Vérifier `git status`, les ports et le build en place, puis résumer l'état en quelques lignes et **attendre « Feu vert pour E6 »** avant toute modification applicative. Pour EDI-603, présenter les deux options et attendre la décision.

## Vérification de cette passation

Mise à jour documentaire uniquement, le 13/10 : aucun code, test, commit, migration ni action distante. Les résultats ci-dessus sont ceux de la réception E5.
