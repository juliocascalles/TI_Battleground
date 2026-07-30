import React from 'react';
import { X, Shield, Zap, Swords, Target, Coffee, Terminal, AlertTriangle } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h2 className="text-xl font-black text-cyan-400 tracking-wide">
              REGRAS DE TI BATTLEGROUND
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
          <section className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-amber-400 text-base mb-1 flex items-center gap-2">
              🏆 Condição de Vitória
            </h3>
            <p className="text-slate-300">
              Mantenha pelo menos <strong className="text-white">1 personagem (carta)</strong> no seu campo com Defesa &gt; 0. Se todas as suas cartas forem demitidas e você não puder jogar mais cartas, você perde o jogo!
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-cyan-400 text-base flex items-center gap-2">
              <Coffee className="w-4 h-4 text-cyan-400" /> Atributos e Café
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li><strong className="text-white">Café:</strong> Começa com 3. Ganha <strong className="text-cyan-300">+2 a cada turno</strong> (máximo 10). O café acumula.</li>
              <li><strong className="text-cyan-300">Bônus de Demissão:</strong> Ao demitir um personagem do adversário, você ganha <strong className="text-amber-300">+1 Café</strong> instantaneamente!</li>
              <li><strong className="text-white">Compras de Carta:</strong> Só é feita nova compra no início do turno se sua mão tiver <strong className="text-amber-300">menos de 5 cartas</strong>.</li>
              <li><strong className="text-rose-400">Ataque:</strong> Dano causado ao atacar cartas inimigas.</li>
              <li><strong className="text-emerald-400">Defesa (HP):</strong> Quando chega a 0 ou menos, o personagem é <strong>DEMITIDO</strong>.</li>
              <li><strong className="text-amber-400">Contrato PJ:</strong> Cartas com essa tag podem sofrer com eventos específicos como <em>Baixa Demanda</em>.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-purple-400 text-base">✨ Modificadores Especiais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-400 block text-xs">Proteção</strong>
                  <span className="text-xs text-slate-300">Imunidade a 1 ataque (perde o escudo após ser atacado).</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2">
                <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-400 block text-xs">Buff de Ataque/Defesa (+0..3)</strong>
                  <span className="text-xs text-slate-300">Aumenta atributos de colegas (+1/+1, +2/+0, +1/+3...).</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2">
                <Swords className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-400 block text-xs">Ataque Duplo</strong>
                  <span className="text-xs text-slate-300">Pode realizar 2 ataques no mesmo turno.</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2">
                <Target className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-400 block text-xs">Prioridade</strong>
                  <span className="text-xs text-slate-300">Inimigos são OBRIGADOS a atacar esta carta primeiro.</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2 col-span-1 sm:col-span-2">
                <span className="text-lg shrink-0 mt-0.5">📉</span>
                <div>
                  <strong className="text-cyan-400 block text-xs">Enfraquecer</strong>
                  <span className="text-xs text-slate-300">Ao atacar um inimigo, reduz os pontos de ataque dele pelo poder de enfraquecer da carta.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <h3 className="font-bold text-lime-400 text-base flex items-center gap-2">
              <Terminal className="w-4 h-4 text-lime-400" /> Terminal de Eventos Globais
            </h3>
            <p className="text-xs text-slate-300">
              A cada turno sem evento, a chance de um imprevisto corporativo aumenta!
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px] text-lime-300">
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">🚨 Layoff</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">🐛 Bug em Produção</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">🚆 Problema nos Trens</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">🏠 Enchente</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">🍼 Virou papai! (Machos)</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">🤧 Epidemia de Gripe</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">🤰 Licença Maternidade (Fem)</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">📉 Baixa Demanda (PJ)</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-600/30"
          >
            Entendido! Vamos ao Jogo
          </button>
        </div>
      </div>
    </div>
  );
};
