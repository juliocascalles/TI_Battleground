import versoImg from '../../assets/card_info/verso_da_carta.png';
import johnyImg from '../../assets/card_info/Johny_da_Silva.png';
import thaisImg from '../../assets/card_info/Thais_Tudano.png';
import igorImg from '../../assets/card_info/Igor_Dinho.png';
import giseleImg from '../../assets/card_info/Gisele_Gante.png';
import cardLayoutJson from '../../assets/card_info/card_layout.json';
import cardOverlaySvg from '../../assets/card_info/card_overlay_template.svg';

export interface DriveAssetMapping {
  'verso_da_carta.png': string;
  'Johny_da_Silva.png': string;
  'Thais_Tudano.png': string;
  'Igor_Dinho.png': string;
  'Gisele_Gante.png': string;
  'card_layout.json': string;
  'card_overlay_template.svg': string;
}

export const LOCAL_ASSETS: Record<string, string> = {
  'verso_da_carta.png': versoImg,
  'Johny_da_Silva.png': johnyImg,
  'Thais_Tudano.png': thaisImg,
  'Igor_Dinho.png': igorImg,
  'Gisele_Gante.png': giseleImg,
  'card_layout.json': typeof cardLayoutJson === 'string' ? cardLayoutJson : JSON.stringify(cardLayoutJson),
  'card_overlay_template.svg': cardOverlaySvg,
};

const STORAGE_KEY = 'ti_battleground_drive_urls';

export const getDriveAssetUrls = (): Record<string, string> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...LOCAL_ASSETS, ...parsed };
    }
  } catch {
    // Fallback to local
  }
  return { ...LOCAL_ASSETS };
};

export const setDriveAssetUrls = (urls: Record<string, string>) => {
  try {
    const current = getDriveAssetUrls();
    const updated = { ...current, ...urls };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('drive_assets_updated'));
  } catch (err) {
    console.error('Failed to save drive asset URLs:', err);
  }
};

export const getAssetUrl = (fileName: keyof DriveAssetMapping): string => {
  const current = getDriveAssetUrls();
  return current[fileName] || LOCAL_ASSETS[fileName] || '';
};
