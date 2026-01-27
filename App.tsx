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

const generatePlayers = (
    p1Settings: { name: string, color: string },
    p2Settings: { name: string, color: string }
): Player[] => {
    return [
        { id: PlayerColor.Red, name: p1Settings.name || 'Player 1', colorHex: p1Settings.color || COLOR_PALETTE[0].hex, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0 },
        { id: PlayerColor.Blue, name: p2Settings.name || 'Player 2', colorHex: p2Settings.color || COLOR_PALETTE[1].hex, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0 }
    ];
};

/**
 * Enhanced Haptic Feedback Engine
 */
const triggerHaptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("Haptics blocked:", e);
    }
  }
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
    const gain = ctx.createGain(); osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, t); osc2.frequency.setValueAtTime(84, t);
    gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
    osc1.start(t); osc2.start(t); osc1.stop(t + 0.4); osc2.stop(t + 0.4);
  },
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
  const [tutorialStep, setTutorialStep] = useState(0);
  const [playerName, setPlayerName] = useState('Player');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex);
  const [showRules, setShowRules] = useState(false);
  const [boardScale, setBoardScale] = useState(0.8);
  const [globalPlayCount, setGlobalPlayCount] = useState<number>(18742);
  const [isCounterPulsing, setIsCounterPulsing] = useState(false);
  const [handShake, setHandShake] = useState(false);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Authentication & Pro State
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);
  const [isProUpgradeOpen, setIsProUpgradeOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '' });

  // Online Multiplayer State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [activeConnections, setActiveConnections] = useState<DataConnection[]>([]);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [targetPeerId, setTargetPeerId] = useState<string>('');
  const [isPeerConnecting, setIsPeerConnecting] = useState(false);
  const [onlineLobbyStatus, setOnlineLobbyStatus] = useState<'IDLE' | 'WAITING' | 'CONNECTED'>('IDLE');
  const [spectatorCount, setSpectatorCount] = useState(0);

  const gameStateRef = useRef({ board, players, turnIndex, phase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa });
  useEffect(() => { 
    gameStateRef.current = { board, players, turnIndex, phase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa }; 
  }, [board, players, turnIndex, phase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa]);

  const addLog = useCallback((msg: string, type: GameLog['type'] = 'info') => { setLogs(prev => [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...prev].slice(50)); }, []);

  const broadcastPacket = useCallback((packet: NetworkPacket) => {
    activeConnections.forEach(conn => {
        if (conn.open) conn.send(packet);
    });
  }, [activeConnections]);

  useEffect(() => { 
    const growth = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 15)); setGlobalPlayCount(prev => prev + growth); 
    const interval = setInterval(() => { if (Math.random() > 0.4) { setGlobalPlayCount(prev => prev + 1); setIsCounterPulsing(true); setTimeout(() => setIsCounterPulsing(false), 2000); } }, 60000);
    return () => clearInterval(interval);
  }, []);

  const initializeGame = useCallback((p1Config: { name: string, color: string }, p2Config: { name: string, color: string }, isTutorial = false) => {
    const newBoard = new Map<number, BoardShell>(); for (let i = 1; i <= TOTAL_SHELLS; i++) newBoard.set(i, { index: i, stackSize: 0, owner: null, isShoMo: false });
    setBoard(newBoard);
    const initialPlayers = generatePlayers(p1Config, p2Config);
    setPlayers(initialPlayers); setTurnIndex(0); setPhase(GamePhase.ROLLING); setLastRoll(null); setIsRolling(false); setPendingMoveValues([]); setPaRaCount(0); setExtraRolls(0); setIsOpeningPaRa(false); setLastMove(null); setTutorialStep(isTutorial ? 1 : 0); setSelectedSourceIndex(null);
    addLog("New game started!", 'info');
  }, [addLog]);

  useEffect(() => {
    const handleResize = () => { if (boardContainerRef.current) { const { width, height } = boardContainerRef.current.getBoundingClientRect(); setBoardScale(Math.max(Math.min((width - 20) / 800, (height - 20) / 800, 1), 0.3)); } };
    window.addEventListener('resize', handleResize); handleResize(); return () => window.removeEventListener('resize', handleResize);
  }, [gameMode]);

  const handleSkipTurn = useCallback((isRemote = false) => {
    const s = gameStateRef.current;
    if (s.gameMode === GameMode.SPECTATOR) return;
    setPendingMoveValues([]);
    setIsOpeningPaRa(false);
    if (!isRemote && (gameMode === GameMode.ONLINE_HOST || gameMode === GameMode.ONLINE_GUEST)) broadcastPacket({ type: 'SKIP_REQ' });
    if (s.extraRolls > 0) {
        setExtraRolls(prev => prev - 1); setPhase(GamePhase.ROLLING);
        addLog(`${players[turnIndex].name} used an extra roll!`, 'info');
    } else {
        setPhase(GamePhase.ROLLING); setTurnIndex((prev) => (prev + 1) % players.length);
        addLog(`${players[turnIndex].name} skipped their turn.`, 'info');
    }
  }, [players, turnIndex, addLog, gameMode, broadcastPacket]);

  const performRoll = async (forcedRoll?: DiceRoll) => {
    const s = gameStateRef.current; 
    if (s.phase !== GamePhase.ROLLING) return;
    if (s.gameMode === GameMode.SPECTATOR) return;

    setIsRolling(true); SFX.playShake();
    triggerHaptic([25, 800, 50]);
    await new Promise(resolve => setTimeout(resolve, 800)); 
    let d1, d2;
    if (forcedRoll) { d1 = forcedRoll.die1; d2 = forcedRoll.die2; }
    else { d1 = Math.floor(Math.random() * 6) + 1; d2 = Math.floor(Math.random() * 6) + 1; }
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) { d1 = 2; d2 = 6; }
    const pos1 = forcedRoll?.visuals ? { x: forcedRoll.visuals.d1x, y: forcedRoll.visuals.d1y, r: forcedRoll.visuals.d1r } : getRandomDicePos();
    let pos2 = forcedRoll?.visuals ? { x: forcedRoll.visuals.d2x, y: forcedRoll.visuals.d2y, r: forcedRoll.visuals.d2r } : getRandomDicePos();
    if (!forcedRoll) {
        let attempts = 0;
        while (Math.sqrt((pos1.x - pos2.x)**2 + (pos1.y - pos2.y)**2) < 45 && attempts < 15) { pos2 = getRandomDicePos(); attempts++; }
    }
    const isPaRa = (d1 === 1 && d2 === 1), total = d1 + d2;
    const newRoll: DiceRoll = { die1: d1, die2: d2, isPaRa, total, visuals: { d1x: pos1.x, d1y: pos1.y, d1r: pos1.r, d2x: pos2.x, d2y: pos2.y, d2r: pos2.r } };
    
    // Broadcast if host or guest player
    if (!forcedRoll && (s.gameMode === GameMode.ONLINE_HOST || s.gameMode === GameMode.ONLINE_GUEST)) {
        broadcastPacket({ type: 'ROLL_REQ', payload: newRoll });
    }

    setLastRoll(newRoll); setIsRolling(false); SFX.playLand();
    if (isPaRa) { 
        SFX.playPaRa(); const newCount = s.paRaCount + 1;
        if (newCount === 3) { addLog(`TRIPLE PA RA! ${players[turnIndex].name} wins instantly!`, 'alert'); setPhase(GamePhase.GAME_OVER); return; }
        setPaRaCount(newCount); addLog(`PA RA (1,1)! Stacked bonuses: ${newCount}. Roll again.`, 'alert'); 
    } else { 
        const isOpening = players[s.turnIndex].coinsInHand === COINS_PER_PLAYER;
        if (s.paRaCount > 0 && isOpening) { setIsOpeningPaRa(true); addLog(`OPENING PA RA! You can place 3 coins!`, 'alert'); }
        const movePool = [...Array(s.paRaCount).fill(2), total];
        setPendingMoveValues(movePool); setPaRaCount(0); setPhase(GamePhase.MOVING); 
    }
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) setTutorialStep(3);
  };

  const performMove = (sourceIdx: number, targetIdx: number, isRemote = false) => {
    const s = gameStateRef.current;
    if (s.gameMode === GameMode.SPECTATOR && !isRemote) return;

    const currentMovesList = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.isNinerMode, s.isOpeningPaRa);
    let move = currentMovesList.find(m => m.sourceIndex === sourceIdx && m.targetIndex === targetIdx);
    
    if (!move && isRemote) {
        const potential = calculatePotentialMoves(sourceIdx, s.pendingMoveValues, s.board, s.players[s.turnIndex], s.isNinerMode, s.isOpeningPaRa);
        move = potential.find(m => m.targetIndex === targetIdx) || { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: [s.pendingMoveValues[0] || 0], type: MoveResultType.PLACE };
    }
    if (!move) return;
    
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
    if (newPlayers[s.turnIndex].coinsFinished >= COINS_PER_PLAYER) { setPhase(GamePhase.GAME_OVER); return; }
    const movesLeft = getAvailableMoves(s.turnIndex, nb, newPlayers, nextMoves, s.isNinerMode, s.isOpeningPaRa);
    if (localExtraRollInc > 0) setExtraRolls(prev => prev + localExtraRollInc);
    if (nextMoves.length === 0 || movesLeft.length === 0) {
        setPendingMoveValues([]); setIsOpeningPaRa(false);
        const totalExtraRolls = s.extraRolls + localExtraRollInc;
        if (totalExtraRolls > 0) { setExtraRolls(prev => prev - 1); setPhase(GamePhase.ROLLING); addLog(`${player.name} used an extra roll!`, 'info'); }
        else { setPhase(GamePhase.ROLLING); setTurnIndex((prev) => (prev + 1) % players.length); }
    } else setPendingMoveValues(nextMoves);
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 3) setTutorialStep(4);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'SIGNUP' && authForm.password !== authForm.confirmPassword) { alert("Passwords do not match!"); return; }
    const name = authForm.email.split('@')[0] || 'User';
    setPlayerName(name); setIsLoggedIn(true); setIsAuthModalOpen(false); setIsSplashVisible(false); setIsLoginGateOpen(false);
    addLog(`Welcome back, ${name}!`, 'info');
  };

  const handleLogout = () => { setIsLoggedIn(false); setPlayerName('Player'); setIsSplashVisible(true); setIsPro(false); addLog(`Logged out successfully.`, 'info'); };

  const handleOnlineClick = () => {
    if (!isLoggedIn) { setIsLoginGateOpen(true); return; }
    if (!isPro) { setIsProUpgradeOpen(true); return; }
    setOnlineLobbyStatus('WAITING');
  };

  const startOnlineHost = () => {
    setOnlineLobbyStatus('WAITING');
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newPeer = new Peer(roomCode, { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } });
    newPeer.on('open', (id) => setMyPeerId(id));
    newPeer.on('connection', (conn) => { 
        setActiveConnections(prev => [...prev, conn]);
        setupPeerEvents(conn, true); 
    });
    newPeer.on('error', (err) => { if (err.type === 'unavailable-id') startOnlineHost(); else { addLog("Network Error: " + err.type, 'alert'); setOnlineLobbyStatus('IDLE'); } });
    setPeer(newPeer);
  };

  const joinOnlineGame = (roomId: string, asSpectator = false) => {
    if (!roomId) return; setIsPeerConnecting(true); const newPeer = new Peer();
    newPeer.on('open', (id) => {
      const conn = newPeer.connect(roomId.toUpperCase().trim(), { reliable: true });
      conn.on('open', () => { 
        setActiveConnections([conn]); 
        setIsPeerConnecting(false); 
        setupPeerEvents(conn, false, asSpectator); 
      });
      conn.on('error', () => { addLog("Failed to connect to room.", 'alert'); setIsPeerConnecting(false); newPeer.destroy(); });
    });
    newPeer.on('error', () => setIsPeerConnecting(false)); setPeer(newPeer);
  };

  const setupPeerEvents = (conn: DataConnection, isHost: boolean, asSpectator = false) => {
    if (!isHost) {
      conn.send({ type: 'SYNC', payload: { playerName, color: selectedColor, isNinerMode, role: asSpectator ? 'spectator' : 'player' } });
    }
    conn.on('data', (data: any) => {
      const packet = data as NetworkPacket;
      switch (packet.type) {
        case 'SYNC':
          if (isHost) {
            if (packet.payload.role === 'spectator') {
                // Just sync state, don't change players
                conn.send({ 
                    type: 'FULL_SYNC', 
                    payload: { 
                        hostInfo: { name: playerName, color: selectedColor }, 
                        guestInfo: players[1], // Current guest
                        board: Array.from(gameStateRef.current.board.entries()),
                        turnIndex: gameStateRef.current.turnIndex,
                        phase: gameStateRef.current.phase,
                        isNinerMode
                    } 
                });
                setSpectatorCount(prev => prev + 1);
            } else {
                // Role is player - handle as guest
                let guestColor = packet.payload.color;
                if (guestColor === selectedColor) guestColor = COLOR_PALETTE.find(c => c.hex !== selectedColor)?.hex || '#3b82f6';
                const guestInfo = { name: packet.payload.playerName, color: guestColor }, hostInfo = { name: playerName, color: selectedColor };
                setGameMode(GameMode.ONLINE_HOST); setOnlineLobbyStatus('CONNECTED'); initializeGame(hostInfo, guestInfo);
                broadcastPacket({ type: 'SYNC', payload: { hostInfo, guestInfo, isNinerMode } });
            }
          } else {
            // Guest syncing
            const { hostInfo, guestInfo, isNinerMode: serverNiner } = packet.payload;
            setIsNinerMode(serverNiner); setGameMode(GameMode.ONLINE_GUEST); setOnlineLobbyStatus('CONNECTED'); initializeGame(hostInfo, guestInfo);
          }
          break;
        case 'FULL_SYNC':
           if (!isHost) {
              const { hostInfo, guestInfo, board: bData, turnIndex: ti, phase: ph, isNinerMode: inm } = packet.payload;
              setIsNinerMode(inm);
              setGameMode(GameMode.SPECTATOR);
              setOnlineLobbyStatus('CONNECTED');
              const initialPlayers = generatePlayers(hostInfo, guestInfo);
              setPlayers(initialPlayers);
              setBoard(new Map(bData));
              setTurnIndex(ti);
              setPhase(ph);
              addLog("Joined as Spectator. ལྟད་མོ་བའི་ཚུལ་དུ་ཞུགས་ཡོད།", 'info');
           }
           break;
        case 'ROLL_REQ': performRoll(packet.payload); if (isHost) broadcastPacket(packet); break;
        case 'MOVE_REQ': performMove(packet.payload.sourceIdx, packet.payload.targetIdx, true); if (isHost) broadcastPacket(packet); break;
        case 'SKIP_REQ': handleSkipTurn(true); if (isHost) broadcastPacket(packet); break;
      }
    });
    conn.on('close', () => { 
        if (isHost) {
            setActiveConnections(prev => prev.filter(c => c !== conn));
            setSpectatorCount(prev => Math.max(0, prev - 1));
        } else {
            addLog("Connection closed.", 'alert'); setOnlineLobbyStatus('IDLE'); setGameMode(null); 
        }
    });
  };

  useEffect(() => { return () => { if (peer) peer.destroy(); }; }, [peer]);

  useEffect(() => {
    if (gameMode === GameMode.AI && turnIndex === 1 && phase !== GamePhase.GAME_OVER && !isRolling) {
      const timer = setTimeout(() => {
        const s = gameStateRef.current;
        if (s.phase === GamePhase.ROLLING) performRoll();
        else if (s.phase === GamePhase.MOVING) {
          const aiMoves = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.isNinerMode, s.isOpeningPaRa);
          if (aiMoves.length > 0) {
            const scores = aiMoves.map(m => {
                let score = m.targetIndex * 10;
                if (m.type === MoveResultType.FINISH) score += 5000;
                if (m.type === MoveResultType.KILL) score += 3000;
                if (m.type === MoveResultType.STACK) score += 500;
                return { move: m, score };
            }).sort((a, b) => b.score - a.score);
            performMove(scores[0].move.sourceIndex, scores[0].move.targetIndex);
          } else handleSkipTurn();
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [turnIndex, phase, gameMode, isRolling, paRaCount, extraRolls, board, pendingMoveValues, isNinerMode, players, handleSkipTurn, isOpeningPaRa]);

  const currentValidMovesList = phase === GamePhase.MOVING ? getAvailableMoves(turnIndex, board, players, pendingMoveValues, isNinerMode, isOpeningPaRa) : [];
  const visualizedMoves = selectedSourceIndex !== null ? currentValidMovesList.filter(m => m.sourceIndex === selectedSourceIndex) : [];
  const shouldHighlightHand = phase === GamePhase.MOVING && (gameMode !== GameMode.AI || turnIndex === 0) && players[turnIndex].coinsInHand > 0;
  
  const isSpectator = gameMode === GameMode.SPECTATOR;

  const isLocalTurn = (() => {
    if (isSpectator) return false;
    if (gameMode === GameMode.ONLINE_HOST) return turnIndex === 0;
    if (gameMode === GameMode.ONLINE_GUEST) return turnIndex === 1;
    if (gameMode === GameMode.AI) return turnIndex === 0;
    return true;
  })();

  const handleFromHandClick = () => {
    if (phase !== GamePhase.MOVING || !isLocalTurn || isSpectator) return;
    const player = players[turnIndex];
    if (player.coinsInHand <= 0) { SFX.playBlocked(); triggerHaptic(100); setHandShake(true); setTimeout(() => setHandShake(false), 400); return; }
    const handMoves = currentValidMovesList.filter(m => m.sourceIndex === 0);
    if (handMoves.length === 0) { SFX.playBlocked(); triggerHaptic(100); setHandShake(true); addLog("BLOCKED!", 'alert'); setTimeout(() => setHandShake(false), 400); return; }
    performMove(0, [...handMoves].sort((a, b) => b.targetIndex - a.targetIndex)[0].targetIndex);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col md:flex-row fixed inset-0 font-sans mobile-landscape-row">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes handBlockedShake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
          .animate-hand-blocked { animation: handBlockedShake 0.4s ease-in-out; border-color: #ef4444 !important; background-color: rgba(127, 29, 29, 0.4) !important; }
          @keyframes turnIndicator { 0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; } 50% { transform: translateY(-8px) scale(1.4); opacity: 1; } }
          .animate-turn-indicator { animation: turnIndicator 1.5s ease-in-out infinite; }
          @keyframes activePulse { 0%, 100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0); } 50% { box-shadow: 0 0 20px 2px rgba(245, 158, 11, 0.3); } }
          .animate-active-pulse { animation: activePulse 2s ease-in-out infinite; }
          @keyframes goldPulse { 0%, 100% { border-color: rgba(251, 191, 36, 0.4); box-shadow: 0 0 5px rgba(251, 191, 36, 0.2); } 50% { border-color: rgba(251, 191, 36, 1); box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); } }
          .animate-gold-pulse { animation: goldPulse 2s ease-in-out infinite; }
          @keyframes spectatorGlow { 0%, 100% { color: #60a5fa; text-shadow: 0 0 5px #3b82f6; } 50% { color: #93c5fd; text-shadow: 0 0 15px #3b82f6; } }
          .animate-spectator-mode { animation: spectatorGlow 3s ease-in-out infinite; }
        `}} />

        {phase === GamePhase.SETUP && gameMode !== null && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 text-amber-500 font-cinzel">Initializing...</div>}
        {gameMode === GameMode.TUTORIAL && <TutorialOverlay step={tutorialStep} onNext={() => setTutorialStep(prev => prev + 1)} onClose={() => { setGameMode(null); setTutorialStep(0); }} />}
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} isNinerMode={isNinerMode} onToggleNinerMode={() => setIsNinerMode(prev => !prev)} />
        
        {/* Auth Modal */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-stone-900 border-2 border-amber-600/50 p-8 rounded-[3rem] w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
              <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-6 right-6 text-stone-500 hover:text-white text-xl">×</button>
              <h2 className="text-3xl font-cinzel text-amber-500 text-center mb-8 font-bold tracking-widest">{authMode === 'LOGIN' ? 'Login' : 'Sign Up'}</h2>
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                <input required type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} className="bg-black/40 border border-stone-800 p-4 rounded-xl text-stone-100 outline-none focus:border-amber-600 transition-colors" placeholder="Email" />
                <input required type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} className="bg-black/40 border border-stone-800 p-4 rounded-xl text-stone-100 outline-none focus:border-amber-600 transition-colors" placeholder="Password" />
                {authMode === 'SIGNUP' && <input required type="password" value={authForm.confirmPassword} onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })} className="bg-black/40 border border-stone-800 p-4 rounded-xl text-stone-100 outline-none focus:border-amber-600 transition-colors" placeholder="Confirm Password" />}
                <button type="submit" className="mt-4 w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl uppercase tracking-widest transition-all shadow-lg active:scale-95">
                  {authMode === 'LOGIN' ? 'Enter Game' : 'Register'}
                </button>
              </form>
              <div className="mt-6 text-center">
                <button onClick={() => setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')} className="text-stone-500 hover:text-amber-500 text-xs font-bold uppercase tracking-widest transition-colors">
                  {authMode === 'LOGIN' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Gate Modal */}
        {isLoginGateOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className="bg-stone-900 border-2 border-amber-600/30 p-8 rounded-[3rem] w-full max-w-sm shadow-[0_0_80px_rgba(0,0,0,0.9)] text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
              <h2 className="text-3xl font-cinzel text-amber-500 mb-6 font-bold tracking-widest">Play Online</h2>
              <p className="text-stone-300 text-sm mb-10 font-serif leading-relaxed px-2">
                Online matches require an account so we can connect players and keep games fair.
              </p>
              <div className="flex flex-col gap-4 mb-8">
                <button 
                  onClick={() => { setAuthMode('LOGIN'); setIsAuthModalOpen(true); setIsLoginGateOpen(false); }} 
                  className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl uppercase tracking-[0.2em] transition-all shadow-lg shadow-amber-900/20 active:scale-95"
                >
                  Log In
                </button>
                <button 
                  onClick={() => { setAuthMode('SIGNUP'); setIsAuthModalOpen(true); setIsLoginGateOpen(false); }} 
                  className="w-full py-4 bg-stone-800 border border-stone-700 hover:border-amber-600 text-stone-200 font-bold rounded-2xl uppercase tracking-[0.2em] transition-all active:scale-95"
                >
                  Create Account
                </button>
                <button onClick={() => setIsLoginGateOpen(false)} className="mt-2 text-stone-500 hover:text-white uppercase text-[11px] tracking-widest font-bold transition-colors">
                  Cancel
                </button>
              </div>
              <div className="pt-6 border-t border-stone-800">
                <p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold">
                  You can play Local or AI without signing in.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pro Upgrade Screen */}
        {isProUpgradeOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in slide-in-from-bottom duration-500">
            <div className="bg-stone-900 border-2 border-amber-600 p-1 rounded-[3.5rem] w-full max-w-md shadow-[0_0_80px_rgba(217,119,6,0.3)]">
              <div className="bg-stone-950/80 p-8 md:p-12 rounded-[3.2rem] h-full flex flex-col items-center">
                <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-[0_0_30px_rgba(217,119,6,0.5)] animate-pulse">⭐</div>
                <h2 className="text-4xl font-cinzel text-white mb-2 font-bold tracking-[0.2em]">PRO ACCESS</h2>
                <div className="h-0.5 w-16 bg-amber-600 mb-6" />
                <p className="text-stone-400 text-center mb-10 text-sm font-serif italic">Unlock the full spiritual journey of Sho.</p>
                
                <ul className="w-full space-y-4 mb-12">
                  {[
                    { icon: '🌐', text: 'Unlimited Online Multiplayer' },
                    { icon: '☁️', text: 'Cloud Progress Sync' },
                    { icon: '💎', text: 'Exclusive Gold Piece Skins' },
                    { icon: '✨', text: 'Ad-Free Experience' }
                  ].map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-4 text-stone-200 font-bold tracking-widest text-[11px] uppercase">
                      <span className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0">{feat.icon}</span>
                      {feat.text}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => { setIsPro(true); setIsProUpgradeOpen(false); setOnlineLobbyStatus('WAITING'); addLog("Upgraded to PRO! Welcome to the elite.", 'alert'); }}
                  className="w-full py-5 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white font-bold rounded-2xl uppercase tracking-[0.3em] shadow-[0_0_25px_rgba(217,119,6,0.4)] animate-gold-pulse"
                >
                  Upgrade Now ($4.99)
                </button>
                <button onClick={() => setIsProUpgradeOpen(false)} className="mt-8 text-stone-500 hover:text-white uppercase text-[10px] tracking-widest font-bold transition-colors">Not Now</button>
              </div>
            </div>
          </div>
        )}

        {!gameMode && (
          <div className="fixed inset-0 z-50 bg-stone-950 text-amber-500 overflow-y-auto flex flex-col items-center justify-between p-6 py-12 md:py-24">
               {isSplashVisible && !isLoggedIn ? (
                 <div className="flex flex-col items-center justify-center w-full max-w-md gap-8 animate-in fade-in duration-700">
                    <div className="flex flex-col items-center text-center">
                        <h1 className="flex items-center gap-6 mb-4 font-cinzel">
                            <span className="text-5xl md:text-7xl text-amber-500 drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]">ཤོ</span>
                            <span className="text-4xl md:text-6xl text-amber-500 tracking-widest drop-shadow-lg">Sho</span>
                        </h1>
                        <div className="h-px w-32 bg-amber-900/40 mb-4" />
                        <p className="text-stone-400 tracking-[0.3em] uppercase text-sm md:text-base font-bold">Traditional Tibetan Dice Game</p>
                    </div>
                    <div className="w-full flex flex-col gap-4 mt-8 px-4">
                        <button onClick={() => setIsSplashVisible(false)} className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl uppercase tracking-[0.2em] shadow-lg transition-all text-sm">Continue as Guest</button>
                        <div className="relative flex items-center py-4"><div className="flex-grow border-t border-stone-800"></div><span className="flex-shrink mx-4 text-stone-600 text-[10px] uppercase font-bold tracking-widest">or</span><div className="flex-grow border-t border-stone-800"></div></div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => { setAuthMode('LOGIN'); setIsAuthModalOpen(true); }} className="py-4 bg-stone-900 border border-stone-800 hover:border-amber-600 text-stone-300 font-bold rounded-2xl uppercase tracking-[0.1em] transition-all text-xs">Login</button>
                            <button onClick={() => { setAuthMode('SIGNUP'); setIsAuthModalOpen(true); }} className="py-4 bg-stone-900 border border-stone-800 hover:border-amber-600 text-stone-300 font-bold rounded-2xl uppercase tracking-[0.1em] transition-all text-xs">Sign Up</button>
                        </div>
                        <p className="text-stone-600 text-[10px] text-center mt-6 leading-relaxed max-w-[200px] mx-auto uppercase tracking-wider font-bold">Login required for online multiplayer and syncing progress.</p>
                    </div>
                 </div>
               ) : (
                 <>
                    <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-[60] bg-gradient-to-b from-stone-950 via-stone-950/80 to-transparent">
                        <div className="flex items-center gap-2">
                            <span className="text-amber-600/60 text-[10px] font-cinzel font-bold tracking-[0.3em] hidden sm:block uppercase">EST. 2024</span>
                            {isPro && <span className="ml-4 bg-amber-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full tracking-widest shadow-[0_0_10px_rgba(217,119,6,0.5)]">PRO MEMBER</span>}
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6">
                            {isLoggedIn && (
                                <div className="flex items-center gap-4">
                                    <span className="text-amber-400 font-cinzel text-xs sm:text-sm tracking-widest">WELCOME, {playerName.toUpperCase()}</span>
                                    <button onClick={handleLogout} className="bg-stone-900/80 border border-stone-700 px-4 py-2 rounded-full text-[10px] uppercase font-bold text-stone-400 hover:text-white hover:border-amber-600 transition-all">Logout</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-center flex-shrink-0 w-full max-w-sm md:max-w-md mt-12 sm:mt-8">
                        <h1 className="flex items-center gap-6 mb-4 font-cinzel">
                            <span className="text-3xl md:text-5xl text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">ཤོ</span>
                            <span className="text-2xl md:text-4xl text-amber-500 tracking-widest drop-shadow-lg">Sho</span>
                        </h1>
                        <div className="h-px w-32 bg-amber-900/40 mb-4" />
                        <p className="text-stone-400 tracking-[0.3em] uppercase text-[12px] md:text-sm text-center font-bold">Traditional Tibetan Dice Game</p>
                    </div>
                    <div className="flex-grow flex flex-col items-center justify-center w-full max-w-md gap-4 md:gap-10 my-8">
                        <div className="w-full bg-stone-900/30 p-6 md:p-8 rounded-[3rem] border border-stone-800/50 backdrop-blur-2xl shadow-2xl">
                            <div className="mb-6">
                                <label className="text-stone-500 text-[10px] uppercase block mb-3 tracking-widest font-bold px-1">Identity</label>
                                <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/40 border-b-2 border-stone-800 focus:border-amber-600 p-3 text-stone-100 outline-none text-center text-xl font-cinzel tracking-wider" maxLength={15} />
                            </div>
                            <div>
                                <label className="text-stone-500 text-[10px] uppercase block mb-4 tracking-widest font-bold px-1">Banner</label>
                                <div className="flex justify-between px-2 gap-2">
                                {COLOR_PALETTE.map((c) => ( 
                                    <button key={c.hex} onClick={() => setSelectedColor(c.hex)} className={`w-8 h-8 rounded-xl transition-all rotate-45 ${selectedColor === c.hex ? 'border-2 border-white scale-110 shadow-[0_0_25px_rgba(255,255,255,0.2)]' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: c.hex }} /> 
                                ))}
                                </div>
                            </div>
                        </div>
                        {onlineLobbyStatus === 'IDLE' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 w-full px-2">
                                <button className="bg-stone-900/40 border-2 border-stone-800/80 p-6 rounded-[2rem] hover:border-amber-600/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-2" onClick={() => { setGameMode(GameMode.LOCAL); initializeGame({name: playerName, color: selectedColor}, {name: 'Opponent', color: COLOR_PALETTE[1].hex}); }}>
                                    <span className="text-2xl">🏔️</span>
                                    <h3 className="text-sm font-bold uppercase font-cinzel tracking-widest text-amber-100 leading-none">Local</h3>
                                </button>
                                <button className="bg-stone-900/40 border-2 border-stone-800/80 p-6 rounded-[2rem] hover:border-amber-600/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-2" onClick={() => { setGameMode(GameMode.AI); initializeGame({name: playerName, color: selectedColor}, {name: 'Sho Bot', color: '#999'}); }}>
                                    <span className="text-2xl">🤖</span>
                                    <h3 className="text-sm font-bold uppercase font-cinzel tracking-widest text-amber-100 leading-none">AI</h3>
                                </button>
                                <button className="col-span-2 md:col-span-1 bg-amber-900/20 border-2 border-amber-800/40 p-6 rounded-[2rem] hover:border-amber-500/80 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 relative overflow-hidden" onClick={handleOnlineClick}>
                                    {!isPro && <span className="absolute top-2 right-2 text-[8px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
                                    <span className="text-2xl">🌐</span>
                                    <h3 className="text-sm font-bold uppercase font-cinzel tracking-widest text-amber-100 leading-none">Online</h3>
                                </button>
                            </div>
                        ) : (
                            <div className="w-full bg-stone-900/50 border-2 border-amber-700/50 p-8 rounded-[3rem] animate-in fade-in zoom-in duration-300">
                                {onlineLobbyStatus === 'WAITING' && (
                                <div className="flex flex-col items-center gap-6">
                                    <h3 className="text-xl font-cinzel mb-2">Room Lobby ཚོམས་ཆེན།</h3>
                                    <div className="flex flex-col gap-4 w-full">
                                        <button className="w-full py-4 bg-amber-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors shadow-lg" onClick={() => { if(!myPeerId) startOnlineHost(); else navigator.clipboard.writeText(myPeerId); }}>
                                            {myPeerId ? `ROOM CODE: ${myPeerId} 📋` : 'Host Game ཁང་བདག'}
                                        </button>
                                        <div className="h-px w-full bg-stone-800" />
                                        <div className="flex flex-col gap-2">
                                        <input type="text" placeholder="ENTER ROOM CODE" value={targetPeerId} onChange={(e) => setTargetPeerId(e.target.value.toUpperCase())} className="bg-black/40 border border-stone-800 p-4 rounded-xl text-center font-cinzel text-lg outline-none focus:border-amber-600" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                className={`py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${targetPeerId.length >= 4 ? 'bg-amber-600 text-white shadow-lg' : 'bg-stone-800 text-stone-500'}`} 
                                                disabled={targetPeerId.length < 4 || isPeerConnecting} 
                                                onClick={() => joinOnlineGame(targetPeerId, false)}
                                            >
                                                {isPeerConnecting ? '...' : 'Play'}
                                            </button>
                                            <button 
                                                className={`py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${targetPeerId.length >= 4 ? 'bg-stone-700 text-amber-500 border border-stone-600' : 'bg-stone-800 text-stone-500'}`} 
                                                disabled={targetPeerId.length < 4 || isPeerConnecting} 
                                                onClick={() => joinOnlineGame(targetPeerId, true)}
                                            >
                                                {isPeerConnecting ? '...' : 'Watch'}
                                            </button>
                                        </div>
                                        </div>
                                    </div>
                                    <button className="text-stone-500 hover:text-white uppercase text-[10px] tracking-widest font-bold" onClick={() => { if(peer) peer.destroy(); setOnlineLobbyStatus('IDLE'); }}>Cancel</button>
                                </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="w-full flex flex-col items-center gap-10 mt-2">
                        <div className="flex gap-16">
                            <button onClick={() => { setGameMode(GameMode.TUTORIAL); initializeGame({name: playerName, color: selectedColor}, {name: 'Guide', color: '#999'}, true); }} className="text-stone-500 hover:text-amber-500 flex flex-col items-center group transition-colors">
                                <span className="font-bold uppercase text-[11px] tracking-widest font-cinzel">Tutorial</span>
                            </button>
                            <button onClick={() => setShowRules(true)} className="text-stone-500 hover:text-amber-500 flex flex-col items-center group transition-colors">
                                <span className="font-bold uppercase text-[11px] tracking-widest font-cinzel">Rules</span>
                            </button>
                        </div>
                        <div className="flex flex-col items-center pb-8">
                            <span className="text-stone-600 text-[10px] uppercase tracking-[0.4em] font-bold">Games Commenced</span>
                            <span className={`text-amber-700/80 font-bold text-4xl tabular-nums transition-all duration-700 mt-2 ${isCounterPulsing ? 'scale-110 text-amber-500' : ''}`}>{globalPlayCount.toLocaleString()}</span>
                        </div>
                    </div>
                 </>
               )}
          </div>
        )}
        {gameMode && (
            <>
                <div className="w-full md:w-1/4 flex flex-col border-b md:border-b-0 md:border-r border-stone-800 bg-stone-950 z-20 shadow-2xl h-[45dvh] md:h-full order-1 overflow-hidden flex-shrink-0 mobile-landscape-sidebar">
                    <div className="p-1.5 md:p-4 flex flex-col gap-0 md:gap-3 flex-shrink-0 bg-stone-950 mobile-landscape-compact-stats">
                        <header className="flex justify-between items-center border-b border-stone-800 pb-1 md:pb-4">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { if (peer) peer.destroy(); setGameMode(null); setOnlineLobbyStatus('IDLE'); }}>
                                <h1 className="text-amber-500 font-cinzel text-[10px] md:text-sm">Sho</h1>
                                {isSpectator && <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest animate-pulse">SPECTATOR</span>}
                            </div>
                            <div className="flex items-center gap-4">
                                {(gameMode === GameMode.ONLINE_HOST || spectatorCount > 0) && (
                                    <div className="flex items-center gap-1.5 bg-stone-800/80 px-2 py-1 rounded-full border border-stone-700">
                                        <span className="text-[10px]">👁️</span>
                                        <span className="text-[9px] font-bold text-stone-400">{spectatorCount}</span>
                                    </div>
                                )}
                                <button onClick={() => setShowRules(true)} className="w-5 h-5 md:w-8 md:h-8 rounded-full border border-stone-600 text-stone-400 flex items-center justify-center text-[10px] md:text-xs">?</button>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 gap-1 md:gap-2 mt-4 md:mt-8 relative px-1">
                            {players.map((p, i) => {
                                const isActive = turnIndex === i;
                                return (
                                    <div key={p.id} className={`relative p-1.5 md:p-3 rounded-xl border transition-all duration-300 ${isActive ? 'bg-stone-800 border-amber-500/50 scale-[1.05] z-10 animate-active-pulse shadow-xl' : 'border-stone-800 opacity-50'}`}>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.colorHex }}></div>
                                            <h3 className="font-bold truncate text-[9px] md:text-[11px] font-serif" style={{ color: p.colorHex }}>{p.name}</h3>
                                        </div>
                                        <div className="flex justify-between text-[11px] md:text-[14px] text-stone-100 font-bold font-cinzel">
                                            <div className="flex flex-col"><span className="text-[7px] text-stone-500">Hand</span><span>{p.coinsInHand}</span></div>
                                            <div className="flex flex-col items-end"><span className="text-[7px] text-stone-500">Done</span><span className="text-amber-500">{p.coinsFinished}</span></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="px-2 md:px-4 pb-1 flex flex-col gap-1 flex-shrink-0 bg-stone-950">
                        {phase === GamePhase.GAME_OVER ? ( 
                            <div className="text-center p-2 bg-stone-800 rounded-xl border border-amber-500 animate-pulse">
                                <h2 className="text-base text-amber-400 font-cinzel">Victory</h2>
                                <button onClick={() => { if(peer) peer.destroy(); setGameMode(null); setOnlineLobbyStatus('IDLE'); }} className="bg-amber-600 text-white px-3 py-1 rounded-full font-bold uppercase text-[8px] mt-1">Exit</button>
                            </div> 
                        ) : ( 
                            <div className={`flex flex-col gap-1 ${isSpectator ? 'opacity-50 pointer-events-none' : ''}`}>
                                <DiceArea currentRoll={lastRoll} onRoll={() => performRoll()} canRoll={(phase === GamePhase.ROLLING) && !isRolling && isLocalTurn} pendingValues={pendingMoveValues} waitingForPaRa={paRaCount > 0} paRaCount={paRaCount} extraRolls={extraRolls} flexiblePool={null} />
                                <div className="flex gap-1">
                                    <div onClick={handleFromHandClick} className={`flex-1 p-2 md:p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${handShake ? 'animate-hand-blocked' : selectedSourceIndex === 0 ? 'border-amber-500 bg-amber-900/40' : (shouldHighlightHand && isLocalTurn) ? 'border-amber-500/80 bg-amber-900/10 animate-pulse' : 'border-stone-800 bg-stone-900/50'}`}>
                                        <span className={`font-bold uppercase font-cinzel text-[11px] md:text-lg`}>From Hand</span>
                                        <span className="text-[11px] text-stone-200 font-serif mt-1 font-bold">({players[turnIndex].coinsInHand})</span>
                                    </div>
                                    {currentValidMovesList.length === 0 && phase === GamePhase.MOVING && !isRolling && paRaCount === 0 && isLocalTurn && ( 
                                        <button onClick={() => handleSkipTurn()} className="flex-1 bg-amber-800/50 hover:bg-amber-700 text-amber-200 border border-amber-600/50 p-1 rounded-xl font-bold flex flex-col items-center justify-center font-cinzel">
                                            <span className="text-[9px]">Skip</span>
                                        </button> 
                                    )}
                                </div>
                                {isSpectator && (
                                    <div className="text-center py-2 animate-spectator-mode">
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Watching Live Match</span>
                                    </div>
                                )}
                            </div> 
                        )}
                    </div>
                </div>
                <div className="flex-grow relative bg-[#1a1715] flex items-center justify-center overflow-hidden order-2 h-[55dvh] md:h-full mobile-landscape-board" ref={boardContainerRef}>
                    <div style={{ transform: `scale(${boardScale})`, width: 800, height: 800 }} className="transition-transform duration-300">
                        <Board 
                            boardState={board} players={players} validMoves={visualizedMoves} onSelectMove={(m) => { if (isLocalTurn) performMove(m.sourceIndex, m.targetIndex); }} 
                            currentPlayer={players[turnIndex].id} turnPhase={phase} onShellClick={(i) => { if (isLocalTurn) { board.get(i)?.owner === players[turnIndex].id ? setSelectedSourceIndex(i) : setSelectedSourceIndex(null) } }} 
                            selectedSource={selectedSourceIndex} lastMove={lastMove} currentRoll={lastRoll} isRolling={isRolling} isNinerMode={isNinerMode} onInvalidMoveAttempt={() => { SFX.playBlocked(); triggerHaptic(100); }} 
                            isOpeningPaRa={isOpeningPaRa}
                        />
                    </div>
                    {isSpectator && (
                        <div className="absolute top-4 right-4 bg-blue-600 px-4 py-2 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2 animate-in fade-in slide-in-from-top duration-700">
                           <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                           <span className="text-white text-xs font-bold uppercase tracking-widest">Live Feed ཐད་གཏོང་།</span>
                        </div>
                    )}
                </div>
            </>
        )}
    </div>
  );
};

export default App;