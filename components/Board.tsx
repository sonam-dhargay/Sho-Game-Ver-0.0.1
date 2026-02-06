
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BoardState, PlayerColor, MoveOption, MoveResultType, DiceRoll, GamePhase } from '../types';
import { CENTER_X, CENTER_Y, TOTAL_SHELLS, COINS_PER_PLAYER } from '../constants';
import * as d3 from 'd3';

interface BoardProps {
  boardState: BoardState;
  players: any[];
  validMoves: MoveOption[];
  onSelectMove: (move: MoveOption) => void;
  currentPlayer: PlayerColor;
  turnPhase: GamePhase;
  onShellClick?: (index: number) => void;
  selectedSource?: number | null;
  lastMove: MoveOption | null;
  currentRoll?: DiceRoll | null;
  isRolling?: boolean;
  onInvalidMoveAttempt?: (sourceIdx: number, targetIdx: number) => void;
  isNinerMode?: boolean; 
  isOpeningPaRa?: boolean;
}

// Localized Synthesizer for Blocked Feedback
const playBlockedSFX = (() => {
  let ctx: AudioContext | null = null;
  return () => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContextClass) return;
      if (!ctx) ctx = new AudioContextClass();
      if (ctx.state === 'suspended') ctx.resume();
      
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const noise = ctx.createBufferSource();
      
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(60, t);
      osc1.frequency.exponentialRampToValueAtTime(40, t + 0.4);
      
      gain1.gain.setValueAtTime(0, t);
      gain1.gain.linearRampToValueAtTime(0.5, t + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      
      noise.connect(filter);
      filter.connect(gain1);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc1.start(t);
      noise.start(t);
      osc1.stop(t + 0.6);
      noise.stop(t + 0.6);
    } catch (e) {
      console.warn("Audio blocked or unavailable", e);
    }
  };
})();

