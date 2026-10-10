# Validation locale des correctifs — 9 octobre 2026

Les 21 défauts B01–B20/A1 sont corrigés et reçus par leurs tests locaux dédiés.
Réception finale au 10 octobre 2026, Africa/Dakar : 37 tickets locaux vérifiés ;
BUG-903 conserve les réserves d'appareils/profils et BUG-904 reste conditionnel.
Le code et les nouveaux tests sont non committés, non publiés.

Mandat : plan B01–B20/A1, lots L0→L7 séquentiels. Référence `e4ff28f`.
Aucun commit, push, déploiement, changement distant, paiement réel ni recontrôle
global autorisé. Source IPTV et fichiers `.env*` préservés.

## L0 — préparation

- Arbre initial : quatre documents suivis modifiés (`contextellm.md`, notes VLC,
  checklist et progression) ; cinq documents non suivis d'audit/plan/diagnostic.
- Aucun listener sur 3001 au début. Aucun serveur tiers arrêté.
- Guides Next 16.3.8 installés lus : routes, proxy, frontière client/serveur,
  sécurité des données et Playwright. Types Clerk locaux à utiliser en L4.
- Preuves historiques disponibles sous `.local-logs/audit-2026-10-09/` ; elles
  attendent les symptômes et ne constituent pas des tests de correction.
- Nouveau banc de composants réservé aux tests E2E, sans route Next publique.
  Données fournisseurs interceptées ; vrai hls.js pour le lecteur.
- Tests SQL : uniquement runner existant et schémas temporaires validés dans
  `africa_live_dev`. Empreintes locales conservées hors Git.

## Journal de réception

| Lot | État | Preuves / limites |
|---|---|---|
| L0 | Vérifié localement | Banc portable et empreintes de huit tables publiques conservées hors Git |
| L1 | Vérifié localement | Tests rouges reçus, 31 unités ciblées + 13 accès/entitlements ; 25 intégrations isolées ; build, types et lint ciblé ; 13 E2E build hors MVP |
| L2 | Vérifié localement | 15 E2E lecteur/mobile puis 3 popup/retard, 12 unités ; types/lint ciblés verts |
| L3 | Vérifié localement | 16 nouveaux tests de ressources, contrôles réseau/SSRF, persistance worker/résolveur isolée ; inventaire sans réseau |
| L4 | Vérifié localement | 35 intégrations ; migration 0020 isolée puis locale après sauvegarde/restauration ; types/lint/drift verts |
| L5 | Vérifié localement | 37 intégrations, 16 composants, 391 unités ; UI : 33 réussis puis un scénario corrigé/rejoué reçu |
| L6 | Vérifié localement | Sept composants (résumé reçu séparément), 20 parsing/délais ; 64 E2E Radar réussis, worker de build reçu séparément |
| L7 | Vérifié localement avec réserves BUG-903/904 | 404 unités, 40 intégrations, composants/application, types/lint/build/migrations/invariants/audit ; nettoyage et handoff |

## Réserves distinctes

BUG-903 : appareils physiques et profils Clerk réels non reçus.
BUG-904 : publication conditionnelle ; aucune action distante réalisée.
Les classifications et droits historiques ne sont pas réparés par ces tests.

Complément postérieur à cette réception : **BUG-905 hydratation du bouton Clerk**,
signalé pendant l'essai local du propriétaire, corrigé et reçu dans
[son dossier distinct](hydratation-clerk-2026-10-10.md). Le bouton et le Radar ont
été vus avec sa session Clerk réelle après rechargement ; les autres profils,
appareils et parcours de BUG-903 gardent leurs réserves. Le serveur du propriétaire
est resté actif sur 3001 durant cette correction.

## L1 — BUG-101 à BUG-104 (B01/A1)

- Rouge : paiement `completed` avec ancienne URL ne rendait aucun résultat ;
  A1 retournait `expired` au lieu de `trial`. Reproductions exécutées avant code.
- Politique pure terminal/incertain ; URL actionnable seulement pour `pending`.
  DTO terminal sans ancienne URL, valeur historique SQL préservée.
- Clé et identifiant de tentative stockés ensemble en session ; repli mémoire
  lors de getter/méthode Storage refusé. Verrou synchrone du double clic.
  Confirmation nettoie seulement le même forfait et le même identifiant.
- Réservation SQL : `pending` protège aussi les autres nouvelles clés. Ancienne
  clé terminale reste idempotente et attribution par utilisateur inchangée.
- Repli essai : agrégat serveur de remboursements vérifiés d'achats déjà honorés,
  zéro achat completed restant, uniquement abonnements NabooPay expirés.
  Aucun autre fournisseur ni refus/past_due n'est contourné. Essai original,
  historique, grâce et montants conservés ; aucune réparation SQL réelle.
- Commandes : `npx tsx --test` (payment/refund/access/entitlements),
  `npm run test:integration` (25/25, ≈55 s), `npx tsc --noEmit --incremental false`,
  `npm run build` hors MVP local, lint ciblé puis E2E auth-entry/payment (13/13).
  Catalogue et témoin de quota inchangés. Aucun achat réel.
- Composants : huit combinaisons terminal/URL, reload incertain/double clic,
  invalide/réseau/Storage refusé et confirmation A face à B en attente.
- Réception physique remboursement/paiement et véritables sessions reste BUG-903.

## L2 — BUG-201 à BUG-204 (B02/B06/B12)

- Trois reproductions rouges exécutées avant modification (manifeste 404,
  MP4 chargé avant clic, dock supprimé après popup refusée).
