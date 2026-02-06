
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
              Sho (Tibetan: <span className="font-serif">ཤོ</span>) is a traditional Tibetan race game that remains widely played today. Its name simply means “dice” in Tibetan.
            </p>
            <p>
              Sho is traditionally played for money and has historically been associated with male players. The game is played by two to four players, with three players being the most common arrangement.
            </p>
          </section>

          <hr className={isDarkMode ? 'border-amber-900/30' : 'border-amber-700/20'} />

          <section className="space-y-4">
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Equipment མཁོ་ཆས།</h3>
            <p>
              The Sho board is formed by a circular spiral of shells (rde’u), typically sixty-four in number.
            </p>
            <p>
              Each player—or team—has nine identical playing pieces (lag kyi), traditionally old coins. These pieces must be stackable, as stacking is a central part of the game.
            </p>
            <p>
              Two six-sided dice are used. They are placed inside a small wooden dice cup, which is shaken and then slammed down onto a dice pad.
            </p>
          </section>

          <section className={`${isDarkMode ? 'bg-amber-900/10 border-amber-600/20' : 'bg-amber-100 border-amber-200'} p-6 rounded-2xl border space-y-4`}>
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Basic Gameplay གཞི་རྩའི་རྩེད་སྟངས།</h3>
            <p>The first player to move all nine coins from the beginning of the board to the end wins the game.</p>
            <p>The shells are arranged in a clockwise spiral around the dice pad.</p>
            <p>Each playing position may be occupied by coins or stacks from only one player.</p>
            <p className="font-bold text-red-600">A stack is destroyed when it is kicked out (killed), and all of its coins are sent back to the start.</p>
          </section>

          <section className="space-y-4">
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Possible Outcomes མཐའ་མའི་འཇུག་འབྲས།</h3>
            <ol className="list-decimal list-inside space-y-4 ml-2">
              <li><span className={`${isDarkMode ? 'text-amber-200' : 'text-amber-700'} font-bold`}>Vacant space (Place):</span> Occupy the new position. <span className="text-stone-500 italic">No bonus roll.</span></li>
              <li><span className={`${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold`}>Same player (Stack):</span> Combine coins together. <span className="text-amber-600 font-bold">Grants a Bonus Roll!</span></li>
              <li><span className="text-red-500 font-bold">Opponent (Kill):</span> Send opponent stack back to start if your stack is equal or larger. <span className="text-amber-600 font-bold">Grants a Bonus Roll!</span></li>
              <li><span className="text-stone-500 font-bold">Opponent (More):</span> Move forbidden if opponent stack is larger than yours.</li>
            </ol>
            <div className={`${isDarkMode ? 'bg-amber-600/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'} p-4 rounded-xl border`}>
              <p className="font-bold text-amber-600">Remember: Only Stacking or Killing grants a Bonus Roll!</p>
            </div>
          </section>

          <section className={`${isDarkMode ? 'bg-amber-950/20 border-amber-900/30' : 'bg-amber-50 border-amber-200'} p-6 rounded-2xl border space-y-4`}>
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Pa Ra (Snake Eyes) པ་རའི་སྒྲིག་གཞི།</h3>
            <p>The only dice roll with special significance is <strong>(1,1)</strong>, called <em>pa ra</em>.</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Rolling a Pa Ra always gives you a <strong>bonus roll</strong>.</li>
              <li>The '2' from the Pa Ra is added to your movement pool, and you roll again immediately.</li>
            </ul>
            
            <div className={`mt-4 p-4 rounded-xl ${isDarkMode ? 'bg-black/40' : 'bg-white/60'} text-xs md:text-sm space-y-3`}>
              <h4 className="font-bold text-amber-50 uppercase tracking-tighter">Instant Win དེ་མ་ཐག་པའི་རྒྱལ་ཁ།</h4>
              <div className="space-y-2 font-mono">
                <p>Triple Pa Ra: If a player rolls a Pa Ra (1,1) three times in a row, they win instantly!</p>
              </div>
            </div>
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
