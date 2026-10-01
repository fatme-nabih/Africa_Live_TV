# Dossier de livraison dashboard — AL-Q02

Complément L5 local, 1er octobre : AL-T05 réalisé/testé et évalué,
**recommandation ajuster** ; code ensuite publié avec autorisation, activation locale seulement. [Dossier et limites du prototype](anchored-player-validation.md).
Les preuves de livraison L0–L4 ci-dessous restent distinctes de ces changements
locaux. Publication L5 reçue : voir le dossier lié ci-dessus.
Briefing inactif ; L6 non commencé, toute livraison future à autoriser.

Date : 1er octobre 2026 · réception locale L4 terminée.
Référence : [plan et tickets](plan-dashboard-backlog.md),
[preuves intégrées AL-Q01/AL-C05](dashboard-release-validation.md).
Dossier initial préparé dans l’arbre de travail avant déploiement ; aucun commit/push.

**Complément du 1er octobre, 18:09 UTC** : le propriétaire a ensuite autorisé
la livraison directe du snapshot L0–L4 sur staging, sans commit/push. Déploiement
`b0d52c0c-3bca-4600-8a3e-fb1f2709dada` SUCCESS et actif, neuf E2E distants réussis,
session administrateur réelle reçue. [Relevé détaillé](dashboard-auth-staging-reception.md).
Les cases initiales ci-dessous restent le dossier préparatoire. Complément à
18:29 UTC : zoom natif Edge 200 % local validé, preuves dans le relevé détaillé.
Les comptes ordinaires demeurent indisponibles et non validés en session réelle.

Clôture publiée ensuite sur GitHub `main` (`22dea98` pour l’applicatif), et
Railway staging `4c8a82cc-5b3b-4a0e-86a1-bf922540869a` SUCCESS ; neuf E2E
distants repassés, santé processus/base 200 et Radar anonyme 401 le 1er octobre
à 18:44 UTC. Un commit documentaire final enregistre les preuves. Runtime
identique au snapshot reçu ; [bilan courant et empreinte](dashboard-session-handoff.md).

## Périmètre et fichiers

| Lot / tickets | Principaux fichiers à relire | Réception |
|---|---|---|
| L0 — C01–C04 | `src/lib/radar-access.test.ts`, `src/app/app/live/page.tsx`, `src/app/api/live/*/route.ts`, `src/lib/map-worker.ts`, `scripts/prepare-maplibre-worker.mjs`, `src/components/radar/TacticalVectorMap.tsx` | Accès expiré refusé, identités et worker |
| L1 — D00/D02/D03/D05/D06 | `src/lib/radar-data.ts`, `radar-upstream.ts`, `live-*.ts`, `rss-collector.ts` et contrats associés ; `src/components/radar/LiveMarketTicker.tsx`, `src/lib/live-channel-summary.ts`, `src/app/app/live/LiveRadarDashboard.tsx` | Dates, disponibilité, compteurs, briefing inactif |
| L2 — W01–W06 | `src/lib/radar-workspace.ts`, `radar-layers.ts`, `src/components/radar/useRadarLayer.ts`, `RadarSourcesPanel.tsx`, dashboard/carte | Pays/URL/mobile/couches/sources |
| L3 — T01–T04 | `src/components/AppNavigation.tsx`, `useCatalogFilters.ts`, `FilterSidebar.tsx`, `CategoryTabs.tsx`, `ChannelGrid.tsx`, `src/lib/catalog-filter-state.ts`, `catalog-metadata.ts`, `catalog-visibility.ts`, `catalog-query.ts`, API channels/filters et pages/layouts app/compte/admin/auth/pricing | Navigation et filtres TV |
| L4 — Q01/C05/Q02 | `e2e/dashboard-reception.spec.ts`, `catalogue.spec.ts`, `payment.spec.ts`, captures `docs/screenshots/l4-*`, ce dossier et réception ; docs listés ci-dessous | Suites intégrées et preuves réconciliées |

Les dossiers de réception L0/L1, L2 et L3 détaillent les changements et captures :
[accès](dashboard-access-matrix.md), [fiabilité](dashboard-reliability-validation.md),
[workspace](dashboard-workspace-validation.md), [TV](tv-workspace-validation.md).
Revue documentaire C05 : `contextellm.md`, `README.md`, `docs/admin-access.md`,
`radar-afrique-roadmap.md`, `production-backlog.md`, `production-progress.md`,
`environment-matrix.md`, `non-regression-checklist.md`,
`railway-preproduction-runbook.md`, `plan-dashboard-backlog.md`.

