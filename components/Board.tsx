
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
      
      // Create noise buffer
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

const CowrieShell: React.FC<{ angle: number; isTarget: boolean; isHovered?: boolean; isBlocked?: boolean; isDimmed?: boolean }> = ({ angle, isTarget, isHovered, isBlocked, isDimmed }) => {
  const rotation = (angle * 180 / Math.PI) + 90;
  return (
    <div 
      className={`w-10 h-12 flex items-center justify-center transition-all duration-300 pointer-events-none ${isBlocked ? 'scale-110' : ''} ${isDimmed ? 'opacity-30 saturate-50' : 'opacity-100'}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg viewBox="0 0 100 130" className={`w-full h-full drop-shadow-xl transition-all ${isTarget ? 'filter brightness-150 saturate-150 scale-125 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]' : ''} ${isHovered ? 'filter drop-shadow-[0_0_15px_#fbbf24]' : ''} ${isBlocked ? 'filter saturate-200 brightness-150 sepia-[.8] hue-rotate-[-50deg] drop-shadow-[0_0_15px_rgba(239,68,68,1)]' : ''}`}>
        <defs>
          <radialGradient id="shellBody" cx="40%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#fdfbf7" />
            <stop offset="60%" stopColor="#e7e5e4" />
            <stop offset="100%" stopColor="#a8a29e" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="65" rx="45" ry="60" fill="url(#shellBody)" stroke={isBlocked ? "#ef4444" : (isTarget ? "#fbbf24" : "#78716c")} strokeWidth={isBlocked ? "5" : (isTarget ? "3" : "1.5")} />
        <path d="M50 20 C 40 40, 40 90, 50 110 C 60 90, 60 40, 50 20" fill={isBlocked ? "#b91c1c" : (isTarget ? "#92400e" : "#44403c")} stroke={isBlocked ? "#ef4444" : "#292524"} strokeWidth="1"/>
        <g stroke={isBlocked ? "#fecaca" : "#e7e5e4"} strokeWidth="2" strokeLinecap="round" opacity="0.8">
           <line x1="48" y1="30" x2="42" y2="30" /><line x1="47" y1="45" x2="40" y2="45" /><line x1="47" y1="60" x2="38" y2="60" /><line x1="47" y1="75" x2="40" y2="75" /><line x1="48" y1="90" x2="42" y2="90" />
           <line x1="52" y1="30" x2="58" y2="30" /><line x1="53" y1="45" x2="60" y2="45" /><line x1="53" y1="60" x2="62" y2="60" /><line x1="53" y1="75" x2="60" y2="75" /><line x1="52" y1="90" x2="58" y2="90" />
        </g>
      </svg>
    </div>
  );
};

const AncientCoin: React.FC<{ color: string; isSelected: boolean; opacity?: number }> = ({ color, isSelected, opacity = 1 }) => {
  return (
    <div 
      className={`relative w-16 h-16 rounded-full shadow-[4px_6px_10px_rgba(0,0,0,0.8),inset_0px_2px_4px_rgba(255,255,255,0.2)] border border-white/20 flex items-center justify-center transition-all ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-stone-900 z-50 scale-105' : ''}`}
      style={{ 
        background: `radial-gradient(circle at 35% 35%, ${color}, #000000)`, 
        touchAction: 'none',
        opacity: opacity 
      }}
    >
      <div className="w-11 h-11 rounded-full border-2 border-dashed border-white/30 opacity-60"></div>
      <div className="absolute w-6 h-6 bg-[#1c1917] border border-white/10 shadow-inner transform rotate-45"></div>
      <div className="absolute top-3 left-4 w-7 h-5 bg-white opacity-20 rounded-full blur-[1px] pointer-events-none"></div>
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
    let style: React.CSSProperties = isRolling ? { left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(1.1) rotate(${Date.now() % 360}deg)`, filter: 'blur(1px)' } : { left: '50%', top: '50%', transform: `translate(calc(-50% + ${animState === 'settled' ? x : 0}px), calc(-50% + ${animState === 'settled' ? y : 0}px)) rotate(${animState === 'settled' ? rotation : (rotation + randomSpinOffset)}deg) scale(${animState === 'settled' ? 1 : 1.4})`, transition: 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' };
    return (
        <div className={`absolute w-10 h-10 bg-amber-100 rounded-md shadow-2xl border border-amber-300 flex overflow-hidden ${isRolling ? 'animate-pulse' : ''}`} style={style}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/10 pointer-events-none" /><div className="absolute inset-0 border border-stone-800/10 rounded-md"></div>
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

  const endBtnPos = useMemo(() => { if (shells.length === 0) return { x: 700, y: 700 }; const last = shells[shells.length - 1]; return { x: last.x + Math.cos(last.angle) * 95, y: last.y + Math.sin(last.angle) * 95 }; }, [shells]);

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
            if (p1?.coinsInHand === COINS_PER_PLAYER) {
                moverSize = isOpeningPaRa ? 3 : 2;
            } else {
                moverSize = 1;
            }
        } else {
            moverSize = boardState.get(sourceIdx)?.stackSize || 0;
        }

        if (targetShell) {
            if (targetShell.owner && targetShell.owner !== currentPlayer) {
                if (targetShell.stackSize > moverSize) {
                    msg = "TOO LARGE བཀག།";
                } else {
                    msg = "INVALID DISTANCE ཐག་རིང་ཐུང་མ་འགྲིག།";
                }
            } else if (targetShell.owner === currentPlayer) {
                if (!isNinerMode && targetShell.stackSize + moverSize === 9) {
                    msg = "9 LIMIT དགུ་བརྩེགས་མི་ཆོག།";
                } else if (targetId !== sourceIdx) {
                    msg = "INVALID DISTANCE ཐག་རིང་ཐུང་མ་འགྲིག།";
                }
            } else {
                msg = "INVALID DISTANCE ཐག་རིང་ཐུང་མ་འགྲིག།";
            }
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
  const isAnySourceSelected = selectedSource !== null && selectedSource !== undefined;

  return (
    <div className="relative mx-auto select-none" style={{ width: 800, height: 800, touchAction: 'none' }} ref={boardRef}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shake { 0%, 100% { transform: translate(-50%, -50%) rotate(0deg); } 15% { transform: translate(-65%, -50%) rotate(-12deg); } 30% { transform: translate(-35%, -50%) rotate(12deg); } 45% { transform: translate(-65%, -50%) rotate(-12deg); } 60% { transform: translate(-35%, -50%) rotate(12deg); } 75% { transform: translate(-55%, -50%) rotate(-6deg); } } 
          @keyframes blockedFadeUp { 0% { opacity: 0; transform: translate(-50%, 0); } 15% { opacity: 1; transform: translate(-50%, -45px); } 85% { opacity: 1; transform: translate(-50%, -55px); } 100% { opacity: 0; transform: translate(-50%, -70px); } } 
          @keyframes xMarkFlash { 0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } 30% { opacity: 1; transform: translate(-50%, -50%) scale(1.6); } 70% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); } } 
          @keyframes blockedOutlinePulse { 0% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 1); } 50% { box-shadow: 0 0 0 25px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0); } } 
          @keyframes redBorderPulse { 0%, 100% { border-color: rgba(239, 68, 68, 0.5); } 50% { border-color: rgba(239, 68, 68, 1); border-width: 6px; } }
          @keyframes targetGlowHalo { 0%, 100% { box-shadow: 0 0 10px 2px rgba(245, 158, 11, 0.5); border-color: rgba(245, 158, 11, 0.5); } 50% { box-shadow: 0 0 25px 8px rgba(245, 158, 11, 0.8); border-color: rgba(245, 158, 11, 1); } }
          @keyframes spinSlow { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
          .animate-shake-target { animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; } 
          .animate-blocked-label { animation: blockedFadeUp 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; } 
          .animate-x-mark { animation: xMarkFlash 0.5s ease-out forwards; } 
          .animate-blocked-outline { animation: blockedOutlinePulse 0.5s ease-out, redBorderPulse 0.5s ease-in-out; }
          .animate-target-glow { animation: targetGlowHalo 1.5s ease-in-out infinite; }
          .animate-target-ring { animation: spinSlow 4s linear infinite; }
        ` }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"><div className="w-[16rem] h-[16rem] bg-[#3f2e26] rounded-full blur-md opacity-80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div><div className="relative w-56 h-56 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] border-4 border-[#271c19] overflow-hidden flex items-center justify-center bg-[#291d1a]"><div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] mix-blend-overlay"></div><div className="flex flex-col items-center opacity-40 mix-blend-screen pointer-events-none"><span className="font-serif text-[#8b5e3c] text-4xl mb-1">ཤོ</span><span className="font-cinzel text-[#8b5e3c] text-4xl font-bold tracking-widest drop-shadow-lg">SHO</span></div>{(isRolling || currentRoll) && ( <div className="absolute inset-0 z-20">{isRolling ? ( <><div className="absolute left-1/2 top-1/2 -ml-[15px] -mt-[30px]"><BoardDie value={1} x={0} y={0} rotation={0} isRolling={true} /></div><div className="absolute left-1/2 top-1/2 ml-[15px] mt-[10px]"><BoardDie value={6} x={0} y={0} rotation={0} isRolling={true} /></div></> ) : ( currentRoll && currentRoll.visuals && ( <><BoardDie value={currentRoll.die1} x={currentRoll.visuals.d1x} y={currentRoll.visuals.d1y} rotation={currentRoll.visuals.d1r} isRolling={false} /><BoardDie value={currentRoll.die2} x={currentRoll.visuals.d2x} y={currentRoll.visuals.d2y} rotation={currentRoll.visuals.d2r} isRolling={false} /></> ) )}</div> )}</div></div>
        <svg width="100%" height="100%" className="absolute inset-0 z-0 pointer-events-none"><path d={d3.line().curve(d3.curveCatmullRom.alpha(0.6))(shells.map(s => [s.x, s.y])) || ""} fill="none" stroke="#44403c" strokeWidth="12" strokeLinecap="round" className="opacity-20 blur-sm transition-all duration-500" /></svg>
        {shells.map((shell) => {
            const moveTarget = validMoves.find(m => m.targetIndex === shell.id); 
            const isTarget = !!moveTarget;
            const shellData = boardState.get(shell.id); const stackSize = shellData?.stackSize || 0; const owner = shellData?.owner;
            const isSource = selectedSource === shell.id;
            const isShaking = shakeShellId === shell.id; const hasBlockedMsg = blockedFeedback?.shellId === shell.id;
            const shellOffX = Math.cos(shell.angle) * -12 + Math.cos(shell.angle + Math.PI / 2) * -10; const shellOffY = Math.sin(shell.angle) * -12 + Math.sin(shell.angle + Math.PI / 2) * -10;
            const stackOffX = Math.cos(shell.angle) * 28 + Math.cos(shell.angle + Math.PI / 2) * -10; const stackOffY = Math.sin(shell.angle) * 28 + Math.sin(shell.angle + Math.PI / 2) * -10;
            
            // Dim non-interactive shells when something is selected
            const isDimmed = isAnySourceSelected && !isTarget && !isSource;

            return (
                <div key={shell.id} data-shell-id={shell.id} className={`absolute flex items-center justify-center transition-all duration-300 ease-in-out ${isTarget ? 'z-40 cursor-pointer rounded-full animate-target-glow border-2' : 'z-20'} ${isShaking ? 'animate-blocked-outline rounded-full border-4 border-red-600' : ''}`} style={{ left: shell.x, top: shell.y, width: 44, height: 44, transform: 'translate(-50%, -50%)', touchAction: 'none' }}
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (isTarget && moveTarget) { 
                            onSelectMove(moveTarget); 
                        } else if (owner === currentPlayer) {
                            onShellClick?.(shell.id);
                        } else if (selectedSource !== null && selectedSource !== undefined && selectedSource !== shell.id) {
                            triggerBlockedFeedback(shell.id, selectedSource);
                        } else if (selectedSource === null) {
                            if (owner && owner !== currentPlayer) {
                                triggerBlockedFeedback(shell.id, null);
                            } else {
                                onShellClick?.(shell.id);
                            }
                        } else {
                            onShellClick?.(shell.id);
                        }
                    }}
                >
                    <div style={{ transform: `translate(${shellOffX}px, ${shellOffY}px)` }}><CowrieShell angle={shell.angle} isTarget={isTarget} isHovered={isTarget} isBlocked={isShaking} isDimmed={isDimmed} /></div>
                    
                    {/* Visual Highlights for Target Destination */}
                    {isTarget && (
                      <>
                        <div className="absolute w-16 h-16 rounded-full border-2 border-dashed border-amber-400/60 animate-target-ring pointer-events-none"></div>
                        <div className="absolute w-20 h-20 rounded-full border border-amber-500/30 animate-ping pointer-events-none"></div>
                        <div className="absolute inset-0 bg-amber-400/20 blur-md rounded-full animate-pulse pointer-events-none"></div>
                      </>
                    )}

                    {isSource && <div className="absolute w-18 h-18 rounded-full border-4 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] opacity-80 pointer-events-none animate-pulse"></div>}
                    {isShaking && ( <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none"><div className="w-20 h-20 rounded-full border-4 border-red-600/60 animate-shake-target flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-16 h-16 text-red-600 animate-x-mark" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg></div></div> )}
                    {hasBlockedMsg && ( <div className="absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-[70] pointer-events-none"><span className="bg-red-700 text-white font-cinzel font-bold px-4 py-2 rounded-lg text-[10px] md:text-sm shadow-2xl border-2 border-red-500/50 animate-blocked-label block text-center shadow-[0_0_30px_rgba(0,0,0,0.9)]">{blockedFeedback?.message}</span></div> )}
                    {stackSize > 0 && owner && (
                        <div className={`absolute z-30 transition-all duration-300 ${owner === currentPlayer && turnPhase === GamePhase.MOVING ? 'scale-105' : ''} ${isDimmed ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`} style={{ transform: `translate(${stackOffX}px, ${stackOffY}px)`, touchAction: 'none' }}>
                           {Array.from({ length: Math.min(stackSize, 9) }).map((_, i) => ( <div key={i} className="absolute left-1/2 -translate-x-1/2 transition-all duration-500" style={{ top: `${-(i * 6)}px`, left: `${Math.sin(i * 0.8) * 3}px`, zIndex: i, transform: `translate(-50%, -50%) rotate(${Math.sin(i * 1.5 + shell.id) * 12}deg)` }}><AncientCoin color={getPlayerColor(owner)} isSelected={isSource} /></div> ))}
                           <div className="absolute left-1/2 -translate-x-1/2 bg-stone-900/90 text-white text-[11px] md:text-xs font-bold px-2 py-0.5 rounded-full border border-stone-600 shadow-xl backdrop-blur-md whitespace-nowrap pointer-events-none flex items-center justify-center" style={{ top: `${-42 - (Math.min(stackSize, 9) * 6)}px`, zIndex: 100, transform: 'translate(-50%, 0)', minWidth: '24px' }}>{stackSize}</div>
                        </div>
                    )}
                </div>
            );
        })}
        {stackingAnim && ( <div key={stackingAnim.id} className="absolute z-[60] pointer-events-none animate-coin-arc" style={{ '--start-x': `${stackingAnim.startX}px`, '--start-y': `${stackingAnim.startY}px`, '--end-x': `${stackingAnim.endX}px`, '--end-y': `${stackingAnim.endY}px`, } as React.CSSProperties}><style dangerouslySetInnerHTML={{__html: `@keyframes coinArc { 0% { transform: translate(var(--start-x), var(--start-y)) scale(1); opacity: 0.8; } 50% { transform: translate(calc(var(--start-x) + (var(--end-x) - var(--start-x))/2), calc(var(--start-y) + (var(--end-y) - var(--start-y))/2 - 60px)) scale(1.3); opacity: 1; } 100% { transform: translate(var(--end-x), var(--end-y)) scale(1); opacity: 1; } } .animate-coin-arc { animation: coinArc 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; transform-origin: center center; margin-left: -32px; margin-top: -32px; }` }} /><AncientCoin color={stackingAnim.color} isSelected={true} /></div> )}
        {finishingParticles.map((p, i) => ( <div key={p.id} className="absolute z-50 pointer-events-none animate-finish-float" style={{ left: p.x, top: p.y, animationDelay: `${i * 100}ms` }}><style dangerouslySetInnerHTML={{__html: `@keyframes finishFloat { 0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; } 50% { transform: translate(-50%, -150px) scale(1.5) rotate(180deg); opacity: 0.8; filter: brightness(1.5); } 100% { transform: translate(-50%, -300px) scale(0.5) rotate(360deg); opacity: 0; } } .animate-finish-float { animation: finishFloat 1.5s ease-out forwards; }` }} /><div className="drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]"><AncientCoin color={p.color} isSelected={true} /></div></div> ))}

        <div className={`absolute transition-all duration-500 transform -translate-x-1/2 -translate-y-1/2 ${hasFinishMove ? 'opacity-100 cursor-pointer scale-110 z-50' : isAnySourceSelected ? 'opacity-20 pointer-events-none z-10' : 'opacity-40 pointer-events-none z-10'}`} style={{ left: endBtnPos.x, top: endBtnPos.y }} onClick={() => { if (hasFinishMove) { const fm = validMoves.find(m => m.type === MoveResultType.FINISH); if (fm) onSelectMove(fm); } }}><div className={`w-24 h-24 border-4 rounded-full flex items-center justify-center border-dashed transition-colors ${hasFinishMove ? 'border-amber-500 bg-amber-900/20 animate-target-glow scale-125' : 'border-stone-700'}`}><span className={`font-cinzel font-bold uppercase ${hasFinishMove ? 'text-amber-500' : 'text-stone-600'}`}>END</span></div></div>
    </div>
  );
};
