# Africa Live — passation des éditions FR · EN · AR

> **Remplacée par la [passation du 13/10](passation-editions-2026-10-13.md)** pour toute reprise ; ce document reste l'état historique d'avant E4.
>
> **Mise à jour du 13/10, après « feu vert pour E5 » :** E5 est reçu ([réception E5](reception-editions-e5-2026-10-13.md)) ; 35/43 tickets faits, EDI-404 attend D7, E6 attend son feu vert ([prompt E6](prompt-agent-editions-2026-10-11.md)).
>
> **Mise à jour du 12/10 au soir, après « Feu vert pour E4 uniquement » :** E4 est fait techniquement. EDI-401 à 403 sont faits ; EDI-404 a ses contrôles terminés et sa réception attend la relecture native D7. Voir la [réception E4](reception-editions-e4-2026-10-12.md), la [relecture à faire](relecture-arabe-e4-2026-10-12.md) et le [prompt actualisé pour E5](prompt-agent-editions-2026-10-11.md). `READY_EDITIONS` contient maintenant `ar`. Le dernier `.next` est un build FR seul (mode Clerk). La suite de ce document décrit l'état d'avant E4.

État arrêté le **12 octobre 2026, Africa/Dakar**, après réception E3. Ce document prépare une nouvelle conversation dans **le même dossier local** `C:/Users/GAMER PC/Africa_Live_TV`.

**E0 à E3 sont terminés et vérifiés localement : 27 tickets sur 43. E4 n'a pas commencé et son feu vert n'a pas encore été donné.** La demande de passation autorise la documentation, sans démarrer E4. Le chantier éditions n'est ni committé, ni poussé, ni déployé.

## Ce qui est fait

| Lot | Tickets | Résultat reçu | Preuve |
| --- | --- | --- | --- |
| E0 | EDI-000 à EDI-002, 3 tickets | Référence, outil de vérification des flux, titres réels annotés et fixtures de dates/encodage | [Validation et historique](validation-editions-2026-10-11.md) |
| E1 | EDI-101 à EDI-107, 7 tickets | Routage `app/[edition]`, cookie, registre, fournisseurs i18n, pluriels arabes typés, formats, extraction FR et réception MVP/Clerk | [Réception E1](reception-editions-e1-2026-10-11.md) |
| E2 | EDI-201 à EDI-209, 9 tickets | Six registres de flux, caches et collectes par édition, 8 lectures maximum, ETag/304, API, dates/ICU, charset/1 Mo, lexiques/rubriques/recherche/régions FR/EN/AR | [Réception E2](reception-editions-e2-2026-10-11.md) |
| E3 | EDI-301 à EDI-308, 8 tickets | Interface EN, 891 textes uniques, sélecteur, consommateurs et repères par édition, pays/TV, tri linguistique SQL sans filtre, devises, météo par code, briefing, Clerk `enGB`, précisions de paiement D5 et erreurs de préférences | [Réception E3](reception-editions-e3-2026-10-12.md) |

Les contrôles finaux E3 sont **501 unités réussies + 41 ignorées, 104/104 composants, 4/4 invariants**, TypeScript/ESLint et builds `fr,en` et `fr` réussis. Les sélections E2E FR/EN, MVP et Clerk sont détaillées au dossier ; le dernier banc complémentaire FR fait **34/34**. Ce bilan ne signifie pas qu'une exécution unique de tous les E2E du dépôt a eu lieu.

Pagination SQL réelle : Nigeria, **50 chaînes FR = 50 chaînes EN**, mêmes identifiants, aucun doublon, 46 anglophones en tête. Session Edge déjà connectée à Clerk : EN → compte/TV/Radar, pays principal suivi conservé, retour FR. Huit empreintes de données métier et celles des `.env*` sont identiques après réception. Les paiements et incidents des tests restent simulés ; aucun paiement réel ni changement de profil utilisateur.

## Ce qui reste à faire

