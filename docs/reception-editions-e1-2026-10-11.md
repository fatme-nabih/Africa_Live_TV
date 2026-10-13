# Africa Live — réception locale du lot E1, 11 octobre 2026

**E1 terminé et vérifié localement (EDI-101 à EDI-107), après le feu vert du propriétaire.** E0 conservé ; E2 non commencé.
Travail non committé, non publié. Aucun changement Railway, Clerk, DNS, OVHcloud, `.env`, migration ou tâche Windows.

## Fait

| Ticket | Résultat et preuve |
|---|---|
| EDI-101 | Registre FR/EN/AR, cookie, D2/D3 et filtre des dictionnaires prêts ; même analyse dans le validateur de démarrage et la CLI. `EDITIONS` documenté dans la matrice. Tests registre et environnement verts. |
| EDI-102 | Arbre `[edition]`, `next/root-params`, génération statique, 404 global et métadonnées servis. Deux builds réussis : `fr` et `fr,en`. Landing `/fr` ISR 600 s ; espace connecté dynamique. Captures et parcours ci-dessous. |
| EDI-103 | Réécritures relatives via `next.config.ts`, redirections/cookie et protection via le proxy. Concordance du résolveur et des règles de réécriture étendue aux cookies normalisés (casse/espaces). Tests HTTP, API/PWA, navigation, MVP et Clerk. |
| EDI-104 | Type des pluriels élargi aux six catégories sans rendre les clés françaises facultatives. Fournisseur applicatif transmettant `radar/time/briefing/markets/weather/world`, édition et éditions actives ; shell hérité de la racine. Repli FR sans fournisseur conservé. |
| EDI-105 | Textes FR du shell/Radar extraits ; analyse AST : 0 chaîne visible accentuée restante dans ces composants et le dashboard. Régressions de composants et E2E verts, textes publics identiques à la référence. |
| EDI-106 | Formats par édition vérifiés : chiffres occidentaux AR, dates EN jour/mois, formats FR identiques, espace insécable des statistiques et heure de Dakar. Exceptions détaillées ci-dessous. |
| EDI-107 | Réception FR en Clerk réel et MVP, captures 360/768/1366, configuration `fr,en` masquant EN sans dictionnaire, contrôles globaux et passation actualisés. |

Les deux défauts constatés par l'audit sont corrigés : le type accepte désormais `zero/one/two/few/many/other` et le fournisseur des espaces applicatifs est posé.
Les dictionnaires EN/AR et le sélecteur ne sont pas implémentés en E1 : `READY_EDITIONS=['fr']`. Les vérifications de formats/pluriels utilisent des messages de test,
pas une traduction produit. Avec `EDITIONS=fr,en`, le build, la CLI et le serveur gardent FR seul et émettent l'avertissement prévu.

## Écart de routage réceptionné

Le plan initial prévoyait une réponse `NextResponse.rewrite()` depuis le proxy. L'implémentation conserve les destinations **internes relatives** dans
`next.config.ts`, en `afterFiles` (forme tableau documentée par Next 16.3.8 installé), après le proxy et avant les routes dynamiques.
Les règles d'accès restent évaluées sur les adresses visibles ; les gardes serveur des pages/API restent inchangées.
Les API, ressources PWA et médias ne passent pas dans ces règles de réécriture.

Ce choix évite de dépendre d'une destination absolue de réécriture entre 127.0.0.1 et localhost. Le diagnostic de normalisation signalé par la session précédente
n'a pas été reproduit séparément ici : la réception porte sur le comportement de la solution conservée. Preuves positives :
8 tests du résolveur/règles, widgets Clerk réels, refus anonymes, parcours connecté réel, parcours MVP et 4 nouveaux E2E du contrat HTTP/navigation.
Un lien connecté vers une édition inactive revient à l'adresse courte en FR ; les pages publiques de l'édition inactive répondent 404.

## Contrôles réels de fin de lot

Preuves privées : `.local-logs/editions-e1/reception/`.

