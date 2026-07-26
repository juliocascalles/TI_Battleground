import React, { useState, useEffect } from 'react';
import { getAssetUrl, DriveAssetMapping } from '../utils/driveAssetUrls';

interface CardSvgAvatarProps {
  avatarId: string;
}

const avatarFileNameMap: Record<string, keyof DriveAssetMapping> = {
  johny: 'Johny_da_Silva.png',
  thais: 'Thais_Tudano.png',
  igor: 'Igor_Dinho.png',
  gisele: 'Gisele_Gante.png',
};

export const CardSvgAvatar: React.FC<CardSvgAvatarProps> = ({ avatarId }) => {
  const fileName = avatarFileNameMap[avatarId] || 'Johny_da_Silva.png';
  const [imgSrc, setImgSrc] = useState(() => getAssetUrl(fileName));

  useEffect(() => {
    setImgSrc(getAssetUrl(fileName));
    const handleUpdate = () => {
      setImgSrc(getAssetUrl(fileName));
    };
    window.addEventListener('drive_assets_updated', handleUpdate);
    return () => window.removeEventListener('drive_assets_updated', handleUpdate);
  }, [fileName]);

  return (
    <img
      src={imgSrc}
      alt={avatarId}
      className="w-full h-full object-cover select-none pointer-events-none"
      draggable={false}
    />
  );
};