L’arbre est volontairement sale et comprend des modifications antérieures à
ces lots. Ne pas assimiler tout `git diff` à L4 ; relire les ajouts et fichiers
non suivis autant que les fichiers suivis avant de sélectionner une livraison.
Les manifestes locaux ignorés `l4-inventory-before.json`, `l4-inventory-after.json`
et `l4-delivery-files.json` conservent les empreintes datées pour cette revue.
Un futur commit doit identifier exactement la révision reçue ; la révision
staging historique n’inclut pas automatiquement cet arbre local.

## Configuration et schéma

- Aucune variable Railway/Clerk/OVHcloud/DNS modifiée. Pas de nouveau secret,
  dépendance, fournisseur payant ou migration de base pour les lots dashboard.
- `predev`/`prebuild` préparent le worker MapLibre ESM public ; inclure le script
  dans la livraison. Ne pas convertir ce worker en relais média.
- Sur staging : `DEPLOYMENT_ENV=staging`, `LOCAL_DEV_MODE=false`,
  `NEXT_PUBLIC_LOCAL_DEV_MODE=false`, `NEXT_PUBLIC_LOCAL_PLAYBACK=false`.
  Les variables publiques sont intégrées au build et exigent un rebuild.
- Préserver les paramètres fournisseurs autorisés existants. Un fournisseur
  non configuré doit rester explicite ; ne pas ajouter une clé pour masquer
  cet état. Le briefing demeure désactivé jusqu’à L6.
- La base de staging conserve le schéma déjà migré DOC-006. Une migration
  éventuelle provenant d’un autre chantier nécessite une revue distincte,
  sauvegarde restaurable et `npm run db:migrate:deploy` ; jamais `db:push`.

## Retour arrière

Avant une livraison autorisée, noter la révision applicative actuellement saine
et capturer les réglages sans secrets dans un relevé privé adapté. Construire et
livrer une seule révision revue avec le schéma courant. Un retour arrière de ces
lots consiste à redéployer la dernière révision compatible avec ce même schéma,
en conservant le rôle staging et les gardes d’accès. Vérifier santé, authentification,
navigation et absence de mode MVP après retour arrière.
Ne pas revenir à une version autorisant le dashboard après expiration : si la
révision précédente ne possède pas la garde AL-C01/C02, préparer une correction
compatible conservant cette garde et recevoir cette correction avant livraison.
Ne pas restaurer une base pour un simple rollback de code : aucun changement de
schéma n’est requis ici. Ne pas utiliser `git reset/clean/checkout` pour éliminer
l’arbre sale ; préserver les travaux existants. Un rollback de code ne révoque
pas une migration d’un autre chantier ni une configuration publique déjà intégrée.

## Réception staging — livraison exécutée, réserves ouvertes

- [x] Paquet isolé de 303 fichiers revu et livré après autorisation ; sans
  secrets ni fichiers privés. Livraison initiale sans commit/push.
- [x] Déploiement/date/environnement/domaine et SHA-256 consignés dans le relevé.
- [x] Configuration staging relue, modes locaux désactivés, santé processus/base 200.
- [x] Neuf E2E distants réussis : entrée publique/auth, gardes anonymes, worker
  sous CSP et paiement intercepté sans transaction.
- [x] Session Clerk administrateur réelle en local et staging ; navigation,
  pays conservé au rechargement, lien TV et filtre Actualités reçus.
- [x] Zoom natif Edge 200 % reçu en local ; clavier, filtres TV, Échap et focus.
- [x] Stratégie de retour arrière documentée ; garder AL-C01/C02 et le rôle staging.
- [ ] Sessions réelles de comptes ordinaires essai/actif/expiré indisponibles.
- [ ] Lecteur d’écran, appareils mobiles physiques et lecture réelle d’un
  échantillon autorisé dans cette réception ; zoom natif staging non testé.
- [ ] Inventaire DB staging daté et qualification actuelle des sources.

Les chiffres staging des journaux de septembre restent historiques. La santé
processus/base et les tests de contrats ne garantissent pas les flux amont.
La production apex/`www` reste inactive. Prochain lot : arbitrer L5, puis L6
briefing en dernier. [Fiche de reprise complète](dashboard-session-handoff.md).
