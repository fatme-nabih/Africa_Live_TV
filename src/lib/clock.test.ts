import assert from 'node:assert/strict';
import test from 'node:test';

import { buildClock, DAKAR_TIME_ZONE, detectTimeZone, formatClockTime, zoneLabel } from './clock';

const instant = new Date('2026-10-02T20:37:00Z');

test('l’heure locale suit le fuseau de l’appareil, Dakar reste en info-bulle', () => {
  const paris = buildClock(instant, 'Europe/Paris');
  assert.deepEqual(paris, { time: '22:37', zone: 'Paris', tooltip: 'Dakar : 20:37 (GMT)', isDakar: false });
  const newYork = buildClock(instant, 'America/New_York');
  assert.equal(newYork.time, '16:37');
  assert.equal(newYork.zone, 'New York');
  assert.equal(newYork.tooltip, 'Dakar : 20:37 (GMT)');
});

test('à Dakar, l’info-bulle l’indique sans doubler l’heure', () => {
  assert.deepEqual(buildClock(instant, DAKAR_TIME_ZONE), { time: '20:37', zone: 'Dakar', tooltip: 'Heure de Dakar', isDakar: true });
});

test('minuit s’affiche 00:05 en 24 h, avec zéros initiaux', () => {
  assert.equal(formatClockTime(new Date('2026-10-02T00:05:00Z'), 'UTC'), '00:05');
  assert.equal(formatClockTime(new Date('2026-10-02T07:03:00Z'), 'UTC'), '07:03');
});

test('un fuseau inconnu retombe sur Dakar au lieu de lever une exception', () => {
  assert.equal(buildClock(instant, 'Mars/Olympus').isDakar, true);
  assert.equal(formatClockTime(instant, 'Mars/Olympus'), '20:37');
});

test('les noms de fuseau composés sont lisibles', () => {
  assert.equal(zoneLabel('America/Argentina/Buenos_Aires'), 'Buenos Aires');
  assert.equal(zoneLabel('America/Port-au-Prince'), 'Port-au-Prince');
  assert.equal(zoneLabel('UTC'), 'UTC');
});

test('le fuseau détecté est toujours un fuseau valide', () => {
  const detected = detectTimeZone();
  assert.doesNotThrow(() => new Intl.DateTimeFormat('fr-FR', { timeZone: detected }));
});