const CowrieShell: React.FC<{ angle: number; isTarget: boolean; isHovered?: boolean; isBlocked?: boolean }> = ({ angle, isTarget, isHovered, isBlocked }) => {
  const rotation = (angle * 180 / Math.PI) + 90;
  return (
    <div 
      className={`w-10 h-12 flex items-center justify-center transition-transform duration-300 pointer-events-none ${isBlocked ? 'scale-110' : ''}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg viewBox="0 0 100 130" className={`w-full h-full drop-shadow-2xl transition-all ${isTarget ? 'filter brightness-125 scale-125 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]' : ''} ${isHovered ? 'filter drop-shadow-[0_0_15px_#fbbf24]' : ''} ${isBlocked ? 'filter saturate-200 brightness-125' : ''}`}>
        <defs>
          <radialGradient id="shellBody" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#f5f5f4" />
            <stop offset="70%" stopColor="#d6d3d1" />
            <stop offset="100%" stopColor="#78716c" />
          </radialGradient>
          <filter id="shellShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="2" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse 
          cx="50" cy="65" rx="45" ry="60" 
          fill="url(#shellBody)" 
          stroke={isBlocked ? "#ef4444" : (isTarget ? "#fbbf24" : "#a8a29e")} 
          strokeWidth={isBlocked ? "5" : (isTarget ? "4" : "1.2")} 
        />
        <path d="M50 20 C 40 40, 38 85, 50 110 C 62 85, 60 40, 50 20" fill={isBlocked ? "#991b1b" : (isTarget ? "#92400e" : "#57534e")} opacity="0.9" />
        <g stroke={isBlocked ? "#fecaca" : "#e7e5e4"} strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
           <line x1="48" y1="35" x2="42" y2="35" /><line x1="47" y1="50" x2="40" y2="50" /><line x1="47" y1="65" x2="38" y2="65" /><line x1="47" y1="80" x2="40" y2="80" /><line x1="48" y1="95" x2="42" y2="95" />
           <line x1="52" y1="35" x2="58" y2="35" /><line x1="53" y1="50" x2="60" y2="50" /><line x1="53" y1="65" x2="62" y2="65" /><line x1="53" y1="80" x2="60" y2="80" /><line x1="52" y1="95" x2="58" y2="95" />
        </g>
      </svg>
    </div>
  );
};

const AncientCoin: React.FC<{ color: string; isSelected: boolean; opacity?: number }> = ({ color, isSelected, opacity = 1 }) => {
  return (
    <div 
      className={`relative w-16 h-16 rounded-full shadow-[6px_8px_12px_rgba(0,0,0,0.7),inset_0px_2px_4px_rgba(255,255,255,0.3)] border border-white/20 flex items-center justify-center transition-all ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-stone-900 z-50 scale-110 brightness-110' : ''}`}
      style={{ 
        background: `radial-gradient(circle at 30% 30%, ${color}, #000000)`, 
        touchAction: 'none',
        opacity: opacity 
      }}
    >
      {/* Metallic Shine Overlay */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-white/5 pointer-events-none"></div>
      {/* Decorative Engraving */}
      <div className="w-12 h-12 rounded-full border border-white/10 opacity-40 flex items-center justify-center">
         <div className="w-8 h-8 rounded-full border-t-2 border-white/20"></div>
      </div>
      {/* Central Square Hole (Traditional Style) */}
      <div className="absolute w-5 h-5 bg-stone-950/80 border border-white/5 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8)] transform rotate-45 flex items-center justify-center">
          <div className="w-2 h-2 bg-stone-900 rounded-sm opacity-50"></div>
      </div>
      {/* Specular Highlight */}
      <div className="absolute top-2.5 left-3.5 w-6 h-4 bg-white/20 rounded-full blur-[2px] pointer-events-none transform -rotate-12"></div>
    </div>
  );
};

const BoardDie: React.FC<{ value: number; x: number; y: number; rotation: number; isRolling: boolean }> = ({ value, x, y, rotation, isRolling }) => {
    const [animState, setAnimState] = useState<'initial' | 'settled'>('initial');
    const [displayValue, setDisplayValue] = useState(value);
    const randomSpinOffset = useRef(Math.random() * 720 - 360).current;
    
    useEffect(() => {
        if (isRolling) {
            const interval = setInterval(() => { setDisplayValue(Math.floor(Math.random() * 6) + 1); }, 80);
            return () => clearInterval(interval);
        } else {
            setDisplayValue(value);
            setAnimState('initial');
            const timer = requestAnimationFrame(() => { setAnimState('settled'); });
            return () => cancelAnimationFrame(timer);
        }
    }, [isRolling, value]);

    const dots: number[][] = [];
    if (displayValue % 2 !== 0) dots.push([1, 1]);
    if (displayValue > 1) { dots.push([0, 0], [2, 2]); }
    if (displayValue > 3) { dots.push([0, 2], [2, 0]); }
    if (displayValue === 6) { dots.push([1, 0], [1, 2]); }

    let style: React.CSSProperties = isRolling 
        ? { left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(1.1) rotate(${Date.now() % 360}deg)`, filter: 'blur(1px)' } 
        : { left: '50%', top: '50%', transform: `translate(calc(-50% + ${animState === 'settled' ? x : 0}px), calc(-50% + ${animState === 'settled' ? y : 0}px)) rotate(${animState === 'settled' ? rotation : (rotation + randomSpinOffset)}deg) scale(${animState === 'settled' ? 1 : 1.4})`, transition: 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' };

    return (
        <div className={`absolute w-10 h-10 bg-amber-50 rounded-md shadow-[4px_6px_10px_rgba(0,0,0,0.5)] border border-stone-300 flex overflow-hidden ${isRolling ? 'animate-pulse' : ''}`} style={style}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-black/5 pointer-events-none" />
             {dots.map(([r, c], i) => {
                 const isAce = displayValue === 1; 
                 return ( <div key={i} className={`absolute ${isAce ? 'bg-red-600' : 'bg-stone-900'} rounded-full ${isAce ? 'w-3.5 h-3.5' : 'w-2 h-2'} shadow-inner`} style={{ top: `${r * 33 + 17}%`, left: `${c * 33 + 17}%`, transform: 'translate(-50%, -50%)' }} /> );
             })}
        </div>
    );
};

const pseudoRandom = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };

export const Board: React.FC<BoardProps> = ({ boardState, players, validMoves, onSelectMove, currentPlayer, turnPhase, onShellClick, selectedSource, lastMove, currentRoll, isRolling, onInvalidMoveAttempt, isNinerMode, isOpeningPaRa }) => {
  const [finishingParticles, setFinishingParticles] = useState<{id: number, x: number, y: number, color: string}[]>([]);
  const [stackingAnim, setStackingAnim] = useState<{ id: number, startX: number, startY: number, endX: number, endY: number, color: string } | null>(null);
  const [shakeShellId, setShakeShellId] = useState<number | null>(null);
  const [blockedFeedback, setBlockedFeedback] = useState<{ shellId: number, message: string, id: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastAnimatedMoveId = useRef<number | null>(null);

  const getPlayerColor = (id: PlayerColor | null): string => { if (!id) return '#666'; const p = players.find(p => p.id === id); return p ? p.colorHex : '#666'; };

  const shells = useMemo(() => {
    const weights = Array.from({ length: TOTAL_SHELLS }, (_, i) => {
        const shell = boardState.get(i + 1);
        const hasNeighbor = (i > 0 && (boardState.get(i)?.stackSize || 0) > 0) || (i < TOTAL_SHELLS - 1 && (boardState.get(i + 2)?.stackSize || 0) > 0);
        return 1.0 + (shell && shell.stackSize > 0 ? 1.8 : (hasNeighbor ? 0.6 : 0));
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let cumulativeWeight = 0;
    return Array.from({ length: TOTAL_SHELLS }, (_, i) => {
      const weight = weights[i];
      const t = (cumulativeWeight + weight / 2) / totalWeight; cumulativeWeight += weight;
      const baseAngle = t * Math.PI * 4.6 + 2.5; const baseRadius = 110 + (t * 270); 
      const angle = baseAngle + (pseudoRandom((i + 1) * 13.5) - 0.5) * 0.12; const radius = baseRadius + (pseudoRandom((i + 1) * 7.2) - 0.5) * 16;
      const x = CENTER_X + radius * Math.cos(angle); const y = CENTER_Y + radius * Math.sin(angle);
      const nextT = Math.min(1, t + 0.01); const nextAngle = nextT * Math.PI * 4.6 + 2.5; const nextRadius = 110 + (nextT * 270);
      const nextX = CENTER_X + nextRadius * Math.cos(nextAngle); const nextY = CENTER_Y + nextRadius * Math.sin(nextAngle);
      return { id: i + 1, x, y, angle: Math.atan2(nextY - y, nextX - x), data: boardState.get(i + 1) };
    });
  }, [boardState]);

  const endBtnPos = useMemo(() => { if (shells.length === 0) return { x: 700, y: 700 }; const last = shells[shells.length - 1]; return { x: last.x + Math.cos(last.angle) * 105, y: last.y + Math.sin(last.angle) * 105 }; }, [shells]);

  useEffect(() => {
    if (lastMove && lastMove.id !== lastAnimatedMoveId.current) {
        lastAnimatedMoveId.current = lastMove.id;
        if (lastMove.type !== MoveResultType.FINISH) {
            let startX = 0, startY = 0, endX = 0, endY = 0;
            if (lastMove.sourceIndex === 0) { startX = 100; startY = 750; } else { const s = shells.find(s => s.id === lastMove.sourceIndex); if (s) { startX = s.x; startY = s.y; } }
            const t = shells.find(s => s.id === lastMove.targetIndex); if (t) { endX = t.x; endY = t.y; }
            if ((startX || startY) && (endX || endY)) {
                const moverId = boardState.get(lastMove.targetIndex)?.owner || currentPlayer;
                setStackingAnim({ id: Date.now(), startX, startY, endX, endY, color: getPlayerColor(moverId) });
                setTimeout(() => setStackingAnim(null), 600);
            }
        } else {
            const s = shells.find(s => s.id === lastMove.sourceIndex);
            if (s) {
                const pColor = getPlayerColor(currentPlayer);
                setFinishingParticles(Array.from({ length: 5 }).map((_, i) => ({ id: Date.now() + i, x: s.x, y: s.y, color: pColor })));
                setTimeout(() => setFinishingParticles([]), 2000);
            }
        }
    }
  }, [lastMove, shells, boardState, currentPlayer, players]);

  const triggerBlockedFeedback = (targetId: number, sourceIdx: number | null) => {
    const targetShell = boardState.get(targetId);
    let msg = "";
    const p1 = players.find(p => p.id === currentPlayer);
    
    if (sourceIdx === null) {
        if (targetShell?.owner && targetShell.owner !== currentPlayer) {
            msg = "SELECT YOUR STACK རང་གི་ལག་ཁྱི་འདོམ།";
        } else return;
    } else {
        let moverSize = 0;
        if (sourceIdx === 0) {
            if (p1?.coinsInHand === COINS_PER_PLAYER) moverSize = isOpeningPaRa ? 3 : 2;
            else moverSize = 1;
        } else {
            moverSize = boardState.get(sourceIdx)?.stackSize || 0;
        }
        if (targetShell) {
            if (targetShell.owner && targetShell.owner !== currentPlayer) {
                if (targetShell.stackSize > moverSize) msg = "TOO LARGE བཀག།";
                else msg = "INVALID DISTANCE ཐག་རིང་ཐུང་མ་འགྲིག།";
            } else if (targetShell.owner === currentPlayer) {
                if (!isNinerMode && targetShell.stackSize + moverSize === 9) msg = "9 LIMIT དགུ་བརྩེགས་མི་ཆོག།";
                else if (targetId !== sourceIdx) msg = "INVALID DISTANCE ཐག་རིང་ཐུང་མ་འགྲིག།";
            } else msg = "INVALID DISTANCE ཐག་རིང་ཐུང་མ་འགྲིག།";
        }
    }
    
    if (msg) {
        setShakeShellId(targetId); 
        setBlockedFeedback({ shellId: targetId, message: msg, id: Date.now() });
        playBlockedSFX();
        setTimeout(() => setShakeShellId(null), 500); 
        setTimeout(() => setBlockedFeedback(null), 1800);
        onInvalidMoveAttempt?.(sourceIdx || 0, targetId);
    }
  };

  const hasFinishMove = validMoves.some(m => m.type === MoveResultType.FINISH);

  return (
    <div className="relative mx-auto select-none rounded-[4rem] overflow-hidden" style={{ width: 800, height: 800, touchAction: 'none' }} ref={boardRef}>
        {/* Subtle Felt Background Texture */}
        <div className="absolute inset-0 bg-[#292524] opacity-90"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }}></div>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shake { 0%, 100% { transform: translate(-50%, -50%) rotate(0deg); } 15% { transform: translate(-65%, -50%) rotate(-12deg); } 30% { transform: translate(-35%, -50%) rotate(12deg); } 45% { transform: translate(-65%, -50%) rotate(-12deg); } 60% { transform: translate(-35%, -50%) rotate(12deg); } 75% { transform: translate(-55%, -50%) rotate(-6deg); } } 
          @keyframes blockedFadeUp { 0% { opacity: 0; transform: translate(-50%, 0); } 15% { opacity: 1; transform: translate(-50%, -45px); } 85% { opacity: 1; transform: translate(-50%, -55px); } 100% { opacity: 0; transform: translate(-50%, -70px); } } 
          @keyframes xMarkFlash { 0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } 30% { opacity: 1; transform: translate(-50%, -50%) scale(1.6); } 70% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); } } 
          @keyframes blockedOutlinePulse { 0% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 1); } 50% { box-shadow: 0 0 0 25px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0); } } 
          @keyframes redBorderPulse { 0%, 100% { border-color: rgba(239, 68, 68, 0.5); } 50% { border-color: rgba(239, 68, 68, 1); border-width: 6px; } }
          @keyframes targetGlowHalo { 0%, 100% { box-shadow: 0 0 10px 2px rgba(245, 158, 11, 0.4); border-color: rgba(245, 158, 11, 0.4); } 50% { box-shadow: 0 0 30px 10px rgba(245, 158, 11, 0.7); border-color: rgba(245, 158, 11, 1); } }
          @keyframes ambientFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
          .animate-shake-target { animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; } 
          .animate-blocked-label { animation: blockedFadeUp 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; } 
          .animate-x-mark { animation: xMarkFlash 0.5s ease-out forwards; } 
          .animate-blocked-outline { animation: blockedOutlinePulse 0.5s ease-out, redBorderPulse 0.5s ease-in-out; }
          .animate-target-glow { animation: targetGlowHalo 1.5s ease-in-out infinite; }
          .animate-float-subtle { animation: ambientFloat 3s ease-in-out infinite; }
        ` }} />

        {/* Central Dice Pad - Leather Texture */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="w-[18rem] h-[18rem] bg-[#1a110e] rounded-full blur-2xl opacity-60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative w-64 h-64 rounded-full shadow-[0_15px_50px_rgba(0,0,0,0.9),inset_0_2px_10px_rgba(255,255,255,0.1)] border-8 border-[#3d2b24] overflow-hidden flex items-center justify-center bg-[#291d1a]">
                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/black-linen-2.png')] mix-blend-overlay"></div>
                <div className="flex flex-col items-center opacity-20 mix-blend-screen pointer-events-none">
                    <span className="font-serif text-amber-900 text-6xl mb-1">ཤོ</span>
                    <span className="font-cinzel text-amber-900 text-5xl font-bold tracking-[0.2em] drop-shadow-2xl">SHO</span>
                </div>
                {(isRolling || currentRoll) && ( 
                    <div className="absolute inset-0 z-20">
                        {isRolling ? ( 
                            <>
                                <div className="absolute left-1/2 top-1/2 -ml-[15px] -mt-[35px]"><BoardDie value={1} x={0} y={0} rotation={0} isRolling={true} /></div>
                                <div className="absolute left-1/2 top-1/2 ml-[15px] mt-[15px]"><BoardDie value={6} x={0} y={0} rotation={0} isRolling={true} /></div>
                            </> 
                        ) : ( 
                            currentRoll && currentRoll.visuals && ( 
                                <>
                                    <BoardDie value={currentRoll.die1} x={currentRoll.visuals.d1x} y={currentRoll.visuals.d1y} rotation={currentRoll.visuals.d1r} isRolling={false} />
                                    <BoardDie value={currentRoll.die2} x={currentRoll.visuals.d2x} y={currentRoll.visuals.d2y} rotation={currentRoll.visuals.d2r} isRolling={false} />
                                </> 
                            ) 
                        )}
                    </div> 
                )}
            </div>
        </div>

        {/* Enhanced Spiral Path Graphics */}
        <svg width="100%" height="100%" className="absolute inset-0 z-0 pointer-events-none">
            <defs>
                <filter id="pathShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
                    <feOffset dx="0" dy="5" result="offsetblur" />
                    <feComponentTransfer><feFuncA type="linear" slope="0.8" /></feComponentTransfer>
                    <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {/* Ambient Shadow Path */}
            <path 
                d={d3.line().curve(d3.curveCatmullRom.alpha(0.6))(shells.map(s => [s.x, s.y])) || ""} 
                fill="none" stroke="#000" strokeWidth="24" strokeLinecap="round" 
                className="opacity-20 blur-md transition-all duration-500" 
            />
            {/* Visual Guide Path */}
            <path 
                d={d3.line().curve(d3.curveCatmullRom.alpha(0.6))(shells.map(s => [s.x, s.y])) || ""} 
                fill="none" stroke="#44403c" strokeWidth="10" strokeLinecap="round" 
                strokeDasharray="1, 15"
                className="opacity-40 transition-all duration-500" 
            />
        </svg>

        {shells.map((shell) => {
            const moveTarget = validMoves.find(m => m.targetIndex === shell.id); 
            const isTarget = !!moveTarget;
            const shellData = boardState.get(shell.id); const stackSize = shellData?.stackSize || 0; const owner = shellData?.owner;
            const isSource = selectedSource === shell.id;
            const isShaking = shakeShellId === shell.id; const hasBlockedMsg = blockedFeedback?.shellId === shell.id;
            
            // Refined offsets for 3D appearance
            const shellOffX = Math.cos(shell.angle) * -14 + Math.cos(shell.angle + Math.PI / 2) * -8; 
            const shellOffY = Math.sin(shell.angle) * -14 + Math.sin(shell.angle + Math.PI / 2) * -8;
            const stackOffX = Math.cos(shell.angle) * 30 + Math.cos(shell.angle + Math.PI / 2) * -12; 
            const stackOffY = Math.sin(shell.angle) * 30 + Math.sin(shell.angle + Math.PI / 2) * -12;
            
            return (
                <div key={shell.id} data-shell-id={shell.id} className={`absolute flex items-center justify-center transition-all duration-300 ease-in-out ${isTarget ? 'z-40 cursor-pointer rounded-full animate-target-glow border-2' : 'z-20'} ${isShaking ? 'animate-blocked-outline rounded-full border-4 border-red-600' : ''}`} style={{ left: shell.x, top: shell.y, width: 48, height: 48, transform: 'translate(-50%, -50%)', touchAction: 'none' }}
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (isTarget && moveTarget) onSelectMove(moveTarget); 
                        else if (owner === currentPlayer) onShellClick?.(shell.id);
                        else if (selectedSource !== null && selectedSource !== undefined && selectedSource !== shell.id) triggerBlockedFeedback(shell.id, selectedSource);
                        else if (selectedSource === null) {
                            if (owner && owner !== currentPlayer) triggerBlockedFeedback(shell.id, null);
                            else onShellClick?.(shell.id);
                        } else onShellClick?.(shell.id);
                    }}
                >
                    <div style={{ transform: `translate(${shellOffX}px, ${shellOffY}px)` }} className={isTarget ? 'animate-float-subtle' : ''}>
                        <CowrieShell angle={shell.angle} isTarget={isTarget} isHovered={isTarget} isBlocked={isShaking} />
                    </div>
                    
                    {isTarget && <div className={`absolute w-20 h-20 rounded-full border-2 border-amber-500/40 animate-ping pointer-events-none`}></div>}
                    {isSource && <div className="absolute w-20 h-20 rounded-full border-4 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)] pointer-events-none animate-pulse"></div>}
                    
                    {isShaking && ( 
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none">
                            <div className="w-24 h-24 rounded-full border-4 border-red-600/60 animate-shake-target flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-16 h-16 text-red-600 animate-x-mark" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                        </div> 
                    )}
                    
                    {hasBlockedMsg && ( 
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap z-[70] pointer-events-none">
                            <span className="bg-red-800 text-white font-cinzel font-bold px-5 py-3 rounded-xl text-xs md:text-sm shadow-2xl border-2 border-red-500/50 animate-blocked-label block text-center shadow-[0_0_40px_rgba(0,0,0,1)]">{blockedFeedback?.message}</span>
                        </div> 
                    )}
                    
                    {stackSize > 0 && owner && (
                        <div className={`absolute z-30 transition-transform ${owner === currentPlayer && turnPhase === GamePhase.MOVING ? 'scale-105' : ''}`} style={{ transform: `translate(${stackOffX}px, ${stackOffY}px)`, touchAction: 'none' }}>
                           {/* Ambient Occlusion Shadow for the whole stack */}
                           <div className="absolute left-1/2 -translate-x-1/2 top-0 w-14 h-14 bg-black/40 rounded-full blur-md -z-10 transform scale-y-50 translate-y-4"></div>
                           
                           {Array.from({ length: Math.min(stackSize, 9) }).map((_, i) => ( 
                               <div key={i} className="absolute left-1/2 -translate-x-1/2 transition-all duration-500" style={{ top: `${-(i * 7)}px`, left: `${Math.sin(i * 0.8) * 4}px`, zIndex: i, transform: `translate(-50%, -50%) rotate(${Math.sin(i * 1.5 + shell.id) * 15}deg)` }}>
                                   <AncientCoin color={getPlayerColor(owner)} isSelected={isSource} />
                               </div> 
                           ))}
                           <div className="absolute left-1/2 -translate-x-1/2 bg-stone-900/95 text-amber-500 text-[12px] md:text-sm font-bold px-3 py-1 rounded-full border border-stone-600 shadow-[0_5px_15px_rgba(0,0,0,0.5)] backdrop-blur-md whitespace-nowrap pointer-events-none flex items-center justify-center font-cinzel" style={{ top: `${-48 - (Math.min(stackSize, 9) * 7)}px`, zIndex: 100, transform: 'translate(-50%, 0)', minWidth: '32px' }}>
                               {stackSize}
                           </div>
                        </div>
                    )}
                </div>
            );
        })}
        
        {stackingAnim && ( 
            <div key={stackingAnim.id} className="absolute z-[100] pointer-events-none animate-coin-arc" style={{ '--start-x': `${stackingAnim.startX}px`, '--start-y': `${stackingAnim.startY}px`, '--end-x': `${stackingAnim.endX}px`, '--end-y': `${stackingAnim.endY}px`, } as React.CSSProperties}>
                <style dangerouslySetInnerHTML={{__html: `@keyframes coinArc { 0% { transform: translate(var(--start-x), var(--start-y)) scale(1); opacity: 0.8; } 50% { transform: translate(calc(var(--start-x) + (var(--end-x) - var(--start-x))/2), calc(var(--start-y) + (var(--end-y) - var(--start-y))/2 - 120px)) scale(1.6); opacity: 1; } 100% { transform: translate(var(--end-x), var(--end-y)) scale(1); opacity: 1; } } .animate-coin-arc { animation: coinArc 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; transform-origin: center center; margin-left: -32px; margin-top: -32px; }` }} />
                <AncientCoin color={stackingAnim.color} isSelected={true} />
            </div> 
        )}
        
        {finishingParticles.map((p, i) => ( 
            <div key={p.id} className="absolute z-50 pointer-events-none animate-finish-float" style={{ left: p.x, top: p.y, animationDelay: `${i * 100}ms` }}>
                <style dangerouslySetInnerHTML={{__html: `@keyframes finishFloat { 0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; } 50% { transform: translate(-50%, -180px) scale(1.8) rotate(180deg); opacity: 0.9; filter: brightness(1.8) gold-glow; } 100% { transform: translate(-50%, -350px) scale(0.3) rotate(360deg); opacity: 0; } } .animate-finish-float { animation: finishFloat 1.8s ease-out forwards; }` }} />
                <div className="drop-shadow-[0_0_20px_rgba(251,191,36,0.9)]"><AncientCoin color={p.color} isSelected={true} /></div>
            </div> 
        ))}

        {/* Improved END target */}
        <div className={`absolute transition-all duration-700 transform -translate-x-1/2 -translate-y-1/2 ${hasFinishMove ? 'opacity-100 cursor-pointer scale-110 z-50' : 'opacity-30 pointer-events-none z-10'}`} style={{ left: endBtnPos.x, top: endBtnPos.y }} onClick={() => { if (hasFinishMove) { const fm = validMoves.find(m => m.type === MoveResultType.FINISH); if (fm) onSelectMove(fm); } }}>
            <div className={`w-28 h-28 border-4 rounded-full flex flex-col items-center justify-center border-dashed transition-all duration-500 ${hasFinishMove ? 'border-amber-500 bg-amber-950/40 animate-target-glow shadow-[0_0_40px_rgba(245,158,11,0.3)]' : 'border-stone-800 bg-stone-900/20'}`}>
                <span className={`font-cinzel font-bold text-lg leading-tight ${hasFinishMove ? 'text-amber-400' : 'text-stone-700'}`}>GOAL</span>
                <span className={`font-serif text-sm leading-tight ${hasFinishMove ? 'text-amber-600' : 'text-stone-800'}`}>མཐའ་མ།</span>
                {hasFinishMove && <div className="absolute -inset-2 rounded-full border-2 border-amber-500/20 animate-ping"></div>}
            </div>
        </div>
    </div>
  );
};
