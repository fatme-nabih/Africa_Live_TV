import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { userFollowedCountries, users } from '@/db/schema';
import { countryListVersion, CountryVersionConflict } from './country-version';

export async function replaceAccountCountries(userId:string,countries:string[],baseVersion:string) {
  return db.transaction(async tx => {
    const [user] = await tx.select({id:users.id}).from(users).where(eq(users.id,userId)).for('update');
    if (!user) throw new Error('USER_NOT_FOUND');
    const current = (await tx.select().from(userFollowedCountries).where(eq(userFollowedCountries.userId,userId)).orderBy(asc(userFollowedCountries.position))).map(row => row.countryCode);
    const version = countryListVersion(current);
    if (baseVersion !== version) throw new CountryVersionConflict(current,version);
    await tx.delete(userFollowedCountries).where(eq(userFollowedCountries.userId,userId));
    if (countries.length) await tx.insert(userFollowedCountries).values(countries.map((countryCode,position) => ({userId,countryCode,position})));
    // Return this transaction's committed snapshot, not another request's list.
    return { countries: [...countries], version: countryListVersion(countries) };
  });
}
