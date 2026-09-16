const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/;
const MAX_LANGUAGE_CODES = 20;
const MAX_LANGUAGE_METADATA_ITEMS = 100_000;

export type ChannelLanguageIndex = {
  byFeedId: ReadonlyMap<string, string>;
  byChannelId: ReadonlyMap<string, string>;
};

function normalizedLanguageTokens(values: readonly string[]) {
  return [
    ...new Set(
      values
        .flatMap((value) => value.split(/[,;|]/))
        .map((value) => value.normalize('NFKC').trim().toLowerCase())
        .filter((value) => LANGUAGE_CODE_PATTERN.test(value)),
    ),
  ]
    .sort()
    .slice(0, MAX_LANGUAGE_CODES);
}

export function serializeLanguageCodes(
  value: string | readonly string[] | null | undefined,
) {
  if (!value) return null;
  const normalized = normalizedLanguageTokens(
    typeof value === 'string' ? [value] : value,
  );
  return normalized.length > 0 ? normalized.join(';') : null;
}

export function parseLanguageCodes(value: string | null | undefined) {
  return value ? normalizedLanguageTokens([value]) : [];
}

function asLanguageMetadataItem(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.channel !== 'string' ||
    typeof item.id !== 'string' ||
    !Array.isArray(item.languages)
  ) {
    return null;
  }

  const channel = item.channel.trim();
  const feedId = item.id.trim();
  const languages = serializeLanguageCodes(
    item.languages.filter((language): language is string => typeof language === 'string'),
  );
  if (!channel || !feedId || !languages) return null;
  if (channel.length > 200 || feedId.length > 100) return null;
  return { channel, feedId, languages };
}

export function buildChannelLanguageIndex(payload: unknown): ChannelLanguageIndex {
  if (!Array.isArray(payload) || payload.length > MAX_LANGUAGE_METADATA_ITEMS) {
    throw new Error('INVALID_CHANNEL_LANGUAGE_METADATA');
  }

  const byFeedId = new Map<string, string>();
  const channelLanguageSets = new Map<string, Set<string>>();

  for (const value of payload) {
    const item = asLanguageMetadataItem(value);
    if (!item) continue;

    const channelKey = item.channel.toLowerCase();
    const feedKey = `${channelKey}@${item.feedId.toLowerCase()}`;
    byFeedId.set(feedKey, item.languages);

    const channelLanguages = channelLanguageSets.get(channelKey) ?? new Set<string>();
    for (const language of parseLanguageCodes(item.languages)) {
      channelLanguages.add(language);
    }
    channelLanguageSets.set(channelKey, channelLanguages);
  }

  const byChannelId = new Map<string, string>();
  for (const [channelId, languages] of channelLanguageSets) {
    const serialized = serializeLanguageCodes([...languages]);
    if (serialized) byChannelId.set(channelId, serialized);
  }

  return { byFeedId, byChannelId };
}

export function resolveChannelLanguage(
  tvgId: string | null | undefined,
  index: ChannelLanguageIndex,
) {
  const normalizedTvgId = tvgId?.normalize('NFKC').trim().toLowerCase();
  if (!normalizedTvgId) return null;

  const exact = index.byFeedId.get(normalizedTvgId);
  if (exact) return exact;

  const channelId = normalizedTvgId.split('@')[0];
  return index.byChannelId.get(channelId) ?? null;
}
