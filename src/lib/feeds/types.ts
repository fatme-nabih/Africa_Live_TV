import type { Edition } from '../editions';
import type { WorldRegion } from '../world-desk-data';

export type FeedDateOptions = {
  timeZone?: string;
  wallClockTimeZone?: string;
  dateFormat?: 'rfc' | 'arabic-long' | 'us-12h' | 'hm-pipe-dmy';
};
export type FeedConfig = FeedDateOptions & {
  id: string;
  edition: Edition;
  name: string;
  domain: string;
  url: string;
  defaultCountry: string | null;
  origin: string;
  role: 'national' | 'panafrican' | 'international';
  editorialScope: 'africa' | 'international';
  category: string;
  enabled: boolean;
  charset?: string;
  /** Flux généraliste du bouquet africain : seuls les titres parlant de l'Afrique sont conservés. */
  africaOnly?: boolean;
};
export type WorldFeed = FeedConfig & { region: WorldRegion | null };
