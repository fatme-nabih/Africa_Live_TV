import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider, useI18n } from '@/i18n/client';
import { getDictionary, pickNamespaces, type Dictionary } from '@/i18n/dictionary';
import { fr } from '@/i18n/fr';
import { collator, dateTimeFormat, displayNames, intlLanguage, intlLocale, numberFormat, pluralCategory, relativeTime } from '@/i18n/format';
import { format, formatPlural } from '@/i18n/message';
import { formatClockTime } from './clock';
import { formatCountryName, formatLanguageName } from './format';
import { formatForexRate, formatMarketPrice, formatVariation } from './market-format';
import { commodityFocusLabel } from './market-geography';
import { formatCount } from './public-stats';
import { formatRadarDate } from './radar-data';

// Contrat de compilation : les autres éditions gardent les clés françaises et peuvent ajouter les six pluriels.
const arabicPlural = { zero: 'zero {count}', one: 'one {count}', two: 'two {count}', few: 'few {count}', many: 'many {count}', other: 'other {count}' } satisfies Dictionary['radar']['newArrivals'];
// @ts-expect-error La forme de repli est obligatoire, même pour un message arabe.
const missingOther: Dictionary['radar']['newArrivals'] = { one: 'one' };
// @ts-expect-error Un nom de catégorie inconnu doit toujours être refusé.
const unknownCategory: Dictionary['radar']['newArrivals'] = { one: 'one', other: 'other', unexpected: 'bad' };
// @ts-expect-error L'élargissement des pluriels ne doit pas rendre les clés du dictionnaire facultatives.
const missingKey: Dictionary['shell']['nav'] = { radar: 'Radar' };
void missingOther; void unknownCategory; void missingKey;

test('EDI-104: Arabic messages select all six plural categories, with a required fallback', () => {
  for (const [count, category] of [[0, 'zero'], [1, 'one'], [2, 'two'], [3, 'few'], [11, 'many'], [100, 'other']] as const) {
    assert.equal(pluralCategory('ar', count), category);
    assert.equal(formatPlural(arabicPlural, count, {}, 'ar'), `${category} ${count}`);
  }
  assert.equal(formatPlural({ other: 'fallback {count}' }, 2, {}, 'ar'), 'fallback 2');
  for (const count of [0, 1, 2]) assert.equal(formatPlural(fr.radar.grid.channels, count), `${count} chaîne${count > 1 ? 's' : ''}`);
  assert.equal(format('{name}: {count}; {missing}', { name: 'Radar', count: 2 }), 'Radar: 2; {missing}');
});

test('EDI-104: en-GB dates use day/month and Arabic formats keep Western digits', () => {
  const date = new Date('2026-10-11T18:07:00Z');
  assert.equal(dateTimeFormat(intlLocale('en'), { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date), '11/10/2026');
  const arabicNumber = numberFormat(intlLocale('ar')).format(1234.5);
  assert.equal(arabicNumber, '1,234.5');
  const arabicDate = dateTimeFormat(intlLocale('ar'), { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  assert.match(arabicDate, /2026/);
  assert.doesNotMatch(arabicNumber + arabicDate + relativeTime('ar', -3, 'hour'), /[\u0660-\u0669\u06f0-\u06f9]/);
  assert.equal(intlLanguage('ar'), 'ar-u-nu-latn');
});

test('EDI-106: French formats stay identical, including NBSP, Dakar time and collation', () => {
  const date = new Date('2026-10-11T18:07:00Z');
  const oldClock = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  assert.equal(formatClockTime(date, 'Africa/Dakar'), oldClock);
  assert.equal(formatRadarDate(date.toISOString()), new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date) + ' GMT');
  for (const value of [0, 1, 999, 12345.67]) {
    assert.equal(formatCount(value), new Intl.NumberFormat('fr-FR').format(value).replace(/\u202f/g, '\u00a0'));
    assert.equal(formatForexRate(value), new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value));
    assert.equal(formatMarketPrice(value, 'USX', '$/t'), new Intl.NumberFormat('fr-FR', { maximumFractionDigits: value >= 100 ? 2 : 4, minimumFractionDigits: 2 }).format(value) + ' cents US / t');
    assert.equal(formatVariation(value).text, `${value > 0 ? '+' : ''}${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} %`);
  }
  assert.equal(formatCount(14205), '14\u00a0205');
  for (const code of ['SN', 'CI', 'CD']) assert.equal(formatCountryName(code), new Intl.DisplayNames(['fr'], { type: 'region' }).of(code));
  for (const code of ['fr', 'en', 'ar']) assert.equal(formatLanguageName(code), new Intl.DisplayNames(['fr'], { type: 'language' }).of(code));
  assert.equal(displayNames(intlLanguage(), 'language').of('en'), 'anglais');
  assert.equal(commodityFocusLabel({ role: 'producteurs', name: 'BLÉ' }), 'Principaux producteurs : blé');
  const names = ['Zambie', 'Égypte', 'Côte d’Ivoire', 'Algérie'];
  assert.deepEqual([...names].sort(collator(intlLanguage()).compare), [...names].sort((a, b) => a.localeCompare(b, 'fr')));
});

function ReadMessages() {
  const { edition, enabled, t } = useI18n();
  return createElement('p', null, [edition, enabled.join(','), t.shell.nav.radar, t.radar.header.title, t.weather.card.title].join('|'));
}

test('EDI-104: no provider preserves French; nested application namespaces preserve the parent edition', () => {
  assert.equal(renderToStaticMarkup(createElement(ReadMessages)), '<p>fr|fr|Radar|Radar Afrique|Météo</p>');
  const messages: Dictionary = { ...fr, shell: { ...fr.shell, nav: { ...fr.shell.nav, radar: 'Synthetic shell' } }, radar: { ...fr.radar, header: { ...fr.radar.header, title: 'Synthetic radar' } } };
  const html = renderToStaticMarkup(createElement(I18nProvider, { edition: 'en', enabled: ['fr', 'en'], messages: pickNamespaces(messages, ['shell']) },
    createElement(I18nProvider, { messages: pickNamespaces(messages, ['radar']) }, createElement(ReadMessages))));
  assert.equal(html, '<p>en|fr,en|Synthetic shell|Synthetic radar|Météo</p>');
  assert.equal(fr.radar.header.title, 'Radar Afrique', 'le test ne doit pas modifier le dictionnaire partagé');
  assert.equal(getDictionary('fr'), fr);
});
