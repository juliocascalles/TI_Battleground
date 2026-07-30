import React, { useState, useEffect } from 'react';
import { getAssetUrl, getCanonicalFileName, LOCAL_ASSETS } from '../utils/driveAssetUrls';

interface CardSvgAvatarProps {
  avatarId: string;
}

const createFallbackAvatarSvg = (name: string) => {
  const initial = (name.split('_')[0] || name).charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#0f172a"/>
    <circle cx="100" cy="85" r="45" fill="#0284c7" opacity="0.2" stroke="#38bdf8" stroke-width="2"/>
    <text x="100" y="100" font-family="monospace" font-size="42" font-weight="bold" fill="#38bdf8" text-anchor="middle" dominant-baseline="central">${initial}</text>
    <rect x="20" y="145" width="160" height="35" rx="6" fill="#0f172a" stroke="#0284c7" stroke-width="1"/>
    <text x="100" y="162" font-family="monospace" font-size="12" font-weight="bold" fill="#94a3b8" text-anchor="middle" dominant-baseline="central">${name.replace(/_/g, ' ')}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const CardSvgAvatar: React.FC<CardSvgAvatarProps> = ({ avatarId }) => {
  const [imgSrc, setImgSrc] = useState(() => getAssetUrl(avatarId));

  useEffect(() => {
    setImgSrc(getAssetUrl(avatarId));

    const handleUpdate = () => {
      setImgSrc(getAssetUrl(avatarId));
    };

    window.addEventListener('drive_assets_updated', handleUpdate);
    return () => window.removeEventListener('drive_assets_updated', handleUpdate);
  }, [avatarId]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Stop browser onError infinite loop immediately
    e.currentTarget.onerror = null;

    const canonical = getCanonicalFileName(avatarId);
    const localUrl = LOCAL_ASSETS[canonical] || LOCAL_ASSETS['Johny_da_Silva.png'];

    if (localUrl && imgSrc !== localUrl) {
      setImgSrc(localUrl);
    } else {
      setImgSrc(createFallbackAvatarSvg(canonical.replace('.png', '')));
    }
  };

  return (
    <img
      src={imgSrc}
      alt={avatarId}
      onError={handleImageError}
      referrerPolicy="no-referrer"
      className="w-full h-full object-cover select-none pointer-events-none"
      draggable={false}
    />
  );
};
