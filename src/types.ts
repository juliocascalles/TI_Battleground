export type CardModifier = 'protecao' | 'buff' | 'ataque_duplo' | 'prioridade' | 'enfraquecer';

export type CharacterGender = 'M' | 'F';

export interface CardTemplate {
  id: string;
  name: string;
  role: string;
  gender: CharacterGender;
  baseCost: number;
  baseAttack: number;
  baseDefense: number;
  isPJ: boolean;
  avatarSvg: string; // Custom SVG illustration path or code identifier
  flavorText: string;
  quote: string;
}

export interface GameCard {
  instanceId: string;
  templateId: string;
  name: string;
  role: string;
  gender: CharacterGender;
  cost: number;
  attack: number;
  defense: number;
  maxDefense: number;
  isPJ: boolean;
  modifiers: CardModifier[];
  hasProtection: boolean; // Lost after absorbing 1 hit
  hasAttackedThisTurn: number; // Max allowed depends on ataque_duplo (1 or 2)
  isStunned: boolean; // From events
  stunnedRounds?: number;
  stunReason?: string; // Reason or event name e.g. "Problema nos Trens", "Baixa Demanda", "Ausente"
  pjBlocked: boolean; // From Baixa Demanda event
  pjBlockedRounds?: number;
  isPregnant?: boolean; // From Gravidez event
  pregnantRounds?: number;
  isSick?: boolean; // From Epidemia de Gripe event
  avatarSvg: string;
  quote: string;
  owner: 'player' | 'computer';
  
  // Temporary buff modifiers
  attackBuff: number;
  defenseBuff: number;

  // Custom variable modifier stats
  buffAttackValue?: number; // 0 to 3
  buffDefenseValue?: number; // 0 to 3
  weakenPower?: number; // Power of enfraquecer attribute (1 to 3)
}

export type EventType =
  | 'layoff'
  | 'bug_producao'
  | 'problema_trens'
  | 'home_office'
  | 'pai_recem_nascido'
  | 'gripe'
  | 'gravidez'
  | 'baixa_demanda'
  | 'outros_imprevistos';

export interface GlobalEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  targetPlayer: 'player' | 'computer' | 'both';
  turn: number;
  timestamp: string;
}

export interface PlayerState {
  id: 'player' | 'computer';
  name: string;
  coffee: number; // Max 10
  hand: GameCard[];
  board: GameCard[];
  firedCount: number;
  canAttackThisTurn: boolean; // Affected by Problema nos Trens
  canPlayCardsThisTurn: boolean; // Affected by Gripe
  drawBlockedRounds: number; // Affected by Gravidez?
  extraCoffeeCostRounds: number; // Affected by Pai de Recém-Nascido (+1 cost)
}

export interface AttackAnimation {
  attackerId: string;
  defenderId: string;
  damageToDefender: number;
  damageToAttacker: number;
  defenderBlockedByProtection: boolean;
  attackerBlockedByProtection: boolean;
}

export interface VisualEffect {
  id: string;
  type: 'attack' | 'event' | 'coffee_drain' | 'coffee_gain' | 'fired';
  targetCardId?: string;
  targetPlayerId?: 'player' | 'computer';
  message?: string;
}
