# Africa Live — feuille de route du Radar OSINT

**État de clôture et reprise : [travail terminé, réserves et prochain lot L5](dashboard-session-handoff.md).**

Les relevés plus anciens conservent leur date ; ils ne remplacent pas ce bilan courant.

Dernière revue des sources : 29 septembre 2026
Statut : proposition produit et technique ; aucun fournisseur payant n’est activé.

## Complément local du 30 septembre 2026

La description « État de départ » ci-dessous est historique. Les correctifs
AL-C01/C02 interdisent maintenant le dashboard après expiration ; AL-C03/C04
et AL-D02/D03/D05/D06 sont livrés localement. Carte MapLibre, météo Open-Meteo,
RSS et métadonnées de disponibilité remplacent certaines hypothèses initiales.
[Contrats et réception locale](dashboard-reliability-validation.md),
[matrice d’accès](dashboard-access-matrix.md),
[plan de suite](plan-dashboard-backlog.md). Aucun déploiement de ces changements
n’est déclaré ; les couches et fournisseurs envisagés plus loin restent des
propositions lorsqu’ils ne figurent pas dans la réception. Briefing différé L6.

AL-W01 à AL-W06 sont maintenant livrés localement : pays dans l’URL,
dashboard compact, fil mobile prioritaire, couches FIRMS/USGS/GDACS à la
demande et tableau de sources. [Réception L2](dashboard-workspace-validation.md).
AL-T01 à AL-T04 (L3) et réception L4 sont livrés localement au 1er octobre 2026 :
[réception TV](tv-workspace-validation.md), [réception intégrée](dashboard-release-validation.md)
et [dossier de livraison](dashboard-delivery-dossier.md). Aucun déploiement déclaré.
Complément autorisé du 1er octobre à 18:09 UTC : L0–L4 est ensuite déployé sur staging,
neuf E2E distants et parcours administrateur réel reçus.
[Preuves et validations restantes](dashboard-auth-staging-reception.md).
Complément L5 : prototype ancré expérimenté/testé localement, recommandation
ajuster avant généralisation ; [preuve et limite VLC](anchored-player-validation.md).
L6 briefing reste désactivé et non commencé ; aucune publication L5.
Les étapes anciennes
ci-dessous restent un historique de proposition ; le plan dashboard fait foi.

## Objectif

Faire évoluer le Radar Live en compagnon d’information pour le catalogue Africa Live :

1. conserver le fil d’articles GDELT comme **veille médiatique** ;
2. ajouter des événements géolocalisés GDACS dans une couche indépendante ;
3. afficher leur provenance, leur heure et leurs limites ;
4. relier le Radar à l’application des chaînes sans confondre l’événement, les médias qui le couvrent et les flux TV disponibles.

Le premier lot ne prétend pas vérifier les faits, émettre des alertes officielles, établir les droits sur les chaînes du catalogue ni fournir un service d’urgence.

## État de départ

- `/app/live` est protégé comme le catalogue ; son bouton « Ouvrir l’app des chaînes » pointe vers `/app`.
- GDELT DOC alimente un fil limité aux dernières 24 heures. Le pays affiché est le pays de publication du média (`sourcecountry`), pas le lieu de l’événement.
- La source, le domaine, l’heure d’indexation et le lien vers l’article original sont conservés ; l’interface précise que GDELT ne vérifie pas les faits.
- La carte est un SVG léger représentant l’origine des médias. Elle ne doit pas être présentée comme une carte d’incidents.
- Le volet météo reste vide tant qu’un fournisseur compatible avec l’usage commercial et son coût n’est pas choisi.
- L’API GDELT passe par l’autorisation existante, une limite dédiée, un appel amont borné et un cache mémoire avec reprise sur donnée périmée.

Références locales : [périmètre actuel](radar-afrique.md), [interface](../src/app/app/live/LiveRadarDashboard.tsx), [service GDELT](../src/lib/live-osint.ts), [route protégée](../src/app/api/live/news/route.ts).

## Principes de produit et de données

### Couches distinctes

| Couche | Ce qu’elle signifie | Ce qu’elle ne signifie pas |
|---|---|---|
| Articles — GDELT | Une publication a été indexée par GDELT ; son pays d’origine média peut être connu. | L’événement s’est produit dans ce pays, les faits sont vrais ou l’article est exhaustif. |
| Événements — GDACS | GDACS a produit ou relayé un événement et une estimation selon ses données et modèles. | Une alerte officielle nationale, une confirmation humaine, une mesure certaine de gravité ou une consigne d’urgence. |
| Météo — fournisseur choisi | Une observation ou prévision datée pour une localisation précise. | Une alerte météo officielle, sauf source et mandat établis. |

