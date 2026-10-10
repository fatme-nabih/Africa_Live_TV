/** Find the close of the session preceding the quoted session, never the chart's range baseline. */
export function previousSessionClose(result: unknown): { price: number; updatedAt: string } | null {
  if (!result || typeof result !== 'object') return null;
  const chart = result as { meta?: { regularMarketTime?: number; exchangeTimezoneName?: string }; timestamp?: unknown[]; indicators?: { quote?: { close?: unknown[] }[] } };
  const time = chart.meta?.regularMarketTime;
  const timestamps = chart.timestamp;
  const closes = chart.indicators?.quote?.[0]?.close;
  if (typeof time !== 'number' || !Number.isFinite(time) || !chart.meta?.exchangeTimezoneName || !timestamps || !closes || timestamps.length !== closes.length) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: chart.meta.exchangeTimezoneName, year: 'numeric', month: '2-digit', day: '2-digit' });
    const day = (seconds: number) => formatter.format(new Date(seconds * 1000));
    const currentDay = day(time);
    let previous: { index: number; time: number } | null = null;
    let hasCurrentSession = false;
    for (let index = 0; index < timestamps.length; index++) {
      const stamp = timestamps[index];
      if (typeof stamp !== 'number' || !Number.isFinite(stamp) || stamp > time) continue;
      const sessionDay = day(stamp);
      if (sessionDay === currentDay) hasCurrentSession = true;
      if (sessionDay < currentDay && (!previous || stamp > previous.time)) previous = { index, time: stamp };
    }
    if (!hasCurrentSession || !previous) return null;
    const price = closes[previous.index];
    // A missing preceding close must not silently turn into a multi-session variation.
    return typeof price === 'number' && Number.isFinite(price) && price > 0
      ? { price, updatedAt: new Date(previous.time * 1000).toISOString() } : null;
  } catch { return null; }
}
