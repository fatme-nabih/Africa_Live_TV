# Réception E5 — pages publiques et partage par édition, 13 octobre 2026

**EDI-501 à EDI-505 implémentés et vérifiés localement après « feu vert pour E5 ».** Aucun commit, push, déploiement, migration ni changement distant.
E0 à E4 et l'arbre volontairement sale sont conservés ; l'index Git est resté tel qu'il était (une modification de l'index par `git mv` a été annulée immédiatement). **E6 n'a pas commencé.**
Les textes arabes ajoutés restent soumis à la relecture native (D7), et les textes juridiques traduits à une relecture juridique conseillée.

## Résultat par ticket

| Ticket | Livrable | État |
| --- | --- | --- |
| EDI-501 | Landing, CGU, confidentialité, contact et tarifs lus dans les dictionnaires, **statiques par édition** au build (`/en/cgu.html`, `/ar/contact.html`…). Liens internes de l'édition (`editionHref`). Métadonnées : le français garde exactement les siennes ; EN/AR ont leurs titre, description, `og:locale` et image d'aperçu `og-image-en.png` / `og-image-ar.png` (1200 × 630, ~100 Ko, logo de 500 px et fond de `og-image.png`). Canonique et `hreflang` (`fr`, `en`, `ar`, `x-default`) **seulement si plusieurs éditions sont actives** : un build `EDITIONS=fr` garde le même `<head>`. Le manifeste reste français (limite documentée). | Fait |
| EDI-502 | Partage d'une chaîne : texte de l'édition et lien `/en/player/…` ou `/ar/player/…`. Partage d'une dépêche : « Via Africa Live » vers l'accueil de l'édition, l'article restant chez l'éditeur. Français identique. | Fait |
| EDI-503 | Suggestion de langue discrète, seulement sur une page publique, sans cookie d'édition, si le navigateur préfère une autre édition active. Elle propose l'édition dans sa propre langue, sans redirection ; sa fermeture est mémorisée localement. Rien n'est rendu côté serveur. | Fait |
| EDI-504 | CGU et confidentialité traduites en EN et AR, avec « La version française fait foi » en tête des traductions. **Relecture juridique conseillée au propriétaire.** | Fait, relectures à faire |
| EDI-505 | Comparaison FR au pixel, builds `fr,en,ar` et `fr`, contrôle des balises, captures EN/AR, E2E Clerk et MVP, banc des composants, unités. | Fait |

## Défaut trouvé et corrigé pendant la réception

**Un simple passage sur `/en` changeait l'édition du visiteur.** Next.js préchargeait les liens visibles, dont `/en/sign-in`. Ce préchargement passait par la règle du proxy qui mémorise l'édition d'un lien partagé vers l'espace connecté, et posait le cookie `al_edition=en` sans aucun clic : `/` redirigeait ensuite vers `/en`. Les liens préfixés vers l'espace connecté ne sont plus préchargés (`editionLinkPrefetch`, appliqué à `ButtonLink`, `RichText` et la landing). Un test unitaire et un E2E le verrouillent (« aucun cookie après la visite de `/en` »). Les liens français ne changent pas.

## Contrôles et preuves

Traces privées : `.local-logs/editions-e5/`.

