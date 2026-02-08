
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { 
  Player, PlayerColor, BoardState, GamePhase, 
  DiceRoll, MoveResultType, MoveOption, GameLog, BoardShell, GameMode, NetworkPacket
} from './types';
import { TOTAL_SHELLS, COINS_PER_PLAYER, PLAYERS_CONFIG, COLOR_PALETTE } from './constants';
import { Board } from './components/Board';
import { DiceArea } from './components/DiceArea';
import { RulesModal } from './components/RulesModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { MenuOverlay } from './components/MenuOverlay';
import { VictoryOverlay } from './components/VictoryOverlay';
import { T } from './translations';

const generatePlayers = (
    p1Settings: { name: string, color: string },
    p2Settings: { name: string, color: string }
): Player[] => {
    return [
        { id: PlayerColor.Red, name: p1Settings.name || 'Player 1', colorHex: p1Settings.color || COLOR_PALETTE[0].hex, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0 },
        { id: PlayerColor.Blue, name: p2Settings.name || 'Player 2', colorHex: p2Settings.color || COLOR_PALETTE[1].hex, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0 }
    ];
};

const triggerHaptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("Haptics blocked:", e);
    }
  }
};

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const SFX = {
  ctx: null as AudioContext | null,
  getContext: () => { if (!SFX.ctx) { SFX.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } if (SFX.ctx.state === 'suspended') SFX.ctx.resume(); return SFX.ctx; },
  createNoiseBuffer: (ctx: AudioContext) => { const bufferSize = ctx.sampleRate * 2; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; } return buffer; },
  playShake: () => { const ctx = SFX.getContext(); const t = ctx.currentTime; const noise = ctx.createBufferSource(); noise.buffer = SFX.createNoiseBuffer(ctx); const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 1000; const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(0, t); noiseGain.gain.linearRampToValueAtTime(0.3, t + 0.05); noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3); noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination); noise.start(t); noise.stop(t + 0.35); },
  playLand: () => { const ctx = SFX.getContext(); const t = ctx.currentTime; const osc = ctx.createOscillator(); const thudGain = ctx.createGain(); osc.frequency.setValueAtTime(120, t); osc.frequency.exponentialRampToValueAtTime(30, t + 0.15); thudGain.gain.setValueAtTime(0.8, t); thudGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2); osc.connect(thudGain); thudGain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.2); },
  playCoinClick: (timeOffset = 0, pitch = 1.0) => { const ctx = SFX.getContext(); const t = ctx.currentTime + timeOffset; const carrier = ctx.createOscillator(); carrier.type = 'sine'; carrier.frequency.setValueAtTime(2000 * pitch, t); const modulator = ctx.createOscillator(); modulator.type = 'square'; modulator.frequency.setValueAtTime(320 * pitch, t); const modGain = ctx.createGain(); modGain.gain.setValueAtTime(800, t); modGain.gain.exponentialRampToValueAtTime(1, t + 0.1); modulator.connect(modGain); modulator.connect(carrier.frequency); const mainGain = ctx.createGain(); mainGain.gain.setValueAtTime(0, t); mainGain.gain.linearRampToValueAtTime(0.2, t + 0.01); mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3); carrier.connect(mainGain); mainGain.connect(ctx.destination); carrier.start(t); carrier.stop(t + 0.3); modulator.start(t); modulator.stop(t + 0.3); },
  playStack: () => { SFX.playCoinClick(0, 1.0); SFX.playCoinClick(0.08, 1.1); },
  playKill: () => { SFX.playCoinClick(0, 0.8); SFX.playCoinClick(0.1, 0.9); SFX.playCoinClick(0.25, 0.85); },
  playFinish: () => { SFX.playCoinClick(0, 1.2); SFX.playCoinClick(0.1, 1.5); SFX.playCoinClick(0.2, 2.0); },
  playBlocked: () => { 
    const ctx = SFX.getContext(); const t = ctx.currentTime;
    const osc1 = ctx.createOscillator(); const osc2 = ctx.createOscillator();
    const gain = ctx.createGain(); 
    const noise = ctx.createBufferSource();
    noise.buffer = SFX.createNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(60, t); 
    osc1.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    osc2.frequency.setValueAtTime(63, t);
    osc2.frequency.exponentialRampToValueAtTime(42, t + 0.4);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    noise.connect(filter);
    filter.connect(gain);
    osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
    osc1.start(t); osc2.start(t); noise.start(t);
    osc1.stop(t + 0.6); osc2.stop(t + 0.6); noise.stop(t + 0.6);
  },
  playBlockedSFX: () => { SFX.playBlocked(); },
  playPaRa: () => { SFX.playCoinClick(0, 2.0); SFX.playCoinClick(0.1, 2.2); }
};

const getRandomDicePos = () => { const r = 35 + Math.random() * 45; const theta = Math.random() * Math.PI * 2; return { x: r * Math.cos(theta), y: r * Math.sin(theta), r: Math.random() * 360 }; };

const calculatePotentialMoves = (sourceIdx: number, moveVals: number[], currentBoard: BoardState, player: Player, isNinerMode: boolean, isOpeningPaRa: boolean): MoveOption[] => {
  const options: Map<number, MoveOption> = new Map();
  const evaluateTarget = (dist: number, consumed: number[]): MoveOption | null => {
    const targetIdx = sourceIdx + dist;
    if (targetIdx > TOTAL_SHELLS) return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.FINISH }; 
    const targetShell = currentBoard.get(targetIdx); if (!targetShell) return null;
    let movingStackSize = 0;
    if (sourceIdx === 0) {
        if (player.coinsInHand === COINS_PER_PLAYER) movingStackSize = isOpeningPaRa ? 3 : 2;
        else movingStackSize = 1;
    } else {
        movingStackSize = currentBoard.get(sourceIdx)?.stackSize || 0;
    }
    if (targetShell.owner === player.id) { 
      const rs = targetShell.stackSize + movingStackSize; 
      if (!isNinerMode && rs === 9) return null; 
      return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.STACK }; 
    }
    if (targetShell.owner && targetShell.owner !== player.id) { 
      if (movingStackSize >= targetShell.stackSize) return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.KILL }; 
      return null; 
    }
    return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.PLACE };
  };
  const generateSubsetSums = (index: number, currentSum: number, currentConsumed: number[]) => {
    if (index === moveVals.length) {
      if (currentSum > 0) {
        const result = evaluateTarget(currentSum, [...currentConsumed]);
        if (result) {
          const existing = options.get(result.targetIndex);
          if (!existing || result.consumedValues.length < existing.consumedValues.length) options.set(result.targetIndex, result);
        }
      }
      return;
    }
    generateSubsetSums(index + 1, currentSum + moveVals[index], [...currentConsumed, moveVals[index]]);
    generateSubsetSums(index + 1, currentSum, currentConsumed);
  };
  generateSubsetSums(0, 0, []);
  return Array.from(options.values());
};

