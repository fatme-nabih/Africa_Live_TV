# AL-C01 / AL-C02 — accès au dashboard et au catalogue

Date : 30 septembre 2026 · Fuseau : Africa/Dakar.
Périmètre : checkout local Africa_Live_TV. Aucune livraison staging effectuée.
Décision D5 : le dashboard n'est pas accessible après expiration de l'essai ou
de l'abonnement. La consultation du catalogue TV conserve la règle DOC-006.

## Diagnostic AL-C01

Avant ce lot, le layout commun `/app` exigeait `decision.hasAccess`, tandis que
les huit routes `/api/live/*` appelaient `authorizeCatalogRequest`. Un compte
expiré était donc redirigé hors des pages dashboard et TV, mais pouvait appeler
les API Radar et catalogue. Les favoris et la résolution exigeaient déjà un
accès actif. Les réponses marchés et briefing annonçaient un cache public.

L'accès administrateur actif sans abonnement et la période de grâce existaient
déjà dans `getCurrentAccessDecision` et `evaluateAccess`. Ce lot les conserve :
la grâce est un droit temporaire actif, puis le statut devient `past_due` ou
`expired` à son échéance. Un abonnement annulé mais payé jusqu'à une échéance
future reste actif jusque-là. Aucun nouveau contournement n'est ajouté.

## Matrice appliquée AL-C02

| Identité / droit effectif | Page dashboard | API Radar | Page / API catalogue | Favoris / résolution | Administration |
|---|---|---|---|---|---|
| Anonyme | Connexion | 401 | Connexion / refus | Refus | Refus |
| Compte actif sans droit, essai échu | Compte, renouvellement | 403 | Consultation autorisée | 403 | Refus |
| Essai actif (5 jours) | Autorisée | Autorisées | Autorisées | Autorisés sous contrôles existants | Refus |
| Abonnement actif | Autorisée | Autorisées | Autorisées | Autorisés sous contrôles existants | Refus |
| Grâce de paiement active (3 jours par défaut) | Autorisée | Autorisées | Autorisées | Autorisés sous contrôles existants | Refus |
| Essai / abonnement expiré | Compte, renouvellement | 403 | Consultation autorisée | 403 | Refus |
| Paiement en retard, grâce échue | Compte, renouvellement | 403 | Consultation autorisée | 403 | Refus |
| Identité bloquée / supprimée | Compte, accès refusé | 403 | Accès refusé | 403 | Refus |
| Administrateur actif revérifié | Autorisée, exception existante | Autorisées | Autorisées | Autorisés sous contrôles existants | Autorisée |
| Administrateur révoqué | Selon les droits ordinaires | Selon les droits ordinaires | Selon les droits ordinaires | Selon les droits ordinaires | Refus |

Un utilisateur sans abonnement peut encore avoir un essai actif : l'absence
d'abonnement seule n'est pas une expiration. L'administrateur doit être actif
chez Clerk et dans la base interne ; un simple claim ne suffit pas. Le mode MVP
local garde son accès technique et n'accorde aucun rôle administrateur.

Les API Radar concernées sont `news`, `rss`, `weather`, `events`, `firms`,
`markets`, `briefing` et `channels` (résumé et pays). Elles vérifient le droit
avant validation des paramètres, lecture du cache métier ou collecte amont.
Chaque succès renvoie `Cache-Control: private, no-store` ; les caches mémoire
des fournisseurs sont conservés derrière l'autorisation. Quotas et suspensions
d'abus restent appliqués par le contrôle serveur partagé.

Le proxy Clerk protège les pages, mais les API Radar contrôlent elles-mêmes
leur session. Les refus anonymes d'API catalogue peuvent être interceptés par
Clerk avant leur handler. Le layout `/app` autorise désormais la consultation
du catalogue ; la page `/app/live` revérifie le droit actif lors de son rendu,
sans dépendre du layout partagé conservé pendant les navigations Next.js.
Le refus dashboard conduit à `/account?access=required`, puis `/pricing` pour
renouveler ; ces pages n'exigent pas le droit dashboard. La fenêtre `/player`
reste un écran authentifié ; aucune lecture n'est accordée sans résolution
autorisée, éligibilité de source et quotas.

## Changements et vérification

- `src/app/app/layout.tsx` : consultation selon `canBrowseCatalog`.
- `src/app/app/live/page.tsx` : session et accès actif vérifiés côté serveur.
- Huit `src/app/api/live/*/route.ts` : `authorizeAppRequest` ; caches publics
  des réponses briefing et marchés remplacés par `private, no-store`.
- `src/app/account/page.tsx` : message de renouvellement applicable à l'essai
  comme à l'abonnement, avec distinction catalogue/dashboard ; lien vers le
  catalogue TV lorsqu'aucun droit actif ne permet d'ouvrir le dashboard.
- `src/lib/radar-access.test.ts` : exécution des vrais handlers, du contrôle
  partagé et des gardes page/layout, avec identité, quotas et fournisseurs
  simulés. Matrice de 11 profils sur 8 API, résumé/pays, expiration entre deux
  requêtes, refresh forcé, suspension, quota et origine locale refusée.
- `e2e/auth-entry.spec.ts` : refus anonyme étendu aux huit API Radar.

Résultats locaux : 26 tests ciblés réussis ; suite `npm test` : 198 réussis,
14 intégrations ignorées ; TypeScript et ESLint réussis ; build Next.js réussi (25/25
pages générées). Parcours E2E anonyme réussi sur le serveur local, Edge.

Limites : les identités de la matrice sont simulées. Aucun paiement, webhook,
compte Clerk réel expiré ou scénario interactif standard/admin connecté n'a été
testé dans ce lot. L'E2E valide uniquement le parcours anonyme. Les intégrations
PostgreSQL n'ont pas été rejouées : aucune requête ni migration DB n'a changé.
Une réponse déjà téléchargée ne peut pas être retirée du navigateur ; tout
nouveau rendu dashboard et toute nouvelle requête Radar contrôlent les droits.
Le briefing reste désactivé dans l'interface ; son API existante est protégée,
sans reprise fonctionnelle de AL-D01/AL-D04.

Statut : implémenté et testé localement, avec les limites ci-dessus ; non déployé.
Prochaine validation distante : seulement après autorisation, sur staging,
avec comptes ordinaires et administrateur distincts, puis preuve datée.
Retour arrière : rétablir seulement les changements de ce lot, en préservant
la landing/navigation déjà modifiées. Aucun schéma ni donnée à restaurer.
