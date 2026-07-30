import React, { useState, useEffect, useRef } from 'react';
import { GameCard, PlayerState, GlobalEvent } from '../types';
import { generateDeck } from '../data/cardsData';
import { isValidAttackTarget, resolveCombat, applyPlayBuff, getActualCardCost, getMaxAttacksAllowed } from '../engine/rules';
import { checkShouldTriggerEvent, triggerRandomEvent } from '../engine/eventsEngine';
import { soundFx } from '../utils/audio';

import { CardView } from './CardView';
import { CardBack } from './CardBack';
import { TerminalConsole } from './TerminalConsole';
import { RulesModal } from './RulesModal';
import { GameOverModal } from './GameOverModal';

import { Coffee, Volume2, VolumeX, HelpCircle, RotateCcw, Swords, Play, ShieldAlert, ShoppingCart, Shield, Zap, Target, Lock } from 'lucide-react';

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

  // Modals & Sound
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [winner, setWinner] = useState<'player' | 'computer' | null>(null);

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
    const fullDeck = generateDeck(24);

    // Deal 4 initial cards to Player hand and 4 to Computer hand
    const playerHand = fullDeck.slice(0, 4).map(c => ({ ...c, owner: 'player' as const }));
    const computerHand = fullDeck.slice(4, 8).map(c => ({ ...c, owner: 'computer' as const }));
    const remainingDeck = fullDeck.slice(8);

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
    setIsGameStarted(true);
    setLogs([
      '🎮 Jogo iniciado! As cartas só entram em campo quando você paga o custo de Café.',
      '☕ Clique em uma carta da sua mão para selecionar e ver o botão de compra.',
    ]);
  };

  useEffect(() => {
    initGame();
  }, []);

  // --- VICTORY / DEFEAT EVALUATION ---
  useEffect(() => {
    if (!isGameStarted || winner || isAnimating) return;

    // Do not check victory if game initialization is incomplete or empty
    if (player.hand.length === 0 && player.board.length === 0 && computer.hand.length === 0 && computer.board.length === 0) {
      return;
    }

    // Check if player is completely cleared
    const playerHasAliveCards = player.board.some(c => c.defense > 0);
    const playerCanPlayMore = player.hand.some(c => getActualCardCost(c, player) <= player.coffee);
    const playerDeckEmpty = deck.length === 0;

    const computerHasAliveCards = computer.board.some(c => c.defense > 0);

    if (!playerHasAliveCards && !playerCanPlayMore && player.hand.length === 0 && playerDeckEmpty) {
      setWinner('computer');
    } else if (!computerHasAliveCards && computer.hand.length === 0 && computer.board.length === 0 && playerHasAliveCards) {
      setWinner('player');
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

    // Apply buff if card has 'buff'
    const updatedBoard = applyPlayBuff(playedCard, player.board);
    updatedBoard.push(playedCard);

    setPlayer(prev => ({
      ...prev,
      coffee: prev.coffee - actualCost,
      hand: newHand,
      board: updatedBoard,
    }));

    setLogs(prev => [...prev, `🃏 Você colocou em campo: ${playedCard.name} (${playedCard.role}).`]);
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
    if (card.isPJ && card.pjBlocked) {
      setLogs(prev => [...prev, '⚠️ Esta carta PJ está bloqueada por Baixa Demanda!']);
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

    const defenderFired = updatedDefender.defense <= 0;
    const attackerFired = updatedAttacker.defense <= 0;

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

    // 4. NOW remove fired cards (defense <= 0) or send non-fired cards to quarantine if attacker was sick!
    const isQuarantine = attacker.isSick;

    if (isQuarantine) {
      setDeck(prevDeck => {
        const returned: GameCard[] = [];
        if (!attackerFired) {
          returned.push({
            ...updatedAttacker,
            defense: updatedAttacker.maxDefense,
            isSick: false,
            attackBuff: 0,
            defenseBuff: 0,
            isStunned: false,
            pjBlocked: false,
          });
        }
        if (!defenderFired) {
          returned.push({
            ...updatedDefender,
            defense: updatedDefender.maxDefense,
            isSick: false,
            attackBuff: 0,
            defenseBuff: 0,
            isStunned: false,
            pjBlocked: false,
          });
        }
        return [...prevDeck, ...returned];
      });

      setPlayer(prev => ({
        ...prev,
        board: prev.board.filter(c => c.defense > 0 && c.instanceId !== attacker.instanceId && c.instanceId !== defender.instanceId),
        firedCount: prev.firedCount + (prev.board.filter(c => (c.instanceId === attacker.instanceId || c.instanceId === defender.instanceId) && c.defense <= 0).length),
      }));

      setComputer(prev => ({
        ...prev,
        board: prev.board.filter(c => c.defense > 0 && c.instanceId !== attacker.instanceId && c.instanceId !== defender.instanceId),
        firedCount: prev.firedCount + (prev.board.filter(c => (c.instanceId === attacker.instanceId || c.instanceId === defender.instanceId) && c.defense <= 0).length),
      }));

      setLogs(prev => [...prev, `😷 QUARENTENA (Epidemia de Gripe)! ${attacker.name} (doente) e ${defender.name} foram enviadas ao baralho.`]);
    } else {
      setPlayer(prev => {
        const firedInTurn = prev.board.filter(c => c.defense <= 0).length;
        return {
          ...prev,
          board: prev.board.filter(c => c.defense > 0),
          firedCount: prev.firedCount + firedInTurn,
        };
      });

      setComputer(prev => {
        const firedInTurn = prev.board.filter(c => c.defense <= 0).length;
        return {
          ...prev,
          board: prev.board.filter(c => c.defense > 0),
          firedCount: prev.firedCount + firedInTurn,
        };
      });
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

  // --- END PLAYER TURN & TRIGGER AI TURN ---
  const handleEndTurn = async () => {
    if (currentTurnOwner !== 'player' || isAnimating) return;

    setIsAnimating(true);

    // Reset player attack counters and tick card status durations
    const resetPlayerBoard = player.board.map(c => {
      const stunnedRounds = Math.max(0, (c.stunnedRounds !== undefined ? c.stunnedRounds : c.isStunned ? 1 : 0) - 1);
      const pjBlockedRounds = Math.max(0, (c.pjBlockedRounds !== undefined ? c.pjBlockedRounds : c.pjBlocked ? 1 : 0) - 1);
      const pregnantRounds = Math.max(0, (c.pregnantRounds !== undefined ? c.pregnantRounds : c.isPregnant ? 1 : 0) - 1);

      return {
        ...c,
        hasAttackedThisTurn: 0,
        stunnedRounds,
        isStunned: stunnedRounds > 0,
        pjBlockedRounds,
        pjBlocked: pjBlockedRounds > 0,
        pregnantRounds,
        isPregnant: pregnantRounds > 0,
      };
    });

    setSelectedAttackerId(null);
    setSelectedHandCardId(null);
    setSelectedBoardCardId(null);

    // 1. Event Check
    let updatedP = { ...player, board: resetPlayerBoard };
    let updatedC = { ...computer };

    const eventTriggers = checkShouldTriggerEvent(turnsSinceLastEvent);
    if (eventTriggers) {
      soundFx.eventAlertSound();
      const outcome = triggerRandomEvent(turnNumber, updatedP, updatedC, deck);
      setActiveEvent(outcome.event);
      setEventHistory(prev => [...prev, outcome.event]);
      updatedP = outcome.updatedPlayer;
      updatedC = outcome.updatedComputer;
      if (outcome.updatedDeck) {
        setDeck(outcome.updatedDeck);
      }
      setTurnsSinceLastEvent(0);
      setLogs(prev => [...prev, outcome.logMessage]);

      // Pause for 3s event animation duration
      await new Promise(r => setTimeout(r, 3000));

      // Filter out fired cards (defense <= 0) resulting from events like Layoff
      const pFired = updatedP.board.filter(c => c.defense <= 0);
      if (pFired.length > 0) {
        updatedP.firedCount += pFired.length;
        updatedP.board = updatedP.board.filter(c => c.defense > 0);
      }
      const cFired = updatedC.board.filter(c => c.defense <= 0);
      if (cFired.length > 0) {
        updatedC.firedCount += cFired.length;
        updatedC.board = updatedC.board.filter(c => c.defense > 0);
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
    let currentDeck = [...deck];
    let compState: PlayerState = {
      ...updatedC,
      coffee: Math.min(10, updatedC.coffee + 2),
      hand: [...updatedC.hand],
      board: [...updatedC.board],
      drawBlockedRounds: Math.max(0, updatedC.drawBlockedRounds - 1),
    };

    // Computer Draw Card (Only if hand has < 5 cards)
    if (updatedC.drawBlockedRounds > 0) {
      setLogs(prev => [...prev, '🤖 Computador com compras bloqueadas por licença maternidade.']);
    } else if (compState.hand.length < 5 && currentDeck.length > 0) {
      const drawn = currentDeck.shift()!;
      compState.hand.push({ ...drawn, owner: 'computer' });
      setDeck(currentDeck);
      setLogs(prev => [...prev, `🤖 Computador comprou 1 carta (Mão: ${compState.hand.length}/5).`]);
    } else if (compState.hand.length >= 5) {
      setLogs(prev => [...prev, `🤖 Mão do computador cheia (${compState.hand.length}/5). Nenhuma carta comprada.`]);
    }

    setComputer({ ...compState });

    await new Promise(r => setTimeout(r, 1200));

    // A. AI Play Cards from Hand Step-by-Step
    if (compState.canPlayCardsThisTurn) {
      let safetyLoop = 0;

      while (safetyLoop < 5) {
        safetyLoop++;

        // Calculate playable cards with local compState
        const playableCards = compState.hand
          .map((card, index) => ({ card, index, actualCost: getActualCardCost(card, compState) }))
          .filter(item => item.actualCost <= compState.coffee);

        if (playableCards.length === 0) {
          break;
        }

        playableCards.sort((a, b) => {
          const scoreA = (a.card.modifiers.includes('buff') ? 3 : 0) + (a.card.modifiers.includes('prioridade') ? 2 : 0) + a.card.attack + a.card.defense;
          const scoreB = (b.card.modifiers.includes('buff') ? 3 : 0) + (b.card.modifiers.includes('prioridade') ? 2 : 0) + b.card.attack + b.card.defense;
          return scoreB - scoreA;
        });

        const chosen = playableCards[0];
        soundFx.playCardSound();

        const newHand = [...compState.hand];
        const [cardToPlay] = newHand.splice(chosen.index, 1);
        cardToPlay.owner = 'computer';

        const newBoard = applyPlayBuff(cardToPlay, compState.board);
        newBoard.push(cardToPlay);

        compState = {
          ...compState,
          coffee: compState.coffee - chosen.actualCost,
          hand: newHand,
          board: newBoard,
        };

        setComputer({ ...compState });
        setLogs(prev => [...prev, `🤖 Computador colocou em campo: ${cardToPlay.name} (${cardToPlay.role})!`]);
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    // B. AI Attacks Step-by-Step with 3s Animation Pause
    if (compState.canAttackThisTurn) {
      let attackLoop = true;
      let attackSafety = 0;

      while (attackLoop && attackSafety < 6) {
        attackSafety++;

        const latestCompBoard = computerRef.current.board;
        const latestPlayerBoard = playerRef.current.board;

        const readyAttackers = latestCompBoard.filter(c => {
          const maxAttacks = getMaxAttacksAllowed(c);
          return c.defense > 0 && c.hasAttackedThisTurn < maxAttacks && (!c.isPJ || !c.pjBlocked);
        });

        const aliveDefenders = latestPlayerBoard.filter(c => c.defense > 0);

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
          const killA = a.defense <= attacker.attack ? 10 : 0;
          const killB = b.defense <= attacker.attack ? 10 : 0;
          return (killB + b.attack) - (killA + a.attack);
        });

        const defender = validTargets[0];

        // Execute animated downward attack
        await runAttackSequence(attacker, defender, 'down');
      }
    }

    // Return turn to Player
    await new Promise(r => setTimeout(r, 800));

    setTurnNumber(prev => prev + 1);
    setCurrentTurnOwner('player');

    setPlayer(prevP => {
      const nextCoffee = Math.min(10, prevP.coffee + 2);
      soundFx.coffeeSound();

      let drawBlocked = prevP.drawBlockedRounds;
      let newHand = [...prevP.hand];
      let curDeck = [...currentDeck];

      if (drawBlocked > 0) {
        drawBlocked -= 1;
        setLogs(prev => [...prev, '🚫 Suas compras estão bloqueadas por licença maternidade!']);
      } else if (newHand.length < 5 && curDeck.length > 0) {
        const card = curDeck.shift()!;
        setDeck(curDeck);
        newHand.push({ ...card, owner: 'player' });
        setLogs(prev => [...prev, `📥 Você comprou a carta: ${card.name}! (Mão: ${newHand.length}/5)`]);
      } else if (newHand.length >= 5) {
        setLogs(prev => [...prev, `⚠️ Sua mão está cheia (${newHand.length}/5). Nenhuma carta comprada neste turno.`]);
      }

      return {
        ...prevP,
        coffee: nextCoffee,
        hand: newHand,
        canAttackThisTurn: true,
        canPlayCardsThisTurn: true,
        drawBlockedRounds: drawBlocked,
        extraCoffeeCostRounds: Math.max(0, prevP.extraCoffeeCostRounds - 1),
        board: prevP.board.map(c => {
          const stunnedRounds = Math.max(0, (c.stunnedRounds !== undefined ? c.stunnedRounds : c.isStunned ? 1 : 0) - 1);
          const pjBlockedRounds = Math.max(0, (c.pjBlockedRounds !== undefined ? c.pjBlockedRounds : c.pjBlocked ? 1 : 0) - 1);
          const pregnantRounds = Math.max(0, (c.pregnantRounds !== undefined ? c.pregnantRounds : c.isPregnant ? 1 : 0) - 1);

          return {
            ...c,
            hasAttackedThisTurn: 0,
            stunnedRounds,
            isStunned: stunnedRounds > 0,
            pjBlockedRounds,
            pjBlocked: pjBlockedRounds > 0,
            pregnantRounds,
            isPregnant: pregnantRounds > 0,
          };
        }),
      };
    });

    setLogs(prev => [...prev, '👉 SEU TURNO! Ganhou +2 Café.']);
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
              v1.2026.07.30
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
                <span className="font-black text-cyan-400">{computer.hand.length}/5</span>
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
                    ⚔️ Ataque: {cardToShow.attack + cardToShow.attackBuff} | 🛡️ Defesa: {cardToShow.defense} | ☕ Custo: {actualCost}
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
                  {cardToShow.defense > 0 && !cardToShow.isStunned && !cardToShow.pjBlocked ? (
                    <span className="text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/50 flex items-center gap-1 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Ativa
                    </span>
                  ) : (
                    <span className="text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/50 flex items-center gap-1 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> Inativa
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
                  {cardToShow.isStunned && (
                    <span className="text-yellow-300 bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-500/50 flex items-center gap-1 font-semibold">
                      <Lock className="w-3 h-3 text-yellow-400" /> Atordoado
                    </span>
                  )}
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
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">👤</span>
                <strong className="text-emerald-300 font-bold">Sua Mão (Jogador)</strong>
                <span className="text-slate-400 text-[11px]">| Demitidos: <strong className="text-rose-400">{player.firedCount}</strong></span>
              </div>

              {/* Player Coffee Meter */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-cyan-500/40 shadow-inner">
                <Coffee className={`w-4 h-4 text-cyan-400 ${player.coffee === 0 ? 'animate-bounce text-red-400' : ''}`} />
                <span className="font-black text-cyan-300 text-sm">
                  {player.coffee} / 10 Café
                </span>
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