| Lot | Tickets restants | Travail attendu | Condition |
| --- | --- | --- | --- |
| **E4, prochain** | EDI-401 à EDI-404, 4 tickets | Classes CSS logiques, RTL, police arabe, bidi, chiffres occidentaux, dictionnaire AR complet, Clerk `arSA`, tests et captures FR/EN/AR | Feu vert E4 avant code ; **D7 avant réception finale** |
| E5 | EDI-501 à EDI-505, 5 tickets | Grandes pages publiques EN/AR, métadonnées/canoniques/hreflang, images OG, textes et liens de partage, suggestion de langue sans redirection, textes juridiques | Lot suivant au feu vert, après E4 |
| E6 | EDI-601 à EDI-604, 4 tickets | Pont utilisant les seuls caches valides, halo accessible, choix d'édition dans le compte, préparation du cycle de vérification des flux | Décision EDI-603 avant stockage persistant ; aucun changement de tâche Windows sans demande explicite |
| E9 | EDI-901 à EDI-903, 3 tickets | Réception globale FR/EN/AR et FR seul, dossier/passation, éventuelle publication staging | Publication **conditionnelle et non autorisée** ; accord distinct pour variables distantes |

Les 16 tickets restants comprennent les décisions et la publication conditionnelle ; ils ne sont pas tous immédiatement exécutables. Les états précis sont dans le [backlog](backlog-editions-2026-10-11.md).

## Décisions à conserver

- D1 : FR/EN/AR seulement. D2 : défaut FR = Sénégal, EN = Nigeria, AR = **Algérie puis Maroc**.
- D3 : arabe avec chiffres occidentaux, `ar-u-nu-latn`. D4 : éditions strictes, pont en E6.
- D5 : **990 et 9 900 FCFA**, XOF et NabooPay inchangés ; carte bancaire internationale mise en avant, Wave/Orange Money situés au Sénégal et dans l'UEMOA.
- D6 : **RT Arabic inclus**, origine « Russie · média d'État » ; « Sahara occidental / Western Sahara / الصحراء الغربية » neutre.
- D7 : relecture arabe native **toujours en attente**. Elle concerne aussi les annotations AR des fixtures. Le code et les contrôles techniques E4 peuvent être préparés après feu vert, mais **EDI-404 ne peut pas être déclaré reçu sans D7**.
- Sources FR : le propriétaire a demandé de **conserver les flux actuels** et de reporter R1–R5 aux mesures de semaine. Aucun remplacement FR n'est autorisé. EDI-603 n'a pas non plus reçu sa décision.

## Limites à transmettre

1. **EN à froid** : lors de la dernière réception Clerk, le premier chargement a affiché « Signal interrupted » ; « Try again » a ensuite reçu 300 dépêches de 60 rédactions et les marchés. La limite navigateur de 15 s est conservée. Le dépassement par une collecte froide est une explication probable, pas un diagnostic instrumenté définitif. Vérifier le repli/reprise en E4 et lors de la réception globale ; ne pas annoncer une correction déjà faite.
2. **Sources EN** : Nation est revenu en 404 le 12/10 et reste désactivé, Eye Radio également ; SABC et d'autres amonts sont intermittents. Remesurer AR avant activation avec `feeds:verify`, sans repartir de l'étude de dimanche comme preuve actuelle.
3. **Pages publiques** : `/en` a son document EN, son sélecteur et sa ligne d'édition ; son grand corps marketing reste FR jusqu'à E5. Juridique/contact/SEO/OG et textes publics du partage relèvent d'E5. Administration et 404 global restent FR aux frontières documentées.
4. **Français** : conserver le rendu reçu en E3, y compris les changements D5 autorisés, la garde de dates E2 et l'ordre historique FR de la grille. Ne pas revenir aveuglément au rendu du commit d'avant ces lots. Pour E4, produire des références FR/EN avant modification ; comparer les vues avec données et horloge contrôlées, car le Radar réel évolue.

