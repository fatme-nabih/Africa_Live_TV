> **État après EDI-903, 13/10/2026 : 43/43 tickets reçus.** D7/juridique validés par le propriétaire sur les textes actuels ; publication FR/EN/AR **f4d85931-e353-422e-bbe6-aa1476ab360a SUCCESS** sur Railway staging, 22 migrations, 646/646 fichiers, santé 200, 28 E2E +22 ignorés, 45 captures. Aucun commit/push ; index, sources FR, données, .env, tâche et cycle conservés. [Publication](publication-editions-edi903-2026-10-13.md), [passation actuelle](passation-editions-publication-2026-10-13.md). Les bilans « en attente/non autorisé » ci-dessous décrivent les états antérieurs.

# Réception E9 — contrôles globaux et dossier final, 13 octobre 2026

**EDI-901 et EDI-902 terminés localement après « Vert pour E9 ». 41/43 tickets faits.** EDI-404 attend toujours D7 ; EDI-903 reste conditionnel, non autorisé et non exécuté. Les lots reçus E0 à E6 sont conservés. Aucun code applicatif ni test versionné modifié dans E9.

## État de reprise et méthode

Même checkout `C:/Users/GAMER PC/Africa_Live_TV`, arbre volontairement sale : **232 entrées** au départ, **27 entrées d'index** identiques à `.local-logs/editions-e6/index-before.txt`. Ports libres. **22 migrations**, aucune valeur `preferred_edition`. Build initial FR seul Clerk reçu par santé 200, `/app` → connexion (307), `/en` → 404.

Traces privées : [dossier E9](../.local-logs/editions-e9/). Lanceurs E6 copiés en E9 ; seuls les processus dont l'appartenance E9 est vérifiée sont arrêtés. Variables posées dans les processus, sans écriture des fichiers d'environnement. Intégrations rejouées uniquement dans un schéma PostgreSQL jetable, supprimé ensuite : aucune migration de la base applicative. Les tests de préférence d'édition sont interceptés, et le favori temporaire du test réel est retiré par son nettoyage.

Les erreurs initiales de transmission des arguments PowerShell (`--edition`, virgules du lanceur/reporter) ont été corrigées avant les passages valides ; le lancement sans serveur est archivé dans `e2e-mvp-launch-failed.txt` et n'entre pas dans les totaux. Aucun test n'a été affaibli.

## EDI-901 — résultats réels

