import React from 'react';
import { GameCard } from '../types';
import { CardSvgAvatar } from './CardSvgAvatar';
import { Shield, Zap, Swords, Target, Lock, Train, Baby, TrendingDown, Activity, Home, AlertTriangle, Clock } from 'lucide-react';

interface CardViewProps {
  card: GameCard;
  isSelected?: boolean;
  isValidTarget?: boolean;
  isAttacking?: boolean;
  attackDirection?: 'up' | 'down';
  isDefenderHit?: boolean;
  isAffectedByEvent?: boolean;
  eventName?: string;
  onClick?: () => void;
  actualCost?: number;
  className?: string;
}

export const getEventStatusIcon = (reason?: string, eventNameStr?: string) => {
  const combined = `${reason || ''} ${eventNameStr || ''}`.toLowerCase();
  if (combined.includes('trem') || combined.includes('metrô') || combined.includes('metro')) {
    return <Train className="w-4 h-4 shrink-0 text-slate-950" />;
  }
  if (combined.includes('maternidade') || combined.includes('gravidez') || combined.includes('papai') || combined.includes('bebê')) {
    return <Baby className="w-4 h-4 shrink-0 text-slate-950" />;
  }
  if (combined.includes('baixa demanda') || combined.includes('demanda') || combined.includes('pj')) {
    return <TrendingDown className="w-4 h-4 shrink-0 text-slate-950" />;
  }
  if (combined.includes('gripe') || combined.includes('doente') || combined.includes('virose')) {
    return <Activity className="w-4 h-4 shrink-0 text-slate-950" />;
  }
  if (combined.includes('home') || combined.includes('enchente')) {
    return <Home className="w-4 h-4 shrink-0 text-slate-950" />;
  }
  if (combined.includes('bug') || combined.includes('layoff')) {
    return <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />;
  }
  return <Clock className="w-4 h-4 shrink-0 text-slate-950" />;
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isSelected = false,
  isValidTarget = false,
  isAttacking = false,
  attackDirection = 'up',
  isDefenderHit = false,
  isAffectedByEvent = false,
  eventName,
  onClick,
  actualCost,
  className = '',
}) => {
  const displayCost = actualCost !== undefined ? actualCost : card.cost;
  const isFired = card.defense <= 0;
  const isActive = card.defense > 0 && !card.isStunned && !card.pjBlocked && !card.isPregnant;
  const totalAttack = card.attack + card.attackBuff;
  const totalDefense = Math.max(0, card.defense + card.defenseBuff);

  return (
    <div
      onClick={onClick}
      className={`relative group w-full aspect-[768/512] rounded-xl overflow-hidden border-2 select-none cursor-pointer transition-all duration-300 shadow-2xl ${
        isSelected
          ? 'border-yellow-400 ring-4 ring-yellow-400/60 scale-105 z-20 shadow-yellow-500/50'
          : isValidTarget
          ? 'border-red-500 ring-4 ring-red-500/60 animate-pulse z-10'
          : 'border-slate-700 hover:border-cyan-400 hover:shadow-cyan-500/20'
      } ${
        isAttacking
          ? attackDirection === 'down'
            ? 'animate-lunge-down z-50'
            : 'animate-lunge-up z-50'
          : ''
      } ${
        isDefenderHit ? 'animate-impact-shake z-40' : ''
      } ${
        isAffectedByEvent ? 'ring-4 ring-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.8)] animate-pulse' : ''
      } ${className}`}
    >
      {/* Background Avatar Illustration */}
      <div className="absolute inset-0 bg-slate-950">
        <CardSvgAvatar avatarId={card.avatarSvg} />
      </div>

      {/* SVG Overlay aligning strictly to 768x512 canvas coordinates from card_layout.json / card_overlay_template.svg */}
      <svg
        viewBox="0 0 768 512"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      >
        <defs>
          <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.9" />
          </filter>
        </defs>

        {/* 1. ZONE CUSTO (Coffee Cost): font size 53 (+3px) */}
        <g id="zone-custo" data-zone="zone-custo">
          <text
            x="72"
            y="71"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="75"
            fill="#000000"
            filter="url(#textGlow)"
          >
            {displayCost}
          </text>
        </g>

        {/* 2. ZONE ATAQUE: aligned with custo on the left (x=72, y=444) */}
        <g id="zone-ataque" data-zone="zone-ataque">
          <text
            x="72"
            y="444"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="75"
            fill="#000000"
            filter="url(#textGlow)"
          >
            {totalAttack}
          </text>
        </g>

        {/* 3. ZONE DEFESA: 20% right, 20% up (x=690, y=444) */}
        <g id="zone-defesa" data-zone="zone-defesa">
          <text
            x="690"
            y="444"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="75"
            fill={card.defense < card.maxDefense ? '#cc0015' : '#000000'}
            filter="url(#textGlow)"
          >
            {totalDefense}
          </text>
        </g>

        {/* 4. ZONE CONTRATO PJ TAG: rect bbox [4, 128, 140, 158] -> [x: 4, y: 128, w: 136, h: 30] */}
        {card.isPJ && (
          <g id="zone-pj-tag" data-zone="zone-pj-tag">
            <rect
              x="4"
              y="128"
              width="136"
              height="30"
              rx="6"
              fill={card.pjBlocked ? '#450a0a' : '#f59e0b'}
              stroke={card.pjBlocked ? '#ef4444' : '#fef08a'}
              strokeWidth="2"
            />
            <text
              x="72"
              y="143"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="12"
              fill={card.pjBlocked ? '#fca5a5' : '#0f172a'}
              letterSpacing="0.5"
            >
              {card.pjBlocked ? 'PJ BLOQ' : 'CONTRATO PJ'}
            </text>
          </g>
        )}

        {/* 5. ZONE MODIFIERS ROW: rect bbox [230, 6, 537, 40] -> [x: 230, y: 6, w: 307, h: 34] */}
        <foreignObject x="230" y="100" width="307" height="34">
          <div className="w-full h-full flex items-center justify-center gap-1.5 px-1">
            {card.hasProtection && (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-500/70 shadow-sm">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Prot
              </span>
            )}
            {card.modifiers.includes('buff') && (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded border border-amber-500/70 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Buff (+{card.buffAttackValue ?? 1}/+{card.buffDefenseValue ?? 1})
              </span>
            )}
            {card.modifiers.includes('enfraquecer') && (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-500/70 shadow-sm">
                📉 Enfraq (-{card.weakenPower ?? 1})
              </span>
            )}
            {card.modifiers.includes('ataque_duplo') && (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-300 bg-rose-950/90 px-2 py-0.5 rounded border border-rose-500/70 shadow-sm">
                <Swords className="w-3.5 h-3.5 text-rose-400" /> 2x
              </span>
            )}
            {card.modifiers.includes('prioridade') && (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-purple-200 bg-purple-950/90 px-2 py-0.5 rounded border border-purple-500/70 shadow-sm">
                <Target className="w-3.5 h-3.5 text-purple-300" /> Prior
              </span>
            )}
          </div>
        </foreignObject>

        {/* 6. ZONE STATUS CIRCLE (TOP-RIGHT): center (708, 61), radius 52 */}
        <g id="zone-status-circle" data-zone="zone-status-circle">
          <circle
            cx="708"
            cy="61"
            r="52"
            fill={isActive ? '#15803d' : '#b91c1c'}
            stroke={isActive ? '#4ade80' : '#fca5a5'}
            strokeWidth="6"
            filter="url(#textGlow)"
          />
          <circle
            cx="708"
            cy="61"
            r="38"
            fill={isActive ? '#16a34a' : '#dc2626'}
          />
          <text
            x="708"
            y="61"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="36"
            fill="#000000"
            filter="url(#textGlow)"
          >
            {isActive ? '✓' : '✕'}
          </text>
        </g>
      </svg>

      {/* SMOKE / EXPLOSION IMPACT OVERLAY */}
      {isDefenderHit && (
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden flex items-center justify-center">
          {/* Fiery Flash background */}
          <div className="absolute inset-0 bg-radial from-amber-400/80 via-rose-600/60 to-transparent animate-explosion-flash rounded-xl" />

          {/* Smoke Puff 1 */}
          <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-slate-900 via-slate-600 to-amber-700/60 animate-smoke opacity-90" />

          {/* Smoke Puff 2 (offset) */}
          <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-slate-950 via-slate-500 to-rose-600/70 animate-smoke opacity-90 [animation-delay:150ms]" />

          {/* Impact Sparkles */}
          <div className="text-4xl font-black text-amber-200 animate-ping drop-shadow-[0_0_16px_rgba(245,158,11,1)]">
            💥
          </div>
        </div>
      )}

      {/* DEMITIDO / FIRED OVERLAY STAMP */}
      {isFired && (
        <div className="absolute inset-0 bg-red-950/85 backdrop-blur-xs flex flex-col items-center justify-center z-30 pointer-events-none">
          <span className="text-2xl sm:text-3xl font-black text-red-500 tracking-widest border-4 border-red-500 px-4 py-1.5 shadow-2xl animate-demissao-stamp bg-slate-950/90 rounded-md">
            DEMITIDO!
          </span>
        </div>
      )}

      {/* PREGNANT / MATERNIDADE OVERLAY */}
      {card.isPregnant && !isFired && (() => {
        const rounds = card.pregnantRounds !== undefined && card.pregnantRounds > 0 ? card.pregnantRounds : 3;
        const turnsText = rounds === 1 ? '1 turno' : `${rounds} turnos`;
        const reasonText = card.stunReason || 'Licença Maternidade';
        return (
          <div className="absolute inset-0 bg-pink-950/80 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none p-2 text-center">
            <div className="flex items-center gap-1.5 bg-pink-400 text-slate-950 px-2.5 py-1.5 rounded-lg font-black text-xs shadow-xl border border-pink-200 max-w-full">
              <Baby className="w-4 h-4 shrink-0 text-slate-950" />
              <span className="truncate">
                {reasonText} por {turnsText}
              </span>
            </div>
          </div>
        );
      })()}

      {/* SICK OVERLAY BADGE */}
      {card.isSick && !isFired && !card.isPregnant && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-25 pointer-events-none">
          <div className="flex items-center gap-1 bg-emerald-600/95 text-white px-2 py-0.5 rounded font-bold text-[10px] shadow-lg border border-emerald-300 whitespace-nowrap">
            <Activity className="w-3 h-3 text-white" /> DOENTE (QUARENTENA)
          </div>
        </div>
      )}

      {/* STUNNED / BLOCKED / AUSENTE OVERLAY */}
      {card.isStunned && !card.isPregnant && !isFired && (() => {
        const rounds = card.stunnedRounds !== undefined && card.stunnedRounds > 0 ? card.stunnedRounds : 1;
        const turnsText = rounds === 1 ? '1 turno' : `${rounds} turnos`;
        const reasonText = card.stunReason || (card.pjBlocked ? 'Baixa Demanda' : 'Ausente');
        const icon = getEventStatusIcon(reasonText, eventName);

        return (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none p-2 text-center">
            <div className="flex items-center gap-1.5 bg-yellow-400 text-slate-950 px-2.5 py-1.5 rounded-lg font-black text-xs shadow-xl border border-yellow-200 animate-pulse max-w-full">
              {icon}
              <span className="truncate">
                {reasonText} por {turnsText}
              </span>
            </div>
          </div>
        );
      })()}

      {/* EVENT OVERLAY ANIMATION BANNER */}
      {isAffectedByEvent && !isFired && (
        <div className="absolute top-1.5 inset-x-1.5 z-35 pointer-events-none flex items-center justify-center animate-bounce">
          <div className="bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-400 text-slate-950 font-black text-[9px] sm:text-[11px] uppercase px-2.5 py-1 rounded-md border border-lime-200 shadow-[0_0_15px_rgba(163,230,53,0.9)] flex items-center gap-1.5 max-w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {getEventStatusIcon(card.stunReason, eventName)}
            <span className="truncate">
              {eventName ? eventName.replace(/^[^\w\s]+/, '').replace(/^EVENTO:\s*/i, '').trim() : 'EVENTO ATIVO'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};


