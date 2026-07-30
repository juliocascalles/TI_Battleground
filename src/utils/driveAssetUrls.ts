import cardLayoutJson from '../../assets/card_layout.json';

export interface DriveAssetMapping {
  'verso_da_carta.png': string;
  'Johny_da_Silva.png': string;
  'Thais_Tudano.png': string;
  'Igor_Dinho.png': string;
  'Gisele_Gante.png': string;
  'Jussara_das_Dores.png': string;
  'Silas_Kow.png': string;
  'Tomas_Tigano.png': string;
  'card_layout.json': string;
  'card_overlay_template.svg': string;
}

export const LOCAL_ASSETS: Record<string, string> = {
  'verso_da_carta.png': '/assets/verso_da_carta.png',
  'Johny_da_Silva.png': '/assets/card_info/Johny_da_Silva.png',
  'Thais_Tudano.png': '/assets/card_info/Thais_Tudano.png',
  'Tahis_Tudano.png': '/assets/card_info/Thais_Tudano.png',
  'Igor_Dinho.png': '/assets/card_info/Igor_Dinho.png',
  'Gisele_Gante.png': '/assets/card_info/Gisele_Gante.png',
  'Jussara_das_Dores.png': '/assets/card_info/Jussara_das_Dores.png',
  'Silas_Kow.png': '/assets/card_info/Silas_Kow.png',
  'Tomas_Tigano.png': '/assets/card_info/Tomas_Tigano.png',
  'card_layout.json': typeof cardLayoutJson === 'string' ? cardLayoutJson : JSON.stringify(cardLayoutJson),
  'card_overlay_template.svg': '/assets/card_overlay_template.svg',
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

export const clearDriveAssetUrls = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('drive_assets_updated'));
  } catch (err) {
    console.error('Failed to clear drive asset URLs:', err);
  }
};

export const getCanonicalFileName = (input: string): string => {
  if (!input) return 'Johny_da_Silva.png';
  const clean = input.split('/').pop() || input;
  const lower = clean.toLowerCase().replace(/\.(png|jpg|jpeg|svg)$/i, '');

  if (lower.includes('johny')) return 'Johny_da_Silva.png';
  if (lower.includes('thais') || lower.includes('tahis')) return 'Thais_Tudano.png';
  if (lower.includes('igor')) return 'Igor_Dinho.png';
  if (lower.includes('gisele')) return 'Gisele_Gante.png';
  if (lower.includes('jussara') || lower.includes('dores')) return 'Jussara_das_Dores.png';
  if (lower.includes('silas')) return 'Silas_Kow.png';
  if (lower.includes('tomas') || lower.includes('tigano')) return 'Tomas_Tigano.png';
  if (lower.includes('verso') || lower.includes('back')) return 'verso_da_carta.png';

  if (clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.svg')) {
    return clean;
  }

  return `${clean}.png`;
};

export const getAssetUrl = (fileName: keyof DriveAssetMapping | string): string => {
  if (!fileName) return '/assets/card_info/Johny_da_Silva.png';

  const current = getDriveAssetUrls();
  const canonical = getCanonicalFileName(fileName);

  // 1. Direct match in saved or LOCAL_ASSETS
  if (current[fileName]) return current[fileName];
  if (LOCAL_ASSETS[fileName]) return LOCAL_ASSETS[fileName];

  // 2. Match canonical name in saved or LOCAL_ASSETS
  if (current[canonical]) return current[canonical];
  if (LOCAL_ASSETS[canonical]) return LOCAL_ASSETS[canonical];

  // 3. Fallback to static public path
  if (canonical.endsWith('.png')) {
    return `/assets/card_info/${canonical}`;
  }

  return '/assets/card_info/Johny_da_Silva.png';
};
