# Checklist de non-régression — lots local et Railway

## Expérience Premium P4 — reçue localement le 3 octobre 2026 (publiée le 3 octobre avec P3 : GitHub `06b662f`, Railway staging `990745ba`, 9/9 E2E distants)

Plan : [plan-experience-premium.md](plan-experience-premium.md) §5.1. Preuves et limites : [production-progress.md](production-progress.md),
section « Lot P4 ». Cases reçues en local uniquement (dev, port 3001). À rejouer à la fin de P5.

- [x] `npx tsc --noEmit` 0 ; `npm run lint` 0 ; build réussi.
- [x] `npm test` : 348 tests, 334 réussis, 14 ignorés, 0 échec ; invariants 4/4.
- [x] E2E mode MVP (14 specs, --workers=1) : 135 tests, 132 réussis, 1 ignoré, 2 échecs au premier passage (320 px et hydratation), corrigés ; specs rejoués 67/67.
- [x] E2E mode Clerk : 8/8 (auth-entry, payment — CTA « Activer pour 990 FCFA », assertion équivalente).
- [x] Parcours NabooPay inchangé (`handleSubscribe` identique), identifiants `lumina_all_access_*` inchangés et jamais affichés (Compte corrigé).
- [x] Aucun chiffre en dur sur la landing : compteur public depuis la base (cache 1 h), aucun chiffre si la base ne répond pas.
- [x] Image du hero produite avec des données fictives (aucun contenu d'éditeur), WebP 41 Ko.
- [x] Aucune migration, aucune dépendance, aucun changement `.env*`, Railway, Clerk (configuration) ou DNS.
- [x] Contrôle visuel 360 / 768 / 1366 px : 0 débordement, 0 texte < 12 px, 0 erreur (landing, /pricing, /sign-in, /sign-up, 404, /pricing/error, /app/live, /app, /app/ui).
- [x] `/account` et `/admin` capturés avec les sessions du propriétaire (UX-214), données personnelles masquées ; widget Profil pleine largeur.
- [x] `@clerk/localizations` 4.9.0 : `@clerk/shared` reste en 4.20.0 (aucune autre dépendance Clerk modifiée) ; build et E2E Clerk 8/8 rejoués.
- [ ] Logos officiels Wave / Orange Money ; appareils Android réels ; Lighthouse : non reçus.

## Expérience Premium P3 — reçue localement le 3 octobre 2026

Plan : [plan-experience-premium.md](plan-experience-premium.md) §5.1. Preuves, mesures et limites :
[production-progress.md](production-progress.md), section « Lot P3 ». **Cases reçues en local uniquement (dev, port 3001) ; P3 committé en local (`412574d`), non poussé ni déployé ;
Railway staging inchangé (P0–P2 y sont publiés).** À rejouer à la fin de chaque lot suivant (P4, P5).

- [x] `npx tsc --noEmit` 0 erreur ; `npm run lint` 0 ; build réussi (Next.js, Turbopack).
- [x] `npm test` : 341 tests, 327 réussis, 14 ignorés (intégrations PostgreSQL), 0 échec ; invariants 4/4.
- [x] E2E mode MVP (14 specs, --workers=1) : 134 tests, 132 réussis, 1 ignoré (test « build servi »), 1 échec de test (course dans le nouveau spec radar-live), corrigé puis rejoué 10/10.
- [x] E2E mode Clerk (dev, anonyme) : 8/8 (auth-entry, payment).
- [x] Découpage UX-301 : 44 E2E radar verts **avant** tout ajout, specs non modifiés à ce stade.
- [x] Aucun relais, conversion ni stockage de média ; image de dépêche chargée par le navigateur depuis l'éditeur (https, sans
  référent), jamais téléchargée par le serveur, absente en mode Éco data ; aucun appel API d'image (E2E).
