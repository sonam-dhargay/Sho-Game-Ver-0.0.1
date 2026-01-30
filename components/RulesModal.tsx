import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNinerMode: boolean;
  onToggleNinerMode: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, isNinerMode, onToggleNinerMode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-stone-900 border border-amber-700/50 rounded-[2rem] w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-stone-900/95 backdrop-blur-md border-b border-amber-900/30 p-6 flex justify-between items-center z-10">
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-cinzel text-amber-500 font-bold leading-none">Game Rules ཤོ་འི་སྒྲིག་གཞི།</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-3xl font-bold transition-colors">×</button>
        </div>

        <div className="p-6 md:p-8 space-y-10 font-sans text-stone-300 leading-relaxed">
          {/* Basic Gameplay Section */}
          <section className="bg-amber-900/10 p-6 rounded-2xl border border-amber-600/20">
            <h3 className="text-xl font-cinzel text-amber-400 mb-4 font-bold border-b border-amber-600/30 pb-2">Basic Gameplay གཞི་རྩའི་རྩེད་སྟངས།</h3>
            <div className="space-y-4 text-sm md:text-base">
              <p>The first player to move all <span className="text-amber-500 font-bold">nine coins</span> from the beginning of the board to the end is the winner.</p>
              <p>The shells are formed into a <span className="italic">clockwise spiral shape</span> around the dice pad. The spaces between the shells are the playing positions which can be occupied by the coins. Each playing position can be occupied by a coin or stack of coins from only one player.</p>
              <p>A stack of coins is moved as one unit. A stack can be increased but never reduced; a stack is destroyed when it is kicked out and all its coins are sent back to the start.</p>
              <p>The players take turns to throw the dice.</p>
              
              <div className="bg-amber-600/5 border-l-4 border-amber-500 p-4 my-4">
                <p className="mb-2">The player chooses which coin or stack to move from its current position to a new target position determined by moving it forward the number of positions (inter-shell spaces) corresponding to the throw of the dice - the total of the dice is taken so there is no difference between, say, the rolls (4,2), (5,1) or (3,3) - all are moved as 6.</p>
                <p className="text-stone-400 text-sm font-serif leading-tight">རྩེད་མོ་བས་རང་གི་ཤོ་མིག་དང་བསྟུན་ནས་ལག་ཁྱི་གང་ཞིག་གཏོང་མིན་འདེམས་དགོས། ཤོ་མིག་གཉིས་ཀྱི་བསྡོམས་འབོར་དེ་རྩིས་རྒྱག་གི་རེད། དཔེར་ན། ཤོ་མིག་ ༤ དང་ ༢ བབས་པའམ་ ༥ དང་ ༡ བབས་པ། ཡང་ན་ ༣ དང་ ༣ བབས་ཀྱང་ཁྱད་པར་མེད་པར་ཚང་མ་ ༦ ལ་བརྩིས་ནས་གཏོང་ཆོག</p>
              </div>

              <p>Depending on whether and how this new target playing position is occupied, there are four possibilities:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><span className="text-amber-200 font-bold">Vacant:</span> Place your coin/stack in the new position.</li>
                <li><span className="text-amber-400 font-bold">Friendly Occupation:</span> Stack your coins onto your existing ones to create a larger stack.</li>
                <li><span className="text-red-400 font-bold">Opponent Kill:</span> If your stack is equal or larger, you kill the opponent stack, sending them to the start.</li>
                <li><span className="text-stone-500 font-bold">Blocked:</span> If the opposing stack is larger than yours, you cannot move there.</li>
              </ul>
              
              <p>If the player cannot move or if they simply place their coin/stack in a new space, play passes to the next player clockwise.</p>
              
              <p className="bg-amber-600/10 p-3 rounded-lg border border-amber-600/30 italic text-stone-200">
                Bonus: If you <span className="font-bold">stack</span> or <span className="font-bold">kill</span>, you roll and move again immediately!
              </p>
            </div>
          </section>

          <section className="bg-stone-800/50 p-6 rounded-2xl border border-stone-700 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                  <h4 className="font-bold text-amber-400 mb-2">Game Variant རྩེད་རིགས་འདམ་ག</h4>
                  <p className="text-sm text-stone-400 italic">{isNinerMode ? "Niner Mode: You can build a full stack of 9 coins." : "No-Niner Mode: Stacks of 9 coins are forbidden."}</p>
              </div>
              <button onClick={onToggleNinerMode} className="bg-amber-700 hover:bg-amber-600 px-8 py-3 rounded-xl font-bold text-white text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg">
                  Switch Variant
              </button>
          </section>

          <section>
            <h3 className="text-xl font-cinzel text-amber-200 mb-3 font-bold">The 'Sho-mo' ཤོ་མོ།</h3>
            <p className="text-sm">On the very first roll of the opening round, players can place two coins. This initial stack is called the 'Sho-mo'. If an opponent lands on and kills your 'Sho-mo', they can place three coins in its place immediately.</p>
          </section>

          <section className="bg-amber-950/20 p-6 rounded-2xl border border-amber-900/30">
            <h3 className="text-xl font-cinzel text-amber-400 mb-3 font-bold">The Pa Ra Rule པ་རའི་སྒྲིག་གཞི།</h3>
            <p className="text-sm mb-3 font-bold">Rolling a 1 and 1 is called 'Pa Ra'.</p>
            <ul className="list-disc list-inside text-sm space-y-2">
              <li><strong>Bonus Roll:</strong> You roll again immediately.</li>
              <li><strong>Opening Pa Ra:</strong> On the first turn, you place 3 coins instead of 2.</li>
              <li><strong>Move Stacking:</strong> The bonus values (2) are added to your movement pool.</li>
              <li><strong>Triple Pa Ra:</strong> Rolling it three times in a row results in an <span className="text-amber-500 font-bold">Instant Victory</span>.</li>
            </ul>
          </section>

          <section className="pt-6 border-t border-stone-800">
            <h3 className="text-lg font-cinzel text-amber-200 mb-3 uppercase tracking-wider font-bold">Learn More ཁ་སྣོན་ཤེས་བྱ།</h3>
            <div className="flex flex-col gap-3">
              <a 
                href="https://en.wikipedia.org/wiki/Sho_(dice_game)" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-500 hover:text-amber-400 underline text-sm transition-colors flex items-center gap-2"
              >
                <span>🌐</span> Sho (Dice Game) - English Wikipedia
              </a>
              <a 
                href="https://bo.wikipedia.org/wiki/%E0%BD%A4%E0%BD%BC%E0%BC%8B%E0%BD%A2%E0%BE%A9%E0%BD%BA%E0%BD%91%E0%BC%8B" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-500 hover:text-amber-400 underline text-sm transition-colors font-serif flex items-center gap-2"
              >
                <span>📜</span> ཤོ་རྩེད་ - བོད་ཡིག་གི་ཝེ་ཁེ་རིག་མཛོད། (Tibetan Wikipedia)
              </a>
            </div>
          </section>
        </div>

        <div className="p-8 text-center bg-stone-900/80 backdrop-blur-sm border-t border-stone-800">
          <button onClick={onClose} className="w-full md:w-auto px-12 py-4 bg-amber-700 hover:bg-amber-600 text-white font-cinzel font-bold rounded-xl uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95">Close ཁ་རྒྱོབ།</button>
        </div>
      </div>
    </div>
  );
};