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
  }
];

export function generateDeck(count: number = 24): GameCard[] {
  const deck: GameCard[] = [];
  const possibleModifiers: CardModifier[] = ['protecao', 'buff', 'ataque_duplo', 'prioridade'];

  for (let i = 0; i < count; i++) {
    // Pick one of the 4 templates
    const template = CARD_TEMPLATES[i % CARD_TEMPLATES.length];

    // Determine random variations for Contrato PJ
    const isPJ = Math.random() < 0.5; // 50% chance of being Contrato PJ
    
    // Assign 0 to 2 random modifiers
    const numModifiers = Math.random() < 0.4 ? 1 : Math.random() < 0.2 ? 2 : 0;
    const cardModifiers: CardModifier[] = [];
    if (numModifiers > 0) {
      const shuffled = [...possibleModifiers].sort(() => 0.5 - Math.random());
      for (let m = 0; m < numModifiers; m++) {
        cardModifiers.push(shuffled[m]);
      }
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
      pjBlocked: false,
      avatarSvg: template.avatarSvg,
      quote: template.quote,
      owner: 'player', // initialized upon draw
      attackBuff: 0,
      defenseBuff: 0,
    };

    deck.push(card);
  }

  // Shuffle deck
  return deck.sort(() => 0.5 - Math.random());
}
