# Dashboard — réception locale L0 / L1

Date : 30 septembre 2026 · Africa/Dakar. Tickets : AL-C03, AL-C04,
AL-D02, AL-D03, AL-D05, AL-D06. Livraison locale uniquement.

## Comportements livrés

- **Identité** : le collecteur RSS utilise un SHA-256 complet de l’URL
  canonique, avec un espace de noms fournisseur. Les listes RSS/GDELT et le
  bandeau dédupliquent les URLs ; les paramètres de suivi et fragments sont
  retirés, mais la casse du chemin et les paramètres métier sont conservés.
  Deux liens Ecofin avec un préfixe identique ne partagent plus un identifiant.
  Les options de catalogue sont nettoyées et dédupliquées côté API et client.
  La copie animée du bandeau est `aria-hidden` et `inert`.
- **Carte** : MapLibre 6 utilise un worker ESM et un module partagé. En dev,
  son URL implicite devenait `/app/live`, une réponse HTML. `predev` et
  `prebuild` copient désormais les deux modules du paquet installé sous
  `public/maplibre` ; `setWorkerUrl` fixe explicitement l’URL. Une sonde module
  vérifie le chargement avant création de la carte. Échec du worker, du fond
  de carte ou WebGL indisponible : message explicite, fil et sélecteur pays
  indépendants. La CSP existante reste inchangée.
- **Temps** : fenêtre glissante inclusive `[instant − 24 h, instant]`, UTC,
  affichée en Africa/Dakar. RSS utilise la publication ; une mise à jour Atom
  seule ne devient pas une publication. GDELT conserve l’indexation, sans la
  présenter comme une publication. Dates invalides, absentes et sans zone
  ISO sont inconnues ; les dates futures et anciennes sont exclues des KPI.
  Les titres sans date restent dans une liste séparée. Les listes et KPI
  utilisent le même ensemble filtré par pays/source, avec URLs canoniques
  communes et priorité RSS pour un doublon entre les deux fournisseurs.
- **Disponibilité** : états par fournisseur : disponible, vide valide,
  partiel, cache périmé, indisponible, non configuré. Les réponses exposent
  périmètre, collecte, dernier succès, date des données, expiration du cache,
  nombre et limite lorsque pertinente. Une réponse vide valide réussit ;
  HTTP erreur, timeout ou format invalide ne deviennent pas un zéro sain.
  Corps et délais amont sont bornés. Le cache RSS est individuel par flux :
  une panne partielle n’efface pas les autres sources. Une panne totale sans
  cache acceptable renvoie une erreur de service.
- **TV** : « Chaînes référencées » compte les chaînes actives du catalogue
  public africain, y compris sans source candidate. Les sources jointes sont
  actives ; les candidates web/VLC utilisent directement
  `isPlaybackSourceEligible`, le prédicat du résolveur. CORS, HTTPS, contenu
  mixte, contrôle récent, statut, éligibilité et URL sensible suivent donc
  la politique existante. Une chaîne est comptée une seule fois par
  indicateur. VLC inclut les candidates web compatibles : les deux chiffres
  ne doivent pas être additionnés. Le relevé est daté ; aucune sonde média
  amont n’est lancée par le résumé.
- **Bandeau** : événements Afrique par défaut, Monde explicitement
  sélectionnable ; un pays inconnu reste classé séparément dans Monde.
  Les cotations mondiales restent explicitement identifiées comme telles.
  Source et date de publication/événement/séance sont visibles. Aucune
  cotation ni date courante de secours n’est inventée. Les parités fixes
  EUR/XOF et EUR/XAF sont identifiées comme des parités institutionnelles,
  sans date d’observation fictive. Pause, liens source et mouvement réduit
  sont accessibles.

## Cache et limites

| Source | Cache frais | Conservation en panne |
|---|---:|---:|
| RSS / GDELT | 5 min | 45 min depuis le succès |
| Open-Meteo | 15 min | 6 h depuis le succès |
| USGS / GDACS | 15 min | 6 h depuis le succès |
| NASA FIRMS | 30 min | 6 h depuis le succès |
| Cotations / devises | 15 min | 6 h depuis le succès |
| Résumé catalogue TV | 10 min | 6 h, signalé périmé |

Le fil est limité à 75 résultats GDELT et 150 RSS chargés. Les chiffres
mesurent cet échantillon, pas une couverture exhaustive. Les dates de séance
financière sont distinctes de la collecte ; une variation est calculée sur
la clôture de référence fournie, sans promesse de variation glissante 24 h.
GDELT situe le média ; RSS distingue le pays du média par défaut du sujet
inféré par mots-clés. Le pays d’un incident demeure une indication fournisseur,
pas une géolocalisation déduite du pays du média.

## Vérifications

- Tests déterministes : collisions Ecofin, doublons, casse d’URL, paramètres
  conservés, options répétées, bornes 24 h, fuseaux, dates invalides/futures,
  horloge fixe, dernier succès inchangé en panne, cache trop ancien refusé,
  réponse vide valide, panne partielle, HTTP erreur, payload invalide,
  timeout simulé, reprise et limites de corps ; candidates TV et plusieurs
  sources d’une même chaîne ; cotations réelles contre secours inventés.
- Suite `npm test` : **208 réussis, 14 intégrations optionnelles ignorées**.
  TypeScript, ESLint sans avertissement et build Next réussis.
- E2E Edge dev : **6 scénarios Radar réussis** (1366, 390, 320 px, worker
  bloqué/RSS en panne/navigation répétée, filtres dupliqués, résumé TV réel sur africa_live_dev), plus
  **3 scénarios catalogue réussis** (pagination, disponibilité, favoris
  nettoyés). Carte avec vrais modules MapLibre et tuiles de fixture valides.
  Aucun avertissement de clé ni exception JavaScript dans les scénarios visés.
  Briefing désactivé : aucune requête déclenchée. Pas de débordement horizontal.
- Build servi avec `npm run start:local`, `DEPLOYMENT_ENV=local`, MVP désactivé :
  **1 scénario worker réussi** (module et dépendance HTTP 200 JavaScript,
  exécution module `ready` sous CSP du build), plus **2 scénarios d’entrée
  anonyme réussis** (landing et protections pages/API).

Limite précise : le dashboard complet est testé en navigateur en développement
local ; sur le build servi, l’exécution du worker est vérifiée depuis une page
publique et la garde dashboard est vérifiée sans session. Aucune nouvelle
session Clerk authentifiée n’a été créée pour afficher le dashboard du build.
Les fournisseurs réels peuvent rester indisponibles ; les tests de dégradation
utilisent des réponses contrôlées, sans prétendre certifier leur disponibilité.
Les intégrations optionnelles restent hors de cette réception : aucune
migration, paiement, création de compte ou modification distante.

Serveur restitué au mode Clerk local sur localhost:3001. Projet IPTV intact,
lecture média directe et protections existantes conservées. Aucun déploiement,
commit ni push. Le briefing demeure différé au dernier lot L6.
