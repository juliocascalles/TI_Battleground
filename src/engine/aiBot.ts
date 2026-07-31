import { PlayerState, GameCard, AttackAnimation } from '../types';
import { isValidAttackTarget, resolveCombat, getActualCardCost, applyPlayBuff, getMaxAttacksAllowed, getEffectiveAttack, getEffectiveDefense } from './rules';

export interface AiTurnResult {
  updatedComputer: PlayerState;
  updatedPlayer: PlayerState;
  quarantinedCards?: GameCard[];
  actionsLog: string[];
  combatsExecuted: AttackAnimation[];
}

/**
 * Executes the AI Computer Bot's full turn strategy:
 * 1. Play affordable cards onto the board.
 * 2. Perform intelligent card attacks against player's board.
 */
export function executeAiTurn(
  computerState: PlayerState,
  playerState: PlayerState
): AiTurnResult {
  let computer = JSON.parse(JSON.stringify(computerState)) as PlayerState;
  let player = JSON.parse(JSON.stringify(playerState)) as PlayerState;
  const quarantinedCards: GameCard[] = [];

  const actionsLog: string[] = [];
  const combatsExecuted: AttackAnimation[] = [];

  // --- STEP 1: PLAY CARDS FROM HAND ---
  if (computer.canPlayCardsThisTurn) {
    let continuePlaying = true;
    while (continuePlaying && computer.hand.length > 0) {
      // Find playable cards sorted by power/utility
      const playableCards = computer.hand
        .map((card, index) => ({ card, index, actualCost: getActualCardCost(card, computer) }))
        .filter(item => item.actualCost <= computer.coffee);

      if (playableCards.length === 0) {
        continuePlaying = false;
        break;
      }

      // Prioritize cards with 'buff', 'prioridade', or best attack/defense ratio
      playableCards.sort((a, b) => {
        const scoreA = (a.card.modifiers.includes('buff') ? 3 : 0) + (a.card.modifiers.includes('prioridade') ? 2 : 0) + getEffectiveAttack(a.card) + getEffectiveDefense(a.card);
        const scoreB = (b.card.modifiers.includes('buff') ? 3 : 0) + (b.card.modifiers.includes('prioridade') ? 2 : 0) + getEffectiveAttack(b.card) + getEffectiveDefense(b.card);
        return scoreB - scoreA;
      });

      const chosen = playableCards[0];
      const cardToPlay = computer.hand.splice(chosen.index, 1)[0];
      cardToPlay.owner = 'computer';
      computer.coffee -= chosen.actualCost;

      // Apply buff to existing board allies if card has 'buff'
      computer.board = applyPlayBuff(cardToPlay, computer.board);
      computer.board.push(cardToPlay);

      actionsLog.push(`🤖 Computador colocou em campo: ${cardToPlay.name} (${cardToPlay.role}) por ${chosen.actualCost} Café!`);
    }
  } else {
    actionsLog.push(`🤖 Computador impedido de jogar cartas da mão neste turno.`);
  }

  // --- STEP 2: ATTACK WITH BOARD CARDS ---
  if (computer.canAttackThisTurn) {
    let attackLoop = true;
    let safetyCounter = 0;

    while (attackLoop && safetyCounter < 10) {
      safetyCounter++;

      // Filter computer cards that can still attack
      const readyAttackers = computer.board.filter(c => {
        const maxAttacks = getMaxAttacksAllowed(c);
        return getEffectiveDefense(c) > 0 && c.hasAttackedThisTurn < maxAttacks && (!c.isPJ || !c.pjBlocked);
      });

      // Filter alive player defender targets
      const aliveDefenders = player.board.filter(c => getEffectiveDefense(c) > 0);

      if (readyAttackers.length === 0 || aliveDefenders.length === 0) {
        attackLoop = false;
        break;
      }

      // Pick an attacker card
      const attacker = readyAttackers[0];

      // Find valid targets under Priority rule
      const validTargets = aliveDefenders.filter(target => isValidAttackTarget(target, player.board));

      if (validTargets.length === 0) {
        attackLoop = false;
        break;
      }

      // Select best target (target with total defense <= attacker.attack to get a guaranteed kill, or highest threat)
      validTargets.sort((a, b) => {
        const killA = getEffectiveDefense(a) <= getEffectiveAttack(attacker) ? 10 : 0;
        const killB = getEffectiveDefense(b) <= getEffectiveAttack(attacker) ? 10 : 0;
        return (killB + getEffectiveAttack(b)) - (killA + getEffectiveAttack(a));
      });

      const defender = validTargets[0];

      // Resolve Combat
      const { updatedAttacker, updatedDefender, animation } = resolveCombat(attacker, defender);

      combatsExecuted.push(animation);

      // Check if sick card quarantine is triggered
      const isQuarantine = attacker.isSick || defender.isSick;

      // Update computer board state
      const atkIndex = computer.board.findIndex(c => c.instanceId === attacker.instanceId);
      if (atkIndex !== -1) {
        if (getEffectiveDefense(updatedAttacker) <= 0) {
          computer.board.splice(atkIndex, 1);
          computer.firedCount += 1;
          actionsLog.push(`💥 ${attacker.name} do Computador foi demitido durante o contra-ataque de ${defender.name}!`);
        } else if (isQuarantine) {
          computer.board.splice(atkIndex, 1);
          quarantinedCards.push({
            ...updatedAttacker,
            defense: updatedAttacker.maxDefense,
            isSick: false,
            attackBuff: 0,
            defenseBuff: 0,
            isStunned: false,
            pjBlocked: false,
          });
        } else {
          computer.board[atkIndex] = updatedAttacker;
        }
      }

      // Update player board state
      const defIndex = player.board.findIndex(c => c.instanceId === defender.instanceId);
      if (defIndex !== -1) {
        if (getEffectiveDefense(updatedDefender) <= 0) {
          player.board.splice(defIndex, 1);
          player.firedCount += 1;
          actionsLog.push(`🔥 ${attacker.name} do Computador atacou e DEMITIU ${defender.name} do Jogador!`);
        } else if (isQuarantine) {
          player.board.splice(defIndex, 1);
          quarantinedCards.push({
            ...updatedDefender,
            defense: updatedDefender.maxDefense,
            isSick: false,
            attackBuff: 0,
            defenseBuff: 0,
            isStunned: false,
            pjBlocked: false,
          });
        } else {
          player.board[defIndex] = updatedDefender;
          actionsLog.push(`⚔️ ${attacker.name} atacou ${defender.name} (Dano trocado: ${animation.damageToDefender} / ${animation.damageToAttacker}).`);
        }
      }

      if (isQuarantine) {
        actionsLog.push(`😷 QUARENTENA! ${attacker.name} e ${defender.name} foram enviados de volta ao baralho.`);
      }
    }
  } else {
    actionsLog.push(`🤖 Computador impedido de realizar ataques neste turno.`);
  }

  return {
    updatedComputer: computer,
    updatedPlayer: player,
    quarantinedCards,
    actionsLog,
    combatsExecuted,
  };
}
