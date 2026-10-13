> **Actualisation du 13/10/2026 après E9 :** validation du propriétaire reçue dans le chat (« Relectures validées, publier les textes actuels »). D7 enregistré, EDI-404 reçu ; les propositions juridiques restent non appliquées. [Retour consigné](relectures-editions-2026-10-13/validation-proprietaire.md). Les mentions antérieures « en attente » ci-dessous sont historiques.

# Relecture arabe native (D7) — édition arabe E4, 12 octobre 2026

> **Préparation du 13/10 après E9 :** le propriétaire validera D7 et la relecture juridique. [Dossier de relecture](relectures-editions-2026-10-13/README.md), [pré-relecture arabe](relectures-editions-2026-10-13/arabe-prerelecture.md) et [fiche de retour](relectures-editions-2026-10-13/validation-proprietaire.md) prêts. **Aucune validation encore rendue.** Le CSV canonique et ses colonnes de correction restent intacts. Les nouvelles propositions juridiques arabes sont à valider également.

> **Mise à jour du 13/10 (E6) :** CSV régénéré avec les 10 textes d'E6 (`radar.feed.bridge` en six formes, `radar.feed.bridgeLanguages`, `shell.edition.savedInAccount`) : **1 175 textes**. Aucune correction de relecteur n'existait ; rien n'a été écrasé.
>
> **Mise à jour du 13/10 (E5) :** le CSV a été régénéré avec les textes publics ajoutés en E5 (landing, CGU, confidentialité, contact, partage, suggestion de langue) : **1 165 lignes**, dont 172 nouvelles. Les CGU et la confidentialité arabes demandent aussi une relecture juridique ; la version française fait foi.

**Statut : en attente de la validation native D7 par le propriétaire, qui s'est désigné comme validateur le 13/10.** Le code et les contrôles techniques d'E4 sont terminés localement ; EDI-404 ne sera déclaré reçu qu'après le retour de relecture. La pré-relecture technique ne vaut pas validation native.
La traduction a été préparée par l'agent en arabe standard moderne (فصحى معاصرة), sans traduction automatique ni API payante.

## Ce qu'il faut relire

| Élément | Fichier | Volume | Ce qui est attendu |
| --- | --- | --- | --- |
| Textes d'interface et pages publiques | [relecture-arabe-e4-2026-10-12.csv](relecture-arabe-e4-2026-10-12.csv) (source : `src/i18n/ar.ts`) | **1 175 lignes**, dont les 65 textes juridiques : clé, français de référence, arabe proposé, colonnes `correction` et `commentaire` | Corriger directement la colonne `correction` ; laisser vide si la proposition convient, puis confirmer le périmètre effectivement relu dans la fiche de retour |
| Écrans Clerk (connexion, compte) | `@clerk/localizations` `arSA` officiel + [CSV personnalisé](relectures-editions-2026-10-13/clerk-ar-personnalise.csv) | **19 lignes** : 9 textes indicatifs +8 titres/sous-titres avec leurs variantes +2 liens d'action | Vérifier aussi les écrans officiels en contexte (captures `.local-logs/editions-e4/captures-ar/clerk-ar-*.jpg`) |
| Annotations des titres réels | `src/lib/fixtures/editions/titles-ar.json` (relevé E0 du 11/10) | 228 titres | Vérifier le pays attendu de chaque titre et les pièges (`مصر`/`مصرف`, `المغرب`, `الصحراء`, `النيجر`/`نيجيريا`, `السودان`/`جنوب السودان`) |

Le CSV s'ouvre dans Excel ou LibreOffice (UTF-8 avec BOM). Les `{nom}` sont des variables remplacées à l'affichage : les garder telles quelles.

## Points à regarder en priorité

1. **Pluriels** : l'arabe a six formes (`zero`, `one`, `two`, `few` 3–10, `many` 11–99, `other` 100+). Les lignes `….zero`, `….one`, etc. du CSV donnent chaque forme ; par exemple `radar.grid.channels` : قناة واحدة · قناتان · 3 قنوات · 11 قناة · 100 قناة.
2. **Formes neutres choisies pour éviter l'accord** quand le français concatène un nombre et un nom : « القنوات المعروضة: {v0} », « الأيام المتبقية: {v0} », « {v0} من الأخبار » (briefing). Les fragments `" قناة معروضة"` (après un nombre) et `"من أصل " … " يوم"` (jauge d'accès) sont les plus fragiles.
3. **Chiffres occidentaux** (D3) : 0–9 partout, jamais ٠–٩. Prix en FCFA inchangés : **990** et **9 900 FCFA** (D5). Dans `ar.ts`, le séparateur des milliers est une espace fine insécable (`\u202F`) : une espace ordinaire ferait afficher « 900 9 » de droite à gauche. Les formules « 1 USD = … FCFA » sont isolées par `\u2066…\u2069` ; ces marques sont invisibles et doivent être conservées.
4. **Noms neutres** (D6) : « الصحراء الغربية » ; RT Arabic signalé « روسيا · وسيلة إعلام حكومية ».
5. **Terminologie** : « النسخة » pour une édition, « الرادار », « الدليل » pour le catalogue, « المفضّلة », « وضع توفير البيانات » pour le mode Éco, « المشغّل المثبّت » pour le lecteur ancré.
6. **Paiement** : carte bancaire internationale en premier, Wave/Orange Money situés au Sénégal et dans l'UEMOA (« منطقة الاتحاد الاقتصادي والنقدي لغرب أفريقيا »).

## Périmètre et exclusions

- Les **titres des rédactions** ne sont jamais traduits : ils restent dans la langue de leur source.
- Les pages publiques, les CGU et la confidentialité sont désormais traduites depuis E5 et **font partie** du CSV à relire ; les 65 clés juridiques sont aussi dans le dossier comparatif FR/EN/AR.
- L'administration reste en français.

## Après la relecture

Reporter les corrections dans `src/i18n/ar.ts` (mêmes clés), relancer `npm test` (le test `edition-arabic.test.ts` contrôle variables, pluriels et chiffres) puis `npx tsc --noEmit --incremental false`, et noter la date de relecture dans le backlog (EDI-404) et le dossier de réception E4.
