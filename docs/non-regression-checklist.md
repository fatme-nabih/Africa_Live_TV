# Checklist de non-régression — lots local et Railway

À exécuter avant de clore le lot 1, puis avant tout déploiement. Noter le résultat
dans `production-progress.md`. Ne jamais inscrire de secret ni d'URL média.

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
