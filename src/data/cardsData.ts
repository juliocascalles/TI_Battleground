import { CardTemplate, GameCard, CardModifier } from '../types';

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'johny_sysadmin',
    name: 'Johny da Silva',
    role: 'SysAdmin',
    gender: 'M',
    baseCost: 2,
    baseAttack: 3,
    baseDefense: 5,
    isPJ: false,
    avatarSvg: 'johny',
    flavorText: 'Mantedor dos servidores nas madrugadas. Viver sem sudo é um pesadelo.',
    quote: 'Keep calm and sudo !!'
  },
  {
    id: 'thais_java',
    name: 'Thais Tudano',
    role: 'Dev. Java Fullstack',
    gender: 'F',
    baseCost: 3,
    baseAttack: 5,
    baseDefense: 4,
    isPJ: false,
    avatarSvg: 'thais',
    flavorText: 'Sobrevivente de NullPointerException e Spring Boot legado.',
    quote: 'If (bug) fixIt() else coffee();'
  },
  {
    id: 'igor_data',
    name: 'Igor Dinho',
    role: 'Analista de Dados',
    gender: 'M',
    baseCost: 2,
    baseAttack: 2,
    baseDefense: 6,
    isPJ: true,
    avatarSvg: 'igor',
    flavorText: 'Mestre em SQL e gráficos no PowerBI. Transforma café em dashboards.',
    quote: 'Dados não mentem, seu relatório sim!'
  },
  {
    id: 'gisele_gerente',
    name: 'Gisele Gante',
    role: 'Gerente de T.I.',
    gender: 'F',
    baseCost: 4,
    baseAttack: 6,
    baseDefense: 6,
    isPJ: false,
    avatarSvg: 'gisele',
    flavorText: 'Sobrinha do patrão com cargo VIP. Desmarca reuniões para fazer a unha.',
    quote: 'T.I. é fácil, só não entendo por que demora!'
  },{
    id: 'jussara_dores',
    name: 'Jussara das Dores',
    role: 'RH',
    gender: 'F',
    baseCost: 9,
    baseAttack: 9,
    baseDefense: 4,
    isPJ: false,
    avatarSvg: 'jussara',
    flavorText: 'Rígida, austera e com cara de poucos amigos.',
    quote: 'Regras acima de tudo!'
  },
  {
    id: 'silas_kow',
    name: 'Silas Kow',
    role: 'DBA',
    gender: 'M',
    baseCost: 6,
    baseAttack: 7,
    baseDefense: 3,
    isPJ: false,
    avatarSvg: 'silas', 
    flavorText: 'Pessimista e paranóico.',
    quote: 'É só eu virar as costas que a procedure vai travar'
  },
  {
    id: 'tomas_tigano',
    name: 'Tomas Tigano',
    role: 'Estagiário',
    gender: 'M',
    baseCost: 1,
    baseAttack: 9,
    baseDefense: 1,
    isPJ: false,
    avatarSvg: 'tomas',
    flavorText: 'Sempre comendo...Como não engorda?!',
    quote: 'Tenho fome de aprender!'
  }
];

export function generateDeck(count: number = 48): GameCard[] {
  const deck: GameCard[] = [];
  const possibleModifiers: CardModifier[] = ['protecao', 'buff', 'ataque_duplo', 'prioridade', 'enfraquecer'];

  for (let i = 0; i < count; i++) {
    // Pick one of the templates
    const template = CARD_TEMPLATES[i % CARD_TEMPLATES.length];

    // Determine random variations for Contrato PJ
    const isPJ = Math.random() < 0.5; // 50% chance of being Contrato PJ
    
    // Assign 0 to 2 random modifiers (increased modifier chance by 50%)
    const rand = Math.random();
    const numModifiers = rand < 0.18 ? 2 : rand < 0.78 ? 1 : 0;
    const cardModifiers: CardModifier[] = [];
    if (numModifiers > 0) {
      const shuffled = [...possibleModifiers].sort(() => 0.5 - Math.random());
      for (let m = 0; m < numModifiers; m++) {
        cardModifiers.push(shuffled[m]);
      }
    }

    // Determine buff values if 'buff' modifier is present (+0..3 / +0..3, never +0/+0)
    let buffAttackValue = 0;
    let buffDefenseValue = 0;
    if (cardModifiers.includes('buff')) {
      do {
        buffAttackValue = Math.floor(Math.random() * 4); // 0, 1, 2, or 3
        buffDefenseValue = Math.floor(Math.random() * 4); // 0, 1, 2, or 3
      } while (buffAttackValue === 0 && buffDefenseValue === 0);
    }

    // Determine weaken power if 'enfraquecer' modifier is present (1..3)
    let weakenPower = 0;
    if (cardModifiers.includes('enfraquecer')) {
      weakenPower = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    }

    // Exact stats matching the character template
    const cost = template.baseCost;
    const attack = template.baseAttack;
    const defense = template.baseDefense;

    const card: GameCard = {
      instanceId: `card_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
      templateId: template.id,
      name: template.name,
      role: template.role,
      gender: template.gender,
      cost,
      attack,
      defense,
      maxDefense: defense,
      isPJ,
      modifiers: cardModifiers,
      hasProtection: cardModifiers.includes('protecao'),
      hasAttackedThisTurn: 0,
      isStunned: false,
      stunnedRounds: 0,
      pjBlocked: false,
      pjBlockedRounds: 0,
      isPregnant: false,
      pregnantRounds: 0,
      isSick: false,
      avatarSvg: template.avatarSvg,
      quote: template.quote,
      owner: 'player', // initialized upon draw
      attackBuff: 0,
      defenseBuff: 0,
      buffAttackValue,
      buffDefenseValue,
      weakenPower,
    };

    deck.push(card);
  }

  // Shuffle deck
  return deck.sort(() => 0.5 - Math.random());
}