Chaque carte, marqueur ou panneau doit garder le nom du fournisseur, l’heure de l’événement ou de l’observation, l’heure du dernier chargement local, le lien d’origine et un indicateur de cache périmé. Les événements affichent le niveau fourni par GDACS comme **classe GDACS**, sans lui substituer une étiquette Africa Live comme « danger élevé ».

### Admission d’une nouvelle source

Avant toute intégration, documenter : propriétaire et URL officielle ; licence des données ; conditions de l’API hébergée ; usage commercial ; attribution requise ; couverture géographique ; signification et précision de la géométrie ; cadence et limites ; authentification et traitement des clés ; politique de cache/rétention ; lien vers la fiche source et ses avertissements.

Une API publique n’est pas considérée comme une licence de réutilisation. Une licence logicielle de carte ne règle pas les droits du fond cartographique ou des données affichées.

## Architecture cible — premier lot

- Conserver la route GDELT séparée et créer une route évènementielle dédiée, par exemple `GET /api/live/events`.
- La nouvelle route reste protégée par le mécanisme d’accès existant, avec un quota propre à la couche événements.
- Appeler uniquement l’hôte GDACS documenté et les paramètres autorisés. Pas de proxy générique ni d’URL amont fournie par l’utilisateur.
- Normaliser le schéma amont vers un type interne stable : identifiant, type, titre, pays/lieu, géométrie, niveau GDACS, date de début, date de mise à jour, URL source et éventuelles références officielles.
- Rejeter les identifiants, dates, URL et coordonnées invalides ; limiter le corps amont ; poser un délai maximal ; dédupliquer par identifiant GDACS.
- Réutiliser le modèle de cache mémoire et de secours périmé déjà employé par GDELT, en exposant séparément l’horodatage de collecte et les dates métier GDACS. Valider la cadence et les modalités de cache contre la documentation en vigueur avant l’implémentation.
- Ne pas ajouter de table, migration, file d’attente ou service de cache externe pour ce premier lot. Revoir ce choix si la charge ou le nombre de réplicas le justifie avant l’ouverture de production.
- Garder les secrets, si un fournisseur futur en exige, dans la configuration serveur. Aucun secret dans le client ou dans les journaux.

## Expérience utilisateur cible

1. Conserver les articles et les événements dans des panneaux/filtres distincts, avec des icônes et légendes différentes.
2. Ajouter un filtre temporel simple et les filtres utiles fournis par le schéma GDACS, sans fabriquer de catégories absentes de la source.
3. Afficher pour chaque événement : type, lieu/pays, date de début, dernière mise à jour, classe GDACS, état courant si fourni et lien « Détails chez GDACS ».
4. Si une géométrie valide est fournie, afficher un marqueur distinct de la carte des médias. Les valeurs invalides ou les événements hors zone ne doivent pas être placés artificiellement.
5. Vérifier que le SVG existant permet une projection honnête des coordonnées événementielles. Si ce n’est pas le cas, commencer par une liste géolocalisée et conserver le SVG uniquement pour les pays des médias ; choisir ensuite une source de géométrie et une projection documentées. Aucun marqueur approximatif ne doit donner l’illusion d’une position précise.
6. Maintenir le bouton de retour `/app`. Un raccourci vers les chaînes du pays ne sera ajouté qu’après validation du contrat actuel des filtres de catalogue ; ne pas inventer des paramètres d’URL non pris en charge.
7. États d’interface explicites : chargement, aucun résultat, amont indisponible, donnée périmée, date de dernière mise à jour. Ne pas remplacer une panne par des événements simulés.
8. Sur mobile, la liste des événements doit rester utilisable même si la carte ou la couche cartographique n’est pas chargée.

## Backlog

Effort indicatif : XS (très court), S (petit), M (moyen), L (important). Il s’agit d’ordres de grandeur de planification, à réestimer après le travail de cadrage.

### RAD-01 — Geler le contrat éditorial et la fiche GDELT

- **Priorité : P0 · Effort : S · État : prêt**
- Reconfirmer les libellés « pays du média », « article indexé » et « faits non vérifiés » dans tous les points d’entrée du Radar.
- Garder visibles le lien GDELT, l’éditeur/domaine, le lien direct vers l’article et l’heure d’indexation.
- Définir distinctement `indexedAt` (horodatage GDELT) et `updatedAt` (instant de collecte/cache) dans les libellés de l’interface.
- **Critères d’acceptation :** aucun texte n’assimile le pays du média au lieu de l’événement ; le lien GDELT et chaque article mènent à leurs sources respectives ; l’état périmé est compréhensible.

### RAD-02 — Vérifier le contrat GDACS et figer l’échantillon de schéma

