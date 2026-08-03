import { GameCard, PlayerState, AttackAnimation } from '../types';
import { pickWeightedModifiers } from '../data/cardsData';

/**
 * Checks if a target defender card is valid under the Priority (Prioridade) rule.
 * If the opponent board contains any card with 'prioridade', the target MUST be one of those cards.
 */
export function isValidAttackTarget(targetCard: GameCard, opponentBoard: GameCard[]): boolean {
  const priorityCards = opponentBoard.filter(c => c.modifiers.includes('prioridade') && getEffectiveDefense(c) > 0);
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
  return card.defense + card.defenseBuff;
}

/**
 * Applies damage to a card, absorbing first with defenseBuff then base defense.
 */
export function applyDamageToCard(card: GameCard, damage: number): GameCard {
  if (damage <= 0) return card;
  const updated = { ...card };
  let remainingDamage = damage;

  if (updated.defenseBuff > 0) {
    if (updated.defenseBuff >= remainingDamage) {
      updated.defenseBuff -= remainingDamage;
      remainingDamage = 0;
    } else {
      remainingDamage -= updated.defenseBuff;
      updated.defenseBuff = 0;
    }
  }

  if (remainingDamage > 0) {
    updated.defense -= remainingDamage;
  }

  return updated;
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
    updatedDefender = applyDamageToCard(updatedDefender, damageToDefender);
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
    updatedAttacker = applyDamageToCard(updatedAttacker, damageToAttacker);
  }

  // 2b. Apply Enfraquecer from Defender to Attacker if Defender has it
  if (defender.modifiers.includes('enfraquecer')) {
    const weakenVal = defender.weakenPower ?? 1;
    updatedAttacker.attack = Math.max(0, updatedAttacker.attack - weakenVal);
  }

  // 2c. Apply Gripe contagion if either card is sick
  if (attacker.isSick || defender.isSick) {
    updatedAttacker.isSick = true;
    updatedAttacker.attack = Math.max(0, updatedAttacker.attack - 1);

    updatedDefender.isSick = true;
    updatedDefender.attack = Math.max(0, updatedDefender.attack - 1);
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

  const targetIds = allyBoard.map(c => c.instanceId);
  playedCard.buffedTargetIds = Array.from(new Set([...(playedCard.buffedTargetIds || []), ...targetIds]));

  return allyBoard.map(card => ({
    ...card,
    attackBuff: card.attackBuff + atkAdd,
    defenseBuff: card.defenseBuff + defAdd,
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

/**
 * Removes a buff (atkAdd, defAdd) from a card, reducing defenseBuff first, then base defense if needed.
 */
export function removeBuffFromCard(card: GameCard, atkAdd: number, defAdd: number): GameCard {
  const updated = { ...card };
  updated.attackBuff = Math.max(0, updated.attackBuff - atkAdd);

  let remainingDefToRemove = defAdd;
  if (updated.defenseBuff > 0) {
    if (updated.defenseBuff >= remainingDefToRemove) {
      updated.defenseBuff -= remainingDefToRemove;
      remainingDefToRemove = 0;
    } else {
      remainingDefToRemove -= updated.defenseBuff;
      updated.defenseBuff = 0;
    }
  }

  if (remainingDefToRemove > 0) {
    updated.defense -= remainingDefToRemove;
  }

  return updated;
}

/**
 * Processes board card removals with cascade elimination.
 * If any removed card had 'buff', removes that buff from remaining allies.
 * If removing the buff causes any ally's effective defense to reach <= 0, that ally is also eliminated.
 */
export function removeCardsWithCascade(
  board: GameCard[],
  initialDeadIds: string[],
  options?: { isVoluntaryResignation?: boolean }
): {
  survivingBoard: GameCard[];
  allFiredCards: GameCard[];
} {
  let currentBoard = [...board];
  const deadMap = new Set<string>(initialDeadIds);
  const firedCards: GameCard[] = [];

  for (const card of currentBoard) {
    if (deadMap.has(card.instanceId)) {
      firedCards.push(card);
    }
  }

  const deadQueue = [...firedCards];
  currentBoard = currentBoard.filter(c => !deadMap.has(c.instanceId));

  const initialDeadSet = new Set<string>(initialDeadIds);

  while (deadQueue.length > 0) {
    const deadCard = deadQueue.shift()!;

    // On voluntary resignation, do not remove the buff granted by the resigning card
    if (options?.isVoluntaryResignation && initialDeadSet.has(deadCard.instanceId)) {
      continue;
    }

    if (deadCard.modifiers.includes('buff')) {
      const atkAdd = deadCard.buffAttackValue ?? 1;
      const defAdd = deadCard.buffDefenseValue ?? 1;
      const buffedTargetIds = deadCard.buffedTargetIds;

      const nextBoard: GameCard[] = [];
      for (const card of currentBoard) {
        const wasBuffed = buffedTargetIds !== undefined ? buffedTargetIds.includes(card.instanceId) : true;
        if (wasBuffed) {
          const updatedCard = removeBuffFromCard(card, atkAdd, defAdd);
          if (getEffectiveDefense(updatedCard) <= 0) {
            deadMap.add(updatedCard.instanceId);
            firedCards.push(updatedCard);
            deadQueue.push(updatedCard);
          } else {
            nextBoard.push(updatedCard);
          }
        } else {
          nextBoard.push(card);
        }
      }
      currentBoard = nextBoard;
    }
  }

  return {
    survivingBoard: currentBoard,
    allFiredCards: firedCards,
  };
}

/**
 * Applies Layoff event damage (2 pts) to a card.
 * Requirement 4: Cards with 'Proteção' lose protection instead of taking damage.
 */
export function applyLayoffDamageToCard(card: GameCard): GameCard {
  if (card.hasProtection || card.modifiers.includes('protecao')) {
    return {
      ...card,
      hasProtection: false,
      modifiers: card.modifiers.filter(m => m !== 'protecao'),
    };
  }
  return applyDamageToCard(card, 2);
}

/**
 * Grants 2 new modifiers to a card that reached 3 turns on board (Tempo de Serviço).
 * If 'buff' is among the new modifiers, immediately applies buff to all ally board cards.
 */
export function grantTempoDeServicoBonus(
  card: GameCard,
  allyBoard: GameCard[]
): {
  updatedCard: GameCard;
  updatedAllyBoard: GameCard[];
  newModifiers: import('../types').CardModifier[];
} {
  const effectiveDef = Math.max(1, getEffectiveDefense(card));
  const possibleModifiers: import('../types').CardModifier[] = ['protecao', 'buff', 'ataque_duplo', 'prioridade', 'enfraquecer', 'lucro'];
  
  // Prefer modifiers not already present on the card
  const candidates = possibleModifiers.filter(m => !card.modifiers.includes(m));
  let newMods = pickWeightedModifiers(candidates, 2, effectiveDef);

  // Fallback if missing candidates were fewer than 2
  if (newMods.length < 2) {
    const allowed = possibleModifiers.filter(m => !newMods.includes(m));
    const extra = pickWeightedModifiers(allowed, 2 - newMods.length, effectiveDef);
    newMods.push(...extra);
  }

  const updatedModifiers = [...card.modifiers, ...newMods];
  let updatedCard: GameCard = {
    ...card,
    modifiers: updatedModifiers,
    hasServiceBonus: true,
  };

  if (newMods.includes('protecao')) {
    updatedCard.hasProtection = true;
  }

  let updatedAllyBoard = [...allyBoard];

  if (newMods.includes('buff')) {
    if (!updatedCard.buffAttackValue && !updatedCard.buffDefenseValue) {
      updatedCard.buffAttackValue = Math.floor(Math.random() * 3) + 1;
      updatedCard.buffDefenseValue = Math.floor(Math.random() * 3) + 1;
    }
    updatedAllyBoard = applyPlayBuff(updatedCard, updatedAllyBoard);
  }

  return {
    updatedCard,
    updatedAllyBoard,
    newModifiers: newMods,
  };
}
