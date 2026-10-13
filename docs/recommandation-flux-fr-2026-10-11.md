**Africa Live — registre français du Radar : remplacements et retraits proposés, 11 octobre 2026**

**Décision reçue le 11/10 pendant E2 : conserver les flux FR actuels et reporter R1–R5 aux mesures de semaine.** Le déplacement vers `src/lib/feeds/africa-fr.ts` a conservé toutes les URL, les états et l’ordre ; aucun remplacement proposé ci-dessous n’est autorisé par le feu vert E2.

Statut : **recommandation, aucune source modifiée.** `RSS_FEEDS` (alias de `src/lib/feeds/africa-fr.ts`) reste tel quel jusqu'à la décision du propriétaire.
Les relevés de semaine restent à faire (voir § 4) : le 11/10 était un dimanche, les mesures ci-dessous sont des mesures de week-end.

## 1. Constat et proposition

| Source (registre actuel) | Constat du 11/10 | Cause établie | Proposition |
| --- | --- | --- | --- |
| Agence Ecofin `…/feed` | Flux valide, plus récent article 19/03/2025 | Ancien flux « Finance » figé ; le site déclare d'autres flux | **Changer l'URL** → `https://www.agenceecofin.com/component/obrss/agence-ecofin-full` (même `id`, nom, domaine) |
| Radio Okapi `…/rss.xml` | Plus récent article 29/09 (≈ 297 h) | `rss.xml` figé ; le site publie toujours (17 articles le 11/10) | **Changer l'URL** → `https://www.radiookapi.net/feed` |
| Jeune Afrique `…/feed/` | HTTP 403 | Refus Cloudflare de tout le site (page d'accueil comprise) pour le User-Agent de l'application ; robots.txt interdit `/*/feed` | **Retirer** (`enabled: false`) ; **ajouter Afrik.com** comme source panafricaine |
| AIP (Côte d'Ivoire) | Délai de 8 s dépassé aux deux passages | Serveur lent sur toutes ses pages (accueil 5,6 s, flux 7–10 s, cache contourné) ; aucune adresse plus rapide | **Si confirmé en semaine** : retirer et **ajouter Linfodrome** (CI) |
| Financial Afrik | 8 s dépassées une fois sur deux | 3 essais sur 3 au-delà de 8 s le soir (17–25 s, une réponse tronquée) | **Si confirmé en semaine** : retirer ; l'économie reste couverte par Ecofin réparé |
| — (candidat de l'étude) | — | Défi Media (Maurice) sain | **Ajouter** (`MU`, nouveau pays) |

Aucun changement n'est proposé pour les 16 autres flux africains et internationaux de `RSS_FEEDS` (21 actifs) ni pour les 15 flux de « Regards sur le monde » (tous `core` ou `complement` le 11/10).

## 2. Preuves (mesures outillées)

Mesure `npm run feeds:verify` (même User-Agent, délai de 8 s et parseur que l'application), dimanche 11/10 à 19 h 16 (Dakar) :

| Candidat | Rôle / pays | Verdict | Articles | En 24 h | Plus récent | Taille |
| --- | --- | --- | --- | --- | --- | --- |
| Ecofin `agence-ecofin-full` | panafricain | core | 30 | 7 | 3,3 h | 43 Ko |
| Ecofin `agence-rss` | panafricain | core | 20 | 7 | 3,3 h | 38 Ko |
| Ecofin `agence-large-rss` | panafricain | core | 40 | 7 | 3,3 h | 74 Ko |
| Radio Okapi `/feed` | national CD | core | 50 | 7 | 1,7 h | 61 Ko |
| Radio Okapi (FeedBurner) | national CD | core | 50 | 6 | 5,9 h | 60 Ko |
| Linfodrome | national CI | core | 74 | 20 | 0,8 h | 95 Ko |
| RTI Info | national CI | core | 10 | 3 | 5,7 h | 81 Ko |
| Afrik.com | panafricain | core | 10 | 10 | 0,5 h | 16 Ko |
| Mondafrique | panafricain | core | 10 | 5 | 1,5 h | 184 Ko |
| Sika Finance (BRVM) | panafricain | complement | 30 | 0 | 51,2 h (bourse fermée le week-end) | 28 Ko |
| Défi Media | national MU | core | 133 | 41 | 0,6 h | 55 Ko |
| Abidjan.net (actualités) | national CI | ko (flux vide) | 0 | — | — | 1 Ko |
| Anadolu Afrique (FR) | international | ko (8 s dépassées) | — | — | — | — |

Recherche des adresses (requêtes `curl` avec le seul User-Agent de l'application) : détail dans
`.local-logs/feeds-verify/2026-10-11/discovery-fr.md` ; mesures dans `.local-logs/feeds-verify/2026-10-11/candidates-1915/` (`result-fr.json`,
`summary-fr.md`, `titles-fr.json`) ; relevés du registre de 18 h 52 dans `.local-logs/feeds-verify/2026-10-11/result-fr.json` et `retry/` (dossiers privés, hors Git).

## 3. Raisons des choix

- **Ecofin** : `agence-ecofin-full` est le premier flux déclaré par la page d'accueil sous le titre « Agence Ecofin » ; même fraîcheur que `agence-rss`, 30 articles au lieu de 20,
  taille moyenne (43 Ko). Les flux RSS de rubrique (`finance-rss`, `mines-rss`…) sont figés entre 2019 et 2025 : ne pas les utiliser.
- **Radio Okapi** : `/feed` est servi par le site lui-même, plus frais que le miroir FeedBurner (1,7 h contre 5,9 h) et donne des liens directs vers radiookapi.net.
  Le relevé précédent marquait la langue « ? » sur l'ancien flux ; le nouveau est détecté `fr`.
- **Jeune Afrique** : le refus porte sur tout le site, pas sur une adresse. Changer de User-Agent ou passer par un relais serait un contournement, exclu.
  Le plan de site `sitemap-googlenews.xml` répond 200, mais il est destiné aux moteurs et n'est pas un flux RSS (il faudrait un nouveau lecteur) : non recommandé.
  Remplaçant proposé : **Afrik.com** (actualité panafricaine francophone, 10 articles en 24 h un dimanche, 16 Ko). **Mondafrique** fonctionne aussi mais mêle
  Afrique et Moyen-Orient avec une ligne éditoriale d'enquête marquée : à garder en réserve. APA News (Dakar) aurait été le meilleur choix éditorial, mais son flux est
  derrière un défi anti-robot Cloudflare : exclu.
- **AIP et Financial Afrik** : le collecteur lance tous les flux ensemble (`Promise.allSettled`) et attend le plus lent, borné à 8 s. Un flux qui dépasse
  régulièrement 8 s retarde donc **chaque** collecte du Radar de 8 s, puis marque l'instantané « partiel », pour zéro article frais (seul le dernier bon relevé est réutilisé).
  Allonger le délai pour une source aggraverait l'attente de toutes. **Linfodrome** remplace AIP pour la Côte d'Ivoire (74 articles, 20 en 24 h, 1,7 s) ;
  **RTI Info** est un complément possible (10 articles, surtout société et culture). Pour Financial Afrik, Ecofin réparé couvre l'économie ; **Sika Finance** (BRVM, utile à la zone
  UEMOA donc au Sénégal) est à remesurer un jour de bourse avant toute proposition.
- **Défi Media** : déjà retenu par l'étude des éditions ; ajoute Maurice, absent du registre.

## 4. Revérification en semaine (à faire, lundi 12/10 conseillé)

Deux passages, vers 10 h et vers 16 h (Dakar) :

```bash
npm run feeds:verify -- --edition fr
```

```bash
npm run feeds:verify -- --edition fr --list .local-logs/feeds-verify/candidates-fr.txt --out .local-logs/feeds-verify/2026-10-12/candidates
```

Pour le second passage, ajouter `--out .local-logs/feeds-verify/2026-10-12/apres-midi` à la première commande et `-apres-midi` au dossier de la seconde,
sinon le relevé du matin est remplacé. Relance des seuls flux lents à 20 s pour séparer « lent » et « en panne » :

```bash
npm run feeds:verify -- --edition fr --list .local-logs/feeds-verify/slow-fr.txt --timeout 20000 --concurrency 1 --out .local-logs/feeds-verify/2026-10-12/lents-20s
```

Règles de décision proposées :

1. Ecofin `agence-ecofin-full` et Okapi `/feed` : adopter si `core` ou `complement` aux deux passages.
2. AIP et Financial Afrik : retirer si les 8 s sont dépassées à au moins un des deux passages de semaine (en plus des échecs du 11/10) ; garder sinon, et noter la marge.
3. Afrik.com, Linfodrome, Défi Media : ajouter si `core` aux deux passages, sans avance de date (`futur = 0`) et langue `fr`.
4. Sika Finance : proposer comme complément seulement si au moins 3 articles en 24 h un jour de bourse.
5. Jeune Afrique : retrait sans condition (refus du site), sauf si le site rouvre l'accès au User-Agent de l'application.

## 5. Coordination avec les éditions (EDI-201)

EDI-201 déplace la liste française « à l'identique » vers `src/lib/feeds/africa-fr.ts`. Pour garder ce déplacement vérifiable (diff de déplacement pur),
**recommandation : appliquer ces corrections avant E2, dans un petit lot séparé limité aux données de `RSS_FEEDS`**, après la mesure de semaine et l'accord du propriétaire.
EDI-201 déplacera ensuite la liste corrigée. Autre possibilité : faire ces changements dans EDI-201, en exception documentée à « l'identique » ; c'est moins lisible
à la réception parce que le déplacement et les changements de contenu se mélangent.

Contraintes à respecter dans les deux cas (tests et plan technique) :

- `RSS_FEEDS[0]` reste APS ; `aps` inchangé (`rss-regressions.test.ts`, `rss-image.test.ts`).
- 6 flux `international` exactement (`rss-collector.test.ts`) : Afrik.com, Linfodrome et Défi Media sont `africa`.
- `ecofin` garde son nom « Agence Ecofin » (`radar-reliability.test.ts` le cherche par nom) ; `okapi`/`ecofin` gardent leur `id` (seule l'URL change).
- Retraits par `enabled: false` plutôt que suppression : les `id` restent réservés et l'historique lisible.
- Pas d'accès réseau dans `npm test` : aucun test ne lit ces URL ; la vérification réelle reste `npm run feeds:verify`.

Modification indicative (non appliquée) :

```ts
// Radio Okapi
url: 'https://www.radiookapi.net/feed',
// Agence Ecofin
url: 'https://www.agenceecofin.com/component/obrss/agence-ecofin-full',
// Jeune Afrique (403 sur tout le site pour le User-Agent de l'application, 11/10/2026)
enabled: false,
// Nouveaux flux africains
{ id: 'linfodrome', editorialScope: 'africa', name: 'Linfodrome (Côte d’Ivoire)', domain: 'linfodrome.com',
  url: 'https://www.linfodrome.com/rss', defaultCountry: 'CI', category: 'Côte d’Ivoire & National', enabled: true },
{ id: 'defimedia', editorialScope: 'africa', name: 'Défi Media (Maurice)', domain: 'defimedia.info',
  url: 'https://defimedia.info/rss.xml', defaultCountry: 'MU', category: 'Maurice & National', enabled: true },
{ id: 'afrikcom', editorialScope: 'africa', name: 'Afrik.com', domain: 'afrik.com',
  url: 'https://www.afrik.com/feed', defaultCountry: null, category: 'Actualité Panafricaine', enabled: true },
// AIP et Financial Afrik : enabled: false seulement si la mesure de semaine confirme le dépassement de 8 s
```

## 6. Décisions attendues du propriétaire

- **R1** : nouvelles URL Ecofin et Radio Okapi (recommandé, sans condition autre que la mesure de semaine).
- **R2** : retrait de Jeune Afrique et ajout d'Afrik.com (Mondafrique en réserve).
- **R3** : ajout de Défi Media (Maurice).
- **R4** : AIP remplacé par Linfodrome, et retrait de Financial Afrik, **si** la mesure de semaine confirme la lenteur ; RTI Info en complément facultatif.
- **R5** : moment d'application : petit lot de données avant E2 (recommandé) ou dans EDI-201.