| Contrôle | Résultat final | Trace |
|---|---|---|
| `npx tsc --noEmit --incremental false` | 0 erreur | `types-final.txt` |
| `npm run lint` + lint ciblé de la dernière fixture corrigée | 0 erreur, 0 avertissement ESLint | `lint-final.txt` ; commande ciblée dans la session |
| `npm test` | **469 réussis / 510 ; 41 ignorés ; 0 échec** | `unit-final.txt` |
| `npm run test:invariants` | **4/4** | `invariants.txt` |
| `npm run build`, `EDITIONS=fr` | Réussi ; landing ISR 600 s | `build-fr.txt` |
| `npm run build`, `EDITIONS=fr,en` | Réussi ; FR seul pré-rendu, EN masqué | `build-fr-en.txt`, manifeste Next |
| `npx tsx src/scripts/check-environment.ts`, processus `EDITIONS=fr,en` | Configuration valide ; `Active editions: fr`, EN ignoré jusqu'à son dictionnaire | Sortie réelle de la session ; aucun identifiant secret affiché |
| `npx playwright test -c playwright.components.config.ts` | **102/102 ; 0 ignoré ; 0 échec** | `components-final.txt` |
| Banc E2E Clerk sur build FR (4 fichiers) | **20/20 ; 0 ignoré ; 0 échec** | `e2e-clerk.txt` |
| Banc E2E MVP (11 fichiers) | **107 réussis ; 1 ignoré ; 0 échec** | `e2e-mvp-final.txt` |
| Sélection E2E CI + routage, build/processus `fr,en`, mode anonyme | **20 réussis ; 10 ignorés ; 0 échec** | `e2e-fr-en.txt` |
| Empreintes SQL avant/après | Identiques : chaînes, sources, utilisateurs, favoris, pays suivis | `db-comparison.json` |
| `git diff --check` | Réussi | Relevé final |

Banc Clerk : `auth-entry`, `payment`, `account-controls-hydration`, `edition-routing`, serveur de production local, mode anonyme désactivé.
Les vrais widgets de connexion/inscription chargent. Paiement intercepté, jamais soumis réellement. L'hydratation des contrôles de compte a ses frontières Clerk simulées.

Banc MVP : `app-shell`, `radar-live`, `radar-reliability`, `radar-workspace`, `radar-weather`, `dashboard-reception`, `edition-routing`,
`tv-workspace`, `player-dock`, `followed-countries`, `universal-search` ; un worker, aucune relance automatique.
Le cas réservé au worker du build est ignoré ici et passe dans le banc anonyme sur build.
Le compte local existant est conservé : `ui-fixture-user --catalog` a refusé de le remplacer. Aucun compte créé ou supprimé ; écritures favoris/pays et lectures de test simulées
dans les scénarios concernés. Les inventaires PostgreSQL démontrent que les données conservées n'ont pas changé.

Banc anonyme sur `fr,en` : mêmes 5 fichiers que la sélection CI, plus `edition-routing`, un worker, sans relance automatique.
Les 10 cas ignorés sont le widget Clerk réel, 3 parcours catalogue connectés et 6 scénarios Radar réservés au MVP.
Cette sélection n'est pas une exécution de tous les E2E du dépôt. Les 41 unités ignorées sont les intégrations conditionnelles ; elles n'ont pas été présentées comme réussies.

## Réception connectée et captures

Session Edge déjà connectée à Clerk, sur le **build local**, sans modification d'identité ni de préférences : Radar → TV → compte → TV → Radar.
Adresses `/app/live`, `/app`, `/account` conservées ; `lang=fr`, absence du badge MVP, compte « Mon accès » et catalogue chargé (30 cartes affichées).
Radar : `scrollWidth=1361/763/355` pour `innerWidth=1366/768/360`, aucun débordement horizontal. Preuve `clerk-connected.json` et captures JPEG.

[Galerie de toutes les vues 360/768/1366](<C:/Users/GAMER PC/Africa_Live_TV/.local-logs/editions-e1/reception/captures.md>).
Référence avant E1 : `.local-logs/editions-e1/baseline/`.

- Public : 18 captures, texte visible identique sur 18/18. Comparaison PNG au seuil 12/255 : 16/18 identiques ; écarts de 0,098 % et 0,335 % sur la landing,
  confinés à l'image d'aperçu. L'asset `hero-radar-tv.webp` est byte pour byte identique à HEAD ; l'écart est compatible avec les versions mises en cache de l'image,
  pas une modification applicative. Polices, positions et reste de l'écran comparés visuellement.