- [x] Machine de lecture, accès, éligibilité, quotas inchangés ; seul changement d'API : champ optionnel `imageUrl` du flux de dépêches.
- [x] Aucune migration, aucun changement `.env*`, Railway, Clerk ou DNS.
- [x] Fond de carte par défaut sans serveur de tuiles tiers (E2E) : 1 requête / 25 Ko contre ≈ 120 Ko (satellite) ; satellite en option.
- [x] Radar au repos : un rendu toutes les 15 s (≈ 4 ms de CPU entre deux rendus à CPU ×4) ; fil paginé par 12.
- [x] Aucun jargon visible ni couleur hors charte dans le Radar (recherche automatisée) ; 0 débordement et 0 texte < 12 px à 320 / 360 / 768 / 1366 px (E2E).
- [x] Pastille « n nouvelles » : `scrollY` inchangé à l'arrivée d'une dépêche (E2E).
- [x] Contrôle visuel 360 / 768 / 1366 px : Edge, 0 débordement horizontal, 0 texte < 12 px, 0 erreur de page sur /app/live, /app, /app/ui (mode MVP) et landing, /pricing, /sign-in, 404 (mode Clerk) ; captures docs/screenshots/premium-p3-<page>-<largeur>.png, plus états simulés (sn-simule, alerte-orage, blocs-replies, direct-modale, pastille, eco) à 360 et 1366 px avec données et lecteur simulés. /account et /admin non capturés (session Clerk requise).
- [ ] Séisme dans la tuile d'alerte : non fait (source retirée en RW-009).
- [ ] Profils Clerk connectés ; `/account` et `/admin` capturés (UX-214) : non reçus.
- [ ] Appareils Android/iOS réels, Safari, lecteur d'écran, VLC réel, flux amont actuels : non reçus.
- [ ] Lighthouse et poids JS avant/après : prévus en UX-505 et UX-508 (P5).

## Expérience Premium P0–P2 — reçue localement le 2 octobre 2026 (publiée le 3 octobre : GitHub `1ef60b5`, Railway staging)

Plan : [plan-experience-premium.md](plan-experience-premium.md) §5.1. Preuves et limites :
[production-progress.md](production-progress.md), sections « Lot P0 », « Lot P1 » et « Lot P2 ».
**Cases reçues en local uniquement (dev, port 3001), sans commit ni déploiement ; Railway staging inchangé.**
À rejouer à la fin de chaque lot suivant (P3, P4, P5).

- [x] `npx tsc --noEmit` 0 erreur ; `npm run lint` 0 ; `npm run build` réussi.
- [x] `npm test` : 321 tests, 307 réussis, 14 ignorés (intégrations PostgreSQL), 0 échec ; invariants 4/4.
- [x] E2E mode MVP (13 specs, `--workers=1`) : 108 réussis, 1 ignoré (test « build servi »).
- [x] E2E mode Clerk anonyme (`auth-entry`, `payment`) : 8/8.
- [x] Aucun relais, conversion ni stockage de média ; images de dépêches chargées par le navigateur
  depuis l'éditeur, sans cache serveur ; aucun lien de partage ne contient une URL de flux.
- [x] Machine de lecture (`src/lib/playback-*`), accès, éligibilité et quotas inchangés ; la seule
  modification d'API est l'ordre « Afrique d'abord » et son curseur signé (UX-208, testés).
- [x] Aucune migration, aucun changement `.env*`, Railway, Clerk ou DNS.
- [x] Contrôle visuel 360 / 768 / 1366 px : 0 débordement horizontal, 0 texte < 12 px, 0 erreur de page
  (`docs/screenshots/premium-p0-*`, `-p1-*`, `-p2-*`).
- [x] Éco data : aucun segment téléchargé avant « Lire maintenant » (`enableInterstitialPlayback: false`).
- [x] Zapping : une chaîne qui exige VLC ne le lance jamais pendant un zapping ; un choix direct le lance
  une seule fois.
- [ ] Profils Clerk connectés ; pages `/account` et `/admin` capturées (UX-214) : non reçus.
- [ ] Appareils Android/iOS réels, Safari/HLS natif, PiP et plein écran mobile, lecteur d'écran : non reçus.
- [ ] VLC réel et flux amont actuels pendant le zapping : non reçus (VLC simulé dans les E2E).
- [ ] Mesures Lighthouse et poids JS avant/après : prévues en UX-505 et UX-508 (P5).

## Publication CLI reçue — 2 octobre 2026

[Dossier et limites](publication-cli-2026-10-02.md), applicatif `51c0bc8`, Railway
staging `f0816583-e6a0-4115-bd54-d4cb0709acb1` SUCCESS après autorisation.