- **Priorité : P0 · Effort : S · Dépendance : aucune**
- Lire le quickstart, le schéma OpenAPI/Swagger et les conditions de GDACS au moment de l’intégration.
- Confirmer endpoint, types d’événements, géométrie (point/polygone), champ pays, dates, niveaux, liens et champs susceptibles d’être absents.
- Confirmer les demandes d’attribution et l’avertissement à afficher ; documenter que les conditions GDACS citent notamment les notifications sismiques, tsunami et cycloniques comme automatiques et non revues par un expert avant émission, qu’elles peuvent comporter des erreurs et ne remplacent pas les autorités compétentes.
- **Critères d’acceptation :** une fiche de source dans cette documentation décrit licence/conditions, champs utilisés, cadence et erreurs possibles ; aucune donnée ni licence n’est inférée des noms de champs.

### RAD-03 — Normaliser et servir la couche d’événements

- **Priorité : P1 · Effort : M · Dépendance : RAD-02**
- Ajouter types internes et service GDACS séparés du normaliseur GDELT.
- Ajouter `GET /api/live/events`, authentifiée, bornée, à hôte fixe et avec un quota propre.
- Normaliser les coordonnées et horodatages, dédupliquer par identifiant source et ignorer les éléments non conformes sans faire échouer toute la réponse.
- Ajouter délai maximal, limite de réponse, cache mémoire, coalescence des requêtes simultanées et retour contrôlé aux données périmées. Ne pas conserver de copie durable sans besoin et examen des conditions.
- **Critères d’acceptation :** route inaccessible hors des règles d’accès actuelles ; réponse stable même si des champs facultatifs amont manquent ; aucune URL arbitraire, HTML amont ou coordonnée invalide n’est rendue ; la réponse expose `fetchedAt` et `stale` séparément des dates d’événement.

### RAD-04 — Afficher la couche GDACS indépendamment de GDELT

- **Priorité : P1 · Effort : M · Dépendance : RAD-03**
- Ajouter un panneau « Événements GDACS » séparé du fil d’articles, avec date, type, lieu, classe fournie, fournisseur et lien d’origine.
- Distinguer visuellement un marqueur d’événement d’un marqueur d’origine média.
- Ajouter filtre pays/type seulement si ces champs sont correctement définis dans le schéma confirmé.
- Afficher le disclaimer GDACS en contexte, le statut périmé et la disponibilité séparément pour chaque source.
- **Critères d’acceptation :** la panne GDACS ne masque pas le fil GDELT et inversement ; aucun événement n’est présenté comme vérifié ou comme consigne d’urgence ; chaque événement permet d’ouvrir sa source.

### RAD-05 — Choisir la représentation géographique des événements

- **Priorité : P1 · Effort : S pour l’étude, M si changement de carte · Dépendance : RAD-02**
- Évaluer le SVG actuel par rapport aux coordonnées et polygones GDACS.
- Si le SVG ne permet pas une projection fiable, soit rester sur une liste avec pays/lieu, soit sélectionner des géométries vectorielles et un rendu léger avec licences, attribution, cache et coût documentés.
- N’introduire MapLibre qu’en réponse à un besoin avéré de déplacement/zoom, de sélection ou de couches. Choisir explicitement un fournisseur de tuiles ou l’auto-hébergement ; la bibliothèque n’apporte pas elle-même un fond de carte.
- Garder Cesium/globe 3D et deck.gl hors du premier lot ; les réexaminer uniquement avec un besoin utilisateur et un volume mesuré.
- **Critères d’acceptation :** coordonnées/pays visibles correspondent à la source ; attribution du fond est lisible ; l’interface ne dépend pas des serveurs publics de tuiles OSM comme service de production garanti.

### RAD-06 — Décider du fournisseur météo de Dakar

- **Priorité : P1 · Effort : S · État : décision attendue avant développement**
- Comparer les options avec un budget d’usage et d’exploitation :
  - **Google Weather API :** compte de facturation et clé requis ; la grille consultée indique 10 000 événements d’utilisation gratuits par mois pour le SKU météo puis tarification à l’usage. Vérifier la grille au moment de configurer le fournisseur.
  - **Open-Meteo commercial hébergé :** souscription commerciale requise pour une application par abonnement ; intégrer le prix/volume de l’offre dans le budget.
  - **Open-Meteo auto-hébergé :** examiner la licence AGPL du serveur et la CC BY 4.0 des données, puis chiffrer l’infrastructure, l’import des modèles, les mises à jour, la supervision et la disponibilité.
