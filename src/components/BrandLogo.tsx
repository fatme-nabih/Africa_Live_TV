import Image from 'next/image';

export default function BrandLogo({ className = 'h-20 w-20' }: { className?: string }) {
  return (
    <Image
      src="/africa-live-logo.webp"
      alt="Africa Live"
      width={640}
      height={640}
      sizes="144px"
      className={`shrink-0 object-contain ${className}`}
      preload
    />
  );
}