- [x] Annulation de corps HTTP natif : aucun rejet non géré, deux cas réels reçus.
- [x] Overlays lecteur : six clés distinctes, quatre cas de composant reçus.
- [x] 244 unitaires réussis, 14 ignorés ; invariants 4/4, TypeScript/lint/migrations/build.
- [x] 287 fichiers applicatifs/configuration/migrations identiques sur le conteneur.
- [x] Deux domaines santé processus/base 200 ; météo anonyme 401, dashboard 307.
- [x] 9 E2E distants réussis sans skip ; widgets Clerk et worker réels, aucun paiement.
- [x] Migrations avant/après 19/19, zéro en attente et empreintes identiques.
- [x] Serveur local sur 3001 conservé, santé 200 ; `.env.local` inchangé.
- [ ] Profils Clerk connectés standard/expiré/suspendu : non reçus.
- [ ] Amonts actuels et appareils/VLC réels : non reçus par cette publication.

## Remédiation Radar/météo RW — reçue localement le 1er octobre 2026

Plan du 1er octobre 2026 :
[tickets, critères et matrice de tests](radar-weather-remediation-backlog.md).
**Cases reçues localement avec fournisseurs/profils simulés et Clerk anonyme réel sur build.**
Preuves : [dossier RW](radar-weather-remediation-validation.md) : 242 unitaires réussis, 14 ignorés, 4 invariants, TypeScript/lint/migrations/build ; 51 E2E dev et 1 build réussis. Les profils Clerk connectés, amonts actuels et staging restent hors réception.

- [x] RW-001 : zéro appel météo direct après 401/403/429, HTML, redirection,
  JSON invalide, échec réseau/timeout interne ou 503 générique ; secours seulement
  après 503 `LIVE_WEATHER_UNAVAILABLE` valide, gardes/quotas inchangés.
- [x] RW-001/RW-006 : API interne bornée à 20 s, secours navigateur à 8 s,
  annulations et sortie de chargement reçues, une tentative directe au plus.
- [x] RW-002 : contrats partagés et validation réelle de tous les snapshots ;
  helpers navigateur indépendants du module de fetch/cache serveur.
- [x] RW-003 : mesures absentes/invalides et corps >100 000 octets rejetés ;
  zéro réel/température négative conservés, aucun relevé fictif à 0 °C/ciel dégagé.
- [x] RW-004 : observation séparée de la collecte, date/fuseau inconnus explicites,
  données anciennes/futures traitées, jour/nuit local reçu dont Nairobi 20 h 30.
- [x] RW-005 : fournisseur/attribution réels, tableau et widget cohérents,
  dates et TTL du cache préservés, secours valide et limites d'expiration reçus.
- [x] RW-006 : réponses/erreurs tardives SN→CI ignorées, timers nettoyés,
  contrôles persistants en panne, aucune donnée conservée après refus d'accès.
- [x] RW-007 : périmètre RSS indépendant de category, cas RFI/France 24/MaliJet
  reçus, déduplication/24 h et compteurs Toutes = Afrique + International.
- [x] RW-008 : météo/pays/carte/RSS/TV/URL/historique/rechargement/reset reçus
  dans Next.js réel ; liste française, clavier, 320/390 px et reflow conservés.
- [x] RW-009 : fixtures GDELT/couches supprimées réconciliées ; tests utiles
  conservés sans skip de contournement, worker/globe et bandeau préservés.
- [x] RW-010 : unitaires, invariants, TypeScript, ESLint, migrations et build
  réussis ; E2E locaux pertinents reçus, comptes exacts et ignorés documentés.
- [x] RW-010 : dossier `docs/radar-weather-remediation-validation.md` créé,
  backlog/journal/reprise mis à jour et environnement local restitué ; aucune
  publication ou réception Clerk réelle non effectuée revendiquée.

Les cases L0–L5 historiques ci-dessous conservent leurs dates et réserves.
Elles ne valident pas les modifications `6f7e384`/`54e5696` ou les corrections RW.

## Réception locale L5 — 1er octobre 2026

Preuves et limites : [AL-T05](anchored-player-validation.md). Code L5 livré
sur staging après autorisation ; neuf E2E distants reçus, santé 200 sur deux
domaines et activation du prototype absente du build, briefing inactif.