- Délai de préparation média 15 s dans tous les modes, indépendant des délais
  résolution et première image. HLS arrête ce délai au manifeste parsé ; natif
  Éco attend le clic avant source/chargement/délai. Aucune télémétrie started
  avant l'événement de lecture réelle.
- Manifeste/variante fatal et HTTP 401/403/404/451 : fin de tentative, sans
  startLoad aveugle. Relances hls.js internes conservées (503→succès reçu).
  Nettoyage/annulation et garde de génération après changement/démontage.
- Refus/exception popup : résultat propagé, dock conservé, même vidéo encore
  en lecture. Fermeture uniquement après lancement/navigation réussi.
- E2E sur vrai hls.js dans Edge, flags locaux désactivés : 404/403, deadline,
  503 puis succès, source suivante saine, zéro requête MP4 Éco pendant 30 s,
  lecture après clic, réponse tardive après zapping, vidéo persistante au refus.
  Sept scénarios mobile-vlc existants reçus par le banc portable.
- Safari natif/iPhone physique et politiques popup des autres navigateurs
  restent BUG-903 ; un user-agent mobile dans Edge n'est pas Safari.

## L3 — BUG-301 à BUG-306 (B03/B04/B05)

- Rouge reçu sur les trois reproductions avant code. Modèle explicite de
  variante/segment/clé/MAP, attributs quotés (virgules dans URI), bases finales
  et byte-ranges explicites. DNS pinning et gardes SSRF conservés partout.
- Bornes : manifeste 1 MiB, segment/init 4 KiB, clé 17 octets maximum lus
  pour recevoir exactement 16 octets. Annulation même si Range est ignoré.
  Requête 15 s par défaut du worker ; sonde complète 60 s (contre un maximum
  antérieur de plusieurs requêtes × trois passages), backoff inclus.
- Protocoles requis et redirections agrégés ; un passage HTTP interdit web,
  sans interdire VLC lorsqu'une preuve positive subsiste. CORS par ressource.
- TS, fMP4 + initialization et ADTS structurels ; AES-128/CBC déchiffre seulement
  le préfixe borné avec IV explicite ou séquence, clé effacée en mémoire.
  Ceci ne certifie pas le décodage intégral. DRM, renditions audio séparées et
  plages implicites non démontrables vont en revue conservatrice.
- Invalidité/preuve incomplète : UNTESTED/STALE/REVIEW_REQUIRED immédiatement,
  sans nouveau lastSuccessAt ni OFFLINE arbitraire. Grâce historique seulement
  pour les pannes réseau ; état sain positif reste reçu.
- Seize nouveaux tests de ressources (sous-cas MIME, clé, init, CORS/protocole,
  AES synthétique, contenu sans fin, deadline et Content-Range invalide).
  Persistance isolée reçue : vraie sonde → update worker → SQL → résolveur web
  strict, sans rajeunir le succès historique. Contrôles réseau/SSRF conservés.
- Inventaire local en lecture seule : `npx tsx src/scripts/inventory-stream-recheck.ts`
  → 6 999 sources actives historiquement BROWSER_OK/VLC_ONLY ; identifiants et
  classifications hors Git dans `.local-logs/bugs-2026-10-09/recheck-candidates.json`.
  Aucun téléchargement de fournisseur ni modification du catalogue.

### Recontrôle futur, séparément autorisé

Les anciennes qualifications ne prouvent pas les nouvelles ressources. Après
autorisation dédiée : relire l'inventaire et sélectionner les identifiants à
recevoir, sauvegarder si une écriture/copie est prévue, sonder un petit lot avec
l'origine staging exacte, inspecter succès/revues et gardes SSRF, puis appliquer
uniquement le lot reçu. Prévoir une sélection explicite d'identifiants dans le
runner avant toute exécution : son option globale `--all` n'est pas une sélection
ciblée. Ne pas lancer le worker, la tâche Windows ou une copie Railway depuis ce
dossier de réception. Date historique de succès conservée ; requalification et
copie distante devront rapporter leurs propres preuves et limites.

## L4 — BUG-401 à BUG-406 (B15/B16/B17)

- Rouge : deux identités reproduites avec horloges incohérentes et delete avant
  create ; API administrative réelle retournait 200 au lieu de 409.
- Migration générée `0020_clerk_identity_revision_and_deletions` : seule colonne
  nullable `users.clerk_profile_updated_at` et table terminale sans email.
  Aucune ancienne migration changée, aucun backfill. Enveloppe Clerk installée
  sans horodatage de suppression déclaré : provider_deleted_at reste nullable.
- SDK et webhook transmettent updatedAt fournisseur ; processedAt et historique
  clerkSyncedAt séparés. Ancienne ligne ambiguë revalidée par SDK serveur avant
  transaction ; indisponibilité → refus contrôlé. Ancien blocage conservé.
- Verrou transactionnel par identifiant absent/présent, partagé avec suppression
  et sessions. Suppression terminale acquittée comme ignorée par le webhook.
- Transition de retrait interdite 409 avant écriture/événement ; clôture avec note
  reste explicite. Une autre demande active protège la source lors d'une levée.
  Réactivation exige une revue/requalification, sans fabriquer de statut sain.
- Publication catalogue/retrait : advisory lock commun avant verrous de lignes,
  contenu de playlist déjà téléchargé avant transaction. Tests déterministes
  par barrières SQL dans les deux ordres (pas de simple timing supposé).
- Sauvegarde locale complète reçue : restauration isolée identique, 23 tables,
  14 505 chaînes, 15 646 sources, 2 comptes, 29 favoris, 20 migrations, ≈4,6 s.
  Dump conservé hors Git `.local-logs/bugs-2026-10-09/pre-0020.dump`.
