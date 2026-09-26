# Rapport d’audit cybersécurité — Africa Live TV (Gpt5.6-sol)

## Verdict exécutif
Le socle catalogue/lecture est globalement sérieux : authentification Clerk côté serveur, autorisations centralisées, requêtes SQL paramétrées, protection SSRF robuste, URLs de lecture filtrées, limitation de débit atomique, secrets absents du bundle client et tests techniques nombreux.
En revanche, la version locale actuelle ne doit pas être déployée telle quelle. L’intégration NabooPay comporte plusieurs défauts bloquants susceptibles de rendre le paiement impossible ou de laisser un client payé sans accès. La préproduction publique est six commits derrière main, n’expose pas les nouvelles routes NabooPay et ne renvoie pas les en-têtes de sécurité attendus.
Je n’ai trouvé aucun contournement d’authentification confirmé, aucune injection SQL, aucune exécution de commande distante, aucun relais média caché et aucun secret réel commité. Mais l’application n’est pas encore « protégée à tous les niveaux », principalement à cause du paiement, de la dérive entre le code et le déploiement, de la CI et de quelques garde-fous opérationnels.
Aucune modification, migration ou action de déploiement n’a été effectuée. Le dépôt est resté propre.

## 1. Constats bloquants
### P0-01 — Le checkout NabooPay local est structurellement cassé
Plusieurs défauts indépendants se cumulent.
La route récupère le userId Clerk puis l’enregistre directement dans naboopay_transactions.user_id :
- [checkout NabooPay, ligne 16](C:/Users/GAMER PC/Africa_Live_TV/src/app/api/checkout/naboopay/route.ts#L16)
- [insertion, ligne 59](C:/Users/GAMER PC/Africa_Live_TV/src/app/api/checkout/naboopay/route.ts#L59)

Or naboopay_transactions.user_id référence users.id, qui est un UUID interne, tandis que users.clerk_user_id contient l’identifiant Clerk. La synchronisation crée justement users.id avec randomUUID() :
- [schéma utilisateur](C:/Users/GAMER PC/Africa_Live_TV/src/db/schema.ts#L20)
- [création de l’utilisateur interne](C:/Users/GAMER PC/Africa_Live_TV/src/lib/identity.ts#L58)
- [clé étrangère NabooPay](C:/Users/GAMER PC/Africa_Live_TV/src/db/schema.ts#L924)

Conséquence probable : violation de clé étrangère après création de la transaction externe.
Le code appelle l’API v2 avec une structure de produit v1 : amount et category, sans objet customer :
- [contrat envoyé](C:/Users/GAMER PC/Africa_Live_TV/src/lib/naboopay.ts#L33)
- [appel externe](C:/Users/GAMER PC/Africa_Live_TV/src/lib/naboopay.ts#L63)

La documentation NabooPay précise que la v2 exige un objet client, remplace product.amount par price et supprime category. Documentation de migration NabooPay
Un identifiant local est créé pour les URLs de retour, mais il n’est pas envoyé à NabooPay. La base utilise ensuite de préférence l’identifiant retourné par NabooPay. Les deux peuvent donc diverger :
- [génération et URL de retour](C:/Users/GAMER PC/Africa_Live_TV/src/app/api/checkout/naboopay/route.ts#L29)
- [identifiant enregistré](C:/Users/GAMER PC/Africa_Live_TV/src/app/api/checkout/naboopay/route.ts#L59)

Les pages /pricing/success et /pricing/error n’existent pas. Le build local ne les liste pas et les deux répondent actuellement 404 sur staging.

**Solution requise**
- Charger l’utilisateur interne avec ensureInternalUser(clerkUserId) et utiliser internalUser.id.
- Corriger le contrat v2 avec un schéma Zod strict : customer, products[].price, quantité, devise et méthodes autorisées.
- Séparer un checkoutAttemptId interne et un providerOrderId unique.
- Créer l’intention locale avant l’appel fournisseur, puis attacher la référence fournisseur.
- Ajouter les pages de retour, lesquelles doivent relire l’état depuis le serveur et ne jamais considérer le paramètre URL comme preuve de paiement.
- Ajouter des tests de route avec un faux serveur NabooPay.

### P0-02 — Un paiement confirmé peut être perdu définitivement
Le webhook effectue successivement :
1. la mise à jour de la transaction en completed ;
2. puis l’insertion de l’abonnement.

Ces opérations ne sont pas dans une même transaction SQL :
- [mise à jour du paiement](C:/Users/GAMER PC/Africa_Live_TV/src/app/api/webhooks/naboopay/route.ts#L44)
- [création de l’abonnement](C:/Users/GAMER PC/Africa_Live_TV/src/app/api/webhooks/naboopay/route.ts#L53)

Si l’étape 2 échoue, une nouvelle livraison sera ignorée immédiatement parce que la transaction est déjà completed :
- [court-circuit d’idempotence](C:/Users/GAMER PC/Africa_Live_TV/src/app/api/webhooks/naboopay/route.ts#L39)

Le client peut donc avoir payé sans recevoir son accès, sans réparation automatique.

**Solution requise**
- Ouvrir une transaction DB.
- Verrouiller la ligne de paiement avec SELECT ... FOR UPDATE.
- Vérifier l’état, le montant, la devise, le plan, le propriétaire et l’horodatage fournisseur.
- Créer ou corriger l’abonnement.
- Marquer l’événement traité seulement après succès de l’ensemble.
- En cas d’échec DB, retourner un statut non-2xx pour provoquer la relivraison.
- Ajouter un worker de réconciliation qui compare les paiements locaux à GET /api/v2/transactions/{order_id}.

### P0-03 — Le webhook accorde l’accès sans contrôler la valeur payée
Le code accepte transaction_status === "completed" et accorde l’abonnement sans comparer :
- payload.amount avec tx.amount ;
- la devise avec XOF ;
- les produits et quantités ;
- l’identité de la transaction ;
- l’horodatage fournisseur.

La signature authentifie l’émetteur, mais ne garantit pas que l’événement correspond aux conditions commerciales attendues.
Le corps est également parsé sans validation Zod et sa valeur status est écrite directement en base.

**Solution requise**
- Valider tout le payload avec un schéma strict.
- Refuser toute différence de montant, devise, plan ou produit.
- Pour un événement ambigu, interroger directement l’API NabooPay avant d’accorder l’accès.
- Ajouter des contraintes DB sur status, amount > 0, plan_code et la devise.
- Conserver un journal d’événements immuable avec empreinte du payload.

## 2. Risques élevés
### P1-01 — Webhook non borné et stockage de données personnelles
Le webhook appelle request.text() sans limite :
- [lecture du webhook](C:/Users/GAMER PC/Africa_Live_TV/src/app/api/webhooks/naboopay/route.ts#L15)

Un expéditeur peut envoyer un corps très volumineux, provoquer une consommation mémoire importante puis faire stocker le payload complet, incluant potentiellement nom et téléphone.
La documentation NabooPay impose la vérification HMAC, l’idempotence et une réponse rapide ; elle annonce seulement trois relances espacées de cinq minutes.

**Solution**
- Limiter le corps à 64 Kio maximum avant parsing.
- Vérifier Content-Type: application/json.
- Comparer la signature avec timingSafeEqual, après validation d’un digest hexadécimal de 64 caractères.
- Ne stocker que les champs nécessaires ou chiffrer les données personnelles.
- Définir une durée de rétention.

### P1-02 — Endpoint de création de paiement insuffisamment protégé
Le checkout :
- n’a pas de limitation de débit ;
- n’a pas de clé d’idempotence ;
- appelle le fournisseur avant de persister localement ;
- n’a aucun timeout réseau ;
- lit une éventuelle réponse d’erreur fournisseur sans limite et la journalise intégralement ;
- accepte Origin pour construire les URLs de retour ;
- retourne un checkout_url non validé, ensuite affecté directement à window.location.href.

Références :
- [construction depuis Origin](C:/Users/GAMER PC/Africa_Live_TV/src/app/api/checkout/naboopay/route.ts#L32)
- [appel sans timeout](C:/Users/GAMER PC/Africa_Live_TV/src/lib/naboopay.ts#L63)
- [log brut fournisseur](C:/Users/GAMER PC/Africa_Live_TV/src/lib/naboopay.ts#L78)
- [redirection client](C:/Users/GAMER PC/Africa_Live_TV/src/app/pricing/page.tsx#L36)

**Solution**
- Utiliser exclusivement l’origine canonique validée NEXT_PUBLIC_APP_URL.
- Ajouter une limite utilisateur/session, par exemple 5 créations en 10 minutes.
- Exiger un identifiant d’idempotence.
- Utiliser AbortSignal.timeout.
- Valider la réponse fournisseur avec Zod et n’autoriser qu’une URL HTTPS sur le domaine NabooPay attendu.
- Ne jamais journaliser le corps brut d’une erreur de paiement.

### P1-03 — Configuration serveur restée sur Clerk Billing
Le validateur de production exige encore CLERK_BILLING_PLAN_SLUG/ID, mais ne vérifie ni NABOOPAY_API_KEY ni NABOOPAY_WEBHOOK_SECRET :
- [validateur obsolète](C:/Users/GAMER PC/Africa_Live_TV/src/lib/server-environment.ts#L102)
- [.env.example obsolète](C:/Users/GAMER PC/Africa_Live_TV/.env.example#L21)

La CI configure quant à elle NABOOPAY_CLIENT_ID et NABOOPAY_CLIENT_SECRET, noms jamais consommés par le code :
- [workflow CI](C:/Users/GAMER PC/Africa_Live_TV/.github/workflows/ci.yml#L28)

Cela permettrait à un déploiement de démarrer sans les véritables secrets NabooPay, tout en exigeant une configuration Billing abandonnée.

### P1-04 — La CI ne valide pas réellement le futur déploiement
Le workflow présente plusieurs lacunes :
- aucun test NabooPay ;
- le scénario catalogue authentifié est ignoré sans E2E_STORAGE_STATE ;
- drizzle-kit push construit directement le schéma au lieu de tester les migrations ;
- aucun npm audit, secret scan, SAST ou dependency review ;
- les variables du job ne satisfont pas le validateur de runtime production, donc npm start devrait échouer lors des E2E ;
- les actions GitHub utilisent des tags, pas des SHA immuables.

Référence : [CI](C:/Users/GAMER PC/Africa_Live_TV/.github/workflows/ci.yml#L1).

**Solution**
- Créer une matrice CI complète.

## 3. Écart critique entre main et staging
Le dépôt local et origin/main sont au commit f0419fa. Le déploiement documenté est resté à 3a325ab, soit six commits de retard.
Il ne faut surtout pas « rattraper » ce retard par un déploiement immédiat : le lot paiement doit être corrigé et testé avant.

## 4. Défense navigateur et en-têtes
La CSP locale existe, mais elle est très permissive :
- script-src autorise unsafe-inline et unsafe-eval ;
- connect-src, media-src et img-src acceptent *.

Référence : [next.config.ts](C:/Users/GAMER PC/Africa_Live_TV/next.config.ts#L3).

**Solution** : Ajouter globalement Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, et progressivement restreindre la CSP.

## 5. Base de données et exploitation
- **Délais SQL annoncés mais absents** : Ajouter un statement_timeout au pool/runtime.
- **db:push reste dangereux** : Encapsuler `db:push` pour l'interdire en prod/staging.

## 6. Code mort, code obsolète et complexité
Les principaux éléments à nettoyer sont :
- tables et exports hérités (Billing, paddle).
- texte du compte.
- code non utilisé (`clipboard.ts`, POC de relais média, `abuse-detection.ts`).

Fichiers à découper : `Player.tsx`, `src/app/app/page.tsx`, `schema.ts`, `verify-streams.ts`.

## 7. Confidentialité des logos externes
Les logos sont chargés directement depuis des URLs du catalogue avec <img> et sans referrerPolicy :
- [ChannelGrid](C:/Users/GAMER PC/Africa_Live_TV/src/components/ChannelGrid.tsx#L29)

**Solution** : Ajouter referrerPolicy="no-referrer", loading="lazy" et decoding="async".

## 8. Points solides constatés
Plusieurs éléments très positifs sont relevés, validant la solidité de l'authentification et du catalogue.

## 9. Résultats des contrôles
Les tests locaux passent avec succès. Les 4 alertes de développement signalées par npm audit ne nécessitent pas un auto-fix agressif.

## 10. Plan de correction recommandé pour un LLM
Phase 1 — Bloquer le lancement paiement
Phase 2 — Configuration et CI
Phase 3 — Durcissement web
Phase 4 — PostgreSQL et maintenance
Phase 5 — Nettoyage

**Conclusion** : catalogue/lecture acceptables pour préproduction contrôlée ; paiement et promotion en production bloqués jusqu’à correction des P0 et P1.
