import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getDictionary } from '@/i18n/dictionary';
import { fr } from '@/i18n/fr';
import { ar } from '@/i18n/ar';
import { formatPlural } from '@/i18n/message';
import { countryName } from './country-names';
import { clerkLocalizationForEdition } from './clerk-theme';
import { horizontalStep } from './direction';
import { weatherPlace } from './weather-text';
import { EDITIONS, READY_EDITIONS } from './editions';

const PLURAL = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const variables = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort();

test('EDI-403: dictionnaire arabe complet, gabarits et pluriels conservés, édition prête', () => {
  assert.equal(getDictionary('ar'), ar);
  assert.ok(READY_EDITIONS.includes('ar'));
  let messages = 0, plurals = 0;
  const compare = (source: unknown, target: unknown, path: string) => {
    if (typeof source === 'string') {
      assert.equal(typeof target, 'string', path);
      assert.deepEqual(variables(target as string), variables(source), path); messages++; return;
    }
    assert.ok(target && typeof target === 'object', path);
    const keys = Object.keys(source as object);
    if (keys.includes('other') && keys.every(key => PLURAL.has(key))) {
      // Pluriel : l'arabe ajoute zero/two/few/many ; « other », « few » et « many » gardent toutes les variables du français,
      // « zero », « one » et « two » peuvent écrire le nombre en toutes lettres mais n'inventent aucune variable.
      plurals++;
      const forms = target as Record<string, string>;
      assert.ok(Object.keys(forms).every(key => PLURAL.has(key)) && 'one' in forms && 'other' in forms, path);
      const expected = variables((source as Record<string, string>).other);
      for (const [form, text] of Object.entries(forms)) {
        if (['other', 'few', 'many'].includes(form)) assert.deepEqual(variables(text), expected, `${path}.${form}`);
        else assert.ok(variables(text).every(name => expected.includes(name)), `${path}.${form}`);
      }
      messages++; return;
    }
    assert.deepEqual(Object.keys(target as object), keys, path);
    for (const key of keys) compare((source as Record<string, unknown>)[key], (target as Record<string, unknown>)[key], `${path}.${key}`);
  };
  compare(fr, ar, 'ar');
  assert.ok(messages > 900, String(messages)); assert.ok(plurals >= 14);
  assert.equal(formatPlural(ar.radar.grid.channels, 0, {}, 'ar'), 'لا قناة');
  assert.deepEqual([1, 2, 3, 11, 100].map(n => formatPlural(ar.radar.grid.channels, n, {}, 'ar')), ['قناة واحدة', 'قناتان', '3 قنوات', '11 قناة', '100 قناة']);
});

test('EDI-403: arabe en chiffres occidentaux, aucun texte français oublié, marquage D7', () => {
  const identical: string[] = [];
  const walk = (source: unknown, target: unknown) => {
    if (typeof source === 'string') {
      assert.doesNotMatch(target as string, /[٠-٩۰-۹]/, 'D3 : chiffres occidentaux');
      // En droite → gauche, une espace ordinaire coupe « 9 900 » en deux nombres affichés « 900 9 » : espace fine insécable.
      assert.doesNotMatch(target as string, /\d \d/, `bidi : ${target}`);
      if (source === target && /[a-zà-ÿ]/i.test(source.replace(/\{\w+\}/g, ''))) identical.push(source);
      return;
    }
    for (const key of Object.keys(source as object)) walk((source as Record<string, unknown>)[key], (target as Record<string, unknown>)[key]);
  };
  walk(fr, ar);
  // Seuls restent les noms de marque, codes et unités internationales, et un message de développeur jamais affiché.
  assert.deepEqual([...new Set(identical)].sort(), [
    ' GMT', '990 FCFA', 'AFRICA LIVE — {headline}', 'Africa Live', 'FCFA', 'Facebook',
    'Orange Money', 'VLC', 'Visa / Mastercard', 'Wave', 'WhatsApp', 'cwt', 'f',
    'usePlayerDock doit être utilisé sous PlayerDockProvider (layout /app).',
  ].sort());
  assert.match(readFileSync('src/i18n/ar.ts', 'utf8'), /À RELIRE \(D7\)/);
});

test('EDI-403: D2, D5 et D6 dans l’édition arabe', () => {
  assert.equal(EDITIONS.ar.dir, 'rtl'); assert.equal(EDITIONS.ar.defaultCountry, 'DZ'); assert.deepEqual(EDITIONS.ar.secondaryCountries, ['MA']);
  // Mêmes montants (D5) ; seul le séparateur de milliers devient une espace fine insécable en arabe.
  const digits = (text: string) => text.replace(/[\s ]/g, '');
  assert.equal(digits(ar.pricing.plans.monthly.price), digits(fr.pricing.plans.monthly.price));
  assert.equal(digits(ar.pricing.plans.annual.price), digits(fr.pricing.plans.annual.price));
  assert.equal(ar.pricing.plans.annual.price, '9 900');
  assert.match(ar.pricing.plans.monthly.cta, /990 FCFA/); assert.match(ar.pricing.plans.annual.cta, /9 900 FCFA/);
  // Carte internationale d'abord, Wave et Orange Money situés au Sénégal et dans l'UEMOA.
  assert.match(ar.pricing.paymentCaption, /^الدفع ببطاقة مصرفية دولية، أو عبر Wave أو Orange Money \(في السنغال ومنطقة الاتحاد الاقتصادي والنقدي لغرب أفريقيا\)/);
  assert.equal(countryName('EH', 'ar'), 'الصحراء الغربية');
  assert.equal(ar.world.origins["Russie · média d'État"], 'روسيا · وسيلة إعلام حكومية');
  assert.equal(ar.weather.card.defaultPlace, 'الجزائر العاصمة');
});

test('EDI-403: Clerk arSA officiel avec libellés de marque ; français et anglais inchangés', () => {
  const arabic = clerkLocalizationForEdition('ar') as Record<string, unknown> & { signIn?: { start?: { title?: string } } };
  assert.equal(arabic.locale, 'ar-SA');
  assert.equal(arabic.signIn?.start?.title, 'تسجيل الدخول إلى Africa Live');
  assert.equal((clerkLocalizationForEdition('fr') as typeof arabic).signIn?.start?.title, 'Connexion à Africa Live');
  assert.equal((clerkLocalizationForEdition('en') as typeof arabic).signIn?.start?.title, 'Sign in to Africa Live');
});

test('EDI-402: les flèches horizontales suivent le sens de lecture', () => {
  assert.equal(horizontalStep('ArrowRight', false), 1); assert.equal(horizontalStep('ArrowLeft', false), -1);
  assert.equal(horizontalStep('ArrowRight', true), -1); assert.equal(horizontalStep('ArrowLeft', true), 1);
  assert.equal(horizontalStep('ArrowDown', true), 0); assert.equal(horizontalStep('Home', false), 0);
});

test('EDI-403: lieu météo traduit côté interface, contrat serveur et français inchangés', () => {
  assert.equal(weatherPlace('Point de référence · Algérie', 'DZ', 'fr', fr.weather), 'Point de référence · Algérie');
  assert.equal(weatherPlace('Point de référence · Algérie', 'DZ', 'ar', ar.weather), 'الجزائر · النقطة المرجعية');
  assert.equal(weatherPlace('Casablanca', 'MA', 'ar', ar.weather), 'الدار البيضاء');
  assert.equal(weatherPlace('Ville inconnue', 'MA', 'ar', ar.weather), 'Ville inconnue');
  assert.equal(weatherPlace('Dakar', 'SN', 'fr', fr.weather), 'Dakar');
});
