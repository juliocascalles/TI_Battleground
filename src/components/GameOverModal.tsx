import React from 'react';
import { Trophy, AlertTriangle, Handshake, RotateCcw } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  winner: 'player' | 'computer' | 'tie' | null;
  playerFiredCount: number;
  computerFiredCount: number;
  roundsSurvived: number;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  playerFiredCount,
  computerFiredCount,
  roundsSurvived,
  onRestart,
}) => {
  if (!isOpen || !winner) return null;

  const isPlayerWin = winner === 'player';
  const isTie = winner === 'tie';

  let borderColor = 'border-rose-500 shadow-rose-500/30';
  if (isPlayerWin) borderColor = 'border-emerald-500 shadow-emerald-500/30';
  if (isTie) borderColor = 'border-amber-500 shadow-amber-500/30';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`bg-slate-900 border-2 ${borderColor} rounded-2xl max-w-lg w-full p-6 flex flex-col items-center text-center shadow-2xl space-y-5 animate-in fade-in zoom-in duration-300`}
      >
        {/* Icon & Title */}
        <div className="flex flex-col items-center space-y-2">
          {isPlayerWin ? (
            <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 animate-bounce">
              <Trophy className="w-10 h-10" />
            </div>
          ) : isTie ? (
            <div className="w-16 h-16 rounded-full bg-amber-950 border-2 border-amber-400 flex items-center justify-center text-amber-400 animate-pulse">
              <Handshake className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-rose-950 border-2 border-rose-500 flex items-center justify-center text-rose-500 animate-pulse">
              <AlertTriangle className="w-10 h-10" />
            </div>
          )}

          <h2
            className={`text-2xl sm:text-3xl font-black tracking-wide ${
              isPlayerWin ? 'text-emerald-400' : isTie ? 'text-amber-400' : 'text-rose-500'
            }`}
          >
            {isPlayerWin
              ? 'VITÓRIA! SOBREVIVEU AO MERCADO DE TI!'
              : isTie
              ? 'EMPATE TÉCNICO! O BARALHO ACABOU!'
              : 'VOCÊ FOI DEMITIDO! GAME OVER'}
          </h2>

          <p className="text-slate-300 text-sm font-medium">
            {isPlayerWin
              ? 'Parabéns! Você manteve mais funcionários ativos e derrotou a concorrência!'
              : isTie
              ? 'O baralho acabou e ambas as equipes fecharam a partida em igualdade de condições!'
              : 'Sua equipe foi superada pela concorrência e o projeto foi cancelado. É hora de atualizar o LinkedIn.'}
          </p>
        </div>

        {/* Game Stats */}
        <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Rodadas</span>
            <strong className="text-white text-base sm:text-lg">{roundsSurvived}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Inimigos Demitidos</span>
            <strong className="text-emerald-400 text-base sm:text-lg">{computerFiredCount}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Aliados Demitidos</span>
            <strong className="text-rose-400 text-base sm:text-lg">{playerFiredCount}</strong>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onRestart}
          className={`w-full py-3.5 px-6 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
            isPlayerWin
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/40'
              : isTie
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/40'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40'
          }`}
        >
          <RotateCcw className="w-5 h-5" />
          NICE! Jogar Outra Partida
        </button>
      </div>
    </div>
  );
};
