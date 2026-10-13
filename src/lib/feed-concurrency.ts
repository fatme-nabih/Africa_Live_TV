/** Résultats dans l'ordre du registre ; huit requêtes amont au plus par collecte. */
export async function settleFeeds<T, R>(feeds: readonly T[], read: (feed: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(feeds.length);
  let next = 0;
  const worker = async () => {
    while (next < feeds.length) {
      const index = next++;
      try { results[index] = { status: 'fulfilled', value: await read(feeds[index]) }; }
      catch (reason) { results[index] = { status: 'rejected', reason }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, feeds.length) }, worker));
  return results;
}
