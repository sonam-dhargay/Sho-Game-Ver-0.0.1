
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

        <div className="p-6 md:p-8 space-y-10 font-sans text-stone-300 leading-relaxed text-sm md:text-base">
          
          <section className="space-y-4">
            <h3 className="text-2xl font-cinzel text-amber-500 font-bold">Sho — Traditional Tibetan Dice Game</h3>
            <p>
              Sho (Tibetan: <span className="font-serif">ཤོ</span>) is a traditional Tibetan race game that remains widely played today. Its name simply means “dice” in Tibetan.
            </p>
            <p>
              Sho is traditionally played for money and has historically been associated with male players, although in contemporary settings anyone may participate. The game is played by two (gnyis ‘dzing) to four players (cha gzing), with three players (gsum gdzing) being the most common arrangement.
            </p>
            <p>
              When four players take part, a frequent variant is to play in two teams of two, with partners seated opposite each other.
            </p>
          </section>

          <hr className="border-amber-900/30" />

          <section className="space-y-4">
            <h3 className="text-xl font-cinzel text-amber-400 font-bold border-b border-amber-600/30 pb-2">Equipment མཁོ་ཆས།</h3>
            <p>
              The Sho board is formed by a circular spiral of shells (rde’u), typically sixty-four in number.
            </p>
            <p>
              Each player—or team—has nine identical playing pieces (lag kyi), traditionally old coins. These pieces must be stackable, as stacking is a central part of the game.
            </p>
            <p>
              Two six-sided dice are used. They are placed inside a small wooden dice cup, which is shaken and then slammed down onto a dice pad.
            </p>
            <p>
              The pad—called the shodden (sho gdan)—is traditionally made of yak leather and stuffed with yak wool. It forms the center of the board, surrounded by the circle of shells.
            </p>
          </section>

          <section className="bg-amber-900/10 p-6 rounded-2xl border border-amber-600/20 space-y-4">
            <h3 className="text-xl font-cinzel text-amber-400 font-bold border-b border-amber-600/30 pb-2">Basic Gameplay གཞི་རྩའི་རྩེད་སྟངས།</h3>
            <p>The first player to move all nine coins from the beginning of the board to the end wins the game.</p>
            <p>The shells are arranged in a clockwise spiral around the dice pad.</p>
            <p>The spaces between the shells form the playing positions, which may be occupied by coins or stacks of coins.</p>
            <p>As stacks move around the board, the shells are rearranged to expand or contract the spiral and its spaces. This makes the game highly tactile and physically dynamic.</p>
            <p>Each playing position may be occupied by coins or stacks from only one player.</p>
            <p>A stack of coins always moves as one unit. Stacks may be increased but never reduced.</p>
            <p className="font-bold text-red-400">A stack is destroyed when it is kicked out, and all of its coins are sent back to the start.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-cinzel text-amber-400 font-bold border-b border-amber-600/30 pb-2">Moving Coins ལག་ཁྱི་གཏོང་སྟངས།</h3>
            <p>Players take turns throwing the dice.</p>
            <p>On a turn, the player chooses one coin or stack to move forward from its current position by a number of spaces equal to the total shown on the two dice.</p>
            <p>For example, the rolls <strong>(4,2), (5,1), or (3,3)</strong> are all treated as <strong>6</strong>.</p>
            <p className="italic text-stone-500">(Unlike backgammon, doubles have no special meaning here.)</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-cinzel text-amber-400 font-bold border-b border-amber-600/30 pb-2">Possible Outcomes of a Move མཐའ་མའི་འབྲས་བུ།</h3>
            <p>After selecting a target position, one of four things can happen:</p>
            <ol className="list-decimal list-inside space-y-4 ml-2">
              <li>
                <span className="text-amber-200 font-bold">Vacant space:</span> 
                <p className="ml-6">The player places their coin or stack in the new position.</p>
              </li>
              <li>
                <span className="text-amber-400 font-bold">Occupied by the same player:</span>
                <p className="ml-6">The player stacks their coins together, forming a larger stack.</p>
              </li>
              <li>
                <span className="text-red-400 font-bold">Occupied by an opponent with equal or fewer coins:</span>
                <p className="ml-6">The player kills the opposing stack, occupies that space, and sends the opponent’s coins back to the start.</p>
              </li>
              <li>
                <span className="text-stone-500 font-bold">Occupied by an opponent with more coins:</span>
                <p className="ml-6">The player may not move that coin or stack.</p>
              </li>
            </ol>
            <div className="bg-amber-600/10 p-4 rounded-xl border border-amber-500/30">
              <p>If the player cannot move, or if they only place a coin or stack in a vacant space, their turn ends and play passes clockwise to the next player.</p>
              <p className="mt-2 font-bold text-amber-400">However, if the player stacks or kills, they roll again and take another move.</p>
              <p className="mt-2 italic">This continues until they can only place or cannot move. With favorable dice rolls, long and game-changing sequences of moves are possible.</p>
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

          <section className="bg-amber-950/20 p-6 rounded-2xl border border-amber-900/30 space-y-4">
            <h3 className="text-xl font-cinzel text-amber-400 font-bold border-b border-amber-600/30 pb-2">Pa Ra (Snake Eyes) པ་རའི་སྒྲིག་གཞི།</h3>
            <p>The only dice roll with special significance in the basic game is <strong>(1,1)</strong>, which is called <em>pa ra</em> in Tibetan.</p>
            <p>When pa ra is rolled:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>The player rolls the dice again <strong>before moving</strong>.</li>
              <li>The player may then choose from several possible move values.</li>
            </ul>
            <div className="bg-black/20 p-4 rounded-lg">
              <p className="text-sm italic">Example: If the player rolls <strong>(1,1) = 2</strong> followed by <strong>(5,3) = 8</strong>, they may choose to move: <strong>2</strong>, <strong>8</strong>, or <strong>10 (2 + 8)</strong>.</p>
            </div>

            <h4 className="font-cinzel text-amber-300 font-bold mt-6">Carrying Forward Unused Values</h4>
            <p>
              If the player chooses one of the two values (not the combined total) and that move results in a kill or stack, the unused value is carried forward to the next roll.
            </p>
            <p>
              This can continue across multiple rolls. As a result, moves larger than the usual maximum of (6,6) = 12 can occur.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-cinzel text-amber-400 font-bold border-b border-amber-600/30 pb-2">Pa Ra Example པ་རའི་དཔེར་བརྗོད།</h3>
            <div className="space-y-3 bg-stone-800/30 p-6 rounded-2xl border border-stone-700">
              <p><strong>1.</strong> The player rolls (1,1), then rolls again and gets (5,6). <br/><span className="text-amber-500">Possible moves: 2, 11, or 13.</span></p>
              <p><strong>2.</strong> The player chooses to move 2, which results in a <strong>kill</strong>. They roll again and obtain (3,4) = 7.</p>
              <p><strong>3.</strong> The unused value of 11 is carried forward. <br/><span className="text-amber-500">Possible moves now: 11, 7, or 18.</span></p>
              <p><strong>4.</strong> The player chooses 11, which results in <strong>stacking</strong>. They roll again and obtain (2,3) = 5.</p>
              <p><strong>5.</strong> The unused value of 7 is carried forward. <br/><span className="text-amber-500">Possible moves: 7, 5, or 12.</span></p>
              <p><strong>6.</strong> The player chooses 12 to move a stack into a vacant space. Their turn now ends, and play passes to the next player.</p>
            </div>
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
