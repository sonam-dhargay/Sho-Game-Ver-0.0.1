
import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNinerMode: boolean;
  onToggleNinerMode: () => void;
  isDarkMode: boolean;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, isNinerMode, onToggleNinerMode, isDarkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className={`${isDarkMode ? 'bg-stone-900 border-amber-700/50' : 'bg-stone-50 border-amber-800/20'} border rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative no-scrollbar`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`sticky top-0 ${isDarkMode ? 'bg-stone-900/95 border-amber-900/30' : 'bg-stone-50/95 border-amber-700/20'} backdrop-blur-md border-b p-6 flex justify-between items-center z-10`}>
          <div className="flex flex-col">
            <h2 className={`text-2xl md:text-3xl font-cinzel ${isDarkMode ? 'text-amber-500' : 'text-amber-700'} font-bold leading-none`}>Game Rules ཤོའི་སྒྲིག་གཞི།</h2>
          </div>
          <button onClick={onClose} className={`${isDarkMode ? 'text-stone-400 hover:text-white' : 'text-stone-500 hover:text-stone-900'} text-3xl font-bold transition-colors`}>×</button>
        </div>

        <div className={`p-6 md:p-8 space-y-10 font-sans ${isDarkMode ? 'text-stone-300' : 'text-stone-700'} leading-relaxed text-sm md:text-base`}>
          
          <section className="space-y-4">
            <h3 className={`text-2xl font-cinzel ${isDarkMode ? 'text-amber-500' : 'text-amber-700'} font-bold`}>Sho — Traditional Tibetan Dice Game</h3>
            <p>
              Sho (Tibetan: <span className="font-serif">ཤོ</span>) is a traditional Tibetan race game. Its name simply means “dice”.
            </p>
          </section>

          <hr className={isDarkMode ? 'border-amber-900/30' : 'border-amber-700/20'} />

          <section className="space-y-4">
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Basic Gameplay གཞི་རྩའི་རྩེད་སྟངས།</h3>
            <p>The first player to move all nine coins from the start to the goal wins.</p>
            <p>Coins move clockwise around the spiral. Strategic use of dice values is essential for victory.</p>
          </section>

          <section className="space-y-4">
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Blocking & Skipping བཀག་པ་དང་སྐོར་ཐེངས་སྐྱུར་བ།</h3>
            <div className={`${isDarkMode ? 'bg-red-950/20' : 'bg-red-50'} p-5 rounded-2xl border border-red-900/30 space-y-3`}>
                <p className="font-bold text-red-600 uppercase text-xs">The Skip Rule</p>
                <p>A turn is <strong>only skipped</strong> if a player is completely unable to make any move.</p>
                <p className="text-sm italic border-l-4 border-red-500/50 pl-4 py-1">
                  "Turns are 'skipped' only when there are no vacant positions to place a coin or stack because of a larger stack occupying that position already."
                </p>
                <p className="text-xs mt-2 border-t border-red-200/50 pt-2">Note: You are blocked if an opponent's stack is larger than the stack you are attempting to move.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Move Outcomes & Bonus Rolls མཐའ་མའི་འཇུག་འབྲས།</h3>
            <div className="space-y-6">
                <div className={`${isDarkMode ? 'bg-stone-800/40' : 'bg-stone-100'} p-4 rounded-xl border border-stone-300`}>
                    <p className="font-bold text-stone-500 uppercase text-xs mb-1">Ends Turn</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Place:</strong> Occupy an empty shell.</li>
                        <li><strong>Goal:</strong> Successfully finish a piece.</li>
                    </ul>
                </div>

                <div className={`${isDarkMode ? 'bg-amber-600/10' : 'bg-amber-50'} p-4 rounded-xl border border-amber-500/30`}>
                    <p className="font-bold text-amber-600 uppercase text-xs mb-1">Grants Bonus Roll</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Stack:</strong> Land on your own piece to combine them.</li>
                        <li><strong>Kill:</strong> Land on an equal/smaller opponent to send them home.</li>
                    </ul>
                </div>
            </div>
          </section>

          <section className={`${isDarkMode ? 'bg-amber-950/20 border-amber-900/30' : 'bg-amber-50 border-amber-200'} p-6 rounded-2xl border space-y-4`}>
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Pa Ra (Snake Eyes) པ་རའི་སྒྲིག་གཞི།</h3>
            <p>Rolling a <strong>(1,1)</strong> is called <em>pa ra</em>. It grants an immediate bonus roll and adds a '2' to your move pool.</p>
          </section>

          <section className={`${isDarkMode ? 'bg-stone-800/50 border-stone-700' : 'bg-white border-stone-200'} p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-4`}>
              <div className="text-center md:text-left">
                  <h4 className="font-bold text-amber-600 mb-2">Game Variant རྩེད་རིགས་འདམ་ག</h4>
                  <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-500'} italic`}>{isNinerMode ? "Niner Mode: Build a full stack of 9 coins." : "No-Niner Mode: 9-stacks forbidden."}</p>
              </div>
              <button onClick={onToggleNinerMode} className="bg-amber-700 hover:bg-amber-600 px-8 py-3 rounded-xl font-bold text-white text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg">Switch Variant</button>
          </section>
        </div>

        <div className={`p-8 text-center ${isDarkMode ? 'bg-stone-900/80 border-stone-800' : 'bg-stone-100/80 border-stone-200'} backdrop-blur-sm border-t`}>
          <button onClick={onClose} className="w-full md:w-auto px-12 py-4 bg-amber-700 hover:bg-amber-600 text-white font-cinzel font-bold rounded-xl uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95">Close ཁ་རྒྱོབ།</button>
        </div>
      </div>
    </div>
  );
};
