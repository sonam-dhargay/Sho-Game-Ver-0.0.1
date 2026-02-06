
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
          </section>

          <hr className={isDarkMode ? 'border-amber-900/30' : 'border-amber-700/20'} />

          <section className="space-y-4">
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Basic Gameplay གཞི་རྩའི་རྩེད་སྟངས།</h3>
            <p>The first player to move all nine coins from the beginning of the board (hand) to the end (goal) wins the game.</p>
            <p>The shells are arranged in a clockwise spiral around the central dice pad.</p>
            <p className="font-bold text-red-600 italic">Movement values from dice must be used strategically. Only specific actions grant extra turns or allow you to keep moving.</p>
          </section>

          <section className="space-y-4">
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Being Blocked & Skipping བཀག་པ་དང་སྐོར་ཐེངས་སྐྱུར་བ།</h3>
            <div className={`${isDarkMode ? 'bg-red-950/20' : 'bg-red-50'} p-5 rounded-2xl border border-red-900/30 space-y-3`}>
                <p className="font-bold text-red-600 uppercase text-xs">The Block Rule</p>
                <p>You are <span className="font-bold text-red-500">blocked</span> if an opponent's stack in your path is <span className="underline italic">strictly larger</span> than the stack you are moving.</p>
                <p>A "Skip Turn" happens <span className="underline decoration-red-500 font-bold">only</span> when a player is completely unable to make any valid move. This occurs when:</p>
                <ul className="list-disc list-inside space-y-2 ml-2 italic">
                    <li>No pieces can be placed from your hand (starting area).</li>
                    <li>Every possible destination for your board stacks is blocked by a larger opponent stack.</li>
                </ul>
                <p className="text-xs opacity-70 mt-2">If you have any valid move at all, you must take it; you cannot skip by choice.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Move Outcomes & Bonus Rolls མཐའ་མའི་འཇུག་འབྲས།</h3>
            <div className="space-y-6">
                <div className={`${isDarkMode ? 'bg-red-950/10' : 'bg-stone-100'} p-4 rounded-xl border border-stone-300`}>
                    <p className="font-bold text-stone-500 uppercase text-xs mb-1">Ends Turn immediately</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li><span className={`${isDarkMode ? 'text-stone-200' : 'text-stone-800'} font-bold`}>Vacant space (Place):</span> Occupy an empty shell. <span className="text-red-500 italic">Ends turn immediately. Any remaining movement points are lost.</span></li>
                        <li><span className={`${isDarkMode ? 'text-stone-200' : 'text-stone-800'} font-bold`}>Goal (Finish):</span> Exiting a piece from the board. <span className="text-red-500 italic">Ends turn immediately.</span></li>
                    </ul>
                </div>

                <div className={`${isDarkMode ? 'bg-amber-600/10' : 'bg-amber-50'} p-4 rounded-xl border border-amber-500/30`}>
                    <p className="font-bold text-amber-600 uppercase text-xs mb-1">Grants Bonus Roll</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li><span className={`${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold`}>Same player (Stack):</span> Combine coins together. <span className="text-amber-600 font-bold">Grants a Bonus Roll (Extra Turn)!</span></li>
                        <li><span className="text-red-500 font-bold">Opponent (Kill):</span> Send opponent stack back to start if your stack is equal or larger. <span className="text-amber-600 font-bold">Grants a Bonus Roll (Extra Turn)!</span></li>
                    </ul>
                </div>
            </div>
          </section>

          <section className={`${isDarkMode ? 'bg-amber-950/20 border-amber-900/30' : 'bg-amber-50 border-amber-200'} p-6 rounded-2xl border space-y-4`}>
            <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-amber-400' : 'text-amber-800'} font-bold border-b ${isDarkMode ? 'border-amber-600/30' : 'border-amber-700/20'} pb-2`}>Pa Ra (Snake Eyes) པ་རའི་སྒྲིག་གཞི།</h3>
            <p>Rolling a <strong>(1,1)</strong> is called <em>pa ra</em>. This special roll grants a bonus roll <em>before</em> moving.</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Each Pa Ra adds a movement value of <strong>2</strong> to your pool.</li>
              <li>You get to roll again immediately for every Pa Ra rolled.</li>
            </ul>
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