- 35/35 intégrations ≈70 s ; migration isolée reçue, puis `db:migrate` sur cible
  loopback contrôlée africa_live_dev. `db:check` sans dérive, 21 migrations.
- Compatibilité : ancien code ignore les ajouts mais ne possède pas les nouvelles
  protections terminales ; rollback applicatif ne retire pas la migration. Future
  publication exige sauvegarde distante et `db:migrate:deploy`, séparément autorisés.
- Aucune revalidation réelle Clerk, réparation de profil ni retrait réel durant
  la réception. Une session Clerk bannie réelle reste une réception BUG-903.

## L5 — BUG-501 à BUG-507 (B07/B08/B09/B10/B11)

- Trois reproductions rouges : Storage empêchait GET, ancien cache faisait PUT,
  et 429 empêchait tout nouveau GET après expiration.
- Adaptateur JSON avec résultat de persistance et véritable mémoire de repli ;
  getter/méthodes Storage refusés, JSON invalide et suppression reçus. Notice VLC
  protégée. Message « cet appareil » ou « cette page » selon résultat réel.
- DTO propriétaire serveur minimal, comparé à l'identité Clerk courante côté
  client ; propriétaire local distinct seulement en MVP validé. Aucun appel API
  avant identité connue. Files/stores/quotas par propriétaire, callbacks abortés
  et ignorés après changement ; précondition de propriétaire à l'API (refus 409,
  jamais utilisée comme autorisation) empêche une intention A attribuée à B.
- Anciennes clés sans propriétaire conservées, aucun transfert automatique.
  Aperçu/import explicite dédupliqué ; reprise depuis Compte, marqueur par compte.
  Payloads de namespace malformés ou propriétaire incorrect mis à part localement.
- Compte canonique, intentions desired/revisions UUID, primaire distinct. GET pays
  `{countries,version,owner}`, PUT avec `baseVersion` et propriétaire ; hash de la
  liste ordonnée comparé sous verrou utilisateur. 409 renvoie état courant, rebase
  de seules intentions actives (trois conflits maximum). Limite de cinq conservée.
- Favoris : limite commune 100 ajouts/100 retraits, lots sérialisés ; acquittement
  des seules révisions envoyées. Échec du second lot ne rejoue pas le premier ;
  chaîne inconnue peut être filtrée par la réponse canonique. Vingt lots par tâche,
  puis reprise planifiée si nécessaire, aucun Promise.all de mutations.
- Quota : Retry-After secondes/date, repli 5 s ; deadline persistée par propriétaire,
  nouveaux choix ne la repoussent pas. Trois 429 automatiques maximum, puis geste
  de reprise ; refus 401/403 sans retry jusqu'au rechargement/identité rétablie.
  Délai API 15 s jusqu'à lecture complète du corps ; nettoyage au démontage.
- 16 composants dans Edge : 0/100/101/250 ajouts, 101 retraits/échec partiel,
  inversion en vol, A→B→A, identité inconnue, getter refusé/remontage, deux onglets,
  cache obsolète, conflit/rebase, quotas GET/PUT et 403. 37 intégrations dont API
  réelle avec dépendances d'autorisation contrôlées ; attribution A/B vérifiée SQL.
- `npm test` : 391 réussis, 35 intégrations ignorées à cette étape ; celles-ci
  n'ont pas été comptées comme succès. Types/lint verts. UI MVP : 33/34 puis
  scénario catalogue favoris corrigé et reçu séparément (33 + 1 reçus).
- Première tentative UI sur 127.0.0.1 refusée par garde Next/Host existante ;
  réception correcte sur localhost:3001, garde conservée. Compte/chaîne techniques
  créés par le script de fixture, puis nettoyage après serveur arrêté.
- Contrat de publication : client/serveur ensemble ; ancien onglet sans version
  ou propriétaire reçoit 409 invitant à recharger, sans écriture inconditionnelle.
  Ajouts SQL uniquement L4 ; aucune nouvelle table de préférence.

## L6 — BUG-601 à BUG-606 (B13/B14/B18/B19/B20)

- Cinq reproductions rouges exécutées, puis reçues : Old après New, SN erreur
  puis CI, GW/GQ/SS/CI, lien Atom self et emoji décimal/hexadécimal.
- LatestRequestController par ressource ; intervalle remplace/annule la demande
  précédente. Refresh invalide synchroniquement RSS/résumé/pays ; aucune erreur
  ou finally dépassé(e) appliqué(e). Délai API 15 s incluant corps, même si le
  transport de test ignore l'abort. Collecte/window asOf reçus du snapshot.
- Ressource pays : clé, token de refresh et génération de sélection ; ancienne
  erreur filtrée dès le rendu. Abandon annule wanted, liste vide/refus courant
  produisent l'issue du bon pays. Résumé des chaînes reçu séparément (même motif,
  aucun nouveau défaut ajouté au total).
- Pays : accents/apostrophes/tirets/espaces normalisés sur texte et alias.
  Multi-pays : davantage de mots, puis longueur, première occurrence, code ISO.
  Sujet inconnu → pays de rédaction et countryBasis=media ; seule une catégorie
  réellement extraite du sujet peut contribuer à inferred_topic.
- Atom : alternate/no-rel HTML/XHTML, priorité MIME humain, lien technique ignoré ;
  bases feed→entry→link à partir de l'URL finale réelle du document. HTTP(S) sans
  identifiants, puis canonicalisation/ID existants. Pas de parseur XML général.
