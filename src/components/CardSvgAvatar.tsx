import React, { useState, useEffect } from 'react';
import { getAssetUrl, getCanonicalFileName } from '../utils/driveAssetUrls';

interface CardSvgAvatarProps {
  avatarId: string;
}

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

  const handleImageError = () => {
    const canonical = getCanonicalFileName(avatarId);
    const targetPublicPath = `/assets/card_info/${canonical}`;
    const defaultFallback = '/assets/card_info/Johny_da_Silva.png';

    if (imgSrc !== targetPublicPath) {
      setImgSrc(targetPublicPath);
    } else if (imgSrc !== defaultFallback) {
      setImgSrc(defaultFallback);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={avatarId}
      onError={handleImageError}
      className="w-full h-full object-cover select-none pointer-events-none"
      draggable={false}
    />
  );
};
