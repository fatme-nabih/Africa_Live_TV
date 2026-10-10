export const FAVORITE_MUTATION_LIMIT = 100;
export const preferenceOwnerKey = (userId: string, local = false) => (local ? 'local:' : 'account:') + userId;
export function retryAfterDeadline(header: string|null, now = Date.now()) {
  const seconds = header !== null && /^\d+$/.test(header.trim()) ? Number(header.trim()) : NaN;
  const date = header === null ? NaN : Date.parse(header);
  const deadline = Number.isFinite(seconds) ? now + seconds * 1000 : date;
  return Number.isSafeInteger(deadline) && deadline >= now ? deadline : now + 5000;
}