- [x] Opt-in local désactivable/non persistant, absent du build production.
- [x] Zapping rapide HLS/MP4, une vidéo gérée, ancienne détruite ; réponses tardives ignorées.
- [x] Arrêt, démontage en navigation, requête annulée, pause/reprise, volume clavier conservé et plein écran/refus.
- [x] Pas d'autoplay/repli VLC automatique dans l'ancré, refus explicite navigateur et serveur.
- [x] Filtres, liste vide, chaîne hors résultats, favoris et lecteurs modale/fenêtre nommée conservés.
- [x] 1366/390/320 px, Enter/slider/Échap/focus et zéro débordement.
- [x] VLC intercepté : sortie explicite, ancré détruit, lancement unique via lecteur existant.
- [x] 220 unitaires + 14 intégrations + 41 E2E distincts, TypeScript/ESLint/build/migrations.
- [x] 11 778 chaînes/12 396 sources, zéro fixture média/schéma jetable restant ; IPTV intact.
- [x] Briefing inactif ; L6 non commencé, aucune publication implicite.
- [ ] Exclusivité incluant VLC/onglets indépendants et arrêt/volume VLC pilotés : non reçus, arrêt manuel.
- [ ] VLC réel et disponibilité réelle amont dans L5 : non reçus, fixtures seulement.
- [ ] Comptes Clerk ordinaires, lecteur d'écran, Safari/HLS natif et appareils physiques : non reçus.

À exécuter avant de clore le lot 1, puis avant tout déploiement. Noter le résultat
dans `production-progress.md`. Ne jamais inscrire de secret ni d'URL média.

## Réception L4 locale — 1er octobre 2026

Complément autorisé : [réception staging](dashboard-auth-staging-reception.md).

- [x] L0–L4 staging actif, neuf E2E distants réussis et santé processus/base 200.
- [x] Compte administrateur Clerk réel : dashboard/TV/compte/admin et pays/URL reçus.
- [ ] Comptes ordinaires distincts essai/actif/expiré : indisponibles à cette réception.
- [x] Zoom natif 200 % local : DPR=2, 937×477 CSS, aucun débordement ;
  pays/clavier/navigation TV/drawer/Échap/focus vérifiés le 1er octobre à 18:29 UTC.

- [x] 219 unitaires + 14 intégrations isolées + 57 E2E réussis ; TypeScript,
  ESLint, build et migrations cohérentes. [Preuves et limites](dashboard-release-validation.md).
- [x] Captures desktop/mobile, clavier/320/390/reflow et fond cartographique bloqué.
- [x] Dashboard/API et lecture refusés après expiration ; catalogue consultable.
- [x] Catalogue local avant/après : 11 778 chaînes, 12 396 sources, empreintes
  identiques ; fixtures et schémas d’intégration nettoyés.
- [x] Documentation réconciliée, état staging historique distinct ;
  [dossier AL-Q02](dashboard-delivery-dossier.md) préparé sans action distante.
- [ ] Réception des comptes Clerk ordinaires, lecteur d’écran et
  lecture sur appareils physiques réels pour cette livraison.
- [ ] Inventaire staging actuel et qualification datée des sources.

[Reprise de session : preuves, limites et prochain lot L5](dashboard-session-handoff.md).

Les listes historiques ci-dessous ne sont pas cochées automatiquement par cette
réception : fournisseurs, sécurité/exploitation et comptes réels ont leur périmètre.

## Configuration et base

- [ ] `npm run config:check` accepte la configuration locale visée.
- [ ] `npm run diagnose:local` confirme `africa_live_dev`, localhost:3001, VLC et une dérive d'horloge compatible Clerk.
- [ ] Le catalogue contient 11 778 chaînes et 12 396 sources avant et après les tests.
- [ ] `npm run db:check:migrations` réussit et aucun schéma d'essai ne subsiste.
- [ ] Aucun test, script ou migration ne touche `C:/Users/GAMER PC/IPTV`.

## Authentification Clerk locale

- [ ] Déconnexion puis reconnexion interactive réussies avec les clés Development.
- [ ] `/api/filters`, `/api/channels` et `/api/favorites` renvoient du JSON en session valide.
- [ ] Sans session, les API restent protégées ; aucun assouplissement de `src/proxy.ts`.
- [ ] Une réponse Clerk HTML/404 affiche « session expirée » et propose implicitement la reconnexion, sans « réponse illisible ».

## Catalogue, recherche, filtres et favoris