- Unicode : une seule passe, fromCodePoint pour scalaires 1..10FFFF hors surrogates ;
  zéro et valeurs invalides → U+FFFD. CDATA/nettoyage conservés, texte React échappé,
  limite de 300 unités UTF-16 sans couper une paire. Aucun HTML injecté.
- Sept composants Edge reçus : périodique/manuel, erreur ancienne, CI vrai refus,
  liste vide, abandon et résumé. 20 tests ciblés parsing/image/délais, types/lint.

## Compléments de revue L1/L3/L4/L5

- Création de paiement : remplacement atomique de métadonnées par clé attendue,
  et adoption de la vraie clé d'une réservation incertaine renvoyée par le serveur
  (DTO privé `idempotency_key`). Évite une clé sans réservation après retour d'une
  tentative concurrente. A tardif n'écrase pas B ; clé historique SQL inchangée.
  En-tête de protocole checkout `2` exigé : ancien onglet reçoit 409/rechargement
  avant réservation fournisseur. Cet en-tête ne remplace aucune authentification.
- Lecture des essais après trace sans profil : décision bloquée sans faux user,
  réponse API 403 cohérente. Ancienne session active ne reconstitue pas un profil.
- Sonde : clé du MAP capturée lors de sa déclaration, indépendante de la clé du
  segment ; clés uniques chargées une fois puis effacées en mémoire. MP3 aligné
  reçu, boîtes MP4 vides refusées. Lectures copient seulement le préfixe retenu.
- Plage explicite : statut 206, Content-Range cohérent et longueur bornée reçus ;
  réponse de mauvaise plage ou corps incomplet ne prouvent pas l'initialisation.
- Confirmation : changement d'order_id remonte la tentative et annule l'ancien
  polling ; aucun statut ou nettoyage d'une précédente commande réutilisé.
- Défaut déterministe de cible privée/URI/redirection → revue immédiate, aucune
  grâce réseau sur une décision de sécurité. Succès VLC positif renouvelle une
  preuve média ; il ne constitue jamais une preuve web.
- Stockage du zapping facultatif avant popup, y compris getter Storage refusé.
  Grille favoris invalidée sur le changement canonique après accusé de réception.
- Revue finale B04 : une seconde trame ADTS limitée à son en-tête était acceptée.
  Test rouge reçu, puis contrôle de longueur des deux trames et fréquence valide :
  deux trames audio positives, une seule ou seconde tronquée refusées. Test
  ajouté au dépôt, unités/build/types et lint du changement reçus de nouveau.

## Correspondance individuelle des 21 défauts

Les scénarios ci-dessous testent le comportement corrigé ; leurs versions rouges
ont été reçues au début du lot (ou par les reproductions d'audit pour le même
motif). Tests transportables dans le dépôt, sans dépendance à `.local-logs`.

| Défaut | Cause corrigée | Preuve dédiée |
|---|---|---|
| B01 | Statut avant URL, cycle de clé, réservation et réponse tardive | payment.test ; composants payment (14), E2E payment ; API checkout/status isolées |
| A1 | Repli de l'essai original prouvé par le serveur | refund-trial.test et achat/remboursement J1→J5 PostgreSQL ; boundary J5/replay/refus |
| B02 | Manifeste fatal et préparation/reprise bornées | Composant vrai hls.js 404/403/503, deadline, source suivante, zapping tardif |
| B03 | Protocoles/CORS de toutes les ressources effectivement requises | stream-resource-regressions : HTTP/CORS manifeste, init, segment et clé ; URLs finales |
| B04 | Préfixe média positif, vide/JSON/texte invalides | TS/fMP4/AAC/MP3 structurels, MIME trompeur, corps sans fin, boîtes vides et annulation |
| B05 | Clé AES et MAP obligatoires, clé du MAP indépendante | Clé 403/taille/DRM, AES-CBC synthétique, init/range et METHOD=NONE ; propagation SQL/résolveur |
| B06 | URL native préparée sans source affectée avant geste | MP4 natif réel : zéro requête pendant 30 s Éco, puis image après clic |
| B07 | Lots et révisions acquittées individuellement | Favoris 0/100/101/250, 101 retraits, second lot échoué, inversion concurrente |
| B08 | Getter/lecture/écriture/suppression Storage peuvent échouer | SafeStorage, quota rempli, getter refusé, API encore appelée, mémoire/remontage, notice protégée |
| B09 | Compte canonique, intentions et CAS | Cache seul sans PUT, conflit/rebase, deux onglets et suppression durable ; API réelle isolée |
| B10 | Propriétaire prouvé et frontière serveur | A→B→A, réponse A tardive, identité inconnue, anciennes clés gardées ; aucune écriture SQL B sous owner A |
| B11 | Quota temporaire distinct du refus d'accès | Seconds/date/fallback, échéance GET/PUT et remontage ; aucun retry 403/online |
| B12 | Résultat popup contrôlé avant fermeture | Null/exception : même vidéo encore en lecture ; dock TV et chemin générique après navigation |
| B13 | Génération pour succès/erreur/finally | Old/New, manuel, corps bloqué, cleanup ; résumé reçu séparément |
| B14 | Erreur et données indexées par pays/génération | SN échoue puis CI joue ; CI erreur/vide et abandon sans lecture tardive |
| B15 | Révision fournisseur distincte du traitement | Événement plus récent après premier profil, ancien/replay, horloge locale décalée, historique/revalidation |
| B16 | Suppression terminale, même avant ligne users | Delete→create, barrières SQL dans les deux ordres, aucune réintroduction d'email ; sessions consultent la trace |
| B17 | Transition et publication retrait sérialisées | API réelle 409 sans événement, import/disable dans deux ordres ; autre retrait actif et levée explicite |
| B18 | Alias spécifiques normalisés et priorité documentée | GW/GQ/SS/CI, accents/tirets, GN/SD vrais, Nigeria/Niger, ambiguïté et repli rédaction |
| B19 | Lien humain Atom et base réelle | Self avant/après, alternate/no-rel HTML/XHTML, xml:base et URI relatives ; unsafe/techniques refusés |
| B20 | Scalaires Unicode, décodage unique et limite sûre | Emoji décimal/hex, BMP, 10FFFF, surrogates/zéro/invalides, CDATA et balises échappées |

