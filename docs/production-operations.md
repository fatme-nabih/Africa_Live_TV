# Africa Live - Procédures d'exploitation, de sauvegarde et d'alerte

## 1. Alertes et Incidents (PROD-052)

L'application expose ses événements critiques via des logs structurés (JSON). Sur Railway, ces logs peuvent être connectés à un service d'observabilité externe ou surveillés via le tableau de bord Railway.

### Types d'incidents et signatures JSON

- **Crash Processus / Erreur inattendue**
  `event: "process.uncaught_exception"`
  Signale une erreur Node.js non interceptée.

- **Panne Applicative / Base de données**
  `event: "db.pool.connection_failed"` ou `event: "api.unhandled_error"` avec code `INTERNAL_SERVER_ERROR`.
  Ceci signale que l'application ne peut pas se connecter à la base de données, ou qu'une requête API a échoué silencieusement.

- **Panne Fournisseur Externe (Clerk / NabooPay)**
  `event: "external.provider.failed"`
  Permet de distinguer un incident interne (base de données/réseau Railway) d'une erreur provenant d'une API tierce en amont (NabooPay, Clerk).

- **Alerte de Fraîcheur des Flux (Jobs Worker)**
  `event: "stream.verification.stale"`
  Indique que le job de vérification (worker:verify) ne tourne plus ou n'arrive pas à maintenir le catalogue à jour.

### Procédure d'Alerte

1. Le destinataire désigné (le propriétaire de l'infrastructure) doit configurer une alerte sur ces signatures JSON depuis son Log Drain.
2. Pour tester la bonne réception des alertes sans impacter la base de données réelle, utiliser :
   `npm run simulate:incident` (Cette commande produit volontairement des logs structurés de criticité *error/warn*).

## 2. Sauvegarde, Restauration et Rollback (PROD-053)

### Objectifs de Perte de Données (RPO) et de Reprise (RTO)

- **RPO (Recovery Point Objective)** : 24h avec la stratégie native Railway ou selon la fréquence du job automatisé de backup (actuellement configuré via `npm run backup:restore-drill:railway` pour les tests).
- **RTO (Recovery Time Objective)** : 2 heures maximum.

### Sauvegarde et Restauration

L'application intègre des scripts validés de test de restauration logique.
- Pour tester la fiabilité d'une restauration :
  Exécuter `npm run backup:restore-drill:railway` (Ce script sauvegarde, déchiffre, crée une base isolée, et valide l'intégrité des tables).
- En cas de sinistre complet de la base de données de production :
  Récupérer le dernier fichier dans `backups/railway`, initialiser un nouveau service PostgreSQL, et restaurer à l'aide de l'outil `pg_restore` ou équivalent à partir du dump déchiffré.

### Rollback Applicatif

Un rollback n'est **jamais une annulation de migration Drizzle**. Si le code récemment déployé génère des erreurs bloquantes, la procédure de rollback est purement applicative (Railway) :
1. Se rendre dans l'interface de déploiement Railway.
2. Cliquer sur les options du déploiement précédent sain.
3. Sélectionner **Redeploy**.
4. Valider que `https://staging.africatv.sn/api/health` ou la route cible retourne `200 OK`.

En cas de migration destructive malveillante ou erronée, ne PAS tenter un rollback de code. Restaurer la base de données à l'aide de la sauvegarde PostgreSQL.
