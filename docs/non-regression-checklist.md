# Checklist de non-régression — lots local et Railway

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
