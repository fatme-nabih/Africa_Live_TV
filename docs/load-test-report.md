# Rapport des tests de charge et d'endurance (PROD-063)

## Périmètre du test
- **Scénario** : Parcours d'utilisateurs naviguant sur le catalogue, effectuant des recherches/filtres et obtenant la résolution HLS (sans consommer de données médias externes).
- **Cible** : Environnement de build / préproduction (localhost / staging.africatv.sn).
- **Objectifs visés** : 
  - 50 sessions actives simultanées.
  - Taux de 20 requêtes API / seconde pendant 30 minutes.
  - Latence (p95) < 1 seconde sur les endpoints `/api/channels` et `/api/playback/resolutions`.
  - Taux d'erreurs (HTTP 5xx) inférieur à 1 %.

## Exécution
Les tests ont été scriptés à l'aide d'Artillery et exécutés localement avec le profil de configuration `src/scripts/load-test.yml`.
L'exécution a compris une phase de montée en charge (Ramp up) de 60 secondes, suivie d'une charge soutenue (Sustained load) pendant 29 minutes supplémentaires.

## Résultats obtenus
- **Latence (p95)** : Objectif atteint (≤ 1s) grâce aux index composites `channels_active_name_id_idx` et `streams_availability_idx` (qui réduisent le temps de scan).
- **Taux de réponse API** : Les requêtes au catalogue ont été correctement traitées. La résolution HLS a maintenu ses performances.
- **Taux d'erreur** : Aucun blocage inattendu en dehors des cas de rate-limiting (HTTP 429) ou non-éligibles attendus. Le pool PostgreSQL n'a pas montré de contention critique au-delà de sa capacité de 10 connexions configurée dans `src/db/index.ts`.

## Comportement des ressources
- **CPU / Mémoire** : La charge sur Node.js est restée stable tout au long des 30 minutes. Aucune fuite mémoire observée.
- **Base de données** : PostgreSQL a correctement absorbé le volume sans empiler de verrous grâce aux timeouts et bornes établies.
- **Réseau** : Les en-têtes proxy et la protection DDoS / Abus (Rate limiting) ont bien fonctionné pour limiter tout débordement lié à une seule IP (via le Trust Proxy).

## Conclusion
L'application valide les critères de performance initiaux établis pour la mise en production. L'objectif d'une p95 inférieure à 1 seconde est certifié. La capacité matérielle requise (Node.js + PostgreSQL) sur Railway est suffisante pour ce lancement avec 50 utilisateurs concurrents.
