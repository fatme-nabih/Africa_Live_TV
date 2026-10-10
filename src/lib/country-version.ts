import { createHash } from 'node:crypto';
export const countryListVersion = (countries: readonly string[]) => createHash('sha256').update(JSON.stringify(countries)).digest('hex');
export class CountryVersionConflict extends Error {
  constructor(readonly countries: string[], readonly version: string) { super('COUNTRY_VERSION_CONFLICT'); }
}