## Fiches de réception des tickets

Champs communs des 37 fiches locales : **Vérifié localement**, réception finale
du 10 octobre 2026 (Africa/Dakar). Les dépendances indiquées ont été reçues dans
l'ordre L0→L7. La colonne « constat / changement / fichiers » donne la cause,
la décision et les fichiers principaux ; les sections de lot précisent les
compatibilités et bornes. Les commandes, modes, résultats et cas ignorés sont
consignés au bilan final ci-dessous, avec les limites BUG-903/904. Les données
synthétiques ont été créées dans des schémas isolés ou par le marqueur de fixture
UI, puis nettoyées ; aucune donnée fournisseur/profil réel réparée.

Chemins abrégés : les modules sans préfixe sont dans `src/lib/`, les composants
dans `src/components/`, les routes/pages dans `src/app/`. Les tests de composant
`payment`, `player`, `mobile-vlc`, `preferences`, `radar` sont dans
`e2e/components/`. Cette table complète la correspondance des 21 symptômes ;
plusieurs tickets reçoivent la même cause avec des contrats/consommateurs différents.

| Ticket | Dépendances reçues | Constat / changement / fichiers principaux | Non-régression et contrôle positif reçus |
|---|---|---|---|
| BUG-000 | — | Arbre sale et données réelles à préserver ; inventaire Git/listener, empreintes et hashes privés. Journal L0 et dossier de validation. | Huit empreintes avant/après égales, `.env*` et anciennes migrations intactes ; listener initial/final absent. |
| BUG-010 | BUG-000 | Preuves d'audit dépendaient du poste ; banc autonome, frontières simulées hors application. `e2e/components/server.mjs`, `entry.tsx`, `playwright.components.config.ts`, `e2e/helpers/load-source.ts`, CI. | 53 composants réels et vraies routes API en schémas isolés ; aucun import de `.local-logs` ni nouvelle route publique. |
| BUG-101 | BUG-010 | URL terminale primait sur statut ; politique des sept états et DTO terminal sans URL actionnable. `payment-attempt-policy.ts`, `payment-contracts.ts`, checkout route. | `payment.test.ts`, matrice terminal avec/sans URL ; pending reste incertain. |
| BUG-102 | BUG-101 | Clé terminale réutilisée, confirmation/tardif pouvaient effacer B ; métadonnées et CAS local. `checkout-attempt.ts`, pricing/page, success/SuccessClient. | 14 composants payment, quatre statuts en E2E application ; reload, double clic, A/B, réseau/Storage ; nouvelle clé seulement au clic. |
| BUG-103 | BUG-010 | Ligne expired masquait l'essai restant ; preuve agrégée serveur, contexte faux par défaut. `refund-trial-access.ts`, `access-control.ts`, `access-policy.ts`, `require-app-access.ts`. | `refund-trial.test.ts` et `naboopay-payment.integration.test.ts` : J1→J5 exact, replay, autre achat/droits prioritaires, refus. |
| BUG-104 | BUG-102, BUG-103 | Frontières client/réservation/accès à recevoir ensemble ; pending bloque une nouvelle réservation, ancien protocole 409. `payment-creation-store.ts`, intégrations concurrence/NabooPay et `e2e/payment.spec.ts`. | Ancienne clé terminale idempotente et historique intact ; route checkout réelle zéro fournisseur, autre compte 404 ; 13 E2E build auth/paiement. |
| BUG-201 | BUG-010 | startLoad ne rechargeait pas le manifeste fatal, attente non bornée hors local ; préparation/reprise 15 s et générations. `player/useMediaLifecycle.ts`, `Player.tsx`. | Composants player : vrais 404/403, corps bloqué, 503→succès, source suivante saine, un échec et callbacks dépassés. |
| BUG-202 | BUG-201 | `src/load` natifs exécutés avant geste ; URL préparée et chargement synchrone séparés. Mêmes hook/Player. | MP4 réel zéro requête Éco pendant 30 s, puis lecture après geste ; HLS natif Safari reste réserve physique. |
| BUG-203 | BUG-010 | Dock fermait même après refus popup ; résultat propagé et fermeture après succès. `player/PlayerDock.tsx`, app/page, `radar/useRadarPlayer.ts`, `player-window.ts`. | Composants null/exception avec même vidéo ; deux E2E TV/générique après navigation, vidéo continue. |
| BUG-204 | BUG-201, BUG-202, BUG-203 | Réception du cycle complet, nettoyage, Éco/autoplay/mobile ; tests player et mobile-vlc, `e2e/player-dock.spec.ts`. | Neuf composants player + sept mobile-vlc ; app TV/streaming/dock reçue ; ouvertures natives simulées et appareils non certifiés. |
| BUG-301 | BUG-010 | Sonde limitée au manifeste/segment ; modèle key/MAP/range/variant et transport borné. `hls-probe-resources.ts`, `stream-verification.ts`, `safe-upstream-fetch.ts`. | `stream-resource-regressions.test.ts` : URI relative/virgule, clés actives, plage ; 4 KiB/corps infini/deadline ; gardes SSRF positives/négatives existantes. |
| BUG-302 | BUG-301 | Ressource ou redirection HTTP/CORS absent omise ; agrégation effective de chaque transport requis. Mêmes sonde/transport. | HTTP/CORS sur manifeste, segment, clé et MAP/final URL ; HTTPS complet web positif, preuve média seulement VLC. |
| BUG-303 | BUG-301 | HTTP/MIME trompeur suffisait ; préfixe structurel et invalidité/incomplétude explicites. `hls-probe-resources.ts`, sonde. | JSON/XML/texte/vide/octets arbitraires, boîtes vides refusés ; TS/fMP4/MP3 structurels positifs, lecture plafonnée. |
| BUG-304 | BUG-301 | Clé/init indispensables non reçus ; key 16 octets, AES-CBC/IV, clé du MAP indépendante, Content-Range reçu. Mêmes modules. | Clé 403/taille/DRM, vrai AES synthétique, MAP+METHOD=NONE, initialisation/plages ; aucun contenu de clé dans résultat. |
| BUG-305 | BUG-302, BUG-303, BUG-304 | Ancienne qualification survivait à preuve invalide ; worker produit revue/stale sans nouveau succès. `src/scripts/verify-streams.ts`, sonde. | `stream-evidence.integration.test.ts` : sonde→worker→SQL→résolveur strict, date historique égale ; pannes réseau historiques conservées. |
| BUG-306 | BUG-305 | Historique non réévalué par seul code ; fixtures structurelles et inventaire/plan de reprise. Tests stream, `src/scripts/inventory-stream-recheck.ts`. | 16 nouveaux tests ressources + persistance isolée ; 6 999 candidats inventoriés sans sonde upstream ; procédure ciblée ci-dessus. |
| BUG-403 | BUG-010 | Pas de révision fiable ni suppression sans profil ; migration additive générée. `src/db/schema.ts`, `drizzle/0020_*`, snapshot/journal. | Installation isolée, sauvegarde/restauration vérifiée puis 21 migrations locales ; drift/journal verts, anciennes vingt identiques, compatibilité/rollback documentés. |
| BUG-401 | BUG-403 | Horloges SDK/webhook/traitement confondues ; updatedAt fournisseur séparé, revalidation avant verrou. `identity.ts`, webhook Clerk route. | `identity-regressions.integration.test.ts` : récent/ancien/replay, horloge décalée, ligne historique/disponibilité/valeur invalide ; blocage conservé. |
| BUG-402 | BUG-403, BUG-401 | Delete avant create perdu, session pouvait recréer ; tombstone terminal et advisory par identifiant absent/présent. `identity.ts`, webhook/access. | Delete→create, concurrence SQL déterministe dans les deux ordres ; email non réintroduit, session/accès refusés sans faux user. |
| BUG-404 | BUG-010 | API autorisait sources_disabled→in_review ; transition serveur refuse avant mutation/événement. `support-request-contracts.ts`, API admin contact-requests/[id]. | `takedown-regressions.integration.test.ts` : vraie API409 sans événement, 401/403 ; clôture avec note reste explicite. |
| BUG-405 | BUG-404 | Import pouvait réactiver sous concurrence ; advisory publication commun avant verrous de lignes. `catalog-publication-lock.ts`, `catalog-import.ts`, API admin. | Import/retrait dans deux ordres par barrières SQL ; seconde demande active protège, dernière levée impose revue/requalification. |
| BUG-406 | BUG-401, BUG-402, BUG-403, BUG-404, BUG-405 | Réception des producteurs/transactions/migration ; tests identity/takedown, loader de vraie API. | Intégrations isolées actuelles : 40/40 ; réseau Clerk remplacé uniquement aux frontières de test, aucun profil/admin réel modifié. |
| BUG-501 | BUG-010 | Storage pouvait bloquer le flux et compte indéfini écrire ; adaptateur facultatif et propriétaire prouvé. `safe-storage.ts`, `shell/PreferenceOwnerContext.tsx`, `AccountPreferences.tsx`, AppShell/layout/account. | `preferences.test.ts`, composants : getter/méthodes refusés, mémoire/remontage, identité inconnue zéro API ; owner A sous auth B refusé SQL. |
| BUG-502 | BUG-501 | Anciennes clés sans propriétaire transférées ; namespaces et preview/import explicite récupérable. `preference-store.ts`, `storage-keys.ts`, `shell/FollowedCountriesSync.tsx`, AccountActivity. | Anciennes clés conservées sans PUT, payload incorrect écarté ; A→B→A et cache partagé inconnus ; API reste autorité. |
| BUG-503 | BUG-502 | Cache obsolète ressuscitait suppression ; intentions/révisions, GET versionné et CAS sous verrou. `country-version.ts`, `followed-countries-store.ts`, API followed-countries, sync client. | Deux onglets, cache seul sans mutation, suppression, conflit/rebase borné ; vraie API409/canonique, ancien contrat sans version refusé. |
| BUG-504 | BUG-503 | 429 permanent ou repris trop tôt ; Retry-After/deadline par compte et trois relances maximum. `preference-contracts.ts`, `preference-sync-client.ts`, store. | Seconds/date/repli, GET/PUT/remontage/échéance exacte ; nouveaux choix ne prolongent pas, 403 ne relance pas sur online. |
| BUG-505 | BUG-501, BUG-502 | Lot >100 rejeté et acquittements écrasaient clic concurrent ; sérialisation/révisions communes. Sync/store, `favorite-sync.ts`, API favorites/api-contracts. | 0/100/101/250 ajouts, 101 retraits, échec second lot et inversion en vol ; seules révisions reçues retirées, aucun replay premier lot. |
| BUG-506 | BUG-502, BUG-503, BUG-504, BUG-505 | Consommateurs lisaient ancien store ; hooks courants et notice Storage sûre. `shell/usePreferences.ts`, FollowCountryButton/FollowedCountriesSync, `tv/hooks.ts`, useFavorites, AccountActivity. | UI pays/TV/favoris, clé propriétaire et principal ; revision grille au changement canonique ACK reçue après correction. |
| BUG-507 | BUG-506 | Frontières compte/onglets/API/quota à recevoir ensemble ; tests preferences et UI consommateurs. | 16 composants, intégrations API réelles, 34 UI (33 puis cas favoris corrigé/rejoué) ; offline/mémoire sans attribution automatique à autre compte. |
| BUG-601 | BUG-010 | Ancien RSS ou finally remplaçait le plus récent ; contrôleurs latest et fetch+body15 s. `radar-request.ts`, `radar/useRadarData.ts`. | Composants Old/New, manuel, erreur/finally tardifs et résumé ; `rss-regressions.test.ts` corps bloqué/abandon. |
| BUG-602 | BUG-601 | Erreur SN annulait lecture CI ; ressource par pays/token/epoch et abandon wanted. `radar/useRadarCountry.ts`, `useRadarPlayer.ts`, `useRadarData.ts`. | SN erreur→CI lecture ; vrai refus CI, vide et abandon sans lecture tardive ; filtrage dès rendu. |
| BUG-603 | BUG-010 | Alias général avant spécifique, ponctuation différente ; normalisation et priorité multi-pays documentées. `rss-collector.ts`. | GW/GQ/SS/CI, GN/SD, Nigeria/Niger, accents/tirets/apostrophes, choix ambigu déterministe et repli rédaction. |
| BUG-604 | BUG-010 | Premier lien Atom technique choisi ; alternate/no-rel HTML/XHTML et xml:base/final document URL. `rss-collector.ts`. | Self avant/après, enclosure/edit ignorés, MIME humain et URI relatives ; protocoles/identifiants dangereux refusés, RSS existant vert. |
| BUG-605 | BUG-010 | fromCharCode tronquait non-BMP ; fromCodePoint validé en passe unique, limite UTF-16 sûre. `rss-collector.ts`. | Décimal/hex/BMP/10FFFF, invalides/zéro/surrogates, CDATA/balises ; texte échappé et paire non coupée. |
| BUG-606 | BUG-601, BUG-602, BUG-603, BUG-604, BUG-605 | Réception des cinq causes Radar/parsing et consommateurs. Tests composants radar, rss et E2E radar-* existants. | Sept composants, 20 unités ciblées, 64 E2E app ; worker build reçu séparément, aucun nouvel appel de média fournisseur. |
| BUG-901 | BUG-104, BUG-204, BUG-306, BUG-406, BUG-507, BUG-606 | Bilan courant nécessaire, succès d'audit insuffisants ; matrice finale, diff et hashes, nettoyage. | 404 unités, 40 intégrations, contrôles et E2E ci-dessous ; preuves dédiées aux 21 défauts, restauration et empreintes inchangées. |
| BUG-902 | BUG-901 | Handoff/backlog reflétaient « aucune correction » ; dossier/tables/contrats/risques et état final. `docs/validation-*`, backlog, contextellm, progression, checklist, matrice environnements. | 37 statuts locaux reçus ; date finale 10 octobre, réserves BUG-903/904 et données historiques distinctes, aucune publication implicite. |
| BUG-903 | BUG-901, BUG-902 | **À recevoir sur appareil/profil.** Moteur Safari/HLS natif, iOS/Android physiques, vrais profils Clerk et paiement/remboursement. | Edge/user-agent et mocks sont reçus ; aucune preuve physique nouvelle ni paiement réel. Ancienne réception CNews du 6 octobre reste limitée à ce parcours publié. |
| BUG-904 | BUG-902, réserves BUG-903 | **Conditionnel — non autorisé.** Préparation documentaire de sauvegarde/migration/compatibilité/rollback/recontrôle. | Checklist ci-dessous prête ; aucun commit/push/déploiement ou changement distant exécuté. |

