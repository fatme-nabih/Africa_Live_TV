import type { Edition } from '../editions';
import { AFRICA_FR } from './africa-fr';
import { AFRICA_EN } from './africa-en';
import { AFRICA_AR } from './africa-ar';
import { WORLD_FR } from './world-fr';
import { WORLD_EN } from './world-en';
import { WORLD_AR } from './world-ar';
import type { FeedConfig, WorldFeed } from './types';

export const AFRICA_FEEDS: Record<Edition, FeedConfig[]> = { fr: AFRICA_FR, en: AFRICA_EN, ar: AFRICA_AR };
export const WORLD_FEEDS_BY_EDITION: Record<Edition, WorldFeed[]> = { fr: WORLD_FR, en: WORLD_EN, ar: WORLD_AR };
