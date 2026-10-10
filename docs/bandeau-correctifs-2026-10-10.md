# Bandeau Radar — correctifs locaux du 10 octobre 2026

Les correctifs ont été appliqués à la version locale présente dans l’arbre de travail, à la demande du propriétaire. Les modifications du Radar déjà présentes ont été conservées. La réception locale ci-dessous précédait l’autorisation de commit, push et déploiement Railway ; la publication est suivie dans [le dossier de livraison](publication-bandeau-2026-10-10.md).

## Comportement reçu

- Bandeau sous le titre sur toute la largeur, texte de 13 px et libellés de marchés courts.
- Sur ordinateur : défilement à 40 px/s, deux groupes identiques incluant l’espace de raccord, largeur minimale égale à la fenêtre. Pause et reprise fonctionnent avec le focus restant sur le bouton. Les copies sont décoratives ; les actions sont disponibles dans une liste stable « Voir tout, sources et dates ».
- Sur mobile (320 et 390 px), en mode Éco et en mouvement réduit : information complète, précédent/suivant, lien source et bouton pays. Le contenu n’est pas coupé et la page ne déborde pas horizontalement.
- Afrique : dépêches africaines, dont celles sans pays d’une rédaction panafricaine, devises CFA et matières premières stratégiques mondiales. Monde : dépêches internationales et de localisation inconnue explicitement signalée, matières premières mondiales et devises hors CFA.
- La classification RSS utilise le périmètre éditorial et le pays inféré dans le sujet ; un pays associé au média ne transforme pas une dépêche internationale en sujet africain. Les rubriques économiques sont normalisées, dont « Economie » sans accent. Les alertes sont prioritaires selon leur gravité et le quota de douze dépêches s’applique à chaque périmètre, afin qu’un périmètre n’évince pas l’autre.
- Variations calculées depuis la clôture de la séance précédente identifiée dans la série quotidienne et dans le fuseau du marché. La référence `chartPreviousClose` de la fenêtre de cinq jours n’est plus utilisée. Référence absente, série incohérente ou séance courante absente : variation inconnue. Le nom de champ historique `changePercent24h` est conservé pour les consommateurs existants ; sa sémantique est documentée. `previousCloseAt` est l’horodatage de la bougie de référence, pas une heure de clôture.
- Sources, dates de cotation, date de collecte, parités fixes et taux indicatifs sont consultables. La réutilisation de données après panne est signalée ; des données ayant dépassé la limite de six heures ne sont pas conservées après un échec. Une variation nulle reste distincte d’une variation inconnue.
- Actualisation manuelle par `?refresh=true`, requêtes client bornées à quinze secondes, générations de réponses protégées, polling toutes les cinq minutes uniquement quand la page est visible, reprise du polling au retour si nécessaire. Les lignes malformées sont écartées avant le formatage.

## Réception

| Contrôle | Résultat |
| --- | --- |
| Tests unitaires ciblés marchés, référence de séance, modèle du bandeau, rubriques, fiabilité et briefing | 32/32 |
| Tests du composant dans Edge avec le vrai CSS Tailwind/global | 9/9 |
| TypeScript sans émission | Réussi |
| ESLint sur les fichiers modifiés et ajoutés | Réussi |
| Build Next.js 16.3.8, version finale du code | Réussi, 28 pages générées |
| Essai réel dans l’onglet Edge connecté sur localhost:3001 | Pause/reprise, Monde/Afrique, sources/dates, navigation mobile reçues |

Le cacao reçu sur la page réelle affiche 5671 USD/tonne et +0,11 % contre la séance précédente, au lieu de −3,34 % contre la référence de la fenêtre de cinq jours. Les prix reçus sont ceux de la dernière séance disponible ; aucune cotation du week-end n’a été inventée. Certains fournisseurs étaient indisponibles et leur statut était visible dans le détail.

Les tests du composant couvrent la pause réelle, la reprise avec focus, la géométrie de la boucle, les liens/pays du lecteur stable, les largeurs mobiles, Éco/mouvement réduit, l’actualisation forcée, une réponse ancienne arrivant tard, la panne avec conservation puis expiration, les taux invalides et le délai maximal. Le banc isolé utilise le port 3002 et n’arrête pas le serveur utilisateur de 3001 ; son processus est arrêté après les tests. Les tests de la CI restent compatibles avec le banc de composants habituel.

Commandes de réception :

```powershell
npx tsx --require ./scripts/unit-network-guard.cjs --test src/lib/live-markets.test.ts src/lib/market-ticker.test.ts src/lib/radar-topics.test.ts src/lib/radar-reliability.test.ts src/lib/live-briefing.test.ts
npx playwright test --config playwright.ticker.config.ts
npx tsc --noEmit --incremental false
npm run build
```

Captures privées : `.local-logs/ticker-fixes/mobile.jpg` et `.local-logs/ticker-fixes/desktop.jpg`. Sauvegarde des fichiers initiaux : `.local-logs/ticker-fixes/before/`. L’affichage Edge a été rétabli à sa largeur initiale avec Afrique sélectionné, détails repliés et défilement actif. Le serveur local est resté actif sur 3001. Les fichiers `.env*`, le catalogue, les droits, les garde-fous d’authentification et le projet source IPTV n’ont pas été modifiés.
