# Réception intégrée dashboard — L4

Date : 1er octobre 2026 · Africa/Dakar. AL-Q01 et AL-C05.
Environnement : Windows, Edge/Chromium, localhost:3001, PostgreSQL `africa_live_dev`.
Relevé initial : L0–L3 implémentés/testés localement, avant déploiement L4.

Complément après autorisation du propriétaire : **L0–L4 déployé sur staging le
1er octobre 2026**, déploiement `b0d52c0c-3bca-4600-8a3e-fb1f2709dada` SUCCESS/actif.
9 E2E distants et parcours administrateur Clerk réel réussis ;
[preuves et limites restantes](dashboard-auth-staging-reception.md).
Le relevé local ci-dessous conserve son périmètre initial. Complément du
1er octobre à 18:29 UTC : zoom natif Edge 200 % validé (DPR=2, 937×477 CSS),
pays/clavier et filtres TV reçus sans débordement. Les comptes ordinaires
connectés restent indisponibles ; preuves dans le complément ci-dessus.

## Résultats

| Contrôle | Résultat local |
|---|---|
| `npm test` | 219 réussis ; 14 intégrations volontairement réservées au runner isolé |
| `npm run test:integration` | Ces 14 intégrations réussies, zéro ignorée ; schéma jetable supprimé, témoin de quota et empreintes du catalogue conservés |
| E2E MVP, 8 fichiers historiques/TV/Radar/lecture | 42 réussis ; seul le scénario worker réservé au build exécuté séparément |
| `e2e/dashboard-reception.spec.ts` | 6 réussis : fixtures datées, reflow, fond bloqué et observations réelles |
| Build servi hors MVP : auth, worker et pages paiement | 9 réussis, zéro ignoré |
| TypeScript, ESLint zéro avertissement, build Next | Réussis |
| `npm run db:check:migrations` | Réussi ; aucune migration nouvelle dans L0–L4 |

Total : **233 tests unitaires/intégration et 57 E2E réussis**, zéro échec final.
Après restitution du serveur dev Clerk : les trois tests d’entrée/auth réussissent
de nouveau, santé processus/base `200`, API Radar anonyme `401`.
Les suites sont séparées selon leur environnement : MVP pour l’interface métier,
build hors MVP pour les protections et Clerk. Un seul lancement de tout E2E ne
représente pas ces deux configurations. Logs locaux ignorés dans `.local-logs/l4-*`.

## Matrice de réception du plan

| Axe / tickets | Preuve locale du 1er octobre | Limite d’observation |
|---|---|---|
| Temps — D02/D06 | Contrats à horloge figée : bornes 24 h, UTC, futur/absent, indexation distincte ; bandeau daté ; fixtures L4 à 17:00 UTC | Une indexation GDELT n’est pas une publication |
| Briefing — D00 | Bouton désactivé, zéro requête/modale ; API sans réactivation | D01/D04 différés L6 |
| Sources — D03 | Service/route/UI : vide, panne, timeout, cache périmé, partiel, reprise ; disponibilité distincte par fournisseur | Observation réelle locale seulement, aucune certification de santé amont |
| Pays — W02/W03 | Sélecteur, carte, URL valide/invalide, reload, historique, sélection rapide, pays vide et fonctionnement sans carte | Tests métier en MVP local |
| TV — D05/T02–T04 | Compteurs selon résolveur ; métadonnées composites/alias, langue inconnue, recherche/reset/pagination/favoris ; API PostgreSQL réelle | Catalogue autorisé, sources OFFLINE exclues ; aucun import modifié |
| Accès — C01/C02/T01 | Vrais handlers/gardes avec frontières externes simulées : anonyme/sans droit/essai/actif/expiré/admin ; expiration entre requêtes ; UI expirée sans lecteur ; protections anonymes build | Comptes Clerk connectés par statut non exercés en E2E ; aucune session dédiée disponible |
| Lecture | HLS/MP4 décodés, timeout, source de secours, navigateur incompatible, VLC simulé, modale clavier et fenêtre séparée réutilisée ; refus URL arbitraire/origine étrangère | Fixtures locales ; aucun lancement VLC réel ni garantie sur chaque chaîne/appareil |
| Mobile/clavier — W01/W04/T03 | 320/390 px, desktop, focus/Échap/Ctrl+K, réduction des animations, aucune largeur débordante | Reflow 683×384 = surface CSS équivalente à 1366×768 à 200 % ; zoom natif reçu ensuite en local (voir complément) ; lecteur d’écran non validé |
| Carte/couches — C04/W05 | Worker ESM dev/build sous CSP, worker/fond bloqués, fil disponible, opt-in, erreurs/retry/cache/concurrence, 2D/3D | Pas d’obligation de disponibilité des tuiles externes |
| Navigation — T01 | Landing, widgets Clerk réels, liens dashboard/TV/logo/compte/admin conditionnel ; composant standard/admin rendu avec capacité serveur | Navigation compte/admin connecté et reconnexion réelle à recevoir ultérieurement |
| Documentation — C05/Q02 | Handoff, roadmap, backlog/progress, matrice/checklist, README et admin réconciliés ; dossier avec configuration/retour arrière | Réception staging conditionnelle à un déploiement autorisé |