## Bilan final des commandes et conservation

Les nombres du journal de lots sont ceux obtenus à chaque étape ; les résultats
suivants sont la référence finale. Les mêmes scénarios rejoués ne sont pas des
défauts supplémentaires. Logs privés conservés sous
`.local-logs/bugs-2026-10-09/` ; les tests du dépôt ne les importent pas.

| Commande / mode | Résultat reçu | Trace privée |
|---|---|---|
| `npm test` ; guard réseau unitaire | 444 tests : **404 réussis, 40 intégrations ignorées, 0 échec** ; ≈11,2 s | `reception-unit-2026-10-10.log` |
| `npm run test:integration` ; schémas aléatoires dans `africa_live_dev`, migrations complètes | **40/40**, ≈76 s après dernier ajustement ADTS ; quota témoin et catalogue public conservés, schéma supprimé | `reception-integration-2026-10-10.log` (précédent passage : `final-integration.log`) |
| `npx tsc --noEmit --incremental false`, `npm run lint` ; ESLint ciblé rejoué sur les deux fichiers ADTS après ajustement | Code retour0, aucun diagnostic | `reception-types-2026-10-10.log`, `reception-lint-2026-10-10.log`, `reception-aac-lint-2026-10-10.log` |
| `npm run build` ; rôle local, MVP/lecture locale/VLC desktop tous false par processus | Build strict réussi après revue ADTS, aucune écriture `.env*` | `reception-build-2026-10-10.log` |
| `npm run db:check`, `npm run db:check:migrations` | Aucune dérive, journal valide ; 21 migrations locales après ajout 0020 | Contrôle final terminal et `l4-drift.log`, `l4-migrate.log` |
| `npm run test:invariants`, `npm audit --omit=dev` | **4/4**, aucune vulnérabilité de dépendance production | Contrôle final terminal ; pas de nouveau scan SAST attesté |
| `npx playwright test -c playwright.components.config.ts` ; banc indépendant, vrai hls.js/React, public playback | **53/53**, ≈50 s ; 14 paiement rejoués après dernier changement, **14/14**, ≈11,9 s | `final-components.log`, `reception-payment-components-2026-10-10.log` |
| `npx playwright test e2e/auth-entry.spec.ts e2e/payment.spec.ts` ; build servi, hors MVP, fournisseur intercepté | **13/13**, ≈22,4 s ; refus anonymes conservés | `final-build-e2e.log` |
| E2E followed-countries/tv-workspace/player-dock/tv-streaming ; MVP fixture possédée, origine localhost:3001 | **34 scénarios reçus : 33 puis un corrigé/rejoué** ; premier échec de grille favoris identifié et corrigé | `l5-ui.log`, `l5-ui-recheck.log` |
| E2E radar-live/workspace/reliability/weather ; même MVP, données interceptées | **64 réussis, 1 ignoré** (worker exige un build), ≈2,3 min | `final-radar-ui.log` |
| E2E radar-reliability `--grep 'Build servi'` ; build strict servi, mode anonyme de test local | Worker réel/module et refus dashboard **1/1**, ≈4,8 s ; reçoit le cas ignoré ci-dessus | `reception-radar-worker-build-2026-10-10.log` |
| E2E player-dock `--grep BUG-203` ; popup refusée sur page TV et après navigation | **2/2**, ≈7,3 s ; même vidéo/time progressent | `final-dock-ui.log` |
| `git diff --check` avec `core.whitespace=cr-at-eol` | Aucun défaut d'espacement ; warnings de normalisation CRLF seuls | `reception-diff-warnings.log`, `reception-git-status-2026-10-10.txt` |

