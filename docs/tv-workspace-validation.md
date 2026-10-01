# Navigation et filtres TV — réception locale L3

Date : 1er octobre 2026 · Africa/Dakar. AL-T01 à AL-T04.
Livraison locale, sans commit, push, déploiement ni migration.

## Comportements livrés

| Ticket | Résultat |
|---|---|
| AL-T01 | Navigation commune Dashboard, TV, Compte et Administration conditionnelle sur dashboard, catalogue, compte et administration. Logo vers `/app/live`, page active annoncée par `aria-current`. Capacité administrateur vérifiée sur le serveur par la garde existante, sans confiance dans un seul claim client. Destinations après connexion/inscription et succès de paiement conservées vers le dashboard ; liens explicites du SDK Clerk restent prioritaires. |
| AL-T02 | Catégories multivaluées normalisées à la lecture : `Business;News` correspond à Économie et Actualités. Alias, accents et casse partagent le même contrat. Libellés français, `Undefined`/null/vide en catégorie non renseignée, valeurs inconnues explicitement non reconnues. Langues ISO canoniques via `Intl`, par exemple `fra`/`fr` → `fr`, composites dédupliqués et état non renseigné explicite. Données importées et DTO bruts conservés. |
| AL-T03 | Un hook fondé sur les paramètres d’URL pilote sidebar, raccourcis et requêtes. Aucune seconde copie locale des filtres. Recherche temporisée, contrôles immédiatement synchronisés, reset complet, réponses obsolètes annulées/ignorées, curseur remis à zéro et résultats précédents retirés au changement. Le nombre annoncé compte les chaînes chargées du même ensemble que la liste. |
| AL-T04 | Raccourcis Afrique, Sénégal, Favoris et Tout le catalogue. Afrique utilise `region=africa`, Sénégal `country=SN`. Catégorie/pays/langue/recherche restent combinables ; Tout et Réinitialiser retirent tous les filtres. L’entrée TV transmet le pays du dashboard, avec conservation au rechargement et dans l’historique. Retour Dashboard conserve aussi le pays ; le logo ouvre la vue globale. Favoris persistants et politique de disponibilité conservés. |

## Contrats et limites

- Une catégorie est sélectionnée dans le filtre ; une chaîne peut appartenir
  à plusieurs catégories séparées par `;`, `,` ou `|`. Les facettes exposent
  les codes atomiques ; les cartes affichent leurs libellés français.
- La normalisation calcule les variantes brutes correspondant au code demandé,
  puis les utilise dans une condition SQL paramétrée. Elle ne modifie aucune
  donnée, ne charge pas le catalogue entier dans le navigateur et ne déplace
  pas la pagination après un filtrage client.
- Facettes et catalogue partagent la visibilité des sources actives non
  `OFFLINE` et les exclusions du catalogue public existantes. Les contrôles
  anciens/périmés ou non encore vérifiés ne disparaissent pas des facettes.
  Une chaîne définitivement indisponible demeure masquée, y compris en favoris.
- La consultation TV après expiration demeure autorisée selon DOC-006, le
  dashboard et la lecture restent refusés. `canPlay=false` empêche également
  l’ouverture de la modale et du raccourci lecteur côté client. Les API de
  lecture/favoris gardent leur autorisation existante ; les favoris conservés
  localement ne contournent pas un refus serveur.
- `region` appartient au contexte signé du curseur, avec les autres filtres,
  la session et les favoris. Changer Afrique/Tout avec un ancien curseur renvoie
  une erreur de requête plutôt qu’une page provenant d’un autre ensemble.
- Le drawer mobile a des identifiants uniques, contient le focus clavier,
  ferme avec Échap, restitue le focus au déclencheur et bloque le défilement
  arrière. Ctrl/Cmd+K ouvre la recherche sur mobile comme sur desktop.
- Aucun lecteur ancré AL-T05, relais média, conversion ou stockage ajouté.
  Le briefing reste désactivé jusqu’à L6.

## Vérifications

- `npm test` : **219 réussis, 14 intégrations optionnelles ignorées**, zéro échec.
- TypeScript sans incrémental, ESLint avec zéro avertissement et build Next réussis.
- E2E Edge dev : **29 réussis**, dont 8 L3, 12 L2, 6 Radar L0/L1 et
  3 catalogue/favoris. Le scénario worker réservé au build est exécuté à part.
- L3 : filtres combinés, raccourci/sidebar, catégories composites, alias de
  langues, pagination/reset/historique, réponses SN tardives après CI,
  Afrique→Tout, favoris vides/non vides et rechargement, pays dashboard→TV,
  1366/390/320 px, clavier, Ctrl+K, boucle de focus/Échap, absence de
  débordement et consultation expirée simulée sans ouverture de lecteur.
- Le contrat est aussi vérifié sur les API réelles et `africa_live_dev` : chaîne
  `Business;News` retrouvée par Actualités, langue `fra` équivalente à `fr`,
  facettes canoniques, curseur refusé dans un autre périmètre, pagination sans
  doublon et métadonnées importées inchangées.
- **10 E2E lecture réussis** : lecteurs historiques `/player/[channelId]`, HLS
  décodé/MP4 direct, remplacement d’une source en panne, repli VLC simulé,
  autoplay refusé, timeout, API locale sans téléchargement média serveur,
  refus d’URL arbitraire et d’origine étrangère. Les fixtures de lecture sont
  nettoyées : 11 778 chaînes, 12 396 sources, aucun canal `lot2-*` restant.
- Deux anciennes fixtures de lecture ont été corrigées : panne temporaire
  représentée par `UNTESTED` + `TEMPORARY_FAILURE`, distincte d’un statut
  définitif `OFFLINE` exclu par la requête existante ; horloge avancée entre
  les réponses réseau plutôt qu’avant l’installation de tous les watchdogs.
  Aucun code applicatif de résolution/lecture n’a été assoupli.
- Build servi, MVP désactivé : **3 réussis**, worker ESM réel/dépendance sous
  CSP, landing et protections anonymes pages/API. Total : **42 E2E réussis**.
- Navigation standard/admin, gardes expirées, fallback Clerk et destination du
  succès de paiement testés sur les vrais composants/gardes avec frontières
  externes simulées. Aucun paiement, rôle ou compte Clerk réel modifié.

Observation réelle locale : 30 options catégorie et 169 options langue, choix
Sénégal fonctionnel, zéro exception JS et aucun débordement. Mesure indicative
à chaud : API catalogue global 188 ms, filtre SN/News/fr vide valide 142 ms,
Afrique 56 ms. `EXPLAIN ANALYZE` de l’agrégation de métadonnées avec visibilité
des sources : 1 791 combinaisons, 14,04 ms d’exécution. Ces mesures locales
ne constituent pas un engagement de performance de staging.

Les tests navigateur du dashboard/catalogue complet utilisent le mode MVP de
développement. Aucune nouvelle session Clerk authentifiée standard/admin/expirée
n’a été créée sur le build servi. Les vérifications simulées de paiement et
de rôles ne remplacent pas ces parcours réels ; la réception distante reste L4,
conditionnée à une autorisation. Le serveur est restitué en mode Clerk local.

## Captures

- [Desktop réel, Sénégal](screenshots/l3-tv-real-desktop.png)
- [Mobile réel, Sénégal](screenshots/l3-tv-real-mobile.png)
- [Filtres mobiles réels](screenshots/l3-tv-real-filters.png)
- [Fixture à 320 px](screenshots/l3-tv-320.png)

Prochaine étape du plan : L4, AL-Q01, AL-Q02 et AL-C05. L5 est optionnel ;
aucune activation du briefing avant L6.
