import React from 'react';
import { X, Shield, Zap, Swords, Target, Coffee, Terminal, AlertTriangle, TrendingUp } from 'lucide-react';

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
              <li><strong className="text-white">Compras de Carta:</strong> No início do seu turno, você saca até preencher sua mão de <strong className="text-amber-300">3 cartas</strong>.</li>
              <li><strong className="text-emerald-300">Triagem:</strong> Substitui a sua mão por 3 novas cartas do baralho. Grátis 2 vezes por rodada (custa 1 Café após esgotar os usos grátis, e reseta na rodada seguinte). <strong className="text-emerald-400">Bônus de RH:</strong> Cada personagem de RH em jogo na mesa concede +1 triagem grátis por rodada!</li>
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

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2">
                <span className="text-lg shrink-0 mt-0.5">📉</span>
                <div>
                  <strong className="text-cyan-400 block text-xs">Enfraquecer</strong>
                  <span className="text-xs text-slate-300">Ao atacar um inimigo, reduz os pontos de ataque dele pelo poder de enfraquecer da carta.</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block text-xs">Lucro (Raro) 💰</strong>
                  <span className="text-xs text-slate-300">Enquanto estiver em jogo na mesa, gera +1 de Café adicional para seu dono a cada turno.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-bold text-lime-400 text-base flex items-center gap-2">
              <Terminal className="w-4 h-4 text-lime-400" /> Terminal de Eventos Globais & Regras Avançadas
            </h3>
            <p className="text-xs text-slate-300">
              <strong className="text-amber-300">Escopo dos Eventos:</strong> Os eventos corporativos só têm efeito sobre os personagens que estão <strong className="text-white">trabalhando na mesa</strong> (comprados e colocados em campo).
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-rose-400">Demissão em Cadeia (Morte de Buff):</strong> Quando uma carta com bônus de Buff morre, seu buff é removido apenas dos colegas que foram afetados por ela. Se isso diminuir a defesa total de algum colega para 0 ou menos, ele é <strong className="text-rose-400">DEMITIDO</strong> imediatamente em cadeia!
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-300 border-t border-slate-800">
              <div>
                <strong className="text-cyan-300">🎖️ Tempo de Serviço:</strong> A cada 3 turnos que a carta sobreviver na mesa, ela ganha <strong className="text-white">2 novos modificadores</strong> (desabilitado para cartas PJ). Se um dos modificadores for Buff, o bônus é aplicado imediatamente aos colegas!
              </div>

              <div>
                <strong className="text-rose-400">🚨 Layoff em Massa:</strong> Corte de gastos! Todas as cartas na mesa sofrem 2 pontos de dano e reavaliam demissão.
              </div>

              <div>
                <strong className="text-amber-400">🤧 Epidemia de Gripe:</strong> Uma carta na mesa fica doente (-1 de Ataque). Toda carta que entrar em contato em combate contra ela também é infectada e perde 1 ponto de ataque.
              </div>

              <div>
                <strong className="text-purple-300">🤰 Gravidez (Licença Maternidade):</strong> Afeta uma carta feminina na mesa. Se CLT: entra em licença por 3 rodadas inativa. Se Contrato PJ: o contrato é rescindido e a carta volta ao baralho.
              </div>

              <div>
                <strong className="text-blue-300">🍼 Virou Papai!:</strong> Uma carta masculina na mesa vai cuidar do bebê e volta ao baralho com <strong className="text-amber-300">Custo de Café +1</strong>.
              </div>

              <div>
                <strong className="text-amber-300">🐛 Bug em Produção:</strong> Perde 1 ponto de Café para cada Estagiário ou Gerente de T.I. em campo.
              </div>

              <div>
                <strong className="text-yellow-400">🚆 Problema nos Trens:</strong> Falha no transporte inativa as cartas na mesa por 1 turno de ataque.
              </div>

              <div>
                <strong className="text-emerald-400">🏠 Enchente (Home-Office Forçado):</strong> Ganhe +3 de Café extra economizando deslocamento.
              </div>

              <div>
                <strong className="text-rose-300">📉 Baixa Demanda nos Contratos:</strong> Cartas com a tag Contrato PJ na mesa ficam inativas por 1 rodada.
              </div>
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