const getAvailableMoves = (pIndex: number, pBoard: BoardState, pPlayers: Player[], pVals: number[], isNinerMode: boolean, isOpeningPaRa: boolean) => {
  let moves: MoveOption[] = []; const player = pPlayers[pIndex]; if (!player) return moves;
  if (player.coinsInHand > 0) moves = [...moves, ...calculatePotentialMoves(0, pVals, pBoard, player, isNinerMode, isOpeningPaRa)];
  pBoard.forEach((shell) => { if (shell.owner === player.id && shell.stackSize > 0) moves = [...moves, ...calculatePotentialMoves(shell.index, pVals, pBoard, player, isNinerMode, isOpeningPaRa)]; });
  return moves;
};

const App: React.FC = () => {
  // Game State
  const [players, setPlayers] = useState<Player[]>(PLAYERS_CONFIG);
  const [board, setBoard] = useState<BoardState>(new Map());
  const [turnIndex, setTurnIndex] = useState(0); 
  const [phase, setPhase] = useState<GamePhase>(GamePhase.ROLLING);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [pendingMoveValues, setPendingMoveValues] = useState<number[]>([]);
  const [paRaCount, setPaRaCount] = useState(0); 
  const [extraRolls, setExtraRolls] = useState(0); 
  const [isOpeningPaRa, setIsOpeningPaRa] = useState(false);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<MoveOption | null>(null);
  const [isNinerMode, setIsNinerMode] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // UI State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex);
  const [showRules, setShowRules] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [boardScale, setBoardScale] = useState(0.8);
  const [globalPlayCount, setGlobalPlayCount] = useState<number>(18742);
  const [isCounterPulsing, setIsCounterPulsing] = useState(false);
  const [handShake, setHandShake] = useState(false);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const getSafePlayerName = useCallback(() => {
      const trimmed = `${firstName} ${lastName}`.trim();
      return trimmed.length > 0 ? trimmed : 'Player';
  }, [firstName, lastName]);

  // Auth / Navigation UI State
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);
  const [isProUpgradeOpen, setIsProUpgradeOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' });

  // Networking State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [activeConnections, setActiveConnections] = useState<DataConnection[]>([]);
  const connectionsRef = useRef<DataConnection[]>([]);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [joinId, setJoinId] = useState<string>('');
  const [isPeerConnecting, setIsPeerConnecting] = useState(false);
  const [onlineLobbyStatus, setOnlineLobbyStatus] = useState<'IDLE' | 'WAITING' | 'CONNECTED'>('IDLE');
  const [isMicActive, setIsMicActive] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    connectionsRef.current = activeConnections;
  }, [activeConnections]);

  const gameStateRef = useRef({ board, players, turnIndex, phase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa, lastRoll, winner });
  
  useEffect(() => { 
    gameStateRef.current = { board, players, turnIndex, phase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa, lastRoll, winner }; 
  }, [board, players, turnIndex, phase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa, lastRoll, winner]);

  const addLog = useCallback((msg: string, type: GameLog['type'] = 'info') => { setLogs(prev => [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...prev].slice(50)); }, []);

  const sanitizeSyncPayload = (payload: any) => {
    const p = { ...payload };
    if (p.board instanceof Map) {
      p.board = Object.fromEntries(p.board);
    }
    // Remove gameMode from sync to prevent Guest from overwriting their local Guest mode
    delete p.gameMode;
    return p;
  };

  const broadcastPacket = useCallback((packet: NetworkPacket) => {
    connectionsRef.current.forEach(conn => {
        if (conn.open) {
            const sanitizedPacket = { ...packet };
            if (packet.type === 'FULL_SYNC' && packet.payload) {
                sanitizedPacket.payload = sanitizeSyncPayload(packet.payload);
            }
            conn.send(sanitizedPacket);
        }
    });
  }, []);

  const syncGameState = useCallback(() => {
    const s = gameStateRef.current;
    if (s.gameMode === GameMode.ONLINE_HOST) {
        broadcastPacket({ type: 'FULL_SYNC', payload: s });
    }
  }, [broadcastPacket]);

  useEffect(() => { 
    const growth = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 15)); setGlobalPlayCount(prev => prev + growth); 
    const interval = setInterval(() => { if (Math.random() > 0.4) { setGlobalPlayCount(prev => prev + 1); setIsCounterPulsing(true); setTimeout(() => setIsCounterPulsing(false), 2000); } }, 60000);
    return () => clearInterval(interval);
  }, []);

  const initializeGame = useCallback((p1Config: { name: string, color: string }, p2Config: { name: string, color: string }, isTutorial = false) => {
    const newBoard = new Map<number, BoardShell>(); for (let i = 1; i <= TOTAL_SHELLS; i++) newBoard.set(i, { index: i, stackSize: 0, owner: null, isShoMo: false });
    setBoard(newBoard);
    const initialPlayers = generatePlayers(p1Config, p2Config);
    setPlayers(initialPlayers); setTurnIndex(0); setPhase(GamePhase.ROLLING); setLastRoll(null); setIsRolling(false); setPendingMoveValues([]); setPaRaCount(0); setExtraRolls(0); setIsOpeningPaRa(false); setLastMove(null); setTutorialStep(isTutorial ? 1 : 0); setSelectedSourceIndex(null); setWinner(null);
    addLog("New game started!", 'info');
  }, [addLog]);

  const resetToLobby = useCallback(() => {
    triggerHaptic(20);
    if (peer) peer.destroy();
    setPeer(null);
    setMyPeerId('');
    setActiveConnections([]);
    setGameMode(null);
    setOnlineLobbyStatus('IDLE');
    setTutorialStep(0);
    setPhase(GamePhase.ROLLING);
    setWinner(null);
  }, [peer]);

  useEffect(() => {
    const handleResize = () => { if (boardContainerRef.current) { const { width, height } = boardContainerRef.current.getBoundingClientRect(); setBoardScale(Math.max(Math.min((width - 20) / 800, (height - 20) / 800, 1), 0.3)); } };
    window.addEventListener('resize', handleResize); handleResize(); return () => window.removeEventListener('resize', handleResize);
  }, [gameMode]);

  const handleSkipTurn = useCallback((isRemote = false) => {
    const s = gameStateRef.current;
    setPendingMoveValues([]);
    setIsOpeningPaRa(false);
    
    // Authorization: Only the Host dictates turn advances in Online matches
    if (!isRemote && (gameMode === GameMode.ONLINE_HOST || gameMode === GameMode.ONLINE_GUEST)) {
        broadcastPacket({ type: 'SKIP_REQ' });
    }
    
    // Only advance turn locally if not in Guest mode or if explicitly instructed by Host (isRemote)
    if (gameMode !== GameMode.ONLINE_GUEST || isRemote) {
      if (s.extraRolls > 0) {
          setExtraRolls(prev => prev - 1); setPhase(GamePhase.ROLLING);
          addLog(`${players[turnIndex].name} used an extra roll!`, 'info');
      } else {
          setPhase(GamePhase.ROLLING); setTurnIndex((prev) => (prev + 1) % players.length);
          addLog(`${players[turnIndex].name} skipped their turn.`, 'info');
      }
    }
    
    if (!isRemote && gameMode === GameMode.ONLINE_HOST) {
        setTimeout(syncGameState, 100);
    }
  }, [players, turnIndex, addLog, gameMode, broadcastPacket, syncGameState]);

  const performRoll = useCallback(async (forcedRoll?: DiceRoll) => {
    const s = gameStateRef.current; 
    if (s.phase !== GamePhase.ROLLING) return;
    triggerHaptic(10);
    setIsRolling(true); SFX.playShake();
    triggerHaptic([20, 30, 20]);
    await new Promise(resolve => setTimeout(resolve, 800)); 
    let d1, d2;
    if (forcedRoll) { d1 = forcedRoll.die1; d2 = forcedRoll.die2; }
    else { d1 = Math.floor(Math.random() * 6) + 1; d2 = Math.floor(Math.random() * 6) + 1; }
    
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) { d1 = 3; d2 = 4; }
    
    const pos1 = forcedRoll?.visuals ? { x: forcedRoll.visuals.d1x, y: forcedRoll.visuals.d1y, r: forcedRoll.visuals.d1r } : getRandomDicePos();
    let pos2 = forcedRoll?.visuals ? { x: forcedRoll.visuals.d2x, y: forcedRoll.visuals.d2y, r: forcedRoll.visuals.d2r } : getRandomDicePos();
    if (!forcedRoll) {
        let attempts = 0;
        while (Math.sqrt((pos1.x - pos2.x)**2 + (pos1.y - pos2.y)**2) < 45 && attempts < 15) { pos2 = getRandomDicePos(); attempts++; }
    }
    const isPaRa = (d1 === 1 && d2 === 1), total = d1 + d2;
    const newRoll: DiceRoll = { die1: d1, die2: d2, isPaRa, total, visuals: { d1x: pos1.x, d1y: pos1.y, d1r: pos1.r, d2x: pos2.x, d2y: pos2.y, d2r: pos2.r } };
    
    if (!forcedRoll && (s.gameMode === GameMode.ONLINE_HOST || s.gameMode === GameMode.ONLINE_GUEST)) {
        broadcastPacket({ type: 'ROLL_REQ', payload: newRoll });
    }
    
    setLastRoll(newRoll); setIsRolling(false); SFX.playLand();
    if (isPaRa) { 
        SFX.playPaRa(); const newCount = s.paRaCount + 1;
        if (newCount === 3) { 
            addLog(`TRIPLE PA RA! ${players[turnIndex].name} wins instantly!`, 'alert'); 
            setWinner(players[turnIndex]);
            setPhase(GamePhase.GAME_OVER); 
            if (s.gameMode === GameMode.ONLINE_HOST) setTimeout(syncGameState, 100);
            return; 
        }
        setPaRaCount(newCount); addLog(`PA RA (1,1)! Stacked bonuses: ${newCount}. Roll again.`, 'alert'); 
        triggerHaptic([50, 50, 50]);
    } else { 
        const isOpening = players[s.turnIndex].coinsInHand === COINS_PER_PLAYER;
        if (s.paRaCount > 0 && isOpening) { setIsOpeningPaRa(true); addLog(`OPENING PA RA! You can place 3 coins!`, 'alert'); }
        const movePool = [...Array(s.paRaCount).fill(2), total];
        setPendingMoveValues(movePool); setPaRaCount(0); setPhase(GamePhase.MOVING); 
    }
    
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) setTutorialStep(3);
    if (!forcedRoll && s.gameMode === GameMode.ONLINE_HOST) {
        setTimeout(syncGameState, 200);
    }
  }, [players, turnIndex, addLog, broadcastPacket, syncGameState]);

  const performMove = useCallback((sourceIdx: number, targetIdx: number, isRemote = false) => {
    const s = gameStateRef.current;
    if (!isRemote) triggerHaptic(10);
    const currentMovesList = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.isNinerMode, s.isOpeningPaRa);
    let move = currentMovesList.find(m => m.sourceIndex === sourceIdx && m.targetIndex === targetIdx);
    
    if (!move && isRemote) {
        const potential = calculatePotentialMoves(sourceIdx, s.pendingMoveValues, s.board, s.players[s.turnIndex], s.isNinerMode, s.isOpeningPaRa);
        move = potential.find(m => m.targetIndex === targetIdx);
    }
    
    if (!move) {
        if (!isRemote) SFX.playBlocked();
        return;
    }
    
    if (!isRemote && (s.gameMode === GameMode.ONLINE_HOST || s.gameMode === GameMode.ONLINE_GUEST)) {
        broadcastPacket({ type: 'MOVE_REQ', payload: { sourceIdx, targetIdx } });
    }
    
    const nb: BoardState = new Map(s.board); const player = s.players[s.turnIndex]; let localExtraRollInc = 0; let movingStackSize = 0; let newPlayers = [...s.players];
    if (move.sourceIndex === 0) { 
        const isOpening = newPlayers[s.turnIndex].coinsInHand === COINS_PER_PLAYER; 
        movingStackSize = isOpening ? (s.isOpeningPaRa ? 3 : 2) : 1; 
        newPlayers[s.turnIndex].coinsInHand -= movingStackSize; if (s.isOpeningPaRa) setIsOpeningPaRa(false);
    } else { 
        const source = nb.get(move.sourceIndex)!; movingStackSize = source.stackSize; 
        nb.set(move.sourceIndex, { ...source, stackSize: 0, owner: null, isShoMo: false }); 
    }
    
    if (move.type === MoveResultType.FINISH) { 
        SFX.playFinish(); triggerHaptic([40, 30, 40, 30, 100]);
        newPlayers[s.turnIndex].coinsFinished += movingStackSize; addLog(`${player.name} finished ${movingStackSize} coin(s)!`, 'action');
    } else {
        const target = nb.get(move.targetIndex)!;
        if (move.type === MoveResultType.KILL) { 
            SFX.playKill(); triggerHaptic([70, 50, 70]);
            const eIdx = players.findIndex(p => p.id === target.owner); if (eIdx !== -1) newPlayers[eIdx].coinsInHand += target.stackSize; 
            nb.set(move.targetIndex, { ...target, stackSize: movingStackSize, owner: player.id, isShoMo: false }); localExtraRollInc = 1; 
            addLog(`${player.name} killed a stack and earned an extra roll!`, 'alert');
        } else if (move.type === MoveResultType.STACK) { 
            SFX.playStack(); triggerHaptic(35);
            nb.set(move.targetIndex, { ...target, stackSize: target.stackSize + movingStackSize, owner: player.id, isShoMo: false }); localExtraRollInc = 1; 
            addLog(`${player.name} stacked and earned a bonus turn!`, 'action');
        } else {
            SFX.playCoinClick(); triggerHaptic(15);
            nb.set(move.targetIndex, { ...target, stackSize: movingStackSize, owner: player.id, isShoMo: (move.sourceIndex === 0 && movingStackSize >= 2) });
        }
    }
    
    setPlayers(newPlayers); setBoard(nb); setSelectedSourceIndex(null); setLastMove({ ...move, id: Date.now() });
    
    let nextMoves = [...s.pendingMoveValues]; 
    move.consumedValues.forEach(val => { const idx = nextMoves.indexOf(val); if (idx > -1) nextMoves.splice(idx, 1); });
    
    if (move.type === MoveResultType.PLACE || move.type === MoveResultType.FINISH) {
        nextMoves = [];
    }

    if (newPlayers[s.turnIndex].coinsFinished >= COINS_PER_PLAYER) { 
        setWinner(newPlayers[s.turnIndex]);
        setPhase(GamePhase.GAME_OVER); 
        if (s.gameMode === GameMode.ONLINE_HOST) setTimeout(syncGameState, 100);
        return; 
    }
    
    // AUTHORITATIVE TURN SWITCH: Only Host advances the turnIndex in multi-player matches.
    // Guest waits for FULL_SYNC.
    if (gameMode !== GameMode.ONLINE_GUEST || isRemote) {
        if (nextMoves.length === 0 || getAvailableMoves(s.turnIndex, nb, newPlayers, nextMoves, s.isNinerMode, s.isOpeningPaRa).length === 0) {
            setPendingMoveValues([]); setIsOpeningPaRa(false);
            const totalExtraRolls = s.extraRolls + localExtraRollInc;
            if (totalExtraRolls > 0) { 
                setExtraRolls(prev => prev - 1); 
                setPhase(GamePhase.ROLLING); 
                addLog(`${player.name} used an extra roll!`, 'info'); 
            } else { 
                setPhase(GamePhase.ROLLING); 
                setTurnIndex((prev) => (prev + 1) % players.length); 
            }
        } else {
            setPendingMoveValues(nextMoves);
            if (localExtraRollInc > 0) setExtraRolls(prev => prev + localExtraRollInc);
        }
    } else {
        // Guest mode: update locally but wait for Host's sync to potentially advance turn
        setPendingMoveValues(nextMoves);
    }
    
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 4) setTutorialStep(5);
    if (!isRemote && s.gameMode === GameMode.ONLINE_HOST) {
        setTimeout(syncGameState, 300);
    }
  }, [players, addLog, broadcastPacket, syncGameState, gameMode]);

  const handleNetworkPacket = useCallback((packet: NetworkPacket, senderConn?: DataConnection) => {
    const s = gameStateRef.current;
    switch (packet.type) {
      case 'JOIN_INFO':
        if (s.gameMode === GameMode.ONLINE_HOST || s.gameMode === null || peer) {
          const guestInfo = packet.payload;
          const hostName = getSafePlayerName();
          const hostColor = selectedColor;
          
          // Ensure Unique Colors for Multi-player
          let finalGuestColor = guestInfo.color;
          if (finalGuestColor === hostColor) {
              const alternative = COLOR_PALETTE.find(c => c.hex !== hostColor);
              if (alternative) finalGuestColor = alternative.hex;
          }

          const verifiedPlayers = [
              { id: PlayerColor.Red, name: hostName, colorHex: hostColor, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0 },
              { id: PlayerColor.Blue, name: guestInfo.name, colorHex: finalGuestColor, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0 }
          ];
          setPlayers(verifiedPlayers);
          addLog(`${guestInfo.name} joined! Synchronizing...`, 'alert');
          
          const syncPayload = sanitizeSyncPayload({
            ...s,
            players: verifiedPlayers,
            gameMode: GameMode.ONLINE_HOST
          });

          if (senderConn && senderConn.open) {
            senderConn.send({ type: 'FULL_SYNC', payload: syncPayload });
          }
          broadcastPacket({ type: 'FULL_SYNC', payload: syncPayload });
        }
        break;
      case 'ROLL_REQ':
        performRoll(packet.payload);
        break;
      case 'MOVE_REQ':
        performMove(packet.payload.sourceIdx, packet.payload.targetIdx, true);
        break;
      case 'SKIP_REQ':
        handleSkipTurn(true);
        break;
      case 'FULL_SYNC':
        // GUEST receives state from Host
        if (packet.payload.board) {
            const boardObj = packet.payload.board;
            const entries = Object.entries(boardObj);
            setBoard(new Map(entries.map(([k, v]) => [Number(k), v as any])));
        }
        if (packet.payload.players) setPlayers(packet.payload.players);
        if (packet.payload.turnIndex !== undefined) setTurnIndex(packet.payload.turnIndex);
        if (packet.payload.phase) setPhase(packet.payload.phase);
        if (packet.payload.winner) setWinner(packet.payload.winner);
        if (packet.payload.pendingMoveValues) setPendingMoveValues(packet.payload.pendingMoveValues);
        if (packet.payload.isOpeningPaRa !== undefined) setIsOpeningPaRa(packet.payload.isOpeningPaRa);
        if (packet.payload.lastRoll) setLastRoll(packet.payload.lastRoll);
        if (packet.payload.paRaCount !== undefined) setPaRaCount(packet.payload.paRaCount);
        if (packet.payload.extraRolls !== undefined) setExtraRolls(packet.payload.extraRolls);
        break;
    }
  }, [performRoll, performMove, handleSkipTurn, broadcastPacket, addLog, getSafePlayerName, selectedColor, peer]);

  const packetHandlerRef = useRef(handleNetworkPacket);
  useEffect(() => { packetHandlerRef.current = handleNetworkPacket; }, [handleNetworkPacket]);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(15);
    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
    setFirstName(authForm.firstName);
    setLastName(authForm.lastName);
    addLog(`Welcome back, ${authForm.firstName}!`, 'info');
  };

  const handleLogout = () => {
    triggerHaptic(10);
    setIsLoggedIn(false);
    setIsPro(false);
    setFirstName('');
    setLastName('');
    addLog("Logged out successfully.", 'info');
  };

  const handleOnlineClick = () => {
    triggerHaptic(15);
    if (!isLoggedIn) {
      setIsLoginGateOpen(true);
      return;
    }
    if (!isPro) {
      setIsProUpgradeOpen(true);
      return;
    }
    setOnlineLobbyStatus('WAITING');
  };

  const startOnlineHost = () => {
    const code = generateRoomCode();
    const newPeer = new Peer(code);
    setPeer(newPeer);
    newPeer.on('open', (id) => {
      setMyPeerId(id);
      addLog(`Room ID: ${id}. Waiting for opponent...`, 'info');
    });
    newPeer.on('connection', (conn) => {
      conn.on('data', (data: any) => packetHandlerRef.current(data, conn));
      conn.on('open', () => {
        setActiveConnections(prev => [...prev, conn]);
        setOnlineLobbyStatus('CONNECTED');
        setGameMode(GameMode.ONLINE_HOST);
        initializeGame({ name: getSafePlayerName(), color: selectedColor }, { name: 'Joining...', color: '#666' });
      });
    });
    newPeer.on('error', (err) => {
      console.error(err);
      if (err.type === 'unavailable-id') {
          addLog("Code taken, trying again...", "alert");
          startOnlineHost();
      } else {
          addLog("Peer connection error.", "alert");
      }
    });
  };

  const joinOnlineMatch = (id: string) => {
    if (!id.trim()) return;
    triggerHaptic(15);
    setIsPeerConnecting(true);
    const newPeer = new Peer();
    setPeer(newPeer);
    newPeer.on('open', () => {
        const conn = newPeer.connect(id.trim().toUpperCase());
        conn.on('data', (data: any) => packetHandlerRef.current(data, conn));
        conn.on('open', () => {
            setActiveConnections(prev => [...prev, conn]);
            setOnlineLobbyStatus('CONNECTED');
            setGameMode(GameMode.ONLINE_GUEST);
            conn.send({ 
                type: 'JOIN_INFO', 
                payload: { name: getSafePlayerName(), color: selectedColor } 
            });
            addLog("Connected! Syncing with host...", 'info');
            setIsPeerConnecting(false);
        });
        conn.on('error', (err) => {
            console.error(err);
            addLog("Connection failed.", "alert");
            setIsPeerConnecting(false);
        });
    });
  };

  const toggleMic = async () => {
    triggerHaptic(15);
    if (isMicActive) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      setIsMicActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        localStreamRef.current = stream;
        setIsMicActive(true);
        addLog("Microphone enabled.", "info");
      } catch (err) {
        console.error("Mic access error:", err);
        addLog("Could not access microphone.", "alert");
      }
    }
  };

  const currentValidMovesList = phase === GamePhase.MOVING ? getAvailableMoves(turnIndex, board, players, pendingMoveValues, isNinerMode, isOpeningPaRa) : [];
  const visualizedMoves = selectedSourceIndex !== null ? currentValidMovesList.filter(m => m.sourceIndex === selectedSourceIndex) : [];
  const shouldHighlightHand = phase === GamePhase.MOVING && players[turnIndex].coinsInHand > 0;
  
  const isLocalTurn = (() => {
    if (gameMode === GameMode.ONLINE_HOST) return turnIndex === 0;
    if (gameMode === GameMode.ONLINE_GUEST) return turnIndex === 1;
    return true; 
  })();

  const handleFromHandClick = () => {
    if (phase !== GamePhase.MOVING || !isLocalTurn) return;
    const player = players[turnIndex];
    triggerHaptic(10);
    if (player.coinsInHand <= 0) { 
      SFX.playBlocked(); 
      triggerHaptic(100); 
      setHandShake(true); 
      setTimeout(() => setHandShake(false), 400); 
      return; 
    }
    const handMoves = currentValidMovesList.filter(m => m.sourceIndex === 0);
    if (handMoves.length === 0) { 
      SFX.playBlocked(); 
      triggerHaptic(100); 
      setHandShake(true); 
      addLog("BLOCKED!", 'alert'); 
      setTimeout(() => setHandShake(false), 400); 
      return; 
    }
    performMove(0, [...handMoves].sort((a, b) => b.targetIndex - a.targetIndex)[0].targetIndex);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-stone-900 text-stone-100' : 'bg-stone-100 text-stone-900'} flex flex-col md:flex-row fixed inset-0 font-sans mobile-landscape-row transition-colors duration-500`}>
        {remoteStream && <audio autoPlay ref={el => { if (el) el.srcObject = remoteStream; }} />}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes handBlockedShake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
          .animate-hand-blocked { animation: handBlockedShake 0.4s ease-in-out; border-color: #ef4444 !important; background-color: rgba(127, 29, 29, 0.4) !important; }
          @keyframes turnIndicator { 0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; } 50% { transform: translateY(-8px) scale(1.4); opacity: 1; } }
          .animate-turn-indicator { animation: turnIndicator 1.5s ease-in-out infinite; }
          @keyframes activePulse { 0%, 100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0); } 50% { box-shadow: 0 0 20px 2px rgba(245, 158, 11, 0.3); } }
          .animate-active-pulse { animation: activePulse 2s ease-in-out infinite; }
          @keyframes goldPulse { 0%, 100% { border-color: rgba(251, 191, 36, 0.4); box-shadow: 0 0 5px rgba(251, 191, 36, 0.2); } 50% { border-color: rgba(251, 191, 36, 1); box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); } }
          .animate-gold-pulse { animation: goldPulse 2s ease-in-out infinite; }
          @keyframes micPulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
          .animate-mic-active { animation: micPulse 1.5s ease-in-out infinite; }
          @keyframes colorPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); box-shadow: 0 0 15px currentColor; } }
          .color-swatch-active { animation: colorPulse 1.5s ease-in-out infinite; border-color: white !important; }
        `}} />
        
        {/* Modals */}
        <RulesModal isOpen={showRules} onClose={() => { triggerHaptic(10); setShowRules(false); }} isNinerMode={isNinerMode} onToggleNinerMode={() => { triggerHaptic(15); setIsNinerMode(prev => !prev); }} isDarkMode={isDarkMode} />
        <MenuOverlay isOpen={showMenu} onClose={() => { triggerHaptic(10); setShowMenu(false); }} isNinerMode={isNinerMode} onToggleNinerMode={() => { triggerHaptic(15); setIsNinerMode(prev => !prev); }} isDarkMode={isDarkMode} onToggleTheme={() => { triggerHaptic(15); setIsDarkMode(prev => !prev); }} />
        {phase === GamePhase.GAME_OVER && winner && <VictoryOverlay winner={winner} isDarkMode={isDarkMode} onRestart={resetToLobby} />}
        
        {/* Auth Modals */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`${isDarkMode ? 'bg-stone-900 border-amber-600/50' : 'bg-stone-50 border-amber-800/20'} border-2 p-8 rounded-[3rem] w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] relative`}>
              <button onClick={() => { triggerHaptic(10); setIsAuthModalOpen(false); }} className="absolute top-6 right-6 text-stone-500 hover:text-amber-600 text-xl">×</button>
              <h2 className="text-3xl font-cinzel text-amber-500 text-center mb-8 font-bold tracking-widest">
                {authMode === 'LOGIN' ? T.auth.loginBtn.en : T.auth.signupBtn.en}
                <div className="text-lg font-serif mt-1">{authMode === 'LOGIN' ? T.auth.loginBtn.bo : T.auth.signupBtn.bo}</div>
              </h2>
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <input required type="text" value={authForm.firstName} onChange={(e) => setAuthForm({ ...authForm, firstName: e.target.value })} className={`${isDarkMode ? 'bg-black/40 border-stone-800 text-stone-100' : 'bg-white border-stone-300 text-stone-900'} border p-4 rounded-xl outline-none focus:border-amber-600 transition-colors text-sm`} placeholder={T.auth.firstName.en} />
                    <input required type="text" value={authForm.lastName} onChange={(e) => setAuthForm({ ...authForm, lastName: e.target.value })} className={`${isDarkMode ? 'bg-black/40 border-stone-800 text-stone-100' : 'bg-white border-stone-300 text-stone-900'} border p-4 rounded-xl outline-none focus:border-amber-600 transition-colors text-sm`} placeholder={T.auth.lastName.en} />
                </div>
                <input required type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} className={`${isDarkMode ? 'bg-black/40 border-stone-800 text-stone-100' : 'bg-white border-stone-300 text-stone-900'} border p-4 rounded-xl outline-none focus:border-amber-600 transition-colors text-sm`} placeholder={T.auth.email.en} />
                <input required type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} className={`${isDarkMode ? 'bg-black/40 border-stone-800 text-stone-100' : 'bg-white border-stone-300 text-stone-900'} border p-4 rounded-xl outline-none focus:border-amber-600 transition-colors text-sm`} placeholder={T.auth.password.en} />
                <button type="submit" className="mt-4 w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 flex flex-col items-center">
                  <span className="uppercase tracking-widest">{authMode === 'LOGIN' ? T.auth.enterGame.en : T.auth.register.en}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {isLoginGateOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className={`${isDarkMode ? 'bg-stone-900 border-amber-600/30' : 'bg-white border-stone-300'} border-2 p-8 rounded-[3rem] w-full max-sm shadow-[0_0_80px_rgba(0,0,0,0.9)] text-center relative`}>
              <h2 className="text-3xl font-cinzel text-amber-500 mb-2 font-bold tracking-widest">{T.auth.gateTitle.en}</h2>
              <p className={`${isDarkMode ? 'text-stone-300' : 'text-stone-600'} text-sm mb-8`}>{T.auth.gateDesc.en}</p>
              <button onClick={() => { setIsAuthModalOpen(true); setIsLoginGateOpen(false); }} className="w-full py-4 bg-amber-600 text-white font-bold rounded-2xl mb-4">Login</button>
              <button onClick={() => setIsLoginGateOpen(false)} className="text-stone-500 uppercase text-[11px] font-bold">Cancel</button>
            </div>
          </div>
        )}

        {isProUpgradeOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className={`${isDarkMode ? 'bg-stone-900 border-amber-600' : 'bg-white border-amber-800'} border-2 p-1 rounded-[3.5rem] w-full max-w-md shadow-2xl`}>
              <div className={`${isDarkMode ? 'bg-stone-950/80' : 'bg-stone-50/80'} p-8 rounded-[3.2rem] h-full flex flex-col items-center text-center`}>
                <h2 className="text-4xl font-cinzel text-amber-600 mb-6 font-bold tracking-widest">{T.pro.title.en}</h2>
                <p className="text-stone-400 mb-8 italic">{T.pro.desc.en}</p>
                <button onClick={() => { setIsPro(true); setIsProUpgradeOpen(false); setOnlineLobbyStatus('WAITING'); }} className="w-full py-5 bg-amber-600 text-white font-bold rounded-2xl shadow-xl animate-gold-pulse uppercase tracking-[0.3em]">Upgrade Now</button>
                <button onClick={() => setIsProUpgradeOpen(false)} className="mt-8 text-stone-500 uppercase text-[10px] font-bold tracking-widest">Not Now</button>
              </div>
            </div>
          </div>
        )}

        {/* Lobby & Splash */}
        {!gameMode && (
          <div className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-stone-950 text-amber-500' : 'bg-stone-50 text-amber-800'} flex flex-col items-center justify-center p-6 transition-colors duration-500`}>
              {isSplashVisible && !isLoggedIn ? (
                 <div className="flex flex-col items-center justify-center w-full max-w-md gap-6 animate-in fade-in duration-700 text-center">
                      <h1 className={`font-cinzel ${isDarkMode ? 'text-amber-500' : 'text-amber-900'}`}>
                          <span className="text-5xl md:text-7xl drop-shadow-[0_0_30px_rgba(245,158,11,0.4)] block mb-2">{T.lobby.title.bo}</span>
                          <span className="text-3xl md:text-5xl tracking-widest">{T.lobby.title.en}</span>
                      </h1>
                      <p className={`${isDarkMode ? 'text-stone-400' : 'text-stone-500'} tracking-[0.3em] uppercase text-xs md:text-sm font-bold`}>{T.lobby.subtitle.en}</p>
                      <div className="w-full flex flex-col gap-4 mt-6 px-4">
                          <button onClick={() => { triggerHaptic(15); setIsSplashVisible(false); }} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-lg flex flex-col items-center">
                              <span className="uppercase tracking-[0.1em] text-sm">{T.lobby.guestContinue.en}</span>
                              <span className="font-serif text-sm mt-0.5">{T.lobby.guestContinue.bo}</span>
                          </button>
                          <div className="grid grid-cols-2 gap-4">
                              <button onClick={() => { triggerHaptic(10); setAuthMode('LOGIN'); setIsAuthModalOpen(true); }} className={`py-3 ${isDarkMode ? 'bg-stone-900 border-stone-800 text-stone-300' : 'bg-white border-stone-300 text-stone-700'} border hover:border-amber-600 font-bold rounded-2xl transition-all flex flex-col items-center`}>
                                  <span className="uppercase text-[11px]">{T.lobby.loginSplash.en}</span>
                                  <span className="font-serif text-[12px] mt-0.5">{T.lobby.loginSplash.bo}</span>
                              </button>
                              <button onClick={() => { triggerHaptic(10); setAuthMode('SIGNUP'); setIsAuthModalOpen(true); }} className={`py-3 ${isDarkMode ? 'bg-stone-900 border-stone-800 text-stone-300' : 'bg-white border-stone-300 text-stone-700'} border hover:border-amber-600 font-bold rounded-2xl transition-all flex flex-col items-center`}>
                                  <span className="uppercase text-[11px]">{T.lobby.signupSplash.en}</span>
                                  <span className="font-serif text-[12px] mt-0.5">{T.lobby.signupSplash.bo}</span>
                              </button>
                          </div>
                      </div>
                 </div>
              ) : (
                 <div className="flex-grow flex flex-col items-center justify-center w-full max-w-md gap-6">
                    <div className={`w-full ${isDarkMode ? 'bg-stone-900/30' : 'bg-white/80'} p-5 md:p-8 rounded-[3rem] border border-stone-800/20 backdrop-blur-2xl shadow-2xl`}>
                        <div className="mb-6">
                            <label className="text-stone-500 text-[10px] uppercase block mb-3 tracking-widest font-bold px-1 text-center">Your Name</label>
                            <input type="text" value={firstName} placeholder="PLAYER" onChange={(e) => setFirstName(e.target.value)} className={`w-full bg-transparent border-b-2 ${firstName.trim() ? 'border-amber-600' : 'border-stone-800/30'} focus:border-amber-500 p-3 outline-none text-center text-xl font-cinzel tracking-widest transition-all ${isDarkMode ? 'text-stone-100' : 'text-stone-900'}`} maxLength={20} />
                        </div>
                        <div className="flex flex-col items-center">
                            <label className="text-stone-500 text-[10px] uppercase block mb-4 tracking-widest font-bold px-1 text-center">Choose Your Color</label>
                            <div className="flex gap-4">
                                {COLOR_PALETTE.map(color => (
                                    <button 
                                        key={color.id} 
                                        onClick={() => { triggerHaptic(10); setSelectedColor(color.hex); }}
                                        className={`w-10 h-10 rounded-full border-4 transition-all shadow-lg ${selectedColor === color.hex ? 'color-swatch-active scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: color.hex, color: color.hex }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    {onlineLobbyStatus === 'IDLE' ? (
                        <div className="grid grid-cols-2 gap-3 w-full px-2">
                            <button className={`border-2 ${isDarkMode ? 'bg-stone-900/40 border-stone-800/80' : 'bg-white border-stone-200'} p-6 rounded-[2rem] hover:border-amber-600/50 transition-all flex flex-col items-center justify-center gap-2`} onClick={() => { triggerHaptic(20); setGameMode(GameMode.LOCAL); initializeGame({name: getSafePlayerName(), color: selectedColor}, {name: 'Player 2', color: COLOR_PALETTE.find(c => c.hex !== selectedColor)?.hex || '#999'}); }}>
                                <span className="text-2xl">👤</span>
                                <h3 className={`text-xs md:text-sm font-bold uppercase font-cinzel tracking-widest`}>Single-Player</h3>
                            </button>
                            <button className={`border-2 ${isDarkMode ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'} p-6 rounded-[2rem] hover:border-amber-500/80 transition-all flex flex-col items-center justify-center gap-2 relative`} onClick={handleOnlineClick}>
                                {!isPro && <span className="absolute top-2 right-2 text-[8px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
                                <span className="text-2xl">🌐</span>
                                <h3 className={`text-xs md:text-sm font-bold uppercase font-cinzel tracking-widest`}>Multi-Player</h3>
                            </button>
                        </div>
                    ) : (
                        <div className={`w-full ${isDarkMode ? 'bg-stone-900/50' : 'bg-white'} border-2 border-amber-700/50 p-6 rounded-[3rem] animate-in fade-in zoom-in duration-300`}>
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-full flex flex-col gap-4">
                                    <button className="w-full py-4 bg-amber-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors shadow-lg" onClick={() => { triggerHaptic(20); if(!myPeerId) startOnlineHost(); else { navigator.clipboard.writeText(myPeerId); addLog("Copied Code!", "info"); } }}>
                                        {myPeerId ? `Code: ${myPeerId}` : "Generate Room Code"}
                                    </button>
                                    <input type="text" value={joinId} onChange={(e) => setJoinId(e.target.value.toUpperCase())} placeholder="6-DIGIT CODE" className={`w-full bg-stone-950/40 border-2 border-stone-800 p-3 rounded-xl text-center text-xl font-cinzel tracking-[0.3em] outline-none focus:border-amber-600 transition-colors ${isDarkMode ? 'text-white' : 'text-stone-900'}`} maxLength={6} />
                                    <button disabled={isPeerConnecting || joinId.length < 6} className="w-full py-4 bg-amber-700 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-amber-600 transition-colors shadow-lg" onClick={() => joinOnlineMatch(joinId)}>
                                        {isPeerConnecting ? "Connecting..." : "Join Match"}
                                    </button>
                                </div>
                                <button className="text-stone-500 hover:text-white uppercase text-[10px] tracking-widest font-bold" onClick={() => { if(peer) peer.destroy(); setOnlineLobbyStatus('IDLE'); setMyPeerId(''); setJoinId(''); }}>Cancel</button>
                            </div>
                        </div>
                    )}
                 </div>
              )}
          </div>
        )}

        {/* Game Layout */}
        {gameMode && (
            <div className={`w-full min-h-screen flex flex-col md:flex-row fixed inset-0 font-sans mobile-landscape-row`}>
                <div className={`w-full md:w-1/4 flex flex-col border-b md:border-b-0 md:border-r ${isDarkMode ? 'border-stone-800 bg-stone-950' : 'border-stone-200 bg-white'} z-20 shadow-2xl h-[45dvh] md:h-full order-1 overflow-hidden transition-colors duration-500`}>
                    <div className="p-4 flex flex-col gap-3 flex-shrink-0">
                        <header className="flex justify-between items-center border-b border-stone-800 pb-4">
                            <h1 className="font-cinzel text-sm text-amber-500 cursor-pointer" onClick={resetToLobby}>Sho</h1>
                            <div className="flex items-center gap-4">
                                {(gameMode === GameMode.ONLINE_HOST || gameMode === GameMode.ONLINE_GUEST) && (
                                    <button onClick={toggleMic} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isMicActive ? 'bg-red-600' : 'bg-stone-800'}`}>
                                        <span className={isMicActive ? 'animate-mic-active' : ''}>{isMicActive ? '🎙️' : '🔇'}</span>
                                    </button>
                                )}
                                <button onClick={() => setShowMenu(true)} className="p-2 bg-stone-800 rounded-lg">☰</button>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 gap-2 mt-4 relative">
                            {players.map((p, i) => {
                                const isActive = turnIndex === i;
                                return (
                                    <div key={p.id} className={`p-3 rounded-xl border transition-all ${isActive ? 'bg-stone-800 border-amber-500 animate-active-pulse scale-105' : 'border-stone-800 opacity-50'}`}>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.colorHex }}></div>
                                            <h3 className="font-bold truncate text-[10px]" style={{ color: p.colorHex }}>{p.name}</h3>
                                        </div>
                                        <div className="flex justify-between text-[12px] font-bold">
                                            <span>{p.coinsInHand}</span>
                                            <span className="text-amber-500">{p.coinsFinished}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="px-4 pb-4 flex flex-col gap-1 mt-auto">
                        {phase !== GamePhase.GAME_OVER && (
                            <div className="flex flex-col gap-2">
                                <DiceArea currentRoll={lastRoll} onRoll={() => performRoll()} canRoll={(phase === GamePhase.ROLLING) && !isRolling && isLocalTurn} pendingValues={pendingMoveValues} waitingForPaRa={paRaCount > 0} paRaCount={paRaCount} extraRolls={extraRolls} flexiblePool={null} />
                                <div className="flex gap-2">
                                    <div onClick={handleFromHandClick} className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${handShake ? 'animate-hand-blocked' : (shouldHighlightHand && isLocalTurn) ? 'border-amber-500 bg-amber-900/10 animate-pulse' : 'border-stone-800 bg-stone-900/50'}`}>
                                        <span className="font-bold uppercase text-[11px] font-cinzel">{T.game.fromHand.en}</span>
                                        <span className="text-[11px] font-serif text-amber-500">{T.game.fromHand.bo}</span>
                                        <span className="text-[11px] font-cinzel mt-1">({players[turnIndex].coinsInHand})</span>
                                    </div>
                                    {currentValidMovesList.length === 0 && phase === GamePhase.MOVING && !isRolling && isLocalTurn && (
                                        <button onClick={() => handleSkipTurn()} className="flex-1 bg-amber-800/50 hover:bg-amber-700 text-amber-200 border border-amber-600/50 p-2 rounded-xl font-bold uppercase text-[9px] font-cinzel">
                                            {T.game.skipTurn.en}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className={`flex-grow relative ${isDarkMode ? 'bg-[#1a1715]' : 'bg-[#fcfaf9]'} flex items-center justify-center overflow-hidden order-2 h-[55dvh] md:h-full mobile-landscape-board`} ref={boardContainerRef}>
                    <div style={{ transform: `scale(${boardScale})`, width: 800, height: 800 }}>
                        <Board 
                            boardState={board} players={players} validMoves={visualizedMoves} onSelectMove={(m) => { if (isLocalTurn) performMove(m.sourceIndex, m.targetIndex); }} 
                            currentPlayer={players[turnIndex].id} turnPhase={phase} onShellClick={(i) => { if (isLocalTurn) { board.get(i)?.owner === players[turnIndex].id ? setSelectedSourceIndex(i) : setSelectedSourceIndex(null) } }} 
                            selectedSource={selectedSourceIndex} lastMove={lastMove} currentRoll={lastRoll} isRolling={isRolling} isNinerMode={isNinerMode} onInvalidMoveAttempt={() => { SFX.playBlocked(); triggerHaptic(100); }} 
                            isOpeningPaRa={isOpeningPaRa}
                        />
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default App;
