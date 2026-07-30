import React, { useState, useEffect } from 'react';
import { getAssetUrl, getCanonicalFileName } from '../utils/driveAssetUrls';

interface CardSvgAvatarProps {
  avatarId: string;
}

export const CardSvgAvatar: React.FC<CardSvgAvatarProps> = ({ avatarId }) => {
  const [imgSrc, setImgSrc] = useState(() => getAssetUrl(avatarId));
  const [errorStep, setErrorStep] = useState<number>(0);

  useEffect(() => {
    setImgSrc(getAssetUrl(avatarId));
    setErrorStep(0);

    const handleUpdate = () => {
      setImgSrc(getAssetUrl(avatarId));
      setErrorStep(0);
    };

    window.addEventListener('drive_assets_updated', handleUpdate);
    return () => window.removeEventListener('drive_assets_updated', handleUpdate);
  }, [avatarId]);

  const handleImageError = () => {
    const canonical = getCanonicalFileName(avatarId);
    const targetPublicPath = `/assets/card_info/${canonical}`;
    const defaultFallback = '/assets/card_info/Johny_da_Silva.png';

    if (errorStep === 0) {
      setErrorStep(1);
      if (imgSrc !== targetPublicPath) {
        setImgSrc(targetPublicPath);
      } else if (imgSrc !== defaultFallback) {
        setErrorStep(2);
        setImgSrc(defaultFallback);
      }
    } else if (errorStep === 1) {
      setErrorStep(2);
      if (imgSrc !== defaultFallback) {
        setImgSrc(defaultFallback);
      }
    } else {
      // Step >= 2: STOP changing imgSrc to prevent any network/state loops
      console.warn(`[CardSvgAvatar] Stop retrying image for ${avatarId} to prevent network loop.`);
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
