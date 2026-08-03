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

export function getModifierWeight(modifier: CardModifier, cardDefense: number): number {
  if (modifier === 'protecao') {
    // Inversely proportional to defense (e.g. 1 def => 3.0, 3 def => 1.0, 6 def => 0.5)
    const def = Math.max(1, cardDefense);
    return 3.0 / def;
  }
  if (modifier === 'prioridade') {
    // Reduced chance
    return 0.5;
  }
  if (modifier === 'lucro') {
    // Rare modifier
    return 0.3;
  }
  // Standard base chance for buff, ataque_duplo, enfraquecer
  return 1.0;
}

export function pickWeightedModifiers(
  candidates: CardModifier[],
  count: number,
  cardDefense: number
): CardModifier[] {
  const pool = [...candidates];
  const selected: CardModifier[] = [];

  for (let i = 0; i < count; i++) {
    const validCandidates = pool.filter(m => getModifierWeight(m, cardDefense) > 0);
    if (validCandidates.length === 0) break;

    const totalWeight = validCandidates.reduce((sum, m) => sum + getModifierWeight(m, cardDefense), 0);
    let rand = Math.random() * totalWeight;

    for (const mod of validCandidates) {
      const w = getModifierWeight(mod, cardDefense);
      if (rand < w) {
        selected.push(mod);
        const idx = pool.indexOf(mod);
        if (idx !== -1) pool.splice(idx, 1);
        break;
      }
      rand -= w;
    }
  }

  return selected;
}

export function generateDeck(count: number = 48): GameCard[] {
  const deck: GameCard[] = [];
  const possibleModifiers: CardModifier[] = ['protecao', 'buff', 'ataque_duplo', 'prioridade', 'enfraquecer', 'lucro'];

  for (let i = 0; i < count; i++) {
    // Pick one of the templates
    const template = CARD_TEMPLATES[i % CARD_TEMPLATES.length];

    // Determine random variations for Contrato PJ
    const isPJ = Math.random() < 0.6; // 60% chance of being Contrato PJ
    
    // Exact stats matching the character template
    const cost = template.baseCost;
    const attack = template.baseAttack;
    const defense = template.baseDefense;

    // Assign 0 to 2 random modifiers using weighted probabilities
    const rand = Math.random();
    const numModifiers = rand < 0.18 ? 2 : rand < 0.78 ? 1 : 0;
    const cardModifiers: CardModifier[] = [];
    if (numModifiers > 0) {
      const chosen = pickWeightedModifiers(possibleModifiers, numModifiers, defense);
      cardModifiers.push(...chosen);
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

    // Determine if card can be born active (10% chance)
    const canBeBornActive = Math.random() < 0.1;

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
      canBeBornActive,
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
