# Réception E3 — édition anglaise, 12 octobre 2026

**EDI-301 à EDI-308 implémentés et vérifiés localement après « Feu vert pour E3 ».** Aucun commit, push, déploiement ou changement distant.
E0/E1/E2 et l'arbre volontairement sale sont conservés. **E4 attend son feu vert ; D7 reste ouvert pour la réception arabe.**

## Résultat par ticket

| Ticket | Livrable reçu |
| --- | --- |
| EDI-301 | RSS, monde, marchés, briefing et chaînes du pays portent l'édition ; données et requêtes en cours isolées, état précédent vidé au changement. Repères de visite et rangées TV EN séparés ; favoris, pays suivis, Éco et historique des chaînes restent communs. Cache des dépêches de recherche séparé par édition. Les anciennes adresses et clés FR restent compatibles. |
| EDI-302 | Sélecteur globe dans l'en-tête, section du compte, sélecteur et ligne sur la landing. Français/English, sans drapeau, `radiogroup`, flèches/Entrée/Échap ; cookie d'un an, navigation complète et paramètres conservés. Masqué avec une seule édition. |
| EDI-303 | `en.ts` complet, `satisfies Dictionary`, **891 textes uniques** traduits manuellement ; contrôle des variables des gabarits. Textes TV, lecteur, recherche, partage UI, compte, tarifs et erreurs extraits, FR copié. Les erreurs de préférences partagées sont traduites à l'affichage, y compris favoris refusés et pays d'un import partiel ; stockage et reprise conservés. `Widen` accepte les tableaux sérialisables des offres. Clerk `enGB` officiel avec marque Africa Live ; administration conservée en FR. |
| EDI-304 | Noms EN, corrections DR Congo/Republic of the Congo/Western Sahara, matrice des 55 pays, tri localisé. Pays suivis d'abord, puis défaut EN et ordre existant ; FR conserve son ordre de référence. Météo sans sélection : Nigeria/Lagos. TV : pays principal suivi, sinon récent, sinon pays de l'édition. Priorité de langue **dans le tri SQL et le curseur**, sans filtre ajouté. |
| EDI-305 | Huit paires USD/NGN, GHS, KES, ZAR, DZD, MAD, TND, EGP dérivées du même relevé ExchangeRate-API. Panier visible selon édition, FR historique conservé. Produits par symbole, unités EN et météo traduite par code fournisseur ; le contrat météo possédait déjà le code, aucune extension nécessaire. |
| EDI-306 | 32 gabarits serveur de briefing, pays et textes selon édition, mêmes branches/métriques/heuristique, cache `édition\|pays`, RSS et marchés correspondants. Aucune API générative payante. |
| EDI-307 | Carte bancaire internationale mise en avant ; Wave/Orange Money situés au Sénégal et dans l'UEMOA/WAEMU. Compte/tarifs EN en FCFA. **990 et 9 900 FCFA, devise XOF, contrats/codes de plans, NabooPay et éligibilité inchangés.** |
| EDI-308 | EN prête avec `EDITIONS=fr,en`, AR masquée. Réception UI/API/SQL, FR/EN, Clerk/MVP, captures, contrôles et passation ci-dessous. |

Les réécritures relatives de `next.config.ts` et les règles du proxy reçues en E1 ne sont pas modifiées.
Les chemins des composants de navigation sont normalisés sans préfixe avant le rendu : SSR et navigateur concordent lors des réécritures.

## Contrôles et preuves

Traces privées : `.local-logs/editions-e3/`. Les nombres suivants sont des résultats réels, pas une promesse de couverture de tous les tests du dépôt.

