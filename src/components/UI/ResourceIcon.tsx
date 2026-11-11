import React, { useState } from 'react';
import { isImageAvatar, RESOURCE_ICON_PATHS, RESOURCE_META } from '../../shared/constants';
import { TradeCardType } from '../../shared/types';

export const AvatarIcon: React.FC<{
  avatar?: string;
  className?: string;
}> = ({ avatar = '👑', className = 'w-6 h-6' }) => {
  if (isImageAvatar(avatar)) {
    return (
      <img
        src={avatar}
        alt="Avatar"
        draggable={false}
        className={`inline-block object-contain rounded-md select-none shrink-0 ${className}`}
      />
    );
  }
  return <span className="leading-none select-none">{avatar}</span>;
};

export interface ResourceIconProps {
  resource: TradeCardType;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
}

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: 'w-4 h-4 text-xs',
  sm: 'w-5 h-5 text-sm',
  md: 'w-7 h-7 text-base',
  lg: 'w-9 h-9 text-xl',
  xl: 'w-12 h-12 text-2xl',
};

/**
 * Renderiza el logotipo/icono oficial de un recurso desde `/assets/icons/`.
 * Soporta tamaños predefinidos ('xs'..'xl') o tamaño numérico en píxeles.
 */
export const ResourceIcon: React.FC<ResourceIconProps> = ({
  resource,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const meta = RESOURCE_META[resource];
  const src = RESOURCE_ICON_PATHS[resource] || meta.iconPath;

  const isNumericSize = typeof size === 'number';
  const sizeClass = isNumericSize ? '' : SIZE_CLASSES[size];
  const inlineStyle: React.CSSProperties | undefined = isNumericSize
    ? { width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.72)}px` }
    : undefined;

  if (imgError) {
    return (
      <span
        style={inlineStyle}
        className={`inline-flex items-center justify-center rounded-full shrink-0 select-none font-black text-[9px] tracking-tighter bg-stone-900/90 text-amber-200 border border-amber-500/40 ${sizeClass} ${className}`}
        title={meta.name}
      >
        {meta.shortName.slice(0, 3).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={meta.name}
      title={meta.name}
      style={inlineStyle}
      onError={() => setImgError(true)}
      className={`inline-block object-contain shrink-0 select-none drop-shadow ${sizeClass} ${className}`}
      draggable={false}
    />
  );
};