| Commande / banc | Mode et résultat | Trace |
| --- | --- | --- |
| `npx tsc --noEmit --incremental false` | `EDITIONS=fr,en,ar`, 0 erreur | [types](../.local-logs/editions-e9/types.txt) |
| `npm run lint` | 0 erreur, 0 avertissement | [lint](../.local-logs/editions-e9/lint.txt) |
| `npm test` | Garde réseau, **519 réussis / 563, 44 ignorés, 0 échec** | [unités](../.local-logs/editions-e9/unit.txt) |
| `npm run test:invariants` | **4/4** | [invariants](../.local-logs/editions-e9/invariants.txt) |
| `npm run test:integration` | **44/44**, schéma jetable, témoin et catalogue public préservés | [intégrations](../.local-logs/editions-e9/integration.txt) |
| `npx playwright test -c playwright.components.config.ts` | Port 3001 seul, **104/104** | [composants](../.local-logs/editions-e9/components.txt) |
| Suite E2E MVP complète, 27 fichiers, un worker, sans réessai automatique | **209 : 187 réussis, 18 ignorés, 4 échecs analysés ci-dessous** | [texte](../.local-logs/editions-e9/e2e-mvp-all.txt), [JSON](../.local-logs/editions-e9/e2e-mvp-all.json) |
| Banc visuel E6, données/horloge contrôlées, FR/EN/AR × Radar/TV/landing/tarifs/compte × 360/768/1366 | **45/45 identiques au pixel (seuil 0, 0 pixel différent)** ; 0 débordement, 0 erreur de page | [banc](../.local-logs/editions-e9/visual.txt), [captures](../.local-logs/editions-e9/visual/current/) |
| `npm run build`, Clerk `fr,en,ar` | Réussi ; pages publiques pré-générées par édition ; accueils sans script Clerk | [build](../.local-logs/editions-e9/build-fr-en-ar.txt), [routes](../.local-logs/editions-e9/build-three-routes.json), [sonde](../.local-logs/editions-e9/landing-clerk-probe.json) |
| Sélection Clerk : hydratation, auth-entry, edition-api, edition-routing, editions, payment | **30 réussis, 16 ignorés, 0 échec** | [Clerk](../.local-logs/editions-e9/e2e-clerk-all.txt) |
| `npx playwright test -c playwright.ticker.config.ts` | Port 3002 sans conflit, **21/21** | [bandeau/monde](../.local-logs/editions-e9/ticker.txt) |
| Pages publiques Clerk : FR/EN/AR × landing/tarifs/CGU/confidentialité/contact × 360/768/1366 | **45/45**, lang/dir, 0 débordement, 0 erreur de page, métadonnées relevées | [banc](../.local-logs/editions-e9/captures-public.txt), [rapport](../.local-logs/editions-e9/captures/report.json) |
| `npm run feeds:verify -- --edition all` | Réel, 162 sources (désactivées comprises), délai 8 s, aucun média ; détail ci-dessous | [flux](../.local-logs/editions-e9/feeds.txt), [relevés](../.local-logs/editions-e9/feeds/) |
| Build Clerk `EDITIONS=fr` + même sélection | **23 réussis, 23 ignorés, 0 échec** | [build](../.local-logs/editions-e9/build-fr.txt), [Clerk FR](../.local-logs/editions-e9/e2e-clerk-fr.txt) |
| Serveur MVP `EDITIONS=fr`, `edition-api` | **5/5**, dont RSS implicite/explicite et absence du champ `bridge` | [API FR](../.local-logs/editions-e9/e2e-mvp-fr-api.txt) |
| Identité FR face aux références d'avant E1 | Public : **12/18 textes**, **17/18 pixels** identiques au seuil 12/255 ; MVP réel : **3/9 textes**, **2/9 pixels**. Détails et écarts justifiés au § suivant | [public](../.local-logs/editions-e9/identity-public-comparison.json), [MVP](../.local-logs/editions-e9/identity-mvp-comparison.json), [analyse](../.local-logs/editions-e9/identity-analysis.md) |
| Fermeture du lot | Huit empreintes SQL, `.env*`, index Git (27 entrées, contenu indexé inclus), 22 migrations, `run-cycle.cjs` et définition de la tâche Windows inchangés. Aucune valeur `preferred_edition` renseignée. Ports 3001/3002 libres ; dernier `.next` reconstruit en FR seul, mode Clerk. | [état final](../.local-logs/editions-e9/state-after.json), [empreintes](../.local-logs/editions-e9/after.json), [ports](../.local-logs/editions-e9/ports-final.txt), [build final](../.local-logs/editions-e9/build-fr-final.txt) |

### Échecs et cas ignorés

| Cas | Analyse et preuve |
| --- | --- |
| `auth-entry` ×3 sous MVP | Landing/connexion/refus anonymes attendent Clerk, alors que le MVP ouvre le Radar. **Les 3 passent dans la sélection Clerk**, widgets réels chargés et accès anonymes refusés. |
| `local-mvp` : chaînes indisponibles | Écart déjà consigné en E4/E5/E6. La requête réelle retourne 30 chaînes, dont **16 OFFLINE**, selon la politique locale du catalogue complet. Assertion inchangée ; aucune source ou donnée modifiée. [Diagnostic](../.local-logs/editions-e9/local-mvp-analysis.json). |
| `anchored-player` / `correction-profile` | Réussis dans la suite complète ; aucun aléa de volume/performance reproduit ici. Les **3** fichiers `docs/screenshots/l5-anchored-*.png` sont les seuls restaurés depuis HEAD, après le banc, conformément à l'autorisation. |
| MVP : 18 ignorés | 7 éditions publiques Clerk, 10 paiements selon le mode, 1 worker du build. Aucun cas ignoré compté comme réussi. |
| Clerk : 16 ignorés ; FR seul : 23 | Scénarios MVP et éditions inactives. Le détail par test figure dans les JSON et la [synthèse](../.local-logs/editions-e9/e2e-summary.json). |
| Unités : 44 ignorées | Intégrations conditionnelles : les 44 tests d'intégration sont reçus séparément, pas dans `npm test`. |

