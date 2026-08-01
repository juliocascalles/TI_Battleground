import { EventType, GlobalEvent, PlayerState, GameCard } from '../types';
import { applyDamageToCard, applyLayoffDamageToCard, removeCardsWithCascade, grantTempoDeServicoBonus } from './rules';

export const ALL_EVENT_TYPES: EventType[] = [
  'layoff',
  'bug_producao',
  'problema_trens',
  'home_office',
  'pai_recem_nascido',
  'gripe',
  'gravidez',
  'baixa_demanda',
  'tempo_servico',
  'outros_imprevistos',
];

export interface EventOutcome {
  event: GlobalEvent;
  updatedPlayer: PlayerState;
  updatedComputer: PlayerState;
  updatedDeck?: GameCard[];
  logMessage: string;
}

/**
 * Calculates if an event triggers this turn.
 * Probability grows each turn without an event: starts at 15%, +10% per eventless turn, increased by 50%.
 */
export function checkShouldTriggerEvent(turnsSinceLastEvent: number): boolean {
  const baseProb = 0.15 + turnsSinceLastEvent * 0.1;
  const probability = Math.min(0.95, baseProb * 1.5);
  return Math.random() < probability;
}

/**
 * Generates and resolves a random event on the current game state.
 */
export function triggerRandomEvent(
  currentTurn: number,
  player: PlayerState,
  computer: PlayerState,
  deck: GameCard[] = []
): EventOutcome {
  let updatedPlayer = JSON.parse(JSON.stringify(player)) as PlayerState;
  let updatedComputer = JSON.parse(JSON.stringify(computer)) as PlayerState;
  let updatedDeck = [...deck];

  let candidateTypes = [...ALL_EVENT_TYPES];

  // Helper lists of characters working on the board ONLY
  const allMaleOnBoard = [
    ...updatedPlayer.board,
    ...updatedComputer.board
  ].filter(c => c.gender === 'M');

  const allFemaleOnBoard = [
    ...updatedPlayer.board,
    ...updatedComputer.board
  ].filter(c => c.gender === 'F');

  // Candidate condition filters
  if (allMaleOnBoard.length === 0) {
    candidateTypes = candidateTypes.filter(t => t !== 'pai_recem_nascido');
  }

  if (allFemaleOnBoard.length === 0) {
    candidateTypes = candidateTypes.filter(t => t !== 'gravidez');
  }

  // Check cards eligible for Tempo de Serviço (at least 3 turns on board and non-PJ)
  const cardsWith3Turns = [
    ...updatedPlayer.board,
    ...updatedComputer.board
  ].filter(c => (c.turnsOnBoard || 0) >= 3 && !c.isPJ);

  if (cardsWith3Turns.length === 0) {
    candidateTypes = candidateTypes.filter(t => t !== 'tempo_servico');
  }

  if (updatedPlayer.board.length === 0 && updatedComputer.board.length === 0) {
    candidateTypes = candidateTypes.filter(t => t !== 'tempo_servico' && t !== 'layoff' && t !== 'baixa_demanda' && t !== 'gripe');
  } else {
    // Requirement 6: Double the chance of 'gripe' event occurring (can occur multiple times per game)
    candidateTypes.push('gripe');
  }

  const selectedType = candidateTypes[Math.floor(Math.random() * candidateTypes.length)];
  const targetPlayerId: 'player' | 'computer' | 'both' = Math.random() < 0.5 ? 'player' : 'computer';

  let title = '';
  let description = '';
  let logMessage = '';

  const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  switch (selectedType) {
    case 'layoff': {
      title = '🚨 EVENTO: LAYOFF EM MASSA!';
      description = 'Corte de gastos da diretoria! Cartas sem proteção sofrem 2 pts de dano; cartas com Proteção perdem o escudo.';
      logMessage = `[${timestamp}] CRITICAL: LAYOFF DETECTADO! Cartas sofrem 2 pts de dano (ou perdem Proteção).`;

      // Requirement 4: Cards with Proteção lose protection instead of taking damage
      updatedPlayer.board = updatedPlayer.board.map(c => applyLayoffDamageToCard(c));
      updatedComputer.board = updatedComputer.board.map(c => applyLayoffDamageToCard(c));

      // Process cascade deaths from layoff damage
      const pDeadIds = updatedPlayer.board.filter(c => c.defense <= 0).map(c => c.instanceId);
      if (pDeadIds.length > 0) {
        const pRes = removeCardsWithCascade(updatedPlayer.board, pDeadIds);
        updatedPlayer.board = pRes.survivingBoard;
        updatedPlayer.firedCount += pRes.allFiredCards.length;
      }

      const cDeadIds = updatedComputer.board.filter(c => c.defense <= 0).map(c => c.instanceId);
      if (cDeadIds.length > 0) {
        const cRes = removeCardsWithCascade(updatedComputer.board, cDeadIds);
        updatedComputer.board = cRes.survivingBoard;
        updatedComputer.firedCount += cRes.allFiredCards.length;
      }
      break;
    }

    case 'bug_producao': {
      title = '🐛 EVENTO: BUG EM PRODUÇÃO!';
      description = 'Servidores caindo! Jogadores perdem 1 ponto de Café para cada carta de Estagiário ou Gerente de T.I. no campo (mínimo 0).';

      const isInternOrManager = (c: GameCard) => {
        const roleLower = (c.role || '').toLowerCase();
        return roleLower.includes('estagiá') || roleLower.includes('estagiari') || roleLower.includes('gerente');
      };

      const pPenalty = updatedPlayer.board.filter(isInternOrManager).length;
      const cPenalty = updatedComputer.board.filter(isInternOrManager).length;

      updatedPlayer.coffee = Math.max(0, updatedPlayer.coffee - pPenalty);
      updatedComputer.coffee = Math.max(0, updatedComputer.coffee - cPenalty);

      logMessage = `[${timestamp}] WARN: BUG EM PRODUÇÃO! Jogador perdeu ${pPenalty} Café (restam: ${updatedPlayer.coffee}) e Computador perdeu ${cPenalty} Café (restam: ${updatedComputer.coffee}).`;
      break;
    }

    case 'problema_trens': {
      title = '🚆 EVENTO: PROBLEMA NOS TRENS!';
      description = 'Falha na linha de trem/metrô! As cartas contratadas na mesa ficam inativas, perdendo um turno de ataque.';
      logMessage = `[${timestamp}] NOTICE: PROBLEMA NOS TRENS! Cartas na mesa de todos os jogadores inativas por 1 turno.`;

      updatedPlayer.board = updatedPlayer.board.map(c => ({
        ...c,
        isStunned: true,
        stunnedRounds: Math.max(c.stunnedRounds || 0, 1),
        stunReason: 'Problema nos Trens',
      }));
      updatedComputer.board = updatedComputer.board.map(c => ({
        ...c,
        isStunned: true,
        stunnedRounds: Math.max(c.stunnedRounds || 0, 1),
        stunReason: 'Problema nos Trens',
      }));
      break;
    }

    case 'home_office': {
      title = '🏠 EVENTO: ENCHENTE (HOME-OFFICE FORÇADO)!';
      description = 'Chuva forte e trânsito travado! O jogador humano ganha +3 de Café extra economizando deslocamento!';
      logMessage = `[${timestamp}] SUCCESS: HOME-OFFICE CONCEDIDO! Jogador humano recebeu +3 de Café extra.`;

      updatedPlayer.coffee = Math.min(10, updatedPlayer.coffee + 3);
      break;
    }

    case 'pai_recem_nascido': {
      title = '🍼 EVENTO: VIROU PAPAI!';
      description = 'Noites em claro trocando fraldas! Uma carta de personagem masculino trabalhando na mesa volta ao baralho com Custo +1 de Café.';

      if (allMaleOnBoard.length > 0) {
        const chosenMale = allMaleOnBoard[Math.floor(Math.random() * allMaleOnBoard.length)];

        // Remove chosen male from player or computer board
        const pIdx = updatedPlayer.board.findIndex(c => c.instanceId === chosenMale.instanceId);
        if (pIdx !== -1) {
          const res = removeCardsWithCascade(updatedPlayer.board, [chosenMale.instanceId]);
          updatedPlayer.board = res.survivingBoard;
          updatedPlayer.firedCount += Math.max(0, res.allFiredCards.length - 1);
        } else {
          const cIdx = updatedComputer.board.findIndex(c => c.instanceId === chosenMale.instanceId);
          if (cIdx !== -1) {
            const res = removeCardsWithCascade(updatedComputer.board, [chosenMale.instanceId]);
            updatedComputer.board = res.survivingBoard;
            updatedComputer.firedCount += Math.max(0, res.allFiredCards.length - 1);
          }
        }

        const returnedCard: GameCard = {
          ...chosenMale,
          cost: chosenMale.cost + 1,
          defense: chosenMale.maxDefense,
          attackBuff: 0,
          defenseBuff: 0,
          isStunned: false,
          stunnedRounds: 0,
          pjBlocked: false,
          pjBlockedRounds: 0,
          isSick: false,
          hasAttackedThisTurn: 0,
        };

        updatedDeck.push(returnedCard);
        logMessage = `[${timestamp}] NOTICE: VIROU PAPAI! ${chosenMale.name} saiu da mesa e voltou ao baralho com Custo de Café +1 (Novo custo: ${returnedCard.cost}).`;
      } else {
        logMessage = `[${timestamp}] NOTICE: VIROU PAPAI! Nenhum personagem masculino na mesa no momento.`;
      }
      break;
    }

    case 'gripe': {
      title = '🤧 EVENTO: EPIDEMIA DE GRIPE!';
      description = 'Surto de virose no escritório! Pelo menos 3 personagens em jogo ficam doentes (-1 de Ataque cada). Toda carta que entrar em contato com elas em combate também ficará doente!';

      const allOnBoard = [...updatedPlayer.board, ...updatedComputer.board];
      if (allOnBoard.length > 0) {
        // Prioritize non-sick cards first
        const notSick = allOnBoard.filter(c => !c.isSick).sort(() => Math.random() - 0.5);
        const alreadySick = allOnBoard.filter(c => c.isSick).sort(() => Math.random() - 0.5);
        const pool = [...notSick, ...alreadySick];
        const countToInfect = Math.min(3, pool.length);
        const infectedNames: string[] = [];

        for (let i = 0; i < countToInfect; i++) {
          const chosenCard = pool[i];
          const isPlayer = updatedPlayer.board.some(c => c.instanceId === chosenCard.instanceId);
          const targetBoard = isPlayer ? updatedPlayer.board : updatedComputer.board;
          const idx = targetBoard.findIndex(c => c.instanceId === chosenCard.instanceId);
          if (idx !== -1) {
            if (!targetBoard[idx].isSick) {
              targetBoard[idx] = {
                ...targetBoard[idx],
                isSick: true,
                attack: Math.max(0, targetBoard[idx].attack - 1),
              };
            }
            infectedNames.push(`${targetBoard[idx].name} (${isPlayer ? 'Jogador' : 'Computador'})`);
          }
        }

        logMessage = `[${timestamp}] WARN: EPIDEMIA DE GRIPE! ${infectedNames.length} personagem(ns) em jogo (${infectedNames.join(', ')}) pegaram gripe (-1 de Ataque)!`;
      } else {
        logMessage = `[${timestamp}] WARN: EPIDEMIA DE GRIPE! Nenhuma carta na mesa no momento para ser infectada.`;
      }
      break;
    }

    case 'gravidez': {
      title = '🤰 EVENTO: GRAVIDEZ?';
      description = 'Uma carta de personagem feminino trabalhando na mesa foi sorteada. Se CLT, entra em licença maternidade (3 rodadas inativa); se PJ, volta ao baralho.';

      if (allFemaleOnBoard.length > 0) {
        const chosenFemale = allFemaleOnBoard[Math.floor(Math.random() * allFemaleOnBoard.length)];

        if (!chosenFemale.isPJ) {
          const markPregnant = (board: GameCard[]) => {
            const idx = board.findIndex(c => c.instanceId === chosenFemale.instanceId);
            if (idx !== -1) {
              board[idx] = {
                ...board[idx],
                isPregnant: true,
                pregnantRounds: 3,
                isStunned: true,
                stunnedRounds: 3,
                stunReason: 'Licença Maternidade',
              };
            }
          };
          markPregnant(updatedPlayer.board);
          markPregnant(updatedComputer.board);

          logMessage = `[${timestamp}] NOTICE: LICENÇA MATERNIDADE! ${chosenFemale.name} (CLT) está em licença maternidade por 3 rodadas.`;
        } else {
          // Female PJ card on board: rescinds contract, returns to deck!
          const pIdx = updatedPlayer.board.findIndex(c => c.instanceId === chosenFemale.instanceId);
          if (pIdx !== -1) {
            const res = removeCardsWithCascade(updatedPlayer.board, [chosenFemale.instanceId]);
            updatedPlayer.board = res.survivingBoard;
            updatedPlayer.firedCount += Math.max(0, res.allFiredCards.length - 1);
          } else {
            const cIdx = updatedComputer.board.findIndex(c => c.instanceId === chosenFemale.instanceId);
            if (cIdx !== -1) {
              const res = removeCardsWithCascade(updatedComputer.board, [chosenFemale.instanceId]);
              updatedComputer.board = res.survivingBoard;
              updatedComputer.firedCount += Math.max(0, res.allFiredCards.length - 1);
            }
          }

          const returnedCard: GameCard = {
            ...chosenFemale,
            defense: chosenFemale.maxDefense,
            attackBuff: 0,
            defenseBuff: 0,
            isStunned: false,
            stunnedRounds: 0,
            pjBlocked: false,
            pjBlockedRounds: 0,
            isSick: false,
            hasAttackedThisTurn: 0,
          };

          updatedDeck.push(returnedCard);
          logMessage = `[${timestamp}] NOTICE: GRAVIDEZ (PJ)! ${chosenFemale.name} (Contrato PJ) rescindiu contrato e voltou ao baralho.`;
        }
      } else {
        logMessage = `[${timestamp}] NOTICE: GRAVIDEZ? Nenhum personagem feminino na mesa no momento.`;
      }
      break;
    }

    case 'baixa_demanda': {
      title = '📉 EVENTO: BAIXA DEMANDA NOS CONTRATOS!';
      description = 'Corte de consultores! Cartas com a tag "Contrato PJ" em campo ficam inativas por 1 rodada.';
      logMessage = `[${timestamp}] WARN: BAIXA DEMANDA! Cartas com tag Contrato PJ na mesa inativas por 1 rodada.`;

      updatedPlayer.board = updatedPlayer.board.map(c => c.isPJ ? {
        ...c,
        pjBlocked: true,
        pjBlockedRounds: 1,
        isStunned: true,
        stunnedRounds: Math.max(c.stunnedRounds || 0, 1),
        stunReason: 'Baixa Demanda',
      } : c);

      updatedComputer.board = updatedComputer.board.map(c => c.isPJ ? {
        ...c,
        pjBlocked: true,
        pjBlockedRounds: 1,
        isStunned: true,
        stunnedRounds: Math.max(c.stunnedRounds || 0, 1),
        stunReason: 'Baixa Demanda',
      } : c);
      break;
    }

    case 'tempo_servico': {
      title = '🎖️ EVENTO: RECONHECIMENTO DE TEMPO DE SERVIÇO!';
      description = 'Promoção e tempo de casa! Uma carta veterana na mesa (com 3+ turnos de empresa) ganha 2 novos modificadores!';

      const eligibleCards = [
        ...updatedPlayer.board,
        ...updatedComputer.board
      ].filter(c => (c.turnsOnBoard || 0) >= 3 && !c.isPJ);

      if (eligibleCards.length > 0) {
        // Pick card with highest turnsOnBoard
        const candidateCard = [...eligibleCards].sort((a, b) => (b.turnsOnBoard || 0) - (a.turnsOnBoard || 0))[0];

        const isPlayer = updatedPlayer.board.some(c => c.instanceId === candidateCard.instanceId);
        const ownerState = isPlayer ? updatedPlayer : updatedComputer;
        const cardIndex = ownerState.board.findIndex(c => c.instanceId === candidateCard.instanceId);

        if (cardIndex !== -1) {
          const target = ownerState.board[cardIndex];
          const allyBoard = ownerState.board.filter((_, i) => i !== cardIndex);
          const { updatedCard, updatedAllyBoard, newModifiers } = grantTempoDeServicoBonus(target, allyBoard);

          ownerState.board = [
            ...updatedAllyBoard.slice(0, cardIndex),
            updatedCard,
            ...updatedAllyBoard.slice(cardIndex)
          ];

          logMessage = `[${timestamp}] SUCCESS: TEMPO DE SERVIÇO! ${candidateCard.name} do ${isPlayer ? 'Jogador' : 'Computador'} ganhou 2 novos modificadores: ${newModifiers.join(', ')}!`;
        }
      } else {
        logMessage = `[${timestamp}] NOTICE: TEMPO DE SERVIÇO! Nenhuma carta veterana no campo de batalha.`;
      }
      break;
    }

    case 'outros_imprevistos': {
      const victimName = targetPlayerId === 'player' ? 'Jogador' : 'Computador';
      title = '⚡ EVENTO: OUTROS IMPREVISTOS CORPORATIVOS!';
      description = `Queda de energia ou reunião de emergência! O ${victimName} teve que descartar sua maior carta da mão ou perdeu o turno.`;

      const victim = targetPlayerId === 'player' ? updatedPlayer : updatedComputer;
      if (victim.hand.length > 0) {
        let highestIdx = 0;
        let highestCost = -1;
        victim.hand.forEach((c, idx) => {
          if (c.cost > highestCost) {
            highestCost = c.cost;
            highestIdx = idx;
          }
        });
        const discarded = victim.hand.splice(highestIdx, 1)[0];
        logMessage = `[${timestamp}] WARN: IMPREVISTO! ${victimName} descartou ${discarded.name} (Custo ${discarded.cost}).`;
      } else {
        victim.canAttackThisTurn = false;
        logMessage = `[${timestamp}] WARN: IMPREVISTO! ${victimName} perdeu a fase de ataque deste turno.`;
      }
      break;
    }
  }

  const globalEvent: GlobalEvent = {
    id: `event_${Date.now()}_${Math.random()}`,
    type: selectedType,
    title,
    description,
    targetPlayer: targetPlayerId,
    turn: currentTurn,
    timestamp,
  };

  return {
    event: globalEvent,
    updatedPlayer,
    updatedComputer,
    updatedDeck,
    logMessage,
  };
}
