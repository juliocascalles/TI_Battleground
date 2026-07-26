import React from 'react';
import johnyImg from '../assets/char_img/Johny_da_Silva.png';
import thaisImg from '../assets/char_img/Thais_Tudano.png';
import igorImg from '../assets/char_img/Igor_Dinho.png';
import giseleImg from '../assets/char_img/Gisele_Gante.png';

interface CardSvgAvatarProps {
  avatarId: string;
}

const imageMap: Record<string, string> = {
  johny: johnyImg,
  thais: thaisImg,
  igor: igorImg,
  gisele: giseleImg,
};

export const CardSvgAvatar: React.FC<CardSvgAvatarProps> = ({ avatarId }) => {
  const imgSrc = imageMap[avatarId] || johnyImg;

  return (
    <img
      src={imgSrc}
      alt={avatarId}
      className="w-full h-full object-cover select-none pointer-events-none"
      draggable={false}
    />
  );
};