### Identité FR et captures

Référence réelle **avant E1** : `.local-logs/editions-e1/baseline/{public,mvp,html}`. Nouvelles captures avec la méthode `editions-e2/shots.cjs`, comparaison RGB au **seuil 12/255** (méthode E3), état DOM et textes visibles. Les 18 pages publiques et les 9 vues MVP sont documentées, sans remplacer les références.


Référence conservée : `.local-logs/editions-e1/baseline/{public,mvp,html}`. Même méthode de captures que `editions-e2/shots.cjs`, tailles 360 × 800, 768 × 1024 et 1366 × 768 ; comparaison RGB au seuil **12/255**, méthode E3. Aucun remplacement de baseline. Données réelles dans les captures MVP, pas de gel artificiel des dépêches ou de l'horloge.

| Groupe | Texte visible | Pixels au seuil 12/255 | Analyse |
| --- | --- | --- | --- |
| Public, 18 vues | **12/18 identiques** | **17/18 identiques** | CGU, confidentialité, contact et 404 : 12 textes exactement conservés et 12 captures identiques. Les six différences de texte de landing/tarifs sont exclusivement D5. |
| Landing, 360/768/1366 | Texte D5 | 360/768 identiques ; 1366 : **0,335 %** | Écart circonscrit à l'image d'accueil (x 688–1276, y 284–658), même écart qu'en E1. Asset `public/landing/hero-radar-tv.webp` identique byte pour byte à HEAD (preuve `hero-asset.json`). C'est compatible avec le cache/rendu de l'image déjà relevé en E1 ; aucune différence hors de cette image dans la capture. |
| Tarifs, 360/768/1366 | Texte D5 | **3/3 identiques dans les viewports** | La carte internationale est mise en avant et Wave/Orange Money situés au Sénégal/UEMOA ; les blocs modifiés sont hors de ces premiers écrans. Les prix et contrats ne changent pas. |
| TV MVP, 360/768/1366 | **3/3 identiques** | 360/768 identiques ; 1366 : **0,013 %** | **132 pixels** : 123 dans l'heure (19:16 → 20:36), 9 dans les logos de chaînes. Aucun autre pixel différent au seuil. La forme, l'ordre, le nombre de chaînes et les libellés sont conservés. Preuve : `identity-tv-pixels.json`, images inspectées côte à côte. |
| Radar réel, trois tailles | Contenu variable | 42,963 / 33,312 / 15,49 % différents | Prises du 11/10 et du 13/10 : dépêches, images des éditeurs, heures, cours, météo et compteurs changent. Les libellés statiques visibles et le cadre sont conservés ; aucune identité globale des pixels ou des textes du Radar réel n'est prétendue. |
| Compte MVP, trois tailles | Redirection historique vers `/app/live`, données Radar variables | 18,48 / 33,314 / 59,166 % différents | Le MVP ne montre historiquement pas le vrai compte Clerk. **La baseline `account-1366.png` est incomplète** : fond sans styles/contenu applicatif, seul lien « Aller au contenu » et indicateur Next visibles. Son JSON relevé après la capture contient du texte Radar, donc le PNG et le relevé DOM ne représentent pas le même état de chargement. Cette image ne permet pas de réceptionner une identité visuelle du compte. Baseline laissée intacte ; limite explicitement conservée. |

Différences de texte D5, identiques aux trois tailles :

- Accueil : « Wave Orange Money Visa / Mastercard » devient « Carte bancaire internationale · Visa / Mastercard Wave Orange Money ».
- Tarifs : même mise en avant, avec « Paiement par carte bancaire internationale, Wave ou Orange Money (Sénégal et zone UEMOA). ».

Les **9 vues MVP** et **18 vues publiques** ne débordent pas. Aucun `pageerror` dans les vues MVP. Les 15 messages des vues publiques contact/404 sont uniquement des messages `console:` de préchargement protégé/CORS et de ressource 404, déjà documentés dans la référence et la réception E1 ; aucun nouveau défaut JavaScript de page constaté.

