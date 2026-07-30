import { EventType, GlobalEvent, PlayerState, GameCard } from '../types';

export const ALL_EVENT_TYPES: EventType[] = [
  'layoff',
  'bug_producao',
  'problema_trens',
  'home_office',
  'pai_recem_nascido',
  'gripe',
  'gravidez',
  'baixa_demanda',
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

  // Helper lists of characters in play (board + hand)
  const allMaleInPlay = [
    ...updatedPlayer.board, ...updatedPlayer.hand,
    ...updatedComputer.board, ...updatedComputer.hand
  ].filter(c => c.gender === 'M');

  const allFemaleInPlay = [
    ...updatedPlayer.board, ...updatedPlayer.hand,
    ...updatedComputer.board, ...updatedComputer.hand
  ].filter(c => c.gender === 'F');

  // Candidate condition filters
  if (allMaleInPlay.length === 0) {
    candidateTypes = candidateTypes.filter(t => t !== 'pai_recem_nascido');
  }

  if (allFemaleInPlay.length === 0) {
    candidateTypes = candidateTypes.filter(t => t !== 'gravidez');
  }

  if (updatedPlayer.board.length === 0) {
    candidateTypes = candidateTypes.filter(t => t !== 'gripe');
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
      description = 'Corte de gastos da diretoria! Todas as cartas de todos os jogadores sofrem 2 pontos de dano e reavalia demissão.';
      logMessage = `[${timestamp}] CRITICAL: LAYOFF DETECTADO! 2 pts de dano em todas as cartas da mesa.`;

      updatedPlayer.board = updatedPlayer.board.map(c => ({ ...c, defense: c.defense - 2 }));
      updatedComputer.board = updatedComputer.board.map(c => ({ ...c, defense: c.defense - 2 }));
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
      description = 'Falha na linha de trem/metrô! As cartas compradas/contratadas ficam inativas, perdendo um turno de ataque.';
      logMessage = `[${timestamp}] NOTICE: PROBLEMA NOS TRENS! Cartas contratadas na mesa de todos os jogadores inativas por 1 turno.`;

      updatedPlayer.board = updatedPlayer.board.map(c => ({
        ...c,
        isStunned: true,
        stunnedRounds: Math.max(c.stunnedRounds || 0, 1),
      }));
      updatedComputer.board = updatedComputer.board.map(c => ({
        ...c,
        isStunned: true,
        stunnedRounds: Math.max(c.stunnedRounds || 0, 1),
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
      description = 'Noites em claro trocando fraldas! Uma carta de personagem masculino foi sorteada, voltando ao baralho com Custo +1 de Café.';

      if (allMaleInPlay.length > 0) {
        const chosenMale = allMaleInPlay[Math.floor(Math.random() * allMaleInPlay.length)];

        const removeCard = (state: PlayerState) => {
          const bIdx = state.board.findIndex(c => c.instanceId === chosenMale.instanceId);
          if (bIdx !== -1) {
            state.board.splice(bIdx, 1);
            return true;
          }
          const hIdx = state.hand.findIndex(c => c.instanceId === chosenMale.instanceId);
          if (hIdx !== -1) {
            state.hand.splice(hIdx, 1);
            return true;
          }
          return false;
        };

        removeCard(updatedPlayer) || removeCard(updatedComputer);

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
        logMessage = `[${timestamp}] NOTICE: VIROU PAPAI! ${chosenMale.name} voltou ao baralho com Custo de Café +1 (Novo custo: ${returnedCard.cost}).`;
      } else {
        logMessage = `[${timestamp}] NOTICE: VIROU PAPAI! Nenhum personagem masculino em jogo no momento.`;
      }
      break;
    }

    case 'gripe': {
      title = '🤧 EVENTO: EPIDEMIA DE GRIPE!';
      description = 'Surto de virose no escritório! Uma carta do jogador fica doente. Se usada num ataque, ela e o defensor vão para quarentena no baralho.';

      if (updatedPlayer.board.length > 0) {
        const sickIndex = Math.floor(Math.random() * updatedPlayer.board.length);
        updatedPlayer.board[sickIndex] = {
          ...updatedPlayer.board[sickIndex],
          isSick: true,
        };
        const sickCard = updatedPlayer.board[sickIndex];
        logMessage = `[${timestamp}] WARN: EPIDEMIA DE GRIPE! ${sickCard.name} do Jogador pegou gripe! Se atacar, ela e o defensor irão para quarentena no baralho.`;
      } else {
        logMessage = `[${timestamp}] WARN: EPIDEMIA DE GRIPE! O Jogador não possui cartas na mesa para serem infectadas.`;
      }
      break;
    }

    case 'gravidez': {
      title = '🤰 EVENTO: GRAVIDEZ?';
      description = 'Uma carta de personagem feminino foi sorteada. Se CLT, entra em licença maternidade (3 rodadas inativa); se PJ, volta ao baralho.';

      if (allFemaleInPlay.length > 0) {
        const chosenFemale = allFemaleInPlay[Math.floor(Math.random() * allFemaleInPlay.length)];

        if (!chosenFemale.isPJ) {
          const markPregnant = (cList: GameCard[]) => {
            const idx = cList.findIndex(c => c.instanceId === chosenFemale.instanceId);
            if (idx !== -1) {
              cList[idx] = {
                ...cList[idx],
                isPregnant: true,
                pregnantRounds: 3,
                isStunned: true,
                stunnedRounds: 3,
              };
            }
          };
          markPregnant(updatedPlayer.board);
          markPregnant(updatedPlayer.hand);
          markPregnant(updatedComputer.board);
          markPregnant(updatedComputer.hand);

          logMessage = `[${timestamp}] NOTICE: LICENÇA MATERNIDADE! ${chosenFemale.name} (CLT) está em licença maternidade por 3 rodadas.`;
        } else {
          const removeCard = (state: PlayerState) => {
            const bIdx = state.board.findIndex(c => c.instanceId === chosenFemale.instanceId);
            if (bIdx !== -1) {
              state.board.splice(bIdx, 1);
              return true;
            }
            const hIdx = state.hand.findIndex(c => c.instanceId === chosenFemale.instanceId);
            if (hIdx !== -1) {
              state.hand.splice(hIdx, 1);
              return true;
            }
            return false;
          };

          removeCard(updatedPlayer) || removeCard(updatedComputer);

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
        logMessage = `[${timestamp}] NOTICE: GRAVIDEZ? Nenhum personagem feminino em jogo no momento.`;
      }
      break;
    }

    case 'baixa_demanda': {
      title = '📉 EVENTO: BAIXA DEMANDA NOS CONTRATOS!';
      description = 'Corte de consultores! Cartas com a tag "Contrato PJ" em campo ficam inativas por 1 rodada.';
      logMessage = `[${timestamp}] WARN: BAIXA DEMANDA! Cartas com tag Contrato PJ inativas por 1 rodada.`;

      updatedPlayer.board = updatedPlayer.board.map(c => c.isPJ ? {
        ...c,
        pjBlocked: true,
        pjBlockedRounds: 1,
        isStunned: true,
        stunnedRounds: Math.max(c.stunnedRounds || 0, 1),
      } : c);

      updatedComputer.board = updatedComputer.board.map(c => c.isPJ ? {
        ...c,
        pjBlocked: true,
        pjBlockedRounds: 1,
        isStunned: true,
        stunnedRounds: Math.max(c.stunnedRounds || 0, 1),
      } : c);
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