Les variables de test ont été définies uniquement dans les processus concernés.
`E2E_ANONYMOUS_MODE` pour le build est un mode de test local existant, sans
activation distante ; les assertions d'autorisation restent dans les scénarios.
Les fixtures média synthétiques d'`e2e/fixtures` demeurent hors TypeScript/ESLint.
Pas de réception Linux/CI distante ni de nouveau scan Snyk Code dans ce passage.

Sauvegarde locale pré-0020 : restauration isolée reçue avant migration, puis base
de restauration supprimée. Dump privé restorable conservé. Les anciennes vingt
migrations et les fichiers `.env*` ont leurs SHA-256 initiaux ; package/lockfile,
source IPTV et configurations distantes n'ont pas été modifiés.

La fixture UI et sa chaîne ont été supprimées par le marqueur possédé du runner,
ainsi que ses sessions ; le marqueur n'existe plus. Empreintes métier finales
identiques aux initiales pour channels, streams, users (projection des colonnes
préexistantes, la nouvelle révision nullable étant additive), subscriptions,
naboopay_transactions, user_favorites, user_followed_countries, support_requests.
Comptages conservés : **14 505 chaînes, 15 646 sources, deux comptes, 29 favoris** ;
zéro transaction/abonnement/pays suivi/demande de support. Aucune sortie d'email,
secret, clé AES ou contenu `.env` nécessaire à cette preuve.

