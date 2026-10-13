/** EDI-206 : à lancer volontairement, jamais au build. ICU Node 22 ; noms statiques versionnés pour le navigateur. */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { AFRICAN_COUNTRIES } from '../lib/radar-countries';

for (const edition of ['en', 'ar'] as const) {
  const display = new Intl.DisplayNames([edition], { type: 'region' });
  const names = Object.fromEntries(AFRICAN_COUNTRIES.map(c => [c.code, [display.of(c.code) ?? c.code]]));
  execFileSync('git', ['status', '--short']);
  writeFileSync(`src/lib/country-lexicon/names-${edition}.ts`, `/** Généré par generate-country-lexicon.ts avec Node 22 ICU ; ne pas éditer à la main. */\nexport const COUNTRY_NAMES = ${JSON.stringify(names, null, 2)} as const;\n`);
}
