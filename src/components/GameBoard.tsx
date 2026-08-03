import React, { useState, useEffect, useRef } from 'react';
import { GameCard, PlayerState, GlobalEvent } from '../types';
import { generateDeck } from '../data/cardsData';
import { isValidAttackTarget, resolveCombat, applyPlayBuff, getActualCardCost, getMaxAttacksAllowed, getEffectiveDefense, getEffectiveAttack, removeCardsWithCascade, grantTempoDeServicoBonus } from '../engine/rules';
import { checkShouldTriggerEvent, triggerRandomEvent } from '../engine/eventsEngine';
import { soundFx } from '../utils/audio';

import { CardView, getEventStatusIcon } from './CardView';
import { CardBack } from './CardBack';
import { TerminalConsole } from './TerminalConsole';
import { RulesModal } from './RulesModal';
import { GameOverModal } from './GameOverModal';

import { Coffee, Volume2, VolumeX, HelpCircle, RotateCcw, Swords, Play, ShieldAlert, ShoppingCart, Shield, Zap, Target, Lock, UserX, Clock, UserPlus, TrendingUp } from 'lucide-react';

export const GameBoard: React.FC = () => {
  // --- STATE ---
  const [deck, setDeck] = useState<GameCard[]>([]);
  const [player, setPlayer] = useState<PlayerState>({
    id: 'player',
    name: 'Jogador',
    coffee: 3,
    hand: [],
    board: [],
    firedCount: 0,
    canAttackThisTurn: true,
    canPlayCardsThisTurn: true,
    drawBlockedRounds: 0,
    extraCoffeeCostRounds: 0,
  });

  const [computer, setComputer] = useState<PlayerState>({
    id: 'computer',
    name: 'Computador (AI Bot)',
    coffee: 3,
    hand: [],
    board: [],
    firedCount: 0,
    canAttackThisTurn: true,
    canPlayCardsThisTurn: true,
    drawBlockedRounds: 0,
    extraCoffeeCostRounds: 0,
  });

  // Refs to avoid stale state issues in async animations
  const playerRef = useRef(player);
  playerRef.current = player;
  const computerRef = useRef(computer);
  computerRef.current = computer;

  const [currentTurnOwner, setCurrentTurnOwner] = useState<'player' | 'computer'>('player');
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [turnsSinceLastEvent, setTurnsSinceLastEvent] = useState<number>(0);

  const [activeEvent, setActiveEvent] = useState<GlobalEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<GlobalEvent[]>([]);
  const [logs, setLogs] = useState<string[]>([
    'Bem-vindo ao TI Battleground!',
    'Jogo iniciado. Que vença o desenvolvedor mais resiliente!',
  ]);

  // Selected attacker card on player board, Selected hand card & Selected board card
  const [selectedAttackerId, setSelectedAttackerId] = useState<string | null>(null);
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [selectedBoardCardId, setSelectedBoardCardId] = useState<string | null>(null);
  const [attackingCardId, setAttackingCardId] = useState<string | null>(null);
  const [attackDirection, setAttackDirection] = useState<'up' | 'down'>('up');
  const [hitCardId, setHitCardId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [triageCount, setTriageCount] = useState<number>(0);

  // Modals & Sound
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [winner, setWinner] = useState<'player' | 'computer' | 'tie' | null>(null);

  // Event animation duration timer: Event animations last 3 seconds, then terminate
  useEffect(() => {
    if (activeEvent) {
      const timer = setTimeout(() => {
        setActiveEvent(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeEvent]);

  // Helper to check if a card is affected by the active event
  const isCardAffectedByEvent = (card: GameCard, event: GlobalEvent | null, owner: 'player' | 'computer') => {
    if (!event) return false;
    if (event.type === 'layoff') return true;
    if (event.type === 'baixa_demanda') return card.isPJ || card.pjBlocked;
    if (event.targetPlayer === 'both' || event.targetPlayer === owner) {
      if (event.type === 'gravidez') return card.gender === 'F';
      return true;
    }
    return false;
  };

  // Calculate event probability percentage
  const eventChancePercent = Math.min(85, Math.round((0.15 + turnsSinceLastEvent * 0.1) * 100));

  // --- INITIALIZE GAME ---
  const initGame = () => {
    const fullDeck = generateDeck(48);

    // Requirement 1: Deal 3 initial cards to Player hand and 3 to Computer hand
    const playerHand = fullDeck.slice(0, 3).map(c => ({ ...c, owner: 'player' as const }));
    const computerHand = fullDeck.slice(3, 6).map(c => ({ ...c, owner: 'computer' as const }));
    const remainingDeck = fullDeck.slice(6);

    setDeck(remainingDeck);

    setPlayer({
      id: 'player',
      name: 'Jogador',
      coffee: 3,
      hand: playerHand,
      board: [],
      firedCount: 0,
      canAttackThisTurn: true,
      canPlayCardsThisTurn: true,
      drawBlockedRounds: 0,
      extraCoffeeCostRounds: 0,
    });

    setComputer({
      id: 'computer',
      name: 'Computador (AI Bot)',
      coffee: 3,
      hand: computerHand,
      board: [],
      firedCount: 0,
      canAttackThisTurn: true,
      canPlayCardsThisTurn: true,
      drawBlockedRounds: 0,
      extraCoffeeCostRounds: 0,
    });

    setCurrentTurnOwner('player');
    setTurnNumber(1);
    setTurnsSinceLastEvent(0);
    setActiveEvent(null);
    setEventHistory([]);
    setSelectedAttackerId(null);
    setSelectedHandCardId(null);
    setSelectedBoardCardId(null);
    setAttackingCardId(null);
    setHitCardId(null);
    setIsAnimating(false);
    setWinner(null);
    setTriageCount(0);
    setIsGameStarted(true);
    setLogs([
      '🎮 Jogo iniciado! Mão máxima de 3 cartas. As cartas entram na mesa ao pagar o custo de Café.',
      '☕ Cartas "recém-contratadas" possuem 70% de chance de nascer inativas no primeiro turno.',
    ]);
  };

  useEffect(() => {
    initGame();
  }, []);

  // --- VICTORY / DEFEAT / TIE EVALUATION ---
  useEffect(() => {
    if (!isGameStarted || winner || isAnimating) return;

    // Requirement 1: Victory / Defeat / Tie ONLY evaluates after the deck has completely run out!
    if (deck.length > 0) return;

    const playerBoardCount = player.board.filter(c => getEffectiveDefense(c) > 0).length;
    const compBoardCount = computer.board.filter(c => getEffectiveDefense(c) > 0).length;

    // 1. If computer board and hand are wiped while deck is empty, player wins!
    if (compBoardCount === 0 && computer.hand.length === 0 && playerBoardCount > 0) {
      setWinner('player');
      return;
    }

    // 2. If player board and hand are wiped while deck is empty, computer wins!
    if (playerBoardCount === 0 && player.hand.length === 0 && compBoardCount > 0) {
      setWinner('computer');
      return;
    }

    // 3. When both hands are empty and deck is empty, evaluate final game winner or tie
    if (player.hand.length === 0 && computer.hand.length === 0) {
      if (playerBoardCount > compBoardCount) {
        setWinner('player');
      } else if (compBoardCount > playerBoardCount) {
        setWinner('computer');
      } else {
        // Equal alive cards on board (or 0 vs 0). Compare demissões / enemy cards fired
        if (computer.firedCount > player.firedCount) {
          setWinner('player');
        } else if (player.firedCount > computer.firedCount) {
          setWinner('computer');
        } else {
          // Compare sum of total defense on board
          const pDefSum = player.board.reduce((sum, c) => sum + Math.max(0, getEffectiveDefense(c)), 0);
          const cDefSum = computer.board.reduce((sum, c) => sum + Math.max(0, getEffectiveDefense(c)), 0);

          if (pDefSum > cDefSum) {
            setWinner('player');
          } else if (cDefSum > pDefSum) {
            setWinner('computer');
          } else {
            // Requirement 2: Tela de empate caso aconteça
            setWinner('tie');
          }
        }
      }
    }
  }, [isGameStarted, player, computer, deck, winner, isAnimating]);

  // --- PLAYER ACTIONS ---

  // 1. Play Card from Hand
  const handlePlayCardFromHand = (card: GameCard, index: number) => {
    if (currentTurnOwner !== 'player' || isAnimating) return;
    if (!player.canPlayCardsThisTurn) {
      setLogs(prev => [...prev, '⚠️ Você está atordoado por evento e não pode jogar novas cartas!']);
      return;
    }

    const actualCost = getActualCardCost(card, player);
    if (player.coffee < actualCost) {
      setLogs(prev => [...prev, `☕ Café insuficiente! Você precisa de ${actualCost} Café.`]);
      return;
    }

    soundFx.playCardSound();

    // Deduct coffee and move card to board
    const newHand = [...player.hand];
    const [playedCard] = newHand.splice(index, 1);
    playedCard.owner = 'player';
    playedCard.turnsOnBoard = 0;

    // Requirement: Check if card can be born active
    const isInactiveOnBirth = playedCard.canBeBornActive !== undefined ? !playedCard.canBeBornActive : Math.random() < 0.9;
    if (isInactiveOnBirth) {
      playedCard.isStunned = true;
      playedCard.stunnedRounds = 1;
      playedCard.stunReason = 'Inativa (recém-contratada)';
    } else {
      playedCard.isStunned = false;
      playedCard.stunnedRounds = 0;
    }

    // Apply buff if card has 'buff'
    const updatedBoard = applyPlayBuff(playedCard, player.board);
    updatedBoard.push(playedCard);

    setPlayer(prev => ({
      ...prev,
      coffee: prev.coffee - actualCost,
      hand: newHand,
      board: updatedBoard,
    }));

    setLogs(prev => [...prev, `🃏 Você colocou em campo: ${playedCard.name} (${playedCard.role})${isInactiveOnBirth ? ' ⚠️ (Inativa no 1º turno)' : ' ✓ (Ativa no 1º dia)'}.`]);
  };

  // Requirement 5: Demissão voluntária button handler
  const handleVoluntaryResignation = (card: GameCard) => {
    if (currentTurnOwner !== 'player' || isAnimating) return;

    // Requirement 5: se a carta tem custo > 1, o café retornado na demissão voluntária é o custo - 1
    const refundCoffee = card.cost > 1 ? (card.cost - 1) : 0;

    soundFx.playCardSound();

    setPlayer(prev => {
      const res = removeCardsWithCascade(prev.board, [card.instanceId], { isVoluntaryResignation: true });
      const extraFired = res.allFiredCards.length - 1;
      if (extraFired > 0) {
        setLogs(l => [...l, `⚠️ DEMISSÃO EM CADEIA! A demissão de ${card.name} demitiu ${extraFired} colega(s).`]);
      }
      return {
        ...prev,
        coffee: Math.min(10, prev.coffee + refundCoffee),
        board: res.survivingBoard,
        firedCount: prev.firedCount + res.allFiredCards.length,
      };
    });

    setLogs(prev => [
      ...prev,
      `🚪 Demissão voluntária de ${card.name}! ${refundCoffee > 0 ? `Recuperou +${refundCoffee} Café (Custo original: ${card.cost}).` : 'Nenhum café retornado (Custo era <= 1).'}`
    ]);

    setSelectedBoardCardId(null);
    setSelectedAttackerId(null);
  };

  // Triagem: replaces cards in player's hand with 3 new cards drawn from the deck
  const handleTriage = () => {
    if (currentTurnOwner !== 'player' || isAnimating) return;

    if (player.drawBlockedRounds && player.drawBlockedRounds > 0) {
      setLogs(prev => [...prev, '🚫 Não é possível realizar a Triagem: Suas compras estão bloqueadas por licença maternidade!']);
      return;
    }

    // Starting from 3rd triage attempt in the same round (triageCount >= 2), cost is 1 Coffee
    const triageCost = triageCount >= 2 ? 1 : 0;
    if (triageCost > 0 && player.coffee < triageCost) {
      setLogs(prev => [...prev, '☕ Café insuficiente! A Triagem a partir da 3ª vez na rodada custa 1 ponto de Café.']);
      return;
    }

    // Return current hand to deck and shuffle
    const combinedDeck = [...deck, ...player.hand].sort(() => Math.random() - 0.5);

    if (combinedDeck.length === 0) {
      setLogs(prev => [...prev, '⚠️ Não há cartas disponíveis no baralho para realizar a Triagem!']);
      return;
    }

    // Draw up to 3 cards from combined deck
    const newHand = combinedDeck.splice(0, 3).map(c => ({ ...c, owner: 'player' as const }));

    setSelectedHandCardId(null);
    setDeck(combinedDeck);
    setTriageCount(prev => prev + 1);
    setPlayer(prev => ({
      ...prev,
      coffee: prev.coffee - triageCost,
      hand: newHand,
    }));

    soundFx.playCardSound();
    const costText = triageCost > 0 ? ' (Custo: 1 ☕)' : ' (Grátis)';
    setLogs(prev => [...prev, `📋 Triagem realizada${costText}! Cartas da mão foram devolvidas e 3 novas cartas foram sacadas do baralho.`]);
  };

  // 2. Select Card on Player Board (Shows attributes panel and enables attack)
  const handleSelectPlayerBoardCard = (card: GameCard) => {
    setSelectedHandCardId(null);
    setSelectedBoardCardId(prev => prev === card.instanceId ? null : card.instanceId);

    if (currentTurnOwner !== 'player' || isAnimating) return;
    if (!player.canAttackThisTurn) {
      setLogs(prev => [...prev, '⚠️ Você está impedido de atacar neste turno por evento!']);
      return;
    }
    if (getEffectiveDefense(card) <= 0) {
      setLogs(prev => [...prev, '⚠️ Carta demitida não pode atacar!']);
      return;
    }
    if (card.isStunned) {
      setLogs(prev => [...prev, `⚠️ ${card.name} está inativa neste turno (${card.stunReason || 'Inativa'}) e não pode atacar!`]);
      return;
    }
    if (card.isPregnant) {
      setLogs(prev => [...prev, `⚠️ ${card.name} está em licença maternidade e não pode atacar!`]);
      return;
    }
    if (card.isPJ && card.pjBlocked) {
      setLogs(prev => [...prev, '⚠️ Esta carta PJ está bloqueada por Baixa Demanda e não pode atacar!']);
      return;
    }

    const maxAttacks = getMaxAttacksAllowed(card);
    if (card.hasAttackedThisTurn >= maxAttacks) {
      setLogs(prev => [...prev, '⚠️ Esta carta já atacou neste turno!']);
      return;
    }

    if (selectedAttackerId === card.instanceId) {
      setSelectedAttackerId(null);
    } else {
      setSelectedAttackerId(card.instanceId);
      setLogs(prev => [...prev, `🎯 ${card.name} selecionado. Escolha uma carta inimiga para atacar!`]);
    }
  };

  // --- ANIMATED ATTACK SEQUENCE (3s TOTAL DELAY) ---
  const runAttackSequence = async (
    attacker: GameCard,
    defender: GameCard,
    direction: 'up' | 'down'
  ): Promise<void> => {
    setAttackingCardId(attacker.instanceId);
    setAttackDirection(direction);

    // 1. Wait for fast lunge animation to reach defender (~250ms)
    await new Promise(r => setTimeout(r, 250));

    setHitCardId(defender.instanceId);
    soundFx.attackImpactSound();

    // Resolve Combat
    const { updatedAttacker, updatedDefender, animation } = resolveCombat(attacker, defender);

    const defenderFired = getEffectiveDefense(updatedDefender) <= 0;
    const attackerFired = getEffectiveDefense(updatedAttacker) <= 0;

    if (defenderFired || attackerFired) {
      soundFx.cardFiredSound();
    }

    // Update Player & Computer Boards with updated health (keep defense <= 0 on board to show DEMITIDO! stamp)
    setPlayer(prev => ({
      ...prev,
      board: prev.board.map(c => {
        if (c.instanceId === attacker.instanceId) return updatedAttacker;
        if (c.instanceId === defender.instanceId) return updatedDefender;
        return c;
      }),
    }));

    setComputer(prev => ({
      ...prev,
      board: prev.board.map(c => {
        if (c.instanceId === attacker.instanceId) return updatedAttacker;
        if (c.instanceId === defender.instanceId) return updatedDefender;
        return c;
      }),
    }));

    // Log combat text
    if (direction === 'up') {
      if (defenderFired) {
        setLogs(prev => [...prev, `🔥 SEU ATAQUE DEMITIU ${defender.name} do computador! (+1 Café bônus)`]);
      } else {
        setLogs(prev => [...prev, `⚔️ ${attacker.name} atacou ${defender.name} (Dano trocado: -${animation.damageToDefender} / -${animation.damageToAttacker}).`]);
      }
    } else {
      if (defenderFired) {
        setLogs(prev => [...prev, `🔥 COMPUTER ATACOU E DEMITIU ${defender.name} do jogador! (+1 Café bônus)`]);
      } else {
        setLogs(prev => [...prev, `⚔️ ${attacker.name} do computador atacou ${defender.name} (Dano trocado: -${animation.damageToDefender} / -${animation.damageToAttacker}).`]);
      }
    }

    // 1.4 Rule: +1 Coffee reward for demoting an enemy card
    let playerCoffeeGain = 0;
    let computerCoffeeGain = 0;

    if (direction === 'up') {
      if (defenderFired) playerCoffeeGain += 1;
      if (attackerFired) computerCoffeeGain += 1;
    } else {
      if (defenderFired) computerCoffeeGain += 1;
      if (attackerFired) playerCoffeeGain += 1;
    }

    if (playerCoffeeGain > 0) {
      setPlayer(prev => ({
        ...prev,
        coffee: Math.min(10, prev.coffee + playerCoffeeGain),
      }));
      soundFx.coffeeSound();
    }

    if (computerCoffeeGain > 0) {
      setComputer(prev => ({
        ...prev,
        coffee: Math.min(10, prev.coffee + computerCoffeeGain),
      }));
    }

    // 2. Wait for impact shake & smoke overlay to complete (~550ms more = 800ms total)
    await new Promise(r => setTimeout(r, 550));
    setAttackingCardId(null);
    setHitCardId(null);

    // 3. Wait remaining duration of 3 seconds total pause (2200ms) so human player can read screen and see DEMITIDO! stamp
    await new Promise(r => setTimeout(r, 2200));

    // 4. NOW remove fired cards (defense <= 0) with buff removal cascade
    setPlayer(prev => {
      const deadIds = prev.board.filter(c => getEffectiveDefense(c) <= 0).map(c => c.instanceId);
      if (deadIds.length === 0) return prev;
      const res = removeCardsWithCascade(prev.board, deadIds);
      if (res.allFiredCards.length > deadIds.length) {
        setLogs(l => [...l, `⚠️ DEMISSÃO EM CADEIA (Jogador)! A perda do buff demitiu ${res.allFiredCards.length - deadIds.length} colega(s) adicional(is).`]);
      }
      return {
        ...prev,
        board: res.survivingBoard,
        firedCount: prev.firedCount + res.allFiredCards.length,
      };
    });

    setComputer(prev => {
      const deadIds = prev.board.filter(c => getEffectiveDefense(c) <= 0).map(c => c.instanceId);
      if (deadIds.length === 0) return prev;
      const res = removeCardsWithCascade(prev.board, deadIds);
      if (res.allFiredCards.length > deadIds.length) {
        setLogs(l => [...l, `⚠️ DEMISSÃO EM CADEIA (Computador)! A perda do buff demitiu ${res.allFiredCards.length - deadIds.length} colega(s) adicional(is).`]);
      }
      return {
        ...prev,
        board: res.survivingBoard,
        firedCount: prev.firedCount + res.allFiredCards.length,
      };
    });

    if (attacker.isSick || defender.isSick) {
      setLogs(prev => [...prev, `😷 CONTAGIO DE GRIPE! O contato entre ${attacker.name} e ${defender.name} transmitiu a virose (-1 de Ataque).`]);
    }

    setSelectedAttackerId(null);
  };

  // 3. Attack or Select Enemy Card on Computer Board
  const handleAttackEnemyCard = async (defender: GameCard) => {
    setSelectedHandCardId(null);

    // If player has a selected attacker, run attack
    if (currentTurnOwner === 'player' && selectedAttackerId && !isAnimating) {
      const attacker = player.board.find(c => c.instanceId === selectedAttackerId);
      if (attacker) {
        if (attacker.isStunned || attacker.isPregnant || (attacker.isPJ && attacker.pjBlocked) || getEffectiveDefense(attacker) <= 0) {
          setLogs(prev => [...prev, `⚠️ ${attacker.name} está inativa ou bloqueada e não pode atacar neste turno!`]);
          setSelectedAttackerId(null);
          return;
        }

        // Validate Priority rule
        if (!isValidAttackTarget(defender, computer.board)) {
          setLogs(prev => [...prev, '🎯 REGRA DE PRIORIDADE: Você é obrigado a atacar a carta inimiga com Prioridade primeiro!']);
          setSelectedBoardCardId(defender.instanceId);
          return;
        }

        setSelectedBoardCardId(defender.instanceId);
        setIsAnimating(true);
        await runAttackSequence(attacker, defender, 'up');
        setIsAnimating(false);
        setSelectedBoardCardId(null);
        return;
      }
    }

    // Otherwise, toggle selection of enemy card on computer board to inspect attributes
    setSelectedBoardCardId(prev => prev === defender.instanceId ? null : defender.instanceId);
  };

  // Helper to tick board cards turn stats and check Tempo de Serviço (3 turns on board)
  const processBoardCardsTurn = (board: GameCard[], logPrefix: string): GameCard[] => {
    let updatedBoard: GameCard[] = board.map(c => {
      const stunnedRounds = Math.max(0, (c.stunnedRounds !== undefined ? c.stunnedRounds : c.isStunned ? 1 : 0) - 1);
      const pjBlockedRounds = Math.max(0, (c.pjBlockedRounds !== undefined ? c.pjBlockedRounds : c.pjBlocked ? 1 : 0) - 1);
      const pregnantRounds = Math.max(0, (c.pregnantRounds !== undefined ? c.pregnantRounds : c.isPregnant ? 1 : 0) - 1);
      const turnsOnBoard = (c.turnsOnBoard || 0) + 1;

      const item: GameCard = {
        ...c,
        hasAttackedThisTurn: 0,
        turnsOnBoard,
        stunnedRounds,
        isStunned: stunnedRounds > 0,
        stunReason: stunnedRounds > 0 ? c.stunReason : undefined,
        pjBlockedRounds,
        pjBlocked: pjBlockedRounds > 0,
        pregnantRounds,
        isPregnant: pregnantRounds > 0,
      };
      return item;
    });

    // Check Tempo de Serviço for cards every 3 turns on board
    for (let i = 0; i < updatedBoard.length; i++) {
      const card = updatedBoard[i];
      const turns = card.turnsOnBoard || 0;
      if (turns >= 3 && turns % 3 === 0 && card.lastServiceBonusTurn !== turns) {
        if (card.isPJ) {
          const msg = `Evento \`tempo de serviço\` desabilitado para ${card.name} por ser PJ`;
          console.log(msg);
          setLogs(prev => [...prev, `⚠️ ${msg}`]);
          updatedBoard[i] = {
            ...card,
            lastServiceBonusTurn: turns,
          };
        } else {
          const allyBoard = updatedBoard.filter((_, idx) => idx !== i);
          const { updatedCard, updatedAllyBoard, newModifiers } = grantTempoDeServicoBonus(card, allyBoard);
          
          updatedBoard = [
            ...updatedAllyBoard.slice(0, i),
            { ...updatedCard, lastServiceBonusTurn: turns },
            ...updatedAllyBoard.slice(i)
          ];

          const msg = `🎖️ TEMPO DE SERVIÇO (${logPrefix})! ${card.name} completou ${turns} turnos na mesa e ganhou 2 novos modificadores (${newModifiers.join(', ')}).`;
          console.log(msg);
          setLogs(prev => [...prev, msg]);
        }
      }
    }

    return updatedBoard;
  };

  // --- END PLAYER TURN & TRIGGER AI TURN ---
  const handleEndTurn = async () => {
    if (currentTurnOwner !== 'player' || isAnimating) return;

    setIsAnimating(true);

    // Keep player board as is at turn end; board status will process at start of player's next turn
    setSelectedAttackerId(null);
    setSelectedHandCardId(null);
    setSelectedBoardCardId(null);

    let currentDeck = [...deck];
    let updatedP = { ...player };
    let updatedC = { ...computer };

    if (updatedP.hand.length > 0) {
      currentDeck = [...currentDeck, ...updatedP.hand].sort(() => Math.random() - 0.5);
      updatedP.hand = [];
      setLogs(prev => [...prev, '🔄 Suas cartas não jogadas da mão foram devolvidas ao baralho.']);
    }

    // 1. Event Check
    const eventTriggers = checkShouldTriggerEvent(turnsSinceLastEvent);
    if (eventTriggers) {
      soundFx.eventAlertSound();
      const outcome = triggerRandomEvent(turnNumber, updatedP, updatedC, currentDeck);
      setActiveEvent(outcome.event);
      setEventHistory(prev => [...prev, outcome.event]);
      updatedP = outcome.updatedPlayer;
      updatedC = outcome.updatedComputer;
      if (outcome.updatedDeck) {
        currentDeck = outcome.updatedDeck;
        setDeck(outcome.updatedDeck);
      }
      setTurnsSinceLastEvent(0);
      setLogs(prev => [...prev, outcome.logMessage]);

      // Pause for 3s event animation duration
      await new Promise(r => setTimeout(r, 3000));

      // Filter out fired cards (defense <= 0) resulting from events like Layoff
      const pFired = updatedP.board.filter(c => getEffectiveDefense(c) <= 0);
      if (pFired.length > 0) {
        updatedP.firedCount += pFired.length;
        updatedP.board = updatedP.board.filter(c => getEffectiveDefense(c) > 0);
      }
      const cFired = updatedC.board.filter(c => getEffectiveDefense(c) <= 0);
      if (cFired.length > 0) {
        updatedC.firedCount += cFired.length;
        updatedC.board = updatedC.board.filter(c => getEffectiveDefense(c) > 0);
      }
    } else {
      setTurnsSinceLastEvent(prev => prev + 1);
    }

    setPlayer(updatedP);
    setComputer(updatedC);

    // Switch turn to Computer
    setCurrentTurnOwner('computer');
    setLogs(prev => [...prev, '🤖 Turno do Computador em andamento...']);

    await new Promise(r => setTimeout(r, 1000));

    // --- STEP 2: COMPUTER TURN EXECUTION ---
    const compLucroBonus = updatedC.board.filter(c => c.modifiers.includes('lucro')).length;
    let compState: PlayerState = {
      ...updatedC,
      coffee: Math.min(10, updatedC.coffee + (turnNumber === 1 ? 0 : 2) + compLucroBonus),
      hand: [...updatedC.hand],
      board: processBoardCardsTurn(updatedC.board, 'Computador'),
      drawBlockedRounds: Math.max(0, updatedC.drawBlockedRounds - 1),
    };

    if (compLucroBonus > 0) {
      setLogs(prev => [...prev, `💰 Modificador Lucro (Computador): +${compLucroBonus} Café gerado por cartas na mesa!`]);
    }

    // Requirement 1: Computer draws up to 3 cards into hand
    const compNeeded = 3 - compState.hand.length;
    if (updatedC.drawBlockedRounds > 0) {
      setLogs(prev => [...prev, '🤖 Computador com compras bloqueadas por licença maternidade.']);
    } else if (compNeeded > 0 && currentDeck.length > 0) {
      const drawnCards = currentDeck.splice(0, compNeeded).map(c => ({ ...c, owner: 'computer' as const }));
      compState.hand = [...compState.hand, ...drawnCards];
      setDeck(currentDeck);
      setLogs(prev => [...prev, `🤖 Computador comprou ${drawnCards.length} carta(s) (Mão: ${compState.hand.length}/3).`]);
    }

    setComputer({ ...compState });

    await new Promise(r => setTimeout(r, 1200));

    // A. AI Play Cards from Hand Step-by-Step
    if (compState.canPlayCardsThisTurn) {
      let safetyLoop = 0;

      while (safetyLoop < 5) {
        safetyLoop++;

        // Enforce maximum 5 cards on board limit
        if (compState.board.length >= 5) {
          break;
        }

        // Calculate playable cards with local compState
        const playableCards = compState.hand
          .map((card, index) => ({ card, index, actualCost: getActualCardCost(card, compState) }))
          .filter(item => item.actualCost <= compState.coffee);

        if (playableCards.length === 0) {
          break;
        }

        playableCards.sort((a, b) => {
          const scoreA = (a.card.modifiers.includes('buff') ? 3 : 0) + (a.card.modifiers.includes('prioridade') ? 2 : 0) + getEffectiveAttack(a.card) + getEffectiveDefense(a.card);
          const scoreB = (b.card.modifiers.includes('buff') ? 3 : 0) + (b.card.modifiers.includes('prioridade') ? 2 : 0) + getEffectiveAttack(b.card) + getEffectiveDefense(b.card);
          return scoreB - scoreA;
        });

        const chosen = playableCards[0];
        soundFx.playCardSound();

        const newHand = [...compState.hand];
        const [cardToPlay] = newHand.splice(chosen.index, 1);
        cardToPlay.owner = 'computer';
        cardToPlay.turnsOnBoard = 0;

        // Requirement: Check if card can be born active
        const isInactiveOnBirth = cardToPlay.canBeBornActive !== undefined ? !cardToPlay.canBeBornActive : Math.random() < 0.9;
        if (isInactiveOnBirth) {
          cardToPlay.isStunned = true;
          cardToPlay.stunnedRounds = 1;
          cardToPlay.stunReason = 'Inativa (recém-contratada)';
        } else {
          cardToPlay.isStunned = false;
          cardToPlay.stunnedRounds = 0;
        }

        const newBoard = applyPlayBuff(cardToPlay, compState.board);
        newBoard.push(cardToPlay);

        compState = {
          ...compState,
          coffee: compState.coffee - chosen.actualCost,
          hand: newHand,
          board: newBoard,
        };

        setComputer({ ...compState });
        setLogs(prev => [...prev, `🤖 Computador colocou em campo: ${cardToPlay.name} (${cardToPlay.role})${isInactiveOnBirth ? ' ⚠️ (Inativa no 1º turno)' : ''}!`]);
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    // B. AI Attacks Step-by-Step with Animation
    if (compState.canAttackThisTurn) {
      let attackLoop = true;
      let attackSafety = 0;

      while (attackLoop && attackSafety < 6) {
        attackSafety++;

        const latestCompBoard = computerRef.current.board;
        const latestPlayerBoard = playerRef.current.board;

        const readyAttackers = latestCompBoard.filter(c => {
          const maxAttacks = getMaxAttacksAllowed(c);
          return getEffectiveDefense(c) > 0 && c.hasAttackedThisTurn < maxAttacks && (!c.isPJ || !c.pjBlocked) && !c.isStunned;
        });

        const aliveDefenders = latestPlayerBoard.filter(c => getEffectiveDefense(c) > 0);

        if (readyAttackers.length === 0 || aliveDefenders.length === 0) {
          attackLoop = false;
          break;
        }

        const attacker = readyAttackers[0];
        const validTargets = aliveDefenders.filter(target => isValidAttackTarget(target, latestPlayerBoard));

        if (validTargets.length === 0) {
          attackLoop = false;
          break;
        }

        validTargets.sort((a, b) => {
          const killA = getEffectiveDefense(a) <= getEffectiveAttack(attacker) ? 10 : 0;
          const killB = getEffectiveDefense(b) <= getEffectiveAttack(attacker) ? 10 : 0;
          return (killB + getEffectiveAttack(b)) - (killA + getEffectiveAttack(a));
        });

        const defender = validTargets[0];

        // Execute animated downward attack
        await runAttackSequence(attacker, defender, 'down');
      }
    }

    // Requirement 1: Return unplayed cards in Computer hand back to deck
    if (compState.hand.length > 0) {
      currentDeck = [...currentDeck, ...compState.hand].sort(() => Math.random() - 0.5);
      setComputer(prevC => ({ ...prevC, hand: [] }));
      setLogs(prev => [...prev, '🤖 As cartas não jogadas do computador foram devolvidas ao baralho.']);
    }

    // Return turn to Player
    await new Promise(r => setTimeout(r, 800));

    setTurnNumber(prev => prev + 1);
    setCurrentTurnOwner('player');
    setTriageCount(0);

    setPlayer(prevP => {
      const playerLucroBonus = prevP.board.filter(c => c.modifiers.includes('lucro')).length;
      const nextCoffee = Math.min(10, prevP.coffee + 2 + playerLucroBonus);
      soundFx.coffeeSound();

      let drawBlocked = prevP.drawBlockedRounds;
      let newHand = [...prevP.hand];
      let curDeck = [...currentDeck];

      if (drawBlocked > 0) {
        drawBlocked -= 1;
        setLogs(prev => [...prev, '🚫 Suas compras estão bloqueadas por licença maternidade!']);
      } else {
        // Requirement 1: Draw up to 3 cards into hand
        const playerNeeded = 3 - newHand.length;
        if (playerNeeded > 0 && curDeck.length > 0) {
          const drawnCards = curDeck.splice(0, playerNeeded).map(c => ({ ...c, owner: 'player' as const }));
          newHand = [...newHand, ...drawnCards];
          setDeck(curDeck);
          const cardText = drawnCards.length === 3 ? 'Três novas cartas foram colocadas na sua mão!' : `${drawnCards.length} nova(s) carta(s) foram colocadas na sua mão!`;
          setLogs(prev => [...prev, `📥 ${cardText} (Mão: ${newHand.length}/3)`]);
        }
      }

      const profitMsg = playerLucroBonus > 0 ? ` (+${playerLucroBonus} 💰 Lucro)` : '';
      setLogs(prev => [...prev, `👉 SEU TURNO! Ganhou +2 Café${profitMsg}.`]);

      return {
        ...prevP,
        coffee: nextCoffee,
        hand: newHand,
        canAttackThisTurn: true,
        canPlayCardsThisTurn: true,
        drawBlockedRounds: drawBlocked,
        extraCoffeeCostRounds: Math.max(0, prevP.extraCoffeeCostRounds - 1),
        board: processBoardCardsTurn(prevP.board, 'Jogador'),
      };
    });

    setComputer(prevC => ({
      ...prevC,
    }));

    setIsAnimating(false);
  };

  const toggleMute = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. TOP HEADER BAR */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between shadow-xl z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-900 to-indigo-900 px-3 py-1 rounded-lg border border-purple-500/50 shadow-lg">
            <span className="text-xl">⚔️</span>
            <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-yellow-400 text-base sm:text-lg tracking-wider">
              TI BATTLEGROUND
            </h1>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-cyan-300/80 bg-slate-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
              v1.2026.08.03
            </span>
          </div>
          <span className="hidden sm:inline text-xs font-mono text-slate-400">
            Rodada #{turnNumber}
          </span>
        </div>

        {/* Turn Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 border shadow-lg transition-all ${
              currentTurnOwner === 'player'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-emerald-500/30 animate-pulse'
                : 'bg-purple-950 text-purple-300 border-purple-500 shadow-purple-500/30'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${currentTurnOwner === 'player' ? 'bg-emerald-400' : 'bg-purple-400'}`} />
            {currentTurnOwner === 'player' ? '👉 SEU TURNO' : '🤖 TURNO DO COMPUTADOR'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRulesOpen(true)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors cursor-pointer"
            title="Regras do Jogo"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title={isMuted ? 'Ativar Som' : 'Mutar Som'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={initGame}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Reiniciar Jogo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN GAME AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col justify-between gap-3">
        {/* 2. OPPONENT / COMPUTER ZONE (TOP) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <strong className="text-purple-300 font-bold">Computador (AI Bot)</strong>
              <span className="text-slate-400 text-[11px]">| Demitidos: <strong className="text-rose-400">{computer.firedCount}</strong></span>
            </div>

            <div className="flex items-center gap-3">
              {/* Coffee indicator */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="text-sm">☕</span>
                <span className="font-black text-cyan-300">{computer.coffee}/10</span>
              </div>
            </div>
          </div>

          {/* Computer Hand (Face Down) & Battlefield */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
            {/* Computer Hand (Face Down cards using verso_da_carta.png) */}
            <div className="md:col-span-2 flex items-center justify-start gap-1.5 overflow-x-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 min-h-[95px]">
              <div className="flex flex-col items-center justify-center shrink-0 pr-1.5 border-r border-slate-800 mr-1 text-[10px] text-slate-400">
                <span className="font-bold text-slate-300">MÃO AI</span>
                <span className="font-black text-cyan-400">{computer.hand.length}/3</span>
              </div>
              {computer.hand.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Mão vazia</span>
              ) : (
                computer.hand.map((card, index) => (
                  <div key={card.instanceId || index} className="w-16 sm:w-20 shrink-0 shadow-lg transition-transform hover:-translate-y-1">
                    <CardBack />
                  </div>
                ))
              )}
            </div>

            {/* Computer Active Board Cards */}
            <div className="md:col-span-4 min-h-[140px] bg-slate-950/40 p-2 rounded-xl border border-slate-800/50 flex items-center justify-center gap-2 flex-wrap">
              {computer.board.length === 0 ? (
                <div className="text-slate-600 text-xs italic flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-600" />
                  Nenhum funcionário do computador no campo de batalha
                </div>
              ) : (
                computer.board.map((card) => {
                  const isValidTarget =
                    selectedAttackerId !== null &&
                    currentTurnOwner === 'player' &&
                    isValidAttackTarget(card, computer.board);

                  const isAffected = isCardAffectedByEvent(card, activeEvent, 'computer');

                  return (
                    <div key={card.instanceId} className="w-32 sm:w-40">
                      <CardView
                        card={card}
                        isSelected={selectedBoardCardId === card.instanceId}
                        isValidTarget={isValidTarget}
                        isAttacking={attackingCardId === card.instanceId}
                        attackDirection={attackDirection}
                        isDefenderHit={hitCardId === card.instanceId}
                        isAffectedByEvent={isAffected}
                        eventName={activeEvent?.title}
                        onClick={() => handleAttackEnemyCard(card)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 3. CENTER ZONE: DECK STACK + TERMINAL CONSOLE + CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch min-h-[120px]">
          {/* Deck Pile */}
          <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deck de Cartas</span>
            <div className="w-20 sm:w-24">
              <CardBack countLabel={deck.length} />
            </div>
            <span className="text-[10px] text-slate-500">{deck.length} restantes</span>
          </div>

          {/* Terminal Console */}
          <div className="md:col-span-8 h-full min-h-[120px]">
            <TerminalConsole
              logs={logs}
              activeEvent={activeEvent}
              eventHistory={eventHistory}
              eventChancePercent={eventChancePercent}
            />
          </div>

          {/* Turn Action Button */}
          <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center justify-center gap-2">
            <button
              onClick={handleEndTurn}
              disabled={currentTurnOwner !== 'player' || isAnimating}
              className={`w-full py-3 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                currentTurnOwner === 'player' && !isAnimating
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 active:scale-95'
                  : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              {isAnimating ? 'Animando...' : 'Passar Turno'}
            </button>
            <span className="text-[10px] text-slate-400 text-center">
              {isAnimating ? 'Aguarde as animações...' : currentTurnOwner === 'player' ? 'Clique para passar a vez' : 'Computador pensando...'}
            </span>
          </div>
        </div>

        {/* 3.5 CARD SELECTION STATUS PANEL (HAND CARD WITH BUY BUTTON, OR BOARD CARD WITHOUT BUY BUTTON) */}
        {(() => {
          const selectedHandCard = player.hand.find(c => c.instanceId === selectedHandCardId) || null;
          const selectedBoardCard = selectedBoardCardId
            ? (player.board.find(c => c.instanceId === selectedBoardCardId) || computer.board.find(c => c.instanceId === selectedBoardCardId) || null)
            : (selectedAttackerId ? player.board.find(c => c.instanceId === selectedAttackerId) || null : null);

          const cardToShow = selectedHandCard || selectedBoardCard;
          if (!cardToShow) return null;

          const isHandCard = selectedHandCard !== null;
          const isPlayerCard = cardToShow.owner === 'player';
          const cardOwnerLabel = isHandCard ? 'Na Mão' : isPlayerCard ? 'Sua Carta (Mesa)' : 'Inimigo (Computador)';
          const actualCost = getActualCardCost(cardToShow, isPlayerCard ? player : computer);

          return (
            <div className={`bg-slate-900 border-2 ${
              isHandCard ? 'border-cyan-400' : isPlayerCard ? 'border-emerald-400' : 'border-rose-400'
            } p-3 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in`}>
              {/* STATUSBAR COM RESUMO DE ATRIBUTOS, MODIFICADORES E CONTRATO PJ */}
              <div className="flex-1 flex flex-col gap-1 text-xs text-left w-full">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-white text-sm">{cardToShow.name}</span>
                  <span className="text-cyan-400 font-semibold text-xs">({cardToShow.role})</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isHandCard 
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60' 
                      : isPlayerCard 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/60' 
                      : 'bg-rose-950 text-rose-300 border border-rose-600/60'
                  }`}>
                    {cardOwnerLabel}
                  </span>
                  <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-700 font-mono text-[11px] text-slate-200">
                    ⚔️ Ataque: {cardToShow.attack + cardToShow.attackBuff} | 🛡️ Defesa: {getEffectiveDefense(cardToShow)} | ☕ Custo: {actualCost}
                  </span>
                  {cardToShow.isPJ ? (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                      cardToShow.pjBlocked 
                        ? 'bg-red-950 text-red-300 border-red-500/80' 
                        : 'bg-amber-950 text-amber-300 border-amber-500/80'
                    }`}>
                      {cardToShow.pjBlocked ? '📄 PJ BLOQUEADO (Baixa Demanda)' : '📄 CONTRATO PJ (Sem Direitos CLT)'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded border bg-emerald-950 text-emerald-300 border-emerald-500/80">
                      📄 CONTRATO CLT (Protegido)
                    </span>
                  )}
                </div>

                {/* MODIFICADORES E STATUS DA CARTA */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-0.5">
                  <span className="text-slate-400 font-medium">Status:</span>
                  {((cardToShow.turnsOnBoard !== undefined)
                    ? getEffectiveDefense(cardToShow) > 0 && !cardToShow.isStunned && !cardToShow.pjBlocked
                    : !!cardToShow.canBeBornActive) ? (
                    <span className="text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/50 flex items-center gap-1 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Ativa
                    </span>
                  ) : (
                    <span className="text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/50 flex items-center gap-1 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> Inativa
                    </span>
                  )}
                  {cardToShow.turnsOnBoard !== undefined && (
                    <span className="text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/50 flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3 text-cyan-400" /> Sobreviveu: {cardToShow.turnsOnBoard} {cardToShow.turnsOnBoard === 1 ? 'round' : 'rounds'}
                    </span>
                  )}
                  {cardToShow.hasProtection && (
                    <span className="text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/50 flex items-center gap-1 font-semibold">
                      <Shield className="w-3 h-3 text-emerald-400" /> Proteção (Anula próximo dano)
                    </span>
                  )}
                  {cardToShow.modifiers.includes('buff') && (
                    <span className="text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/50 flex items-center gap-1 font-semibold">
                      <Zap className="w-3 h-3 text-amber-400" /> Buff (+{cardToShow.buffAttackValue ?? 1}/+{cardToShow.buffDefenseValue ?? 1})
                    </span>
                  )}
                  {cardToShow.modifiers.includes('ataque_duplo') && (
                    <span className="text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/50 flex items-center gap-1 font-semibold">
                      <Swords className="w-3 h-3 text-rose-400" /> Ataque Duplo (2x/turno)
                    </span>
                  )}
                  {cardToShow.modifiers.includes('prioridade') && (
                    <span className="text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/50 flex items-center gap-1 font-semibold">
                      <Target className="w-3 h-3 text-purple-300" /> Prioridade (Taunt)
                    </span>
                  )}
                  {cardToShow.modifiers.includes('lucro') && (
                    <span className="text-amber-200 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/50 flex items-center gap-1 font-semibold">
                      <TrendingUp className="w-3 h-3 text-amber-400" /> Lucro (+1 ☕ por turno)
                    </span>
                  )}
                  {cardToShow.isStunned && (() => {
                    const rounds = cardToShow.stunnedRounds !== undefined && cardToShow.stunnedRounds > 0 ? cardToShow.stunnedRounds : 1;
                    const turnsText = rounds === 1 ? '1 turno' : `${rounds} turnos`;
                    const reasonText = cardToShow.stunReason || (cardToShow.pjBlocked ? 'Baixa Demanda' : 'Ausente');
                    return (
                      <span className="text-yellow-300 bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-500/50 flex items-center gap-1 font-bold">
                        {getEventStatusIcon(reasonText, activeEvent?.title)}
                        {reasonText} por {turnsText}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* BOTÃO COMPRAR - APENAS SE FOR CARTA DA MÃO */}
              {isHandCard && (() => {
                const canAfford = player.coffee >= actualCost;
                const isMyTurn = currentTurnOwner === 'player';
                const handIndex = player.hand.findIndex(c => c.instanceId === cardToShow.instanceId);
                const canBuy = canAfford && isMyTurn && !isAnimating && handIndex !== -1 && player.board.length < 5;

                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (canBuy && handIndex !== -1) {
                        handlePlayCardFromHand(cardToShow, handIndex);
                        setSelectedHandCardId(null);
                      }
                    }}
                    disabled={!canBuy}
                    className={`shrink-0 py-2.5 px-5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg w-full sm:w-auto ${
                      canBuy
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/40 active:scale-95 ring-2 ring-emerald-400/50'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {canBuy
                      ? `Comprar / Contratar (-${actualCost} ☕)`
                      : !canAfford
                      ? `Café Insuficiente (${player.coffee}/${actualCost} ☕)`
                      : !isMyTurn
                      ? 'Aguarde seu Turno'
                      : player.board.length >= 5
                      ? 'Mesa Cheia (Máx 5)'
                      : 'Indisponível'}
                  </button>
                );
              })()}

              {/* BOTÃO DEMISSÃO VOLUNTÁRIA - SE FOR CARTA CONTRATADA NA MESA DO JOGADOR */}
              {!isHandCard && isPlayerCard && (() => {
                const isMyTurn = currentTurnOwner === 'player';
                const refundCoffee = cardToShow.cost > 1 ? (cardToShow.cost - 1) : 0;
                const canResign = isMyTurn && !isAnimating;

                return (
                  <button
                    type="button"
                    onClick={() => handleVoluntaryResignation(cardToShow)}
                    disabled={!canResign}
                    className={`shrink-0 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg w-full sm:w-auto ${
                      canResign
                        ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-red-700 hover:from-amber-500 hover:to-rose-500 text-white shadow-rose-900/40 active:scale-95 ring-2 ring-rose-500/50'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                    Demissão Voluntária {refundCoffee > 0 ? `(+${refundCoffee} ☕)` : '(0 ☕)'}
                  </button>
                );
              })()}
            </div>
          );
        })()}

        {/* 4. PLAYER ZONE (BOTTOM) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2">
          {/* Player Active Board Cards */}
          <div className="min-h-[140px] bg-slate-950/40 p-2 rounded-xl border border-slate-800/50 flex items-center justify-center gap-2 flex-wrap">
            {player.board.length === 0 ? (
              <div className="text-slate-500 text-xs italic flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-500" />
                Seu campo está vazio! Selecione e compre cartas da sua mão para defender sua equipe.
              </div>
            ) : (
              player.board.map((card) => {
                const isSelected = selectedAttackerId === card.instanceId || selectedBoardCardId === card.instanceId;
                const isAffected = isCardAffectedByEvent(card, activeEvent, 'player');
                return (
                  <div key={card.instanceId} className="w-32 sm:w-40">
                    <CardView
                      card={card}
                      isSelected={isSelected}
                      isAttacking={attackingCardId === card.instanceId}
                      attackDirection={attackDirection}
                      isDefenderHit={hitCardId === card.instanceId}
                      isAffectedByEvent={isAffected}
                      eventName={activeEvent?.title}
                      onClick={() => handleSelectPlayerBoardCard(card)}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Player Controls Bar & Hand */}
          <div className="border-t border-slate-800 pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">👤</span>
                <strong className="text-emerald-300 font-bold">Sua Mão (Jogador)</strong>
                <span className="text-slate-400 text-[11px]">| Demitidos: <strong className="text-rose-400">{player.firedCount}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                {/* Triagem Button */}
                <button
                  onClick={handleTriage}
                  disabled={currentTurnOwner !== 'player' || isAnimating || (triageCount >= 2 && player.coffee < 1)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold px-3 py-1 rounded-lg border border-emerald-400/40 shadow-sm transition-all cursor-pointer"
                  title={triageCount >= 2 ? "Substituir cartas da mão (Custa 1 Café a partir da 3ª vez na rodada)" : `Substituir cartas da mão (Grátis na rodada - uso ${triageCount + 1}/2)`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Triagem {triageCount >= 2 ? '(-1 ☕)' : '(Grátis)'}</span>
                </button>

                {/* Player Coffee Meter */}
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-cyan-500/40 shadow-inner">
                  <Coffee className={`w-4 h-4 text-cyan-400 ${player.coffee === 0 ? 'animate-bounce text-red-400' : ''}`} />
                  <span className="font-black text-cyan-300 text-sm">
                    {player.coffee} / 10 Café
                  </span>
                </div>
              </div>
            </div>

            {/* Player Hand Cards */}
            <div className="flex items-center justify-center gap-2 flex-wrap min-h-[120px] bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
              {player.hand.length === 0 ? (
                <span className="text-slate-600 text-xs italic">Sua mão está vazia!</span>
              ) : (
                player.hand.map((card) => {
                  const actualCost = getActualCardCost(card, player);
                  const canAfford = player.coffee >= actualCost;
                  const isAffected = isCardAffectedByEvent(card, activeEvent, 'player');
                  const isSelectedHand = selectedHandCardId === card.instanceId;

                  return (
                    <div
                      key={card.instanceId}
                      className={`w-28 sm:w-36 transition-transform ${
                        isSelectedHand
                          ? 'scale-105 -translate-y-2'
                          : canAfford ? 'hover:-translate-y-1 cursor-pointer' : 'opacity-60 grayscale'
                      }`}
                    >
                      <CardView
                        card={card}
                        actualCost={actualCost}
                        isSelected={isSelectedHand}
                        isAffectedByEvent={isAffected}
                        eventName={activeEvent?.title}
                        onClick={() => setSelectedHandCardId(prev => prev === card.instanceId ? null : card.instanceId)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <GameOverModal
        isOpen={winner !== null}
        winner={winner}
        playerFiredCount={player.firedCount}
        computerFiredCount={computer.firedCount}
        roundsSurvived={turnNumber}
        onRestart={initGame}
      />
    </div>
  );
};