Contrôle final de l'état additif : 21 migrations, zéro trace de suppression,
zéro révision fournisseur affectée aux profils existants, zéro compte/chaîne de
fixture et zéro schéma d'intégration restant (`reception-state-2026-10-10.log`).

Port 3001 libéré comme à l'entrée ; aucun serveur tiers arrêté. Le futur parcours
MVP doit utiliser `http://localhost:3001` : 127.0.0.1 déclenche le refus Host/Next
existant. Aucun commit/push/déploiement, appel de paiement réel, requalification
globale, changement de tâche Windows, Railway, Clerk, OVHcloud ou DNS effectué.

## BUG-904 — préparation conditionnelle de publication

La publication exige une nouvelle demande. Prévoir : revue du diff complet,
sauvegarde Railway restaurable, migration additive 0020 par `db:migrate:deploy`
avant démarrage du nouveau code, journal 21/21 et contrôle de dérive. Publier
client/serveur ensemble ; anciens onglets préférences sans propriétaire/version
et checkout sans protocole 2 refusés 409, choix en attente conservés/rechargement.

Contrôles staging à recevoir séparément : santé sur les deux domaines,
authentification membre/admin/expiré/bloqué, webhook Clerk authentifié et session
embarquée, droits/essai/remboursement sur profils autorisés, synchronisation
entre appareils, retraits et lecture directe web/VLC. Garder le rôle staging et
les paiements désactivés tant qu'une activation n'est pas demandée.

Un rollback du code laisse les ajouts SQL et réouvre les anciens défauts de
synchronisation/identité. Il n'est pas une réception de ces protections ; définir
la fenêtre et les garde-fous de retour avant publication. Aucune restauration
par-dessus des profils/droits réels depuis ce dossier.

Les 6 999 qualifications historiques demandent un recontrôle ciblé autorisé,
avec sélection explicite et petite réception préalable ; aucune tâche Windows,
requalification globale, synchronisation Railway ou correction de droits réels
n'a été déclenchée. Les appareils/profils réels (BUG-903) restent à recevoir.
