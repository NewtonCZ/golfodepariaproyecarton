// src/components/common/FichaImg.tsx
import React from 'react';
import {
  getFichaImageUrl,
  getFichaImageAvifUrl,
  handleFichaImageError,
} from '../../data/fichaImages';

type FichaImgSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

interface FichaImgProps {
  id: number;
  alt?: string;
  size?: FichaImgSize;
  className?: string;
  eager?: boolean;
}

const SIZE_MAP: Record<FichaImgSize, string> = {
  xs: 'w-7 h-7',
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
  xl: 'w-28 h-28',
  hero: 'w-full h-full max-w-[260px] max-h-[260px]',
};

export const FichaImg: React.FC<FichaImgProps> = ({
  id,
  alt,
  size = 'md',
  className = '',
  eager = false,
}) => {
  return (
    <picture className={`inline-flex items-center justify-center ${SIZE_MAP[size]} ${className}`}>
      <source srcSet={getFichaImageAvifUrl(id)} type="image/avif" />
      <img
        src={getFichaImageUrl(id)}
        alt={alt ?? `Ficha ${id}`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className="w-full h-full object-contain"
        onError={handleFichaImageError}
      />
    </picture>
  );
};