- Le service gratuit hébergé Open-Meteo pour usage non commercial n’est pas une option pour l’application payante.
- Après choix, ajouter une route météo dédiée et protégée, clé côté serveur, coordonnées Dakar constantes, affichage de la source et de l’heure, cache conforme aux conditions de l’offre et gestion d’erreur sans valeur simulée.
- **Critères d’acceptation :** choix et budget sont consignés ; l’interface affiche période, fuseau et fournisseur ; les conditions commerciales et règles de cache sont respectées ; aucun secret n’est embarqué côté client.
- **Garde :** aucune création de projet Cloud, activation de facturation, souscription, clé ou dépense sans autorisation distincte.

### RAD-07 — Relier les événements au catalogue sans toucher aux droits d’accès

- **Priorité : P2 · Effort : S · Dépendance : RAD-04**
- Garder l’action globale « Ouvrir l’app des chaînes » vers `/app`.
- Vérifier le modèle de filtre du catalogue avant d’ajouter une action contextuelle par pays ; si aucun deep-link stable n’existe, revenir au catalogue sans paramètre inventé.
- Ne modifier ni la durée d’essai, ni l’abonnement, ni les règles de sélection/lecture des flux.
- **Critères d’acceptation :** le Radar n’affiche ni URL de flux, ni lecteur intégré ; la navigation n’altère pas l’authentification ou l’éligibilité.

### RAD-08 — Fiche d’admission des futures sources

- **Priorité : P2 · Effort : S · Dépendance : aucune**
- Créer une petite fiche réutilisable pour toute source future et y noter la date de dernière revue des conditions.
- **Différé :** RSS de médias, AIS/navires, ADS-B/avions, FIRMS/feux, briefing généré, vidéo PiP, globe 3D et couches de grands volumes.
- Pour chaque source différée, exiger une preuve des droits commerciaux, quotas, attribution, couverture en Afrique, fraîcheur, fiabilité, cache/rétention et coût opérationnel avant une demande d’intégration.
- **Critères d’acceptation :** une source au statut « à étudier » n’est jamais présentée dans l’interface comme connectée ou en direct.

### RAD-09 — Vérifier l’ensemble avant toute promotion

- **Priorité : P1 · Effort : M · Dépendance : RAD-03 à RAD-06**
- Vérifier sur le profil utilisateur authentifié que GDELT, GDACS et météo restent des services indépendants : rafraîchissement, cache périmé, erreur amont, filtres et navigation.
- Vérifier l’affichage mobile, les limites de requêtes, les liens externes et les mentions de source.
- Confirmer que le catalogue complet, les règles d’accès, les paiements et la lecture directe ne sont pas affectés.
- **Garde de sortie :** une éventuelle validation sur staging, activation d’une API payante ou mise en production est une décision séparée ; ce plan n’autorise aucun déploiement ni changement d’état externe.

## Ordre de livraison proposé

```text
RAD-01 + RAD-02
       ↓
RAD-03 → RAD-04 → RAD-05
                   ↘
RAD-06 (décision fournisseur météo, en parallèle après validation du budget)
       ↓
RAD-07 + RAD-09

RAD-08 reste le garde-fou pour toutes les nouvelles sources.
```

### Découpage en lots

1. **Lot A — contrat et source GDACS :** RAD-01, RAD-02. Aucun changement applicatif.
2. **Lot B — données géolocalisées :** RAD-03, RAD-04, puis décision de rendu RAD-05. Pas de nouvelle dépendance cartographique imposée.
3. **Lot C — météo :** RAD-06, uniquement après décision documentée sur fournisseur et coût.
4. **Lot D — parcours catalogue et promotion :** RAD-07, RAD-09. Promotion éventuelle soumise aux gardes du projet.
5. **En continu :** appliquer RAD-08 avant d’ajouter RSS, FIRMS, AIS, ADS-B ou toute autre source.

## Références officielles à revalider à l’implémentation

- [GDACS API quickstart 2025](https://www.gdacs.org/Documents/2025/GDACS_API_quickstart_v2.pdf) — API, listes et données géographiques.
- [Conditions GDACS, mars 2025](https://www.gdacs.org/Documents/2025/GDACS_Terms_of_use_Mar_25.pdf) — attribution, limites et avertissements.
- [Conditions d’utilisation GDELT](https://www.gdeltproject.org/about.html) — usage des données et attribution.
- [Google Weather API : usage et facturation](https://developers.google.com/maps/documentation/weather/usage-and-billing) et [grille Google Maps Platform](https://developers.google.com/maps/billing-and-pricing/pricing) — coûts à revérifier avant activation.
- [Conditions Open-Meteo](https://open-meteo.com/en/terms), [offres](https://open-meteo.com/en/pricing) et [licences du service et des données](https://open-meteo.com/) — accès hébergé et auto-hébergement.
- [Politique des tuiles OSM](https://operations.osmfoundation.org/policies/tiles/) — les données et l’hébergement public des tuiles sont deux sujets différents.
