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
  logMessage: string;
}

/**
 * Calculates if an event triggers this turn.
 * Probability grows each turn without an event: starts at 15%, +10% per eventless turn.
 */
export function checkShouldTriggerEvent(turnsSinceLastEvent: number): boolean {
  const probability = Math.min(0.85, 0.15 + turnsSinceLastEvent * 0.1);
  return Math.random() < probability;
}

/**
 * Generates and resolves a random event on the current game state.
 */
export function triggerRandomEvent(
  currentTurn: number,
  player: PlayerState,
  computer: PlayerState
): EventOutcome {
  const targetPlayerId: 'player' | 'computer' | 'both' = Math.random() < 0.5 ? 'player' : 'computer';
  
  // Pick candidate event types
  let candidateTypes = [...ALL_EVENT_TYPES];

  // Check condition for 'gravidez': target must have a female character on board
  const targetState = targetPlayerId === 'player' ? player : computer;
  const hasFemaleOnBoard = targetState.board.some(c => c.gender === 'F');
  if (!hasFemaleOnBoard) {
    candidateTypes = candidateTypes.filter(t => t !== 'gravidez');
  }

  const selectedType = candidateTypes[Math.floor(Math.random() * candidateTypes.length)];

  let updatedPlayer = JSON.parse(JSON.stringify(player)) as PlayerState;
  let updatedComputer = JSON.parse(JSON.stringify(computer)) as PlayerState;

  let title = '';
  let description = '';
  let logMessage = '';

  const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  switch (selectedType) {
    case 'layoff': {
      title = '🚨 EVENTO: LAYOFF EM MASSA!';
      description = 'Corte de gastos da diretoria! Todas as cartas no campo de ambos os jogadores sofrem 2 de dano.';
      logMessage = `[${timestamp}] CRITICAL: LAYOFF DETECTADO! 2 pts de dano em todas as cartas da mesa.`;

      updatedPlayer.board = updatedPlayer.board.map(c => ({ ...c, defense: c.defense - 2 }));
      updatedComputer.board = updatedComputer.board.map(c => ({ ...c, defense: c.defense - 2 }));
      break;
    }

    case 'bug_producao': {
      const victimName = targetPlayerId === 'player' ? 'Jogador' : 'Computador';
      title = '🐛 EVENTO: BUG EM PRODUÇÃO!';
      description = `Servidores caindo! O ${victimName} perdeu todo o estoque de Café atual para pagar horas extras!`;
      logMessage = `[${timestamp}] WARN: BUG EM PRODUÇÃO! ${victimName} perdeu todo o café acumulado.`;

      if (targetPlayerId === 'player') {
        updatedPlayer.coffee = 0;
      } else {
        updatedComputer.coffee = 0;
      }
      break;
    }

    case 'problema_trens': {
      const victimName = targetPlayerId === 'player' ? 'Jogador' : 'Computador';
      title = '🚆 EVENTO: PROBLEMA NOS TRENS!';
      description = `Falha na linha de trem/metrô! O ${victimName} perde a fase de ataque deste turno devido ao atraso.`;
      logMessage = `[${timestamp}] NOTICE: PROBLEMA NOS TRENS! ${victimName} impedido de atacar no próximo turno.`;

      if (targetPlayerId === 'player') {
        updatedPlayer.canAttackThisTurn = false;
      } else {
        updatedComputer.canAttackThisTurn = false;
      }
      break;
    }

    case 'home_office': {
      const victimName = targetPlayerId === 'player' ? 'Jogador' : 'Computador';
      title = '🏠 EVENTO: ENCHENTE (HOME-OFFICE FORÇADO)!';
      description = `Trânsito parado e chuva forte! O ${victimName} ganhou +3 de Café extra economizando deslocamento!`;
      logMessage = `[${timestamp}] SUCCESS: HOME-OFFICE CONCEDIDO! ${victimName} recebeu +3 de Café extra.`;

      if (targetPlayerId === 'player') {
        updatedPlayer.coffee = Math.min(10, updatedPlayer.coffee + 3);
      } else {
        updatedComputer.coffee = Math.min(10, updatedComputer.coffee + 3);
      }
      break;
    }

    case 'pai_recem_nascido': {
      const victimName = targetPlayerId === 'player' ? 'Jogador' : 'Computador';
      title = '🍼 EVENTO: PAI DE RECÉM-NASCIDO!';
      description = `Noites em claro trocando fraldas! Custo de Café de todas as cartas do ${victimName} aumenta em +1 pelas próximas 2 rodadas.`;
      logMessage = `[${timestamp}] NOTICE: LICENÇA PATERNIDADE! Cartas de ${victimName} custam +1 Café por 2 rodadas.`;

      if (targetPlayerId === 'player') {
        updatedPlayer.extraCoffeeCostRounds = 2;
      } else {
        updatedComputer.extraCoffeeCostRounds = 2;
      }
      break;
    }

    case 'gripe': {
      const victimName = targetPlayerId === 'player' ? 'Jogador' : 'Computador';
      title = '🤧 EVENTO: EPIDEMIA DE GRIPE!';
      description = `Surto de virose no escritório! O ${victimName} fica atordoado por 1 rodada e não pode jogar novas cartas da mão.`;
      logMessage = `[${timestamp}] WARN: EPIDEMIA DE GRIPE! ${victimName} atordoado por 1 rodada.`;

      if (targetPlayerId === 'player') {
        updatedPlayer.canPlayCardsThisTurn = false;
      } else {
        updatedComputer.canPlayCardsThisTurn = false;
      }
      break;
    }

    case 'gravidez': {
      const victimName = targetPlayerId === 'player' ? 'Jogador' : 'Computador';
      title = '🤰 EVENTO: LICENÇA MATERNIDADE / GRAVIDEZ!';
      description = `Parabéns ao time! A dev do ${victimName} tirou licença, bloqueando a compra de novas cartas pelo ${victimName} por 3 rodadas.`;
      logMessage = `[${timestamp}] NOTICE: MATERNIDADE CONFIRMADA! ${victimName} sem compras de deck por 3 rodadas.`;

      if (targetPlayerId === 'player') {
        updatedPlayer.drawBlockedRounds = 3;
      } else {
        updatedComputer.drawBlockedRounds = 3;
      }
      break;
    }

    case 'baixa_demanda': {
      title = '📉 EVENTO: BAIXA DEMANDA NOS CONTRATOS!';
      description = 'Corte de consultores! Todas as cartas com a tag "Contrato PJ" em campo ficam impedidas de jogar/atacar por 1 rodada.';
      logMessage = `[${timestamp}] WARN: BAIXA DEMANDA! Cartas com tag Contrato PJ bloqueadas por 1 rodada.`;

      updatedPlayer.board = updatedPlayer.board.map(c => c.isPJ ? { ...c, pjBlocked: true } : c);
      updatedComputer.board = updatedComputer.board.map(c => c.isPJ ? { ...c, pjBlocked: true } : c);
      break;
    }

    case 'outros_imprevistos': {
      const victimName = targetPlayerId === 'player' ? 'Jogador' : 'Computador';
      title = '⚡ EVENTO: OUTROS IMPREVISTOS CORPORATIVOS!';
      description = `Queda de energia ou reunião de emergência! O ${victimName} teve que descartar sua maior carta da mão ou perdeu o turno.`;

      const victim = targetPlayerId === 'player' ? updatedPlayer : updatedComputer;
      if (victim.hand.length > 0) {
        // Discard highest cost card
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
    logMessage,
  };
}
