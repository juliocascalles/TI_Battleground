import React, { useState, useEffect } from 'react';
import { getAssetUrl, LOCAL_ASSETS } from '../utils/driveAssetUrls';

interface CardBackProps {
  className?: string;
  onClick?: () => void;
  countLabel?: number | string;
}

const createFallbackCardBackSvg = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420">
    <rect width="300" height="420" rx="16" fill="#020617" stroke="#06b6d4" stroke-width="4"/>
    <rect x="15" y="15" width="270" height="390" rx="12" fill="#0f172a" stroke="#0891b2" stroke-width="2" stroke-dasharray="6,6"/>
    <circle cx="150" cy="210" r="70" fill="#06b6d4" opacity="0.1" stroke="#22d3ee" stroke-width="2"/>
    <text x="150" y="200" font-family="monospace" font-size="20" font-weight="bold" fill="#22d3ee" text-anchor="middle">TI BATTLE</text>
    <text x="150" y="225" font-family="monospace" font-size="14" font-weight="bold" fill="#06b6d4" text-anchor="middle">GROUND</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const CardBack: React.FC<CardBackProps> = ({ className = '', onClick, countLabel }) => {
  const [versoUrl, setVersoUrl] = useState(() => getAssetUrl('verso_da_carta.png'));

  useEffect(() => {
    const handleUpdate = () => {
      setVersoUrl(getAssetUrl('verso_da_carta.png'));
    };
    window.addEventListener('drive_assets_updated', handleUpdate);
    return () => window.removeEventListener('drive_assets_updated', handleUpdate);
  }, []);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null;
    const localUrl = LOCAL_ASSETS['verso_da_carta.png'];
    if (localUrl && versoUrl !== localUrl) {
      setVersoUrl(localUrl);
    } else {
      setVersoUrl(createFallbackCardBackSvg());
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