- [ ] La première page contient exactement 30 chaînes et indique qu'une suite existe.
- [ ] Une recherche textuelle retourne uniquement des correspondances pertinentes.
- [ ] Au moins un filtre pays et un filtre de catégorie fonctionnent.
- [ ] Un favori ajouté reste présent après rechargement, puis est nettoyé par le test.
- [ ] Les sources OFFLINE restent cachées en mode Clerk ; le catalogue complet reste tentable en mode MVP local.

## Lecture navigateur et VLC

- [ ] Une source web est résolue par l'API, puis téléchargée directement par le navigateur.
- [ ] Les échecs web bornés déclenchent le secours attendu sans double lancement VLC.
- [ ] L'API VLC refuse une URL arbitraire du client et une origine étrangère.
- [ ] Un lancement réel transmet au processus VLC une source choisie côté serveur.
- [ ] Le serveur Africa Live ne relaie, ne convertit et ne stocke aucune playlist, vidéo ou segment.
- [ ] `ENABLE_LOCAL_VLC=false` dans Railway et dans toute production.

## Contact, retrait et Radar Afrique

- [ ] AL-C01/AL-C02 : dashboard et huit API Radar refusés après expiration ;
  catalogue TV toujours consultable ; favoris et lecture restent soumis aux droits.
  Tester essai, actif, grâce, expiré, paiement requis, bloqué et administrateur
  distincts selon [la matrice](dashboard-access-matrix.md). Les comptes réels
  connectés restent à vérifier avant livraison staging.

- [ ] Une demande de contact/retrait n'est confirmée qu'après son enregistrement ; les abus sont limités par email et, si disponible, par empreinte réseau calculée depuis un en-tête proxy explicitement fiable.
- [ ] Les routes d'administration des demandes exigent un administrateur actif ; fermer une demande remet une source en révision et ne la rend pas automatiquement éligible à la lecture.
- [ ] Les demandes actives de retrait continuent de neutraliser les sources concernées après un nouvel import.
- [ ] `/app/live` et son API restent derrière l'accès authentifié au catalogue ; les liens d'articles ouvrent la publication d'origine.
- [ ] Le pays du média, l'éditeur de l'article, l'URL d'origine et l'heure d'indexation restent distincts ; l'avertissement indique que le Radar ne vérifie pas les faits.
- [ ] La panne ou l'indisponibilité de GDELT ne produit pas de faux articles ; aucune couche GDACS, météo, avion ou navire n'est annoncée comme active tant qu'elle n'est pas intégrée et attribuée.

## Deux modes locaux

- [ ] Mode Clerk : `LOCAL_DEV_MODE=false`, `NEXT_PUBLIC_LOCAL_DEV_MODE=false`, `NEXT_PUBLIC_LOCAL_PLAYBACK=true`.
- [ ] Mode MVP : `LOCAL_DEV_MODE=true`, `NEXT_PUBLIC_LOCAL_DEV_MODE=true`, `ENABLE_LOCAL_VLC=true` ; aucun compte requis.
- [ ] Le passage d'un mode à l'autre nécessite un redémarrage du serveur et ne modifie pas la base source IPTV.

## Contrôles automatiques

- [ ] `npm test`.
- [ ] `npm run test:integration`.
- [ ] `npx tsc --noEmit --incremental false`.
- [ ] `npm run lint`.
- [ ] `npm run build`.
- [ ] E2E `local-mvp`, `local-playback` et `local-playback-api` sur le serveur de ce checkout.

## Railway avant promotion