| Vérification | Résultat | Trace |
| --- | --- | --- |
| `npx tsc --noEmit --incremental false` | Sans erreur | `types-final.txt` |
| `npm run lint` | Sans erreur ni avertissement | `lint-final.txt` |
| `npm test`, garde réseau | **542 : 501 réussis, 41 ignorés, 0 échec** | `unit-final.txt` |
| `npm run test:invariants` | **4/4** | `invariants.txt` |
| `npm run build`, `EDITIONS=fr,en` | Réussi ; FR/EN statiques, landing ISR, connecté dynamique | `build-final-fr-en.txt` |
| `npm run build`, `EDITIONS=fr` | Réussi, EN masquée | `build-fr-only.txt` |
| Composants complets, dont deux parcours EN de préférences | **104/104**, repli FR sans fournisseur conservé | `components-final.txt` (premier banc : `components-first.txt`) |
| Réception E3 MVP | **4 réussis, 1 ignoré** (public réservé Clerk) | `editions-first.txt` |
| Sélection FR MVP, 10 fichiers | 101 réussis + 1 ignoré ; 2 régressions corrigées puis reçues | `e2e-fr-first.txt`, `final-rerun.txt` |
| Dernier banc des fichiers modifiés FR/EN | **28 réussis, 1 ignoré, 0 échec** | `changed-fr-en.txt` |
| Lecteur/paiement/mobile complémentaires | 19 réussis, 10 ignorés ; 1 cas de décodage rejoué **1/1** | `e2e-additional.txt`, `anchored-rerun.txt` |
| Dernier banc FR complémentaire, 7 fichiers | **34/34** : accessibilité axe/clavier, catalogue, contrat SQL réel, rangées TV, mur TV, lecteur direct synthétique et profil 1/2/4 lectures | `e2e-extra-final.txt` |
| API FR/inactives en MVP | **4/4**, vrai RSS FR implicite/explicite | `api-rerun.txt` |
| Clerk FR/EN, 6 fichiers | 23 réussis + 5 ignorés ; dernier défaut 404 corrigé et reçu | `clerk-first.txt`, `clerk-rerun.txt` |
| Clerk FR seul (auth/routage/paiement) | **17/17** | `fr-only-e2e.txt` |
| Données métier SQL | **8/8 empreintes identiques** | `before.json`, `after.json` |
| `.env*` et diff | Empreintes identiques ; diff sans erreur d'espacement | `env-comparison.json`, `diff-check.txt` |

Les 41 unités ignorées sont des intégrations conditionnelles. Les cas E2E ignorés dépendent du mode (MVP, build, catalogue de fixture).
Les refus anonymes et widgets Clerk sont réellement reçus en mode Clerk ; paiements, hydratation et scénarios d'incident utilisent les frontières simulées prévues.
Aucun paiement réel, création/modification d'identité ou fixture utilisateur/catalogue n'a été effectué.
Un lancement `auth-entry` sous MVP était inapplicable et a été corrigé par la réception Clerk ; ses échecs ne sont pas comptés comme régressions applicatives.

## Régressions corrigées pendant la réception

- Le catalogue avait deux espaces DOM entre le nombre et « chaînes visibles » après extraction JSX. Corrigé au caractère près, assertion de recherche conservée.
- Le bouton de réinitialisation du pays recouvrait le centre de la saisie à 320 px avec deux éditions. Sa cible reste 24 px sous 360 px dans ce seul cas ; clavier et assertion utilisateur conservés. FR seul garde son rendu existant.
- Le 404 d'une édition inactive rappelait le getter qui déclenchait lui-même `notFound`. Son repli FR est conservé sans récursion ; HTTP 404 et « Page hors antenne » passent à nouveau.
- Les constantes d'offre importées depuis un composant devenu client ne pouvaient pas être lues au build serveur. Elles vivent désormais dans `lib/plan-copy.ts`, sans changer leurs montants.
- Les erreurs de synchronisation et de favoris refusés restaient françaises en EN. Les phrases connues sont traduites à l'affichage sans modifier le stockage partagé, les choix en attente ni la reprise. Le banc vérifie l'échec/reprise EN et un import EN partiel. « Côte d'Ivoire » est aussi le nom officiel de la table EN ; le test de changement de langue utilise « Sénégal » → « Senegal ».
- Les tests de disponibilité EN sont actualisés pour EN prête/AR toujours indisponible, avec les mêmes assertions sur FR, redirections et refus.
- Le décodage réel du popup a dépassé le délai de 5 s lors du premier chargement ; le même scénario passe après compilation, sans modification du test ni retrait d'assertion.

## Réception réelle

**Pagination TV sur PostgreSQL local via HTTP, sans fixture :** Nigeria, **50 FR = 50 EN**, ensembles d'identifiants identiques, zéro doublon entre pages,
**46 anglophones en tête** puis les autres langues. Trace `catalog-pagination.json`. Le curseur est lié à la préférence linguistique et au compte/session.
Le champ `edition` du catalogue est optionnel, le champ `language` est seulement ajouté aux réponses EN ; les anciens corps FR et contextes de curseur restent compatibles.

