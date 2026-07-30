import cardLayoutJson from '../assets/card_layout.json';
import versoImg from '../assets/verso_da_carta.png';
import johnyImg from '../assets/card_info/Johny_da_Silva.png';
import thaisImg from '../assets/card_info/Thais_Tudano.png';
import igorImg from '../assets/card_info/Igor_Dinho.png';
import giseleImg from '../assets/card_info/Gisele_Gante.png';
import jussaraImg from '../assets/card_info/Jussara_das_Dores.png';
import silasImg from '../assets/card_info/Silas_Kow.png';
import tomasImg from '../assets/card_info/Tomas_Tigano.png';
import overlaySvg from '../assets/card_overlay_template.svg';

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

// Local fallback assets
export const LOCAL_ASSETS: Record<string, string> = {
  'verso_da_carta.png': versoImg || '/assets/verso_da_carta.png',
  'Johny_da_Silva.png': johnyImg || '/assets/card_info/Johny_da_Silva.png',
  'Thais_Tudano.png': thaisImg || '/assets/card_info/Thais_Tudano.png',
  'Tahis_Tudano.png': thaisImg || '/assets/card_info/Thais_Tudano.png',
  'Igor_Dinho.png': igorImg || '/assets/card_info/Igor_Dinho.png',
  'Gisele_Gante.png': giseleImg || '/assets/card_info/Gisele_Gante.png',
  'Jussara_das_Dores.png': jussaraImg || '/assets/card_info/Jussara_das_Dores.png',
  'Silas_Kow.png': silasImg || '/assets/card_info/Silas_Kow.png',
  'Tomas_Tigano.png': tomasImg || '/assets/card_info/Tomas_Tigano.png',
  'card_layout.json': typeof cardLayoutJson === 'string' ? cardLayoutJson : JSON.stringify(cardLayoutJson),
  'card_overlay_template.svg': overlaySvg || '/assets/card_overlay_template.svg',
};

// Public direct image URLs (converted to lh3 CDN viewer format for direct embedding)
export const PUBLIC_ASSET_URLS: Record<string, string> = {
  'Gisele_Gante.png': 'https://lh3.googleusercontent.com/d/1lynqDf2CwizUEoE6CvmMcvcN0QTIiBxz',
  'Igor_Dinho.png': 'https://lh3.googleusercontent.com/d/1x0yz99-9r4xWRlqP7cNinYb8gcYELMwH',
  'Johny_da_Silva.png': 'https://lh3.googleusercontent.com/d/1WhyKeVVoPxlY1lL47DJ2s5fyaShUFs_n',
  'Jussara_das_Dores.png': 'https://lh3.googleusercontent.com/d/17EcMDEDsii1flZNF1auXxe59V1M2YZa5',
  'Silas_Kow.png': 'https://lh3.googleusercontent.com/d/1tzKtwC6IC3d58yKTy2upajem_iSePne5',
  'Thais_Tudano.png': 'https://lh3.googleusercontent.com/d/14cFsTb9gxHP-Qk_aEPISBl-XU5_fJzyG',
  'Tahis_Tudano.png': 'https://lh3.googleusercontent.com/d/14cFsTb9gxHP-Qk_aEPISBl-XU5_fJzyG',
  'Tomas_Tigano.png': 'https://lh3.googleusercontent.com/d/1pLz6nxwjG-Kw35X_zp17bPMQ8b-LkAB2',
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
  if (!fileName) return LOCAL_ASSETS['Johny_da_Silva.png'];

  const canonical = getCanonicalFileName(fileName);

  // 1. Prefer local bundled assets first (100% reliable, zero network latency/errors, works everywhere)
  if (LOCAL_ASSETS[fileName]) return LOCAL_ASSETS[fileName];
  if (LOCAL_ASSETS[canonical]) return LOCAL_ASSETS[canonical];

  // 2. Public URLs fallback
  if (PUBLIC_ASSET_URLS[fileName]) return PUBLIC_ASSET_URLS[fileName];
  if (PUBLIC_ASSET_URLS[canonical]) return PUBLIC_ASSET_URLS[canonical];

  return LOCAL_ASSETS['Johny_da_Silva.png'];
};
