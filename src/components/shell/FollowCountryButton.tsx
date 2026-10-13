'use client';

import { Star } from 'lucide-react';
import { useFollowedCountries, useWriteFollowedCountries } from '@/components/tv/hooks';
import { Button } from '@/components/ui';
import { MAX_FOLLOWED_COUNTRIES, toggleFollowedCountry } from '@/lib/followed-countries';
import { formatCountryName } from '@/lib/format';
import { useI18n } from '@/i18n/client';
import { format } from '@/i18n/message';

/** « Suivre » un pays (UX-503) : 5 pays au plus, gardés sur l'appareil ; le premier suivi devient le pays principal. */
export default function FollowCountryButton({ code }: { code: string }) {
  const { t, edition } = useI18n();
  const labels = t.shell.follow;
  const followed = useFollowedCountries();
  const writeFollowedCountries = useWriteFollowedCountries();
  const isFollowed = followed.includes(code);
  const full = !isFollowed && followed.length >= MAX_FOLLOWED_COUNTRIES;
  const name = formatCountryName(code, undefined, edition);
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-pressed={isFollowed}
      disabled={full}
      title={full ? format(labels.full, { max: MAX_FOLLOWED_COUNTRIES }) : undefined}
      onClick={() => writeFollowedCountries(toggleFollowedCountry(followed, code))}
      icon={<Star size={14} aria-hidden="true" className={isFollowed ? 'fill-al-gold text-al-gold' : 'text-al-gold'} />}
      aria-label={format(isFollowed ? labels.unfollowAria : labels.followAria, { name })}
    >
      {isFollowed ? (followed[0] === code ? labels.primary : labels.followed) : labels.follow}
    </Button>
  );
}