- [ ] L'environnement applicatif reste `staging` tant que la promotion n'est pas autorisée.
- [ ] `/api/health` répond 200 avec processus et DB `ok`, 503 si la DB échoue, sans détail sensible.
- [ ] Le healthcheck Railway vise `/api/health` avec un délai de 120 s et a bloqué un déploiement de test défaillant.
- [ ] Le pré-déploiement exécute `npm run db:migrate:deploy` avec un délai Railway de 300 s.
- [ ] Une migration volontairement défaillante laisse le schéma et les données intacts ; aucune migration concurrente ne passe le verrou.
- [ ] Catalogue authentifié, DB et migrations sont accessibles sans exposer de secret.
- [ ] L'éligibilité reste fermée tant que les sources n'ont pas été revalidées.
- [ ] Un dump Railway daté et chiffré est restauré dans une base isolée ; inventaire et parcours critique concordent.
- [ ] Le rollback applicatif est exécuté dans la fenêtre de rétention et ne prétend pas annuler une migration destructive.
- [ ] Application et PostgreSQL sont colocalisés ; tout changement de région possède sauvegarde et fenêtre de maintenance.
- [ ] L'alerte de budget a un seuil utile, un destinataire confirmé et aucune limite dure non préparée.
- [ ] Le domaine Railway reste disponible pendant la validation de `staging.africatv.sn`.
- [ ] Les CNAME/TXT saisis chez OVHcloud correspondent exactement aux valeurs fournies par Railway ; aucun secret n'est placé dans le DNS.
- [ ] `https://staging.africatv.sn/api/health` répond 200 avec un certificat valide avant toute modification des URLs Clerk/app.
- [ ] Clerk accepte l'origine et les redirections staging ; connexion, déconnexion et les trois API authentifiées réussissent sur le nouveau domaine.
- [ ] `africatv.sn` et `www.africatv.sn` ne servent pas la préproduction et restent réservés au lancement.
- [ ] Planification de vérification et surveillance continue sont traitées avant la production ; le healthcheck de déploiement ne les remplace pas.

## Réception locale du dashboard — 30 septembre 2026

Périmètre et preuves : [dashboard-reliability-validation.md](dashboard-reliability-validation.md).

- [x] AL-C03 : collisions Ecofin, déduplication listes/bandeau et options, aucun avertissement React dans les fixtures.
- [x] AL-C04 : worker dev et build servi sous CSP, panne explicite, fil et pays utilisables ; desktop/mobile/navigation répétée.
- [x] AL-D02 : bornes 24 h, dates inconnues/futures, fuseaux, doublons et compteurs sur le même ensemble filtré.
- [x] AL-D03 : vide valide, HTTP/payload/timeout, panne partielle, dernier succès, cache expiré et reprise.
- [x] AL-D05 : références/candidates web/VLC, prédicat partagé du résolveur ; aucune sonde média du résumé.
- [x] AL-D06 : Afrique/Monde, dates/source, copie inaccessible, pause et mouvement réduit.
- [x] Briefing toujours désactivé ; aucune requête E2E depuis le dashboard.
- [ ] Dashboard complet avec une session Clerk authentifiée sur le build servi : non revendiqué dans cette réception locale.

## Réception locale L2 — 30 septembre 2026

Preuves et limites : [dashboard-workspace-validation.md](dashboard-workspace-validation.md).

- [x] AL-W01 : en-tête/KPI compacts, début carte/fil à 1366×768, repli 683×384.
- [x] AL-W02 : contrôle natif nommé, clavier, reset, pays vide et sans carte.
- [x] AL-W03 : lien direct, paramètres/fragment, rechargement, historique, code invalide et réponses SN→CI tardives.
- [x] AL-W04 : 320/390 px, paysage, connexion lente, fil avant carte, zéro worker par défaut sur mobile, panne isolée.
- [x] AL-W05 : opt-in, dates/légendes, erreur/retry, coordonnées invalides, activations concurrentes, cache et réponse tardive ignorée.
- [x] AL-W06 : détail par fournisseur, panne totale/partielle, non configuré, reprise, expiration selon cadence et annonces stables.
- [x] Non-régressions Radar/catalogue, TypeScript, ESLint, unitaires, build et worker sous CSP du build servi.

## Réception locale L3 — 1er octobre 2026

Preuves et limites : [tv-workspace-validation.md](tv-workspace-validation.md).

- [x] AL-T01 : navigation commune, logo Dashboard, page active, rôle serveur, fallback Clerk et succès paiement simulé.
- [x] AL-T02 : composites/alias/accents/casse, inconnus explicites, facettes et résultats cohérents, imports intacts, mesures locales.
- [x] AL-T03 : filtres combinés, shortcut/sidebar, reset, curseur et réponses tardives, compte des chaînes chargées cohérent.
- [x] AL-T04 : contexte Sénégal→TV, Afrique→Tout, favoris persistants/vides, historique/rechargement, disponibilité et droits expirés simulés.
- [x] 1366/390/320 px, Ctrl+K, boucle de focus, Échap, retour au déclencheur, absence de débordement.
- [x] Lecteurs historiques et API locale, fixtures nettoyées, gardes anonymes et worker du build servi.
- [ ] Parcours Clerk réels standard/admin/expiré sur le build : non revendiqués par cette réception locale.