La comparaison avant E1 est complétée par **45/45 captures FR/EN/AR identiques au pixel**, sur données et horloge contrôlées face à la référence **avant E6**, et par les tests français existants (notamment le contrat des collecteurs FR sur fixtures). Cette preuve contrôlée ne transforme pas les vues réelles variables ou la baseline incomplète en comparaisons identiques.

Rapports : `identity-public-comparison.json` et `identity-mvp-comparison.json` ; PNG et textes visibles dans `identity-public/` et `identity-mvp/`. Le vrai compte/profil Clerk arabe et la préférence sur deux navigateurs restent à recevoir séparément.


[Galerie des captures E9](../.local-logs/editions-e9/captures.md). Les 45 comparaisons contrôlées masquent seulement canvas, vidéo et décodage tardif du logo, comme E6 ; les captures de QA enregistrent aussi le rendu réel. Les titres FR des fixtures EN/AR ne sont pas des dépêches amont ni une preuve de traduction des titres.

### Flux réels — relevé du 13/10 vers 20:07 UTC (Africa/Dakar)

| Édition | Noyau / complément | Ancien | KO | Observations |
| --- | --- | --- | --- | --- |
| FR, 36 | 25 / 5 (**30 exploitables**) | 2 | 4 | AIP, Gabon Review, Financial Afrik hors délai ; Jeune Afrique 403 ; Radio Okapi et Ecofin anciens. Le signal de langue indéterminée concerne Radio Okapi ancien. |
| EN, 85 | 69 / 13 (**82 exploitables**) | 0 | 3 | Fana, Eye Radio et SABC hors délai ; pas de langue erronée. Les sources désactivées sont incluses dans ce diagnostic, sans réactivation. |
| AR, 41 | 37 / 4 (**41 exploitables**) | 0 | 0 | RT Arabic inclus ; pas de langue erronée. |

Aucune avance résiduelle ni flux au-delà d'1 Mo. Diagnostic ponctuel, aucune garantie de disponibilité future ni source déclarée saine en base. Sources FR inchangées, R1–R5 restent ouverts.

## EDI-902 — documents et suite

[Dossier global avec les 43 tickets](validation-editions-2026-10-11.md), backlog, progression, contexte, prompt de reprise et [nouvelle passation fin E9](passation-editions-fin-e9-2026-10-13.md) actualisés. La [check-list EDI-903](checklist-publication-editions-e9-2026-10-13.md) est préparée **sans exécution** : sauvegarde Railway restaurable, migration 0021 via `db:migrate:deploy` avant le code, accord distinct `EDITIONS`, SHA/santé/E2E distants et scripts privés à adapter.

## Limites et travaux humains

- **D7 reste en attente** : EDI-404 n'est pas reçu. [Notice arabe](relecture-arabe-e4-2026-10-12.md), CSV de **1 175 textes**, plus les **228 titres annotés** de `src/lib/fixtures/editions/titles-ar.json`.
- **Relecture juridique à faire** : traductions EN/AR des CGU/confidentialité et décision sur les mentions FR de `al_edition`, de la mémorisation locale de la suggestion et de `users.preferred_edition`. Le texte FR n'est pas modifié dans E9.
- **Vraie session Clerk à recevoir** : compte/profil/Radar/TV arabes et préférence d'édition sur deux navigateurs. E9 reçoit des widgets réels anonymes et des parcours MVP/simulés, sans piloter le profil Edge du propriétaire. La preuve réelle EDI-603 au compte MVP reste celle d'E6 (valeur d'origine remise).
- **R1–R5** restent à décider après les mesures de semaine ; sources FR conservées. EN à froid peut demander « Try again » après 15 s. Nation et Eye Radio restent désactivés ; les autres intermittences restent signalées.
- Le pont lit uniquement les autres caches valides depuis moins de 5 minutes, sur la même instance ; aucune collecte supplémentaire. Manifeste PWA et administration FR, image d'accueil montrant l'interface FR : limites conservées.
- Aucun paiement réel ni lecture d'un média amont pendant les bancs synthétiques. Aucun commit, push, déploiement, migration supplémentaire, action Railway/Clerk/DNS/OVHcloud ou modification de la tâche Windows.
