
import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import { T } from '../translations';

interface VictoryOverlayProps {
  winner: Player;
  onRestart: () => void;
  isDarkMode: boolean;
}

export const VictoryOverlay: React.FC<VictoryOverlayProps> = ({ winner, onRestart, isDarkMode }) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    const colors = [winner.colorHex, '#fbbf24', '#f59e0b', '#ffffff', '#ef4444', '#3b82f6'];
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 10,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 3,
    }));
    setParticles(newParticles);
  }, [winner]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .confetti {
          animation: confetti-fall linear infinite;
        }
        @keyframes victory-glow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.4)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 40px rgba(245, 158, 11, 0.8)); transform: scale(1.05); }
        }
        .animate-victory-glow {
          animation: victory-glow 3s ease-in-out infinite;
        }
      `}} />

      {/* Confetti Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="confetti absolute rounded-sm"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className={`${isDarkMode ? 'bg-stone-900 border-amber-500/50' : 'bg-stone-50 border-amber-700/30'} border-4 p-8 md:p-12 rounded-[4rem] w-full max-w-lg shadow-[0_0_100px_rgba(0,0,0,0.8)] text-center animate-in zoom-in slide-in-from-bottom-20 duration-700 relative overflow-hidden`}>
        {/* Decorative background circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 mb-6 relative animate-victory-glow">
            <div 
                className="w-full h-full rounded-full flex items-center justify-center text-5xl shadow-2xl border-4"
                style={{ backgroundColor: winner.colorHex, borderColor: 'white' }}
            >
              🏆
            </div>
            <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">WINNER</div>
          </div>

          <h2 className={`text-4xl md:text-5xl font-cinzel font-bold mb-2 ${isDarkMode ? 'text-amber-500' : 'text-amber-700'} tracking-[0.2em]`}>
            {T.game.victory.en}
          </h2>
          <h3 className="text-3xl md:text-4xl font-serif text-amber-600 mb-8 leading-none">
            {T.game.victory.bo}
          </h3>

          <div className="space-y-2 mb-10">
            <p className={`text-xl md:text-2xl font-cinzel ${isDarkMode ? 'text-stone-200' : 'text-stone-800'} font-bold`}>
              {winner.name.toUpperCase()} {T.game.wonMsg.en.toUpperCase()}
            </p>
            <p className="text-2xl md:text-3xl font-serif text-stone-500 leading-tight">
              {winner.name}{T.game.wonMsg.bo}
            </p>
          </div>

          <button 
            onClick={onRestart}
            className="w-full py-5 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white font-cinzel font-bold rounded-2xl shadow-[0_10px_30px_rgba(217,119,6,0.4)] uppercase tracking-[0.3em] active:scale-95"
          >
            {T.game.newGame.en}
            <div className="text-sm font-serif mt-1 font-normal lowercase tracking-normal">{T.game.newGame.bo}</div>
          </button>
        </div>
      </div>
    </div>
  );
};