| Vérification | Résultat | Trace |
| --- | --- | --- |
| `npx tsc --noEmit --incremental false` | Sans erreur | `types-final.txt` |
| `npm run lint` | Sans erreur ni avertissement | `lint-final.txt` |
| `npm test`, garde réseau | **553 : 512 réussis, 41 ignorés, 0 échec** (+5 tests dans `edition-public.test.ts`) | `unit-final.txt` |
| `npm run test:invariants` | **4/4** | `invariants-final.txt` |
| Banc des composants (3001, seul) | **104/104** (entrée du banc pointée vers `PricingClient`, même composant) | `components.txt` |
| Pages publiques FR avant/après (build Clerk `fr,en,ar`, 5 pages × 360/768/1366, références stables sur 2 relevés) | **15/15 identiques au pixel** | `visual-fr-final.txt`, `visual/baseline/` |
| Pages publiques FR/EN/AR (45 relevés) | `lang`/`dir` corrects, débordement 0, 0 erreur de page ; canonique, `hreflang` et `og:image` propres à chaque édition | `captures/report.json`, `captures/*.png` |
| Sélection E2E Clerk `fr,en,ar` (dont EDI-503/505) | **30 réussis, 11 ignorés (scénarios MVP), 0 échec** | `e2e-clerk.txt` |
| Build Clerk `EDITIONS=fr` + même sélection | **23 réussis, 18 ignorés, 0 échec** ; aucun canonique ni `hreflang`, titres et aperçu FR inchangés, `/en` en 404 | `e2e-clerk-fr-only.txt` |
| E2E MVP `fr,en,ar` (éditions, routage, API, Radar, météo, coquille, TV, partage, recherche, a11y, MVP) | **93 réussis, 7 ignorés, 1 échec** : `local-mvp` (chaînes `OFFLINE` de la base réelle), écart préexistant consigné en E4 | `e2e-mvp.txt` |
| Empreintes métier SQL (8 tables) et `.env*` | **Identiques** | `after.json`, `env-after.txt` |

## Écarts au plan et choix

1. **Liens vers l'espace connecté** : préfixés par l'édition (`/ar/sign-in`) pour qu'un visiteur sans cookie arrive dans sa langue, et jamais préchargés (voir le défaut ci-dessus).
2. **Pages client converties** : `contact` et `pricing` deviennent des pages serveur (métadonnées) qui affichent `ContactForm` / `PricingClient`. Les fichiers renommés sont restés à leur place dans l'index Git ; les nouveaux composants sont des fichiers non suivis.
3. **Rendu identique** : un texte assemblé en un seul nœud décalait les glyphes d'un pixel (copyright, nombre de chaînes par genre). `TemplateText`/`YearText` reproduisent les nœuds de l'ancien JSX.
4. **Image d'accueil** : la capture `hero-radar-tv.webp` montre l'interface française ; sa légende EN/AR le précise.

## Limites

- **D7** : 1 165 textes arabes à relire (dont les 172 ajoutés en E5 : landing, CGU, confidentialité, contact, partage, suggestion) — même CSV `docs/relecture-arabe-e4-2026-10-12.csv`, régénéré.
- **Juridique** : traductions EN/AR des CGU et de la confidentialité à faire relire. Le texte français n'a pas été modifié ; il ne mentionne pas encore le cookie fonctionnel `al_edition` ni la mémorisation locale de la suggestion (à décider par le propriétaire).
- Le manifeste PWA reste français. Les erreurs renvoyées en français par l'API de contact sont remplacées par un message générique traduit en EN/AR.
- Le contrôle d'une session Edge connectée reste celui listé en E4 (non piloté).

## Fichiers et reprise

Nouveaux : `src/i18n/metadata.ts`, `src/components/marketing/RichText.tsx`, `src/components/shell/EditionSuggestion.tsx`, `src/app/[edition]/contact/ContactForm.tsx`, `src/app/[edition]/(clerk)/pricing/PricingClient.tsx`, `src/lib/edition-public.test.ts`, `public/og-image-en.png`, `public/og-image-ar.png`.
Modifiés : `src/i18n/{fr,en,ar}.ts` (espaces `landing`, `legal`, `contact`, `share.messages`, suggestion), `src/app/[edition]/{layout,page}.tsx`, `cgu`, `privacy`, `contact` et `pricing/page.tsx`, `src/lib/{edition-routing,edition-client,share-links}.ts`, `src/components/ui/Button.tsx`, `src/components/tv/ChannelTile.tsx`, `e2e/editions.spec.ts`, `e2e/components/entry.tsx`, `src/lib/edition-arabic.test.ts`.
Ports 3001/3002 libres, serveurs du lot arrêtés. **Le dernier `.next` est un build FR seul (mode Clerk).**
