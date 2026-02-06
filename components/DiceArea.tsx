
import React from 'react';
import { DiceRoll } from '../types';
import { T } from '../translations';

interface DiceAreaProps {
  currentRoll: DiceRoll | null;
  onRoll: () => void;
  canRoll: boolean;
  pendingValues: number[];
  waitingForPaRa: boolean;
  paRaCount?: number;
  extraRolls?: number;
  flexiblePool: number | null;
}

export const DiceArea: React.FC<DiceAreaProps> = ({ 
  currentRoll, 
  onRoll, 
  canRoll, 
  pendingValues, 
  waitingForPaRa, 
  paRaCount = 0,
  extraRolls = 0,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-1 md:p-3 bg-stone-900/90 rounded-xl border border-stone-700 shadow-2xl w-full relative overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes paraBanner {
                0% { transform: scale(0.5) translateY(20px); opacity: 0; }
                15% { transform: scale(1.1) translateY(0); opacity: 1; }
                85% { transform: scale(1) translateY(0); opacity: 1; }
                100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            @keyframes goldShimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
            }
            .animate-para-banner { animation: paraBanner 2s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite; }
            .gold-shimmer-bg {
                background: linear-gradient(90deg, #d97706, #fbbf24, #d97706);
                background-size: 200% auto;
                animation: goldShimmer 3s linear infinite;
            }
            @keyframes pulseShadowGold {
                0%, 100% { box-shadow: 0 0 5px #fbbf24; }
                50% { box-shadow: 0 0 20px #fbbf24; }
            }
            .gold-pulse-shadow { animation: pulseShadowGold 2s ease-in-out infinite; }
        `}} />

        {/* Celebratory Pa Ra Banner in Sidebar */}
        {waitingForPaRa && (
            <div className="w-full py-3 mb-2 bg-gradient-to-r from-amber-900/40 via-amber-600/40 to-amber-900/40 border-y border-amber-500/50 flex flex-col items-center animate-para-banner overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                <span className="text-white font-cinzel text-xl md:text-2xl font-bold tracking-[0.3em] drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">PA RA!</span>
                <span className="text-amber-400 font-serif text-2xl md:text-3xl leading-none mt-1">པ་ར།</span>
                <div className="flex gap-1 mt-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full border border-amber-400/50 ${i < paRaCount ? 'bg-amber-500 shadow-[0_0_8px_#fbbf24]' : 'bg-stone-800'}`} />
                    ))}
                </div>
            </div>
        )}
        
        {extraRolls > 0 && !waitingForPaRa && (
            <div className="w-full bg-blue-900/40 border border-blue-600/50 rounded-lg py-1 md:p-2 text-center mb-1 animate-pulse">
                <div className="text-blue-300 text-[6px] md:text-[8px] uppercase font-bold tracking-widest">Bonus Rolls</div>
                <div className="text-xs md:text-xl font-cinzel text-white leading-none">+{extraRolls}</div>
            </div>
        )}

        {pendingValues.length > 0 && (
            <div className="w-full mb-1">
                <div className="text-[7px] md:text-[9px] text-stone-500 uppercase font-bold text-center mb-1 tracking-widest">Movement Pool ཤོ་མིག་གཏོང་ཆོག</div>
                <div className="flex gap-1 justify-center flex-wrap">
                    {pendingValues.map((val, idx) => {
                        const isPaRaVal = val === 2;
                        return (
                            <span 
                                key={idx} 
                                className={`px-2 md:px-4 py-1 md:py-2 rounded-lg font-bold text-[12px] md:text-xl shadow-lg border animate-in zoom-in duration-300 flex items-center gap-1
                                ${isPaRaVal ? 'gold-shimmer-bg gold-pulse-shadow border-amber-300/50 text-stone-900' : 'bg-indigo-600 border-indigo-400/30 text-white'}`}
                            >
                                {isPaRaVal && <span className="text-[10px] md:text-sm">👁️👁️</span>}
                                {val}
                            </span>
                        );
                    })}
                </div>
            </div>
        )}

        <button
            onClick={onRoll}
            disabled={!canRoll && !waitingForPaRa}
            className={`
                w-full py-1.5 md:py-4 rounded-lg font-cinzel font-bold transition-all flex flex-col items-center justify-center leading-none mt-1 relative overflow-hidden group
                ${(canRoll || waitingForPaRa) ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-xl text-[10px] md:text-lg active:scale-95' : 'bg-stone-800 text-stone-600 cursor-not-allowed text-[8px] md:text-sm'}
                ${waitingForPaRa ? 'gold-shimmer-bg border-2 border-white shadow-[0_0_30px_rgba(251,191,36,0.6)]' : ''}
            `}
        >
            {waitingForPaRa && <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none"></div>}
            <div className="flex flex-col items-center gap-0.5 relative z-10">
              <span className={waitingForPaRa ? 'text-stone-900 font-black' : ''}>
                  {waitingForPaRa ? T.game.rollBonus.en : canRoll ? T.game.rollDice.en : T.game.waiting.en}
              </span>
              <span className={`text-lg md:text-3xl font-serif ${waitingForPaRa ? 'text-stone-950' : 'text-amber-400'}`}>
                {waitingForPaRa ? T.game.rollBonus.bo : canRoll ? T.game.rollDice.bo : T.game.waiting.bo}
              </span>
            </div>
        </button>
    </div>
  );
};