Les gardes testées ne sont pas une preuve de configuration des rôles dans Clerk.
Le chargement réel des widgets sign-in/sign-up sur le build n’implique pas une
connexion, une création de compte ou un achat. Les offres testées interceptent
la création de paiement ; validation du téléphone invalide sans requête.

## Captures et observation

Captures fixtures : [1366×768](screenshots/l4-dashboard-1366.png),
[390×844](screenshots/l4-dashboard-390.png),
[reflow 683×384](screenshots/l4-dashboard-683.png).
Captures sans interception Radar : [desktop réel](screenshots/l4-dashboard-real-1366.png)
et [mobile réel](screenshots/l4-dashboard-real-390.png).
Revue visuelle : navigation/pays/fil lisibles, focus pays visible, sources
explicites ; carte à la demande sur mobile. Les fonds unis des fixtures sont des
tuiles synthétiques de test, pas une observation du fournisseur cartographique.
Observation réelle : page Radar et statut de couverture affichés, zéro exception
JS et zéro débordement. Les couches restent optionnelles et le briefing inactif.

Inventaire lu le 1er octobre à 17:21 UTC : **11 778 chaînes, 12 396 sources**.
Comparaison après réception : effectifs et empreintes identiques, aucune chaîne
de fixture `lot2-*` ni schéma d’intégration restant. Ces nombres concernent la
base locale entière, pas les chaînes affichables ni des sources saines.

## Reproduction

Les variables ci-dessous sont processuelles ; aucune clé ni configuration
distante à modifier. Utiliser deux serveurs successivement sur le port 3001,
jamais simultanément. Le runner d’intégration protège la base locale et crée
son propre schéma ; ne pas passer des flags d’intégration manuellement.

```powershell
npm test
npm run test:integration
npx tsc --noEmit --incremental false
npx eslint . --max-warnings=0
npm run db:check:migrations

# Serveur dev MVP dédié avec les deux flags true ; cible locale obligatoire.
$env:LOCAL_DEV_MODE='true'
$env:NEXT_PUBLIC_LOCAL_DEV_MODE='true'
$env:E2E_EXTERNAL_SERVER='true'
npx playwright test e2e/catalogue.spec.ts e2e/tv-workspace.spec.ts e2e/tv-contract.spec.ts e2e/radar-workspace.spec.ts e2e/radar-reliability.spec.ts e2e/local-mvp.spec.ts e2e/local-playback.spec.ts e2e/local-playback-api.spec.ts --workers=2
npx playwright test e2e/dashboard-reception.spec.ts --workers=1

# Arrêter ce serveur avant le build hors MVP et son démarrage.
$env:LOCAL_DEV_MODE='false'
$env:NEXT_PUBLIC_LOCAL_DEV_MODE='false'
$env:DEPLOYMENT_ENV='local'
npm run build
# Dans un terminal avec les mêmes flags : npm run start:local
$env:RADAR_BUILD_TEST='true'
npx playwright test e2e/radar-reliability.spec.ts e2e/auth-entry.spec.ts e2e/payment.spec.ts --grep 'Build servi|anonymous visitors|landing page|Clerk sign|Page de paiement' --workers=2
```

La réception locale L4 est terminée avec les limites ci-dessus consignées.
Le [dossier de livraison](dashboard-delivery-dossier.md) précise les contrôles
effectués ensuite sur staging après autorisation et les réserves restantes.
La [fiche de reprise](dashboard-session-handoff.md) donne le bilan courant et
la prochaine décision L5, avant L6 briefing.
