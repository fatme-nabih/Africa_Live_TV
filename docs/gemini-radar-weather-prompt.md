# Prompt Gemini — correction du Radar et de la météo

Préparé le 1er octobre 2026. Copier le bloc ci-dessous dans Gemini.
Le backlog lié contient le détail, les dépendances et les critères de réception.

```text
Implémente localement le plan de correction Radar/météo dans :
C:/Users/GAMER PC/Africa_Live_TV

Commence par lire AGENTS.md, contextellm.md, puis intégralement :
docs/radar-weather-remediation-backlog.md
Lis aussi la fiche dashboard et les documents opérationnels auxquels ce plan
renvoie. Exécute git status --short et préserve toutes les modifications
existantes. Avant le code Next.js, lis les guides de la version installée dans
node_modules/next/dist/docs/.

Le plan porte sur les modifications des commits 6f7e384 et 54e5696. Réinspecte
HEAD et les diffs actuels pour tenir compte d'éventuels changements depuis
l'audit. Les tests réussis de l'audit ne sont pas une preuve de correction.

Réalise RW-001 à RW-010 dans l'ordre des lots A, B, C, D, avec tests pendant
chaque ticket. Corrige notamment :
- le secours météo déclenché après 401/403/429 : il n'est autorisé qu'après un
  HTTP 503 avec JSON valide et code LIVE_WEATHER_UNAVAILABLE, produit après
  les gardes serveur ; pas de secours sur HTML, redirection, réseau, timeout
  ou erreur interne générique ;
- les requêtes sans échéance : 20 s pour l'API interne, 8 s pour le secours
  navigateur, annulation des réponses obsolètes et aucune boucle immédiate ;
- les mesures absentes ou invalides transformées en 0 °C/ciel dégagé :
  validation partagée stricte, payload borné, cache uniquement de résultats
  valides ;
- les observations wttr.in rajeunies à l'heure de collecte, le fuseau Dakar
  arbitraire et le calcul jour/nuit UTC : données réelles ou inconnu explicite ;
- wttr.in identifié comme Open-Meteo et availability absente du secours
  navigateur : provenance réelle et tableau cohérent avec le widget ;
- le filtre International dépendant de category : un périmètre éditorial
  indépendant de la catégorie XML, transmis du flux au client ;
- la synchronisation pays/météo/RSS/TV/URL et les E2E devenus obsolètes après
  le retrait de GDELT du fil et des couches FIRMS/USGS de la carte.

Conserve l'interface harmonisée, les rédactions ajoutées, les villes rapides,
les contrôles météo persistants, les fonctionnalités cartographiques et les
lecteurs existants. Ne réactive pas le briefing L6 et n'étends pas le prototype
L5/VLC. Ne supprime pas implicitement les événements serveur du bandeau.

Ne touche pas au projet C:/Users/GAMER PC/IPTV. Travaille uniquement sur
africa_live_dev et localhost:3001. Ne modifie pas les gardes d'accès, quotas,
rôles ou abonnements pour faire réussir un test. Les médias restent téléchargés
directement depuis l'amont ; aucun relais/conversion/stockage vidéo.

Exécute les validations locales prévues au backlog : unitaires, invariants,
TypeScript, lint, cohérence migrations, build et E2E Radar/TV concernés.
Actualise les fixtures en préservant les assertions utiles, sans skip destiné
à masquer un échec. Vérifie le serveur sur 3001 avant lancement ; restitue
l'environnement local. Aucun secret, cookie, token ou URL média dans les logs.

Mets à jour le journal RW, docs/production-progress.md,
docs/non-regression-checklist.md, docs/dashboard-session-handoff.md et
contextellm.md avec les résultats exacts. Crée ensuite
docs/radar-weather-remediation-validation.md pour les preuves de réception.
Distingue ce qui est écrit, testé localement, simulé, reçu avec Clerk réel et
non vérifié. Signale les comptes/appareils indisponibles sans les fabriquer.

Poursuis les travaux locaux autorisés et les corrections de tests jusqu'à la
réception du plan, sans demander une confirmation pour les choix techniques
réversibles couverts par ce backlog. Si une dépendance extérieure empêche une
preuve, consigne-la et termine les autres travaux indépendants.

Ne fais aucun commit, push, déploiement, migration distante ou changement
Railway/OVHcloud/Clerk/DNS/plan/abonnement. Aucun coût ou fournisseur payant.
Railway just-compassion reste staging malgré le nom d'environnement production.
Laisse le diff local pour revue. Termine par les tickets clos/restants, les
fichiers changés, les tests avec comptes exacts et les limites de réception.
```