- MVP : captures du Radar chargé et de la TV à 360/768/1366, `lang=fr`, aucun débordement, 0 erreur console dans les 6 vues finales.
  Les textes du catalogue correspondent aux 3 références ; les titres RSS, cours, météo et horaires du Radar ont évolué entre les prises.
  Aucune égalité pixel à pixel du Radar réel n'est prétendue. Les E2E du Radar utilisent aussi des relevés simulés et des horloges fixes.
- Les premières captures MVP prises pendant le chargement sont conservées dans `mvp/` pour le journal, mais la réception visuelle utilise **`mvp-ready/`**.
  `/account` redirige historiquement vers le Radar en MVP ; son vrai contenu est reçu dans Clerk.

## Échecs intermédiaires corrigés, sans affaiblir les assertions

- Contrôle rouge de typage : TS2353 sur le pluriel arabe avant correction de `Widen`. Les contrôles négatifs imposent encore `other` et toutes les clés du dictionnaire.
- Réécritures : cookie ` EN ` accepté par le résolveur mais pas par les règles de cookie. Même normalisation désormais, test rouge/vert consigné dans `routing-red/green.txt`.
- Premier banc MVP : 82 réussis, 1 ignoré, 2 échecs. Le nouveau test de navigation supposait une landing visible en MVP, alors qu'elle redirige historiquement au Radar ;
  il vérifie maintenant explicitement cette redirection et la navigation TV. L'autre scénario demandait de voir le titre SN au premier écran tout en lui donnant
  la même date qu'au titre CI : la fixture choisit désormais SN comme titre le plus récent dans ce scénario, avec toutes les assertions de visibilité/clavier conservées.
- Premier banc composants : 101 réussis, 1 échec. `Date.now()` exécuté pendant la boucle pouvait inverser RFI/France 24 selon la milliseconde de création.
  Dates espacées d'une seconde depuis une référence unique ; les assertions d'ordre, compteurs, régions et pagination restent identiques. Banc final 102/102.

## Exceptions FR et limites

- `AdminSupportQueue` : outil administratif interne, dates FR autorisées par le plan.
- `weather-contract` et validation interne des fuseaux : la locale n'affecte que la construction du validateur, aucune sortie visible.
- Manifeste PWA : FR conservé, limite explicitement prévue pour E5.
- `global-error` et `global-not-found` : secours autonomes, sans contexte fiable d'édition en cas d'échec racine/adresse inconnue ; repli FR.
- Les captures publiques comportent des erreurs de préchargement de liens protégés redirigés vers Clerk (déjà observées dans la référence) ; les requêtes 404 apparaissent aussi
  dans la console des 404. Next a journalisé des `NoFallbackError` internes sur des adresses indisponibles ; les réponses HTTP reçues restent les 404 attendus, jamais une preuve de 500.
- Aucune vérification de flux frais ni traduction produit EN/AR pendant E1 ; ces travaux commencent en E2/E3/E4. D7 reste requis pour la réception arabe.
- Les ports 3001/3002 sont libres après réception. Aucun serveur du propriétaire arrêté ; seuls les serveurs de cette session ont été arrêtés.

## Fichiers et passation

Socle issu de la session précédente : déplacement des pages/layouts sous `src/app/[edition]`, `root-document`, `global-not-found`,
`src/i18n/*`, registre/routage des éditions, `src/proxy.ts`, `next.config.ts`, extraction des composants shell/Radar et des helpers de formats.
L'inventaire complet des changements conservés est dans `git-status-final.txt` (il comprend aussi E0 et les documents antérieurs).

Compléments de cette reprise : `src/i18n/message.ts`, `client.tsx`, layout applicatif ; `src/lib/i18n.test.ts`, `edition-routing.ts/test`,
`server-environment.ts/test`, `radar-access.test.ts`, `src/scripts/check-environment.ts` ;
`e2e/edition-routing.spec.ts`, `helpers/radar-fixture.ts`, `radar-workspace.spec.ts`, `components/world-desk.spec.ts` ;
matrice, backlog, validation, progression, contexte, état de l'implémentation et prompt de reprise actualisés.

**Prochain lot : E2, uniquement après « vert pour E2 ».** Les décisions R1–R5 sur les sources FR restent à obtenir avant leur remplacement.
Aucun commit, push ou déploiement sans demande explicite ; aucune migration avant la décision EDI-603.
