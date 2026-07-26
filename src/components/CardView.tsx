import React from 'react';
import { GameCard } from '../types';
import { CardSvgAvatar } from './CardSvgAvatar';
import { Shield, Zap, Swords, Target, Lock } from 'lucide-react';

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

        {/* 1. ZONE CUSTO (Coffee Cost): circle bbox [4, 4, 120, 118] -> center (62, 61) */}
        <g id="zone-custo" data-zone="zone-custo">
          <text
            x="62"
            y="61"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="48"
            fill="#ffffff"
            filter="url(#textGlow)"
          >
            {displayCost}
          </text>
        </g>

        {/* 2. ZONE ATAQUE: circle bbox [4, 340, 120, 452] -> center (62, 396) */}
        <g id="zone-ataque" data-zone="zone-ataque">
          <text
            x="62"
            y="396"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="48"
            fill="#ffffff"
            filter="url(#textGlow)"
          >
            {totalAttack}
          </text>
        </g>

        {/* 3. ZONE DEFESA: circle bbox [652, 340, 764, 452] -> center (708, 396) */}
        <g id="zone-defesa" data-zone="zone-defesa">
          <text
            x="708"
            y="396"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="48"
            fill={card.defense < card.maxDefense ? '#facc15' : '#ffffff'}
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
        <foreignObject x="230" y="6" width="307" height="34">
          <div className="w-full h-full flex items-center justify-center gap-1.5 px-1">
            {card.hasProtection && (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-500/70 shadow-sm">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Prot
              </span>
            )}
            {card.modifiers.includes('buff') && (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded border border-amber-500/70 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Buff
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

      {/* STUNNED / BLOCKED OVERLAY */}
      {card.isStunned && !isFired && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-yellow-500/90 text-slate-950 px-3 py-1 rounded-md font-bold text-xs">
            <Lock className="w-4 h-4" /> ATORDOADO
          </div>
        </div>
      )}

      {/* EVENT OVERLAY ANIMATION BANNER */}
      {isAffectedByEvent && !isFired && (
        <div className="absolute top-1.5 inset-x-1.5 z-35 pointer-events-none flex items-center justify-center animate-bounce">
          <div className="bg-gradient-to-r from-lime-500 via-emerald-500 to-lime-500 text-slate-950 font-black text-[9px] sm:text-[11px] uppercase px-2 py-0.5 rounded border border-lime-200 shadow-[0_0_15px_rgba(163,230,53,0.9)] text-center tracking-wider truncate max-w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            ⚡ {eventName ? eventName.replace(/^[^\w\s]+/, '').replace(/^EVENTO:\s*/i, '').trim() : 'EVENTO ATIVO'}
          </div>
        </div>
      )}

      {/* HOVER TOOLTIP WITH MODIFIERS AND CONTRATO PJ TAG */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-56 sm:w-64 p-2.5 bg-slate-950/95 border border-cyan-500/70 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.95)] backdrop-blur-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 text-left ${
          card.owner === 'computer' ? 'top-full mt-2' : 'bottom-full mb-2'
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <div>
            <h4 className="font-bold text-xs text-white leading-tight">{card.name}</h4>
            <p className="text-[10px] text-cyan-400 font-semibold">{card.role}</p>
          </div>
          {card.isPJ && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
              card.pjBlocked 
                ? 'bg-red-950 text-red-300 border-red-500/60' 
                : 'bg-amber-950 text-amber-300 border-amber-500/60'
            }`}>
              {card.pjBlocked ? 'PJ BLOQ' : 'CONTRATO PJ'}
            </span>
          )}
        </div>

        <div className="my-1.5 space-y-1 text-[10px]">
          {card.isPJ && (
            <div className="text-amber-300/90 bg-amber-950/40 p-1 rounded border border-amber-500/30">
              📄 <strong>Contrato PJ:</strong> {card.pjBlocked ? 'Bloqueado por Baixa Demanda' : 'Sem Direitos CLT — Sujeito a cortes de demanda'}
            </div>
          )}
          {card.hasProtection && (
            <div className="flex items-center gap-1 text-emerald-300 bg-emerald-950/40 p-1 rounded border border-emerald-500/30">
              <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
              <span><strong>Proteção:</strong> Anula o próximo dano sofrido</span>
            </div>
          )}
          {card.modifiers.includes('buff') && (
            <div className="flex items-center gap-1 text-amber-300 bg-amber-950/40 p-1 rounded border border-amber-500/30">
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              <span><strong>Buff:</strong> +1 Ataque / +1 Defesa concedidos</span>
            </div>
          )}
          {card.modifiers.includes('ataque_duplo') && (
            <div className="flex items-center gap-1 text-rose-300 bg-rose-950/40 p-1 rounded border border-rose-500/30">
              <Swords className="w-3 h-3 text-rose-400 shrink-0" />
              <span><strong>Ataque Duplo:</strong> Ataca até 2x no mesmo turno</span>
            </div>
          )}
          {card.modifiers.includes('prioridade') && (
            <div className="flex items-center gap-1 text-purple-200 bg-purple-950/40 p-1 rounded border border-purple-500/30">
              <Target className="w-3 h-3 text-purple-300 shrink-0" />
              <span><strong>Prioridade (Taunt):</strong> Deve ser atacada primeiro</span>
            </div>
          )}
          {card.isStunned && (
            <div className="flex items-center gap-1 text-yellow-300 bg-yellow-950/40 p-1 rounded border border-yellow-500/30">
              <Lock className="w-3 h-3 text-yellow-400 shrink-0" />
              <span><strong>Atordoado:</strong> Bloqueado temporariamente</span>
            </div>
          )}
          {!card.isPJ && !card.hasProtection && !card.modifiers.length && !card.isStunned && (
            <p className="text-slate-400 italic">Nenhum modificador ativo.</p>
          )}
        </div>

        {card.quote && (
          <p className="text-[9px] text-slate-400 italic border-t border-slate-800/80 pt-1 leading-tight">
            "{card.quote}"
          </p>
        )}
      </div>
    </div>
  );
};