## État du poste et précautions de reprise

- Reprendre **ce checkout local**, avec ses changements non committés et ses renommages déjà dans l'index. Un nouveau worktree ou clone depuis `HEAD` ne contiendrait pas ce chantier. Ne pas remettre l'arbre à zéro ; garder `.claude/`.
- `READY_EDITIONS=['fr','en']` ; `src/i18n/ar.ts` n'existe pas. `EDITIONS` reste `fr` par défaut, `fr,en` active EN seulement si build et runtime correspondent. L'anglais n'est pas activé à distance.
- **Le dernier build `.next` est FR seul.** Reconstruire avec les éditions et drapeaux du mode voulu avant `next start`. Les variables de réception sont définies uniquement dans le processus, sans éditer `.env*`.
- Ports 3001/3002 libres à la fin d'E3 et revérifiés lors de cette passation ; les vérifier de nouveau au démarrage. Ne stopper que ses propres serveurs. Le banc complet de composants utilise 3001 en dur et doit être exécuté seul.
- PostgreSQL local `africa_live_dev`, `localhost:3001`, source `C:/Users/GAMER PC/IPTV` intacte. Ne pas exécuter `setup:local`, les anciens scripts d'ajout/nettoyage d'utilisateur ou des migrations. Le compte local existant appartient au propriétaire.
- Clerk réel reçu dans **Edge**, avec la session existante. Le navigateur intégré ne constitue pas une preuve de connexion. Le mode MVP couvre la réception locale mais ne remplace pas les contrôles Clerk.
- Garder les réécritures relatives `next.config.ts` (afterFiles) et le proxy d'E1. Ne pas refaire EDI-102/103 ni ajouter une nouvelle stratégie de routage.
- Catalogue complet, compte/droits/favoris/pays/Éco communs ; médias directement depuis l'amont. Aucun relais, conversion, stockage média, traduction automatique des titres ni API payante.
- Aucun commit/push/déploiement, configuration Railway/Clerk/OVH/DNS, tâche Windows ou coût sans demande explicite. Railway `just-compassion` reste **staging**.

## Références et première action du prochain agent

Lire `AGENTS.md`, `contextellm.md`, cette passation, la réception E3, le [prompt complet](prompt-agent-editions-2026-10-11.md), le plan technique et le backlog. L'[ancienne fiche d'audit](etat-implementation-editions-2026-10-11.md) comporte maintenant un bilan courant puis une archive clairement séparée ; ses anciennes lacunes E1 ne sont plus à refaire.

Preuves privées : `.local-logs/editions-e3/`, notamment `unit-final.txt`, `components-final.txt`, `e2e-extra-final.txt`, `types-final.txt`, `lint-final.txt`, `build-final-fr-en.txt`, `build-fr-only.txt`, `catalog-pagination.json`, `before.json`, `after.json`, `env-comparison.json` et [galerie](<C:/Users/GAMER PC/Africa_Live_TV/.local-logs/editions-e3/captures.md>). Ne pas divulguer d'identité, de secret ou d'URL de session.

**Première action :** vérifier le checkout et les ports, résumer l'état en quelques lignes et préparer E4. Si le message humain contient « Feu vert pour E4 », exécuter EDI-401 à EDI-404 dans ce périmètre ; sinon attendre ce feu vert avant toute modification applicative. À la fin, actualiser les documents, distinguer validation technique et D7, puis attendre le feu vert E5.

## Vérification de cette passation

Mise à jour documentaire uniquement : **11 Markdown contrôlés, 256 liens locaux valides, 43 tickets dont 27 reçus et 16 restants**, statuts Git hors Markdown inchangés et diff sans erreur d'espacement. Les tests applicatifs n'ont pas été relancés pour cette passation ; leurs résultats proviennent de la réception E3. Trace privée : `.local-logs/editions-e3/doc-passation-validation.json`.
