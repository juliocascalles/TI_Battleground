import React, { useState, useEffect } from 'react';
import { getAssetUrl } from '../utils/driveAssetUrls';

interface CardBackProps {
  className?: string;
  onClick?: () => void;
  countLabel?: number | string;
}

export const CardBack: React.FC<CardBackProps> = ({ className = '', onClick, countLabel }) => {
  const [versoUrl, setVersoUrl] = useState(() => getAssetUrl('verso_da_carta.png'));
  const [hasErrored, setHasErrored] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setVersoUrl(getAssetUrl('verso_da_carta.png'));
      setHasErrored(false);
    };
    window.addEventListener('drive_assets_updated', handleUpdate);
    return () => window.removeEventListener('drive_assets_updated', handleUpdate);
  }, []);

  const handleImageError = () => {
    if (!hasErrored) {
      setHasErrored(true);
      const publicPath = '/assets/verso_da_carta.png';
      if (versoUrl !== publicPath) {
        setVersoUrl(publicPath);
      }
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative w-full aspect-[768/512] rounded-xl overflow-hidden border-2 border-cyan-500/60 bg-slate-900 shadow-xl select-none transition-all ${className}`}
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <img
          src={versoUrl}
          alt="Verso da Carta"
          onError={handleImageError}
          referrerPolicy="no-referrer"
          className="w-[150%] h-[150%] max-w-none object-cover select-none pointer-events-none -rotate-90 origin-center"
          draggable={false}
        />
      </div>

      {countLabel !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <span className="text-xl sm:text-2xl font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
            {countLabel}
          </span>
        </div>
      )}
    </div>
  );
};