**Session Edge déjà connectée à Clerk :** passage FR → EN avec le sélecteur, Radar anglais à l'adresse courte, compte « My access » et
« Active (Administrator) », profil Clerk anglais, TV anglaise avec pays principal suivi conservé (Maroc), puis Radar et retour FR.
Compte, favoris/pays et droits existants préservés. Aucun champ de profil édité. Onglet de réception fermé, autres onglets laissés ouverts.
Preuve privée actualisée `clerk-en-radar-final.jpg` (Radar stabilisé après reprise, session Clerk réelle).
Au dernier démarrage à froid, les premières demandes EN ont affiché le repli indisponible ; « Try again » a ensuite reçu **300 dépêches de 60 rédactions** et les marchés.
La limite navigateur de 15 s est conservée ; le temps de collecte à froid peut la dépasser (inférence cohérente avec la reprise après mise en cache).
Les données et le retour FR sont reçus, mais une disponibilité au premier chargement n'est pas garantie pour des flux amont lents.

**Bouquet EN revérifié le 12/10 :** 85 sources, 69 noyau, 13 compléments, 2 KO, 1 ancienne au relevé ; aucune taille au-delà d'1 Mo,
aucune avance résiduelle. Nation est revenu en 404 et reste désactivé, avec Eye Radio déjà désactivé ; SABC a dépassé 8 s au relevé puis répondu lors de la réception réelle.
Les sources lentes/intermittentes restent signalées par la disponibilité et le repli, sans contournement. `feeds-en-before/`.
Les sources FR sont conservées sur décision du propriétaire ; R1–R5 attendent toujours mesures de semaine et décision de remplacement.

## Captures et écarts de périmètre

[Galerie FR/EN 360/768/1366](<C:/Users/GAMER PC/Africa_Live_TV/.local-logs/editions-e3/captures.md>).
Douze captures MVP Radar/TV et dix-huit publiques FR/EN (landing, tarifs, connexion) : **0 débordement, 0 erreur de page**.
Les données Radar sont réelles et évolutives ; pas d'égalité pixel prétendue entre langues ou relevés.

FR seul comparé à E2 sur 18 captures publiques : **17/18 identiques au seuil 12/255** ; tarifs 360 px : 0,458 % d'écart volontaire D5.
Les extraits de texte des pages juridiques/contact/404 sont identiques ; landing et tarifs changent seulement pour la carte internationale mise en avant et la précision Sénégal/UEMOA.
Les messages console de préchargement Clerk bloqué et ressources 404 sont ceux déjà connus en E1/E2 ; URLs masquées dans le rapport.

Écarts reçus pour compatibilité : FR conserve l'ordre historique de sa grille, EN place son défaut après les pays suivis ; clés/adresses FR inchangées.
Les API marchés/catalogue/chaînes de pays reçoivent l'édition pour permettre leurs comportements EN, en conservant quotas et garde d'accès.
La préférence de langue du catalogue est un **tri**, jamais un filtre.

Les grandes sections de landing, CGU/confidentialité/contact, métadonnées/OG et les liens/textes publics de partage restent le périmètre E5.
La landing `/en` reçoit ici son document EN, son sélecteur et sa ligne d'édition ; son grand corps marketing reste français jusqu'à E5.
Pas de dictionnaire arabe, police arabe, conversion RTL, pont entre éditions, stockage d'édition dans le compte ni tâche Windows : lots futurs.
La relecture arabe native D7 reste à obtenir pour E4.

## Fichiers et reprise

Principaux fichiers : `src/i18n/{fr,en,dictionary,message}.ts`, fournisseurs/layouts et thème Clerk ; `EditionSwitcher`, `AccountPreferences`,
helpers `edition-client`, `country-names`, `edition-affinity`, `edition-markets`, `weather-text`, `plan-copy` ; composants TV/lecteur/recherche/partage/compte/tarifs,
hooks Radar et recherche, briefing/marchés, contrats/cursor/catalogue SQL et API de pays, `e2e/editions.spec.ts`, tests de formats/routage/affinités.
`next.config.ts`, proxy, NabooPay, migrations et source IPTV sans changement dans E3. Pas de dépendance ajoutée.

Serveurs de réception arrêtés à la clôture, ports 3001/3002 libérés ; `.env*`, Railway/Clerk/OVHcloud/DNS/tâches Windows inchangés.
**Suite : E4 seulement après « vert pour E4 », sans refaire E0 à E3.**
