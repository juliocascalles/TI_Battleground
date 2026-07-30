import { GameCard, PlayerState, AttackAnimation } from '../types';

/**
 * Checks if a target defender card is valid under the Priority (Prioridade) rule.
 * If the opponent board contains any card with 'prioridade', the target MUST be one of those cards.
 */
export function isValidAttackTarget(targetCard: GameCard, opponentBoard: GameCard[]): boolean {
  const priorityCards = opponentBoard.filter(c => c.modifiers.includes('prioridade') && c.defense > 0);
  if (priorityCards.length > 0) {
    return targetCard.modifiers.includes('prioridade');
  }
  return true;
}

/**
 * Calculates effective attack of a card considering active buffs.
 */
export function getEffectiveAttack(card: GameCard): number {
  return Math.max(0, card.attack + card.attackBuff);
}

/**
 * Calculates effective defense of a card considering active buffs.
 */
export function getEffectiveDefense(card: GameCard): number {
  return Math.max(0, card.defense + card.defenseBuff);
}

/**
 * Max attacks a card can perform in a single turn.
 */
export function getMaxAttacksAllowed(card: GameCard): number {
  return card.modifiers.includes('ataque_duplo') ? 2 : 1;
}

/**
 * Executes a combat attack between attacker and defender.
 * Both exchange damage (troca de dano - vice versa).
 * Respects Proteção (absorbs 1 attack entirely).
 */
export function resolveCombat(
  attacker: GameCard,
  defender: GameCard
): {
  updatedAttacker: GameCard;
  updatedDefender: GameCard;
  animation: AttackAnimation;
} {
  const atkPower = getEffectiveAttack(attacker);
  const defPower = getEffectiveAttack(defender);

  let updatedAttacker = { ...attacker };
  let updatedDefender = { ...defender };

  let defenderBlockedByProtection = false;
  let attackerBlockedByProtection = false;

  let damageToDefender = 0;
  let damageToAttacker = 0;

  // 1. Attacker strikes Defender
  if (updatedDefender.hasProtection) {
    defenderBlockedByProtection = true;
    updatedDefender.hasProtection = false; // Lose shield after receiving attack
    damageToDefender = 0;
  } else {
    damageToDefender = atkPower;
    updatedDefender.defense -= damageToDefender;
  }

  // 1b. Apply Enfraquecer from Attacker to Defender
  if (attacker.modifiers.includes('enfraquecer')) {
    const weakenVal = attacker.weakenPower ?? 1;
    updatedDefender.attack = Math.max(0, updatedDefender.attack - weakenVal);
  }

  // 2. Defender counter-strikes Attacker (troca de dano)
  if (updatedAttacker.hasProtection) {
    attackerBlockedByProtection = true;
    updatedAttacker.hasProtection = false; // Lose shield after receiving counter-attack
    damageToAttacker = 0;
  } else {
    damageToAttacker = defPower;
    updatedAttacker.defense -= damageToAttacker;
  }

  // 2b. Apply Enfraquecer from Defender to Attacker if Defender has it
  if (defender.modifiers.includes('enfraquecer')) {
    const weakenVal = defender.weakenPower ?? 1;
    updatedAttacker.attack = Math.max(0, updatedAttacker.attack - weakenVal);
  }

  updatedAttacker.hasAttackedThisTurn += 1;

  const animation: AttackAnimation = {
    attackerId: attacker.instanceId,
    defenderId: defender.instanceId,
    damageToDefender,
    damageToAttacker,
    defenderBlockedByProtection,
    attackerBlockedByProtection,
  };

  return {
    updatedAttacker,
    updatedDefender,
    animation,
  };
}

/**
 * Applies Buff effect when a card with 'buff' modifier is played onto the board.
 * Increases Attack (+0..3) and Defense (+0..3) to all ally cards currently on the board.
 */
export function applyPlayBuff(playedCard: GameCard, allyBoard: GameCard[]): GameCard[] {
  if (!playedCard.modifiers.includes('buff')) {
    return allyBoard;
  }

  const atkAdd = playedCard.buffAttackValue ?? 1;
  const defAdd = playedCard.buffDefenseValue ?? 1;

  return allyBoard.map(card => ({
    ...card,
    attackBuff: card.attackBuff + atkAdd,
    defenseBuff: card.defenseBuff + defAdd,
    defense: card.defense + defAdd,
    maxDefense: card.maxDefense + defAdd,
  }));
}

/**
 * Calculates current actual coffee cost to play a card, factoring in event penalties.
 */
export function getActualCardCost(card: GameCard, player: PlayerState): number {
  const extraCost = (player.extraCoffeeCostRounds > 0 && card.gender === 'M') ? 1 : 0;
  return Math.max(1, card.cost + extraCost);
}
