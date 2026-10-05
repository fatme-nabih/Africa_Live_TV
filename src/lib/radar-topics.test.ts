import assert from 'node:assert/strict';
import test from 'node:test';

import { articleTopics, matchesRadarQuery, normalizeSearchText } from './radar-topics';

const topics = (title: string, category = 'Actualité Panafricaine') => articleTopics({ title, category });

test('clear feed labels give the topic, whatever their spelling', () => {
  assert.deepEqual(topics('Un titre neutre', 'POLITIQUE'), ['politique']);
  assert.deepEqual(topics('Un titre neutre', 'Bourses et Marchés'), ['economie']);
  assert.deepEqual(topics('Un titre neutre', 'SPORT'), ['sport']);
  assert.deepEqual(topics('Un titre neutre', 'Faits divers'), ['societe']);
  // Les étiquettes générales de flux ne disent rien du sujet.
  assert.deepEqual(topics('Un titre neutre', 'À la une'), []);
  assert.deepEqual(topics('Un titre neutre', 'Burkina Faso & National'), []);
});

test('titles from real feeds are classified, possibly under two topics', () => {
  assert.deepEqual(topics('En Ethiopie, Abiy Ahmed reconduit à la tête du gouvernement, en pleine guerre au Tigré'), ['politique', 'securite']);
  assert.deepEqual(topics('Prix de la viande : le gouvernement renforce la concertation avec les acteurs de la filière'), ['politique', 'economie']);
  assert.deepEqual(topics('Amical Maroc-Mali : pas de vainqueur à Tanger'), ['sport']);
  assert.deepEqual(topics('Sénégal: l\'écrivain Cheikh Hamidou Kane inhumé à Dakar'), ['culture']);
  assert.deepEqual(topics('Touba : des enseignants du CCAK formés à la pédagogie universitaire'), ['societe']);
  assert.deepEqual(topics('Les Lions de la Teranga battent la Gambie', 'International'), ['sport']);
});

test('ambiguous words do not create false topics', () => {
  assert.deepEqual(topics('Le prix Nobel de littérature attendu jeudi'), ['culture']);
  assert.deepEqual(topics('Un but de plus pour la réforme'), []);
  assert.deepEqual(topics('Ce que la mode dit de nous'), []);
  assert.deepEqual(topics('Deux millions de visiteurs attendus'), []);
  assert.deepEqual(topics('Quatre éléphants aperçus dans le parc'), []);
  // « CAN » en capitales est la Coupe d'Afrique ; « can » en minuscules n'est rien.
  assert.deepEqual(topics('CAN 2027 : le tirage au sort a eu lieu'), ['sport']);
  assert.deepEqual(topics('Yes we can, disait-il'), []);
});

test('search ignores accents and case, and every word must match somewhere', () => {
  const article = { title: 'Éthiopie : Abiy Ahmed reconduit', sourceName: 'Africanews (FR)', domain: 'africanews.com', category: 'Actualité Panafricaine' };
  assert.equal(matchesRadarQuery(article, ''), true);
  assert.equal(matchesRadarQuery(article, '  '), true);
  assert.equal(matchesRadarQuery(article, 'ethiopie'), true);
  assert.equal(matchesRadarQuery(article, 'ABIY africanews'), true);
  assert.equal(matchesRadarQuery(article, 'abiy senegal'), false);
  assert.equal(matchesRadarQuery(article, 'afrique de l est', 'Afrique de l’Est'), true);
  assert.equal(normalizeSearchText('Côte d’Ivoire'), ' cote d ivoire ');
});
