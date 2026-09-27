'use client';

import React from 'react';
import Image from 'next/image';

interface BrandWatermarkProps {
  className?: string;
  opacityClass?: string;
  size?: number;
}

export default function BrandWatermark({
  className = '',
  opacityClass = 'opacity-[0.035] sm:opacity-[0.045]',
  size = 720,
}: BrandWatermarkProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden select-none ${className}`}
    >
      {/* Subtle ambient tricolor halos behind the logo */}
      <div className="absolute h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-yellow-400/8 to-red-500/10 blur-[130px]" />
      
      {/* Transparent watermark logo */}
      <div className={`relative transition-opacity duration-700 ${opacityClass}`}>
        <Image
          src="/africa-live-logo.webp"
          alt=""
          width={size}
          height={size}
          priority={false}
          className="max-h-[85vh] max-w-[85vw] object-contain drop-shadow-[0_0_80px_rgba(250,204,21,0.15)] filter grayscale contrast-125"
        />
      </div>
    </div>
  );
}
