
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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous 0, O, 1, I
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [winner, setWinner] = useState<Player | null>(null);
  
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

  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);
  const [isProUpgradeOpen, setIsProUpgradeOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' });

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

  const broadcastPacket = useCallback((packet: NetworkPacket) => {
    connectionsRef.current.forEach(conn => {
        if (conn.open) conn.send(packet);
    });
  }, []);

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
    if (!isRemote && (gameMode === GameMode.ONLINE_HOST || gameMode === GameMode.ONLINE_GUEST)) broadcastPacket({ type: 'SKIP_REQ' });
    if (s.extraRolls > 0) {
        setExtraRolls(prev => prev - 1); setPhase(GamePhase.ROLLING);
        addLog(`${players[turnIndex].name} used an extra roll!`, 'info');
    } else {
        setPhase(GamePhase.ROLLING); setTurnIndex((prev) => (prev + 1) % players.length);
        addLog(`${players[turnIndex].name} skipped their turn.`, 'info');
    }
  }, [players, turnIndex, addLog, gameMode, broadcastPacket]);

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
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) { d1 = 2; d2 = 6; }
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
            return; 
        }
        setPaRaCount(newCount); addLog(`PA RA (1,1)! Stacked bonuses: ${newCount}. Roll again.`, 'alert'); 
        triggerHaptic([50, 50, 50]);
    } else { 
        const isOpening = players[s.turnIndex].coinsInHand === COINS_PER_PLAYER;
        if (s.paRaCount > 0 && isOpening) { setIsOpeningPaRa(true); addLog(`OPENING PA RA! You can place 3 coins!`, 'alert'); }
        // Each Pa Ra contributes exactly one '2' to the movement pool as a bonus roll value.
        const movePool = [...Array(s.paRaCount).fill(2), total];
        setPendingMoveValues(movePool); setPaRaCount(0); setPhase(GamePhase.MOVING); 
    }
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) setTutorialStep(3);
  }, [players, turnIndex, addLog, broadcastPacket]);

  const performMove = useCallback((sourceIdx: number, targetIdx: number, isRemote = false) => {
    const s = gameStateRef.current;
    if (!isRemote) triggerHaptic(10);
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
    if (newPlayers[s.turnIndex].coinsFinished >= COINS_PER_PLAYER) { 
        setWinner(newPlayers[s.turnIndex]);
        setPhase(GamePhase.GAME_OVER); 
        return; 
    }
    const movesLeft = getAvailableMoves(s.turnIndex, nb, newPlayers, nextMoves, s.isNinerMode, s.isOpeningPaRa);
    if (localExtraRollInc > 0) setExtraRolls(prev => prev + localExtraRollInc);
    if (nextMoves.length === 0 || movesLeft.length === 0) {
        setPendingMoveValues([]); setIsOpeningPaRa(false);
        const totalExtraRolls = s.extraRolls + localExtraRollInc;
        if (totalExtraRolls > 0) { setExtraRolls(prev => prev - 1); setPhase(GamePhase.ROLLING); addLog(`${player.name} used an extra roll!`, 'info'); }
        else { setPhase(GamePhase.ROLLING); setTurnIndex((prev) => (prev + 1) % players.length); }
    } else setPendingMoveValues(nextMoves);
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 3) setTutorialStep(4);
  }, [players, addLog, broadcastPacket]);

  const handleNetworkPacket = useCallback((packet: NetworkPacket) => {
    const s = gameStateRef.current;
    switch (packet.type) {
      case 'JOIN_INFO':
        if (s.gameMode === GameMode.ONLINE_HOST) {
          const guestInfo = packet.payload;
          const hostName = getSafePlayerName();
          const hostColor = selectedColor;
          
          setPlayers(prev => {
              const updatedPlayers = [
                  { ...prev[0], name: hostName, colorHex: hostColor },
                  { ...prev[1], name: guestInfo.name, colorHex: guestInfo.color }
              ];
              
              // Immediate broadcast of full sync with final player details
              setTimeout(() => {
                  broadcastPacket({ 
                      type: 'FULL_SYNC', 
                      payload: { 
                          ...gameStateRef.current, 
                          players: updatedPlayers 
                      } 
                  });
              }, 100);
              
              return updatedPlayers;
          });
          addLog(`${guestInfo.name} joined the match.`, 'alert');
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
        if (packet.payload.board) setBoard(new Map(Object.entries(packet.payload.board).map(([k, v]) => [Number(k), v as any])));
        if (packet.payload.players) setPlayers(packet.payload.players);
        if (packet.payload.turnIndex !== undefined) setTurnIndex(packet.payload.turnIndex);
        if (packet.payload.phase) setPhase(packet.payload.phase);
        if (packet.payload.winner) setWinner(packet.payload.winner);
        if (packet.payload.pendingMoveValues) setPendingMoveValues(packet.payload.pendingMoveValues);
        if (packet.payload.isOpeningPaRa !== undefined) setIsOpeningPaRa(packet.payload.isOpeningPaRa);
        break;
    }
  }, [performRoll, performMove, handleSkipTurn, broadcastPacket, addLog, getSafePlayerName, selectedColor]);

  // Use a Ref to provide the latest handleNetworkPacket to connection listeners
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
      conn.on('open', () => {
        setActiveConnections(prev => [...prev, conn]);
        setOnlineLobbyStatus('CONNECTED');
        setGameMode(GameMode.ONLINE_HOST);
        // Host initializes with their own known identity
        initializeGame({ name: getSafePlayerName(), color: selectedColor }, { name: 'Joining...', color: '#666' });
        addLog("Opponent connecting...", 'info');
      });
      conn.on('data', (data: any) => packetHandlerRef.current(data));
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
        conn.on('open', () => {
            setActiveConnections(prev => [...prev, conn]);
            setOnlineLobbyStatus('CONNECTED');
            setGameMode(GameMode.ONLINE_GUEST);
            // Shake hands immediately with identity details
            conn.send({ 
                type: 'JOIN_INFO', 
                payload: { name: getSafePlayerName(), color: selectedColor } 
            });
            addLog("Connected! Syncing identities...", 'info');
            setIsPeerConnecting(false);
        });
        conn.on('data', (data: any) => packetHandlerRef.current(data));
        conn.on('error', (err) => {
            console.error(err);
            addLog("Connection failed.", "alert");
            setIsPeerConnecting(false);
        });
    });
  };

  const handleTutorialNext = () => {
    setTutorialStep(prev => prev + 1);
    triggerHaptic(10);
  };
  const handleTutorialClose = () => {
    setTutorialStep(0);
    setGameMode(null);
    triggerHaptic(10);
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
        `}} />
        {phase === GamePhase.SETUP && gameMode !== null && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 text-amber-500 font-cinzel text-xl animate-pulse">Initializing འགོ་འཛུགས་བཞིན་པ...</div>}
        <RulesModal isOpen={showRules} onClose={() => { triggerHaptic(10); setShowRules(false); }} isNinerMode={isNinerMode} onToggleNinerMode={() => { triggerHaptic(15); setIsNinerMode(prev => !prev); }} isDarkMode={isDarkMode} />
        <MenuOverlay 
          isOpen={showMenu} 
          onClose={() => { triggerHaptic(10); setShowMenu(false); }} 
          isNinerMode={isNinerMode}
          onToggleNinerMode={() => { triggerHaptic(15); setIsNinerMode(prev => !prev); }}
          isDarkMode={isDarkMode}
          onToggleTheme={() => { triggerHaptic(15); setIsDarkMode(prev => !prev); }}
        />
        {phase === GamePhase.GAME_OVER && winner && (
          <VictoryOverlay 
            winner={winner} 
            isDarkMode={isDarkMode} 
            onRestart={resetToLobby} 
          />
        )}
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
                    <div className="flex flex-col gap-1">
                      <input required type="text" value={authForm.firstName} onChange={(e) => setAuthForm({ ...authForm, firstName: e.target.value })} className={`${isDarkMode ? 'bg-black/40 border-stone-800 text-stone-100' : 'bg-white border-stone-300 text-stone-900'} border p-4 rounded-xl outline-none focus:border-amber-600 transition-colors text-sm`} placeholder={T.auth.firstName.en} />
                      <span className="text-[9px] text-stone-600 font-serif ml-2">{T.auth.firstName.bo}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <input required type="text" value={authForm.lastName} onChange={(e) => setAuthForm({ ...authForm, lastName: e.target.value })} className={`${isDarkMode ? 'bg-black/40 border-stone-800 text-stone-100' : 'bg-white border-stone-300 text-stone-900'} border p-4 rounded-xl outline-none focus:border-amber-600 transition-colors text-sm`} placeholder={T.auth.lastName.en} />
                      <span className="text-[9px] text-stone-600 font-serif ml-2">{T.auth.lastName.bo}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                  <input required type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} className={`${isDarkMode ? 'bg-black/40 border-stone-800 text-stone-100' : 'bg-white border-stone-300 text-stone-900'} border p-4 rounded-xl outline-none focus:border-amber-600 transition-colors text-sm`} placeholder={T.auth.email.en} />
                  <span className="text-[9px] text-stone-600 font-serif ml-2">{T.auth.email.bo}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <input required type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} className={`${isDarkMode ? 'bg-black/40 border-stone-800 text-stone-100' : 'bg-white border-stone-300 text-stone-900'} border p-4 rounded-xl outline-none focus:border-amber-600 transition-colors text-sm`} placeholder={T.auth.password.en} />
                  <span className="text-[9px] text-stone-600 font-serif ml-2">{T.auth.password.bo}</span>
                </div>
                {authMode === 'SIGNUP' && (
                  <div className="flex flex-col gap-1">
                    <input required type="password" value={authForm.confirmPassword} onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })} className={`${isDarkMode ? 'bg-black/40 border-stone-800 text-stone-100' : 'bg-white border-stone-300 text-stone-900'} border p-4 rounded-xl outline-none focus:border-amber-600 transition-colors text-sm`} placeholder={T.auth.confirmPassword.en} />
                    <span className="text-[9px] text-stone-600 font-serif ml-2">{T.auth.confirmPassword.bo}</span>
                  </div>
                )}
                <button type="submit" className="mt-4 w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 flex flex-col items-center">
                  <span className="uppercase tracking-widest">{authMode === 'LOGIN' ? T.auth.enterGame.en : T.auth.register.en}</span>
                  <span className="font-serif text-sm mt-0.5">{authMode === 'LOGIN' ? T.auth.enterGame.bo : T.auth.register.bo}</span>
                </button>
              </form>
              <div className="mt-6 text-center">
                <button onClick={() => { triggerHaptic(10); setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN'); }} className="text-stone-500 hover:text-amber-500 text-xs font-bold uppercase tracking-widest transition-colors flex flex-col items-center w-full gap-1">
                  <span>{authMode === 'LOGIN' ? T.auth.noAccount.en : T.auth.hasAccount.en}</span>
                  <span className="font-serif normal-case opacity-70">{authMode === 'LOGIN' ? T.auth.noAccount.bo : T.auth.hasAccount.bo}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoginGateOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className={`${isDarkMode ? 'bg-stone-900 border-amber-600/30' : 'bg-white border-stone-300'} border-2 p-8 rounded-[3rem] w-full max-sm shadow-[0_0_80px_rgba(0,0,0,0.9)] text-center relative overflow-hidden`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
              <h2 className="text-3xl font-cinzel text-amber-500 mb-2 font-bold tracking-widest">{T.auth.gateTitle.en}</h2>
              <div className="text-lg font-serif text-amber-600 mb-6">{T.auth.gateTitle.bo}</div>
              <div className="flex flex-col gap-2 mb-10">
                <p className={`${isDarkMode ? 'text-stone-300' : 'text-stone-600'} text-sm font-serif leading-relaxed px-2`}>{T.auth.gateDesc.en}</p>
                <p className="text-stone-500 text-[13px] font-serif leading-relaxed px-2">{T.auth.gateDesc.bo}</p>
              </div>
              <div className="flex flex-col gap-4 mb-8">
                <button onClick={() => { triggerHaptic(15); setAuthMode('LOGIN'); setIsAuthModalOpen(true); setIsLoginGateOpen(false); }} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-amber-900/20 active:scale-95 flex flex-col items-center">
                  <span className="uppercase tracking-[0.2em]">{T.auth.loginBtn.en}</span>
                  <span className="font-serif text-sm mt-0.5">{T.auth.loginBtn.bo}</span>
                </button>
                <button onClick={() => { triggerHaptic(15); setAuthMode('SIGNUP'); setIsAuthModalOpen(true); setIsLoginGateOpen(false); }} className={`w-full py-4 ${isDarkMode ? 'bg-stone-800 border-stone-700 text-stone-200' : 'bg-stone-100 border-stone-200 text-stone-700'} border hover:border-amber-600 font-bold rounded-2xl transition-all active:scale-95 flex flex-col items-center`}>
                  <span className="uppercase tracking-[0.2em]">{T.auth.signupBtn.en}</span>
                  <span className="font-serif text-sm mt-0.5">{T.auth.signupBtn.bo}</span>
                </button>
                <button onClick={() => { triggerHaptic(10); setIsLoginGateOpen(false); }} className="mt-2 text-stone-500 hover:text-amber-600 uppercase text-[11px] tracking-widest font-bold transition-colors">
                  {T.common.cancel.en} <span className="font-serif ml-1">{T.common.cancel.bo}</span>
                </button>
              </div>
              <div className="pt-6 border-t border-stone-800">
                <p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold">{T.auth.gateHint.en}</p>
                <p className="text-stone-700 text-[11px] font-serif mt-1">{T.auth.gateHint.bo}</p>
              </div>
            </div>
          </div>
        )}

        {isProUpgradeOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in slide-in-from-bottom duration-500">
            <div className={`${isDarkMode ? 'bg-stone-900 border-amber-600' : 'bg-white border-amber-800'} border-2 p-1 rounded-[3.5rem] w-full max-w-md shadow-[0_0_80px_rgba(217,119,6,0.3)]`}>
              <div className={`${isDarkMode ? 'bg-stone-950/80' : 'bg-stone-50/80'} p-8 md:p-12 rounded-[3.2rem] h-full flex flex-col items-center`}>
                <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-[0_0_30px_rgba(217,119,6,0.5)] animate-pulse">⭐</div>
                <h2 className={`text-4xl font-cinzel ${isDarkMode ? 'text-white' : 'text-stone-900'} mb-1 font-bold tracking-[0.2em]`}>{T.pro.title.en}</h2>
                <div className="text-lg font-serif text-amber-600 mb-2">{T.pro.title.bo}</div>
                <div className="h-0.5 w-16 bg-amber-600 mb-6" />
                <div className="flex flex-col gap-1 text-center mb-10">
                  <p className={`${isDarkMode ? 'text-stone-400' : 'text-stone-600'} text-sm font-serif italic`}>{T.pro.desc.en}</p>
                  <p className="text-stone-500 text-xs font-serif">{T.pro.desc.bo}</p>
                </div>
                <ul className="w-full space-y-4 mb-12">
                  {[
                    { icon: '🌐', key: 'feat1' },
                    { icon: '🎙️', key: 'feat2' },
                    { icon: '☁️', key: 'feat3' },
                    { icon: '💎', key: 'feat4' },
                    { icon: '✨', key: 'feat5' }
                  ].map((feat, idx) => (
                    <li key={idx} className={`flex items-center gap-4 ${isDarkMode ? 'text-stone-200' : 'text-stone-700'} font-bold`}>
                      <span className={`w-8 h-8 rounded-lg ${isDarkMode ? 'bg-stone-800' : 'bg-white border border-stone-200'} flex items-center justify-center flex-shrink-0`}>{feat.icon}</span>
                      <div className="flex flex-col">
                        <span className="uppercase tracking-widest text-[10px]">{T.pro[feat.key].en}</span>
                        <span className="text-[11px] font-serif text-stone-500 leading-tight">{T.pro[feat.key].bo}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <button onClick={() => { triggerHaptic(25); setIsPro(true); setIsProUpgradeOpen(false); setOnlineLobbyStatus('WAITING'); addLog("Upgraded to PRO! Welcome to the elite.", 'alert'); }} className="w-full py-5 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white font-bold rounded-2xl shadow-[0_0_25px_rgba(217,119,6,0.4)] animate-gold-pulse flex flex-col items-center">
                  <span className="uppercase tracking-[0.3em]">{T.pro.upgrade.en}</span>
                  <span className="font-serif text-sm mt-0.5">{T.pro.upgrade.bo}</span>
                </button>
                <button onClick={() => { triggerHaptic(10); setIsProUpgradeOpen(false); }} className={`mt-8 ${isDarkMode ? 'text-stone-500 hover:text-white' : 'text-stone-400 hover:text-stone-900'} uppercase text-[10px] tracking-widest font-bold transition-colors`}>
                  {T.pro.notNow.en} <span className="font-serif ml-1">{T.pro.notNow.bo}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {!gameMode && (
          <div className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-stone-950 text-amber-500' : 'bg-stone-50 text-amber-800'} overflow-y-auto flex flex-col items-center justify-between p-6 py-6 md:py-10 transition-colors duration-500`}>
               {isSplashVisible && !isLoggedIn ? (
                 <>
                   <div className="flex-grow flex flex-col items-center justify-center w-full max-w-md gap-6 animate-in fade-in duration-700">
                      <div className="flex flex-col items-center text-center">
                          <h1 className={`flex items-center gap-6 mb-2 font-cinzel ${isDarkMode ? 'text-amber-500' : 'text-amber-900'}`}>
                              <span className="text-5xl md:text-7xl drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]">{T.lobby.title.bo}</span>
                              <span className="text-3xl md:text-5xl tracking-widest drop-shadow-md">{T.lobby.title.en}</span>
                          </h1>
                          <div className={`h-px w-32 ${isDarkMode ? 'bg-amber-900/40' : 'bg-amber-700/20'} mb-3`} />
                          <div className="flex flex-col gap-1 mb-6">
                              <p className={`${isDarkMode ? 'text-stone-400' : 'text-stone-500'} tracking-[0.3em] uppercase text-xs md:text-sm font-bold`}>{T.lobby.subtitle.en}</p>
                              <p className={`${isDarkMode ? 'text-stone-500' : 'text-stone-600'} font-serif text-2xl md:text-3xl leading-tight text-center`}>{T.lobby.subtitle.bo}</p>
                          </div>
                      </div>
                      <div className="w-full flex flex-col gap-4 mt-2 px-4">
                          <button onClick={() => { triggerHaptic(15); setIsSplashVisible(false); }} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-lg flex flex-col items-center justify-center">
                              <span className="uppercase tracking-[0.1em] text-sm leading-tight">{T.lobby.guestContinue.en}</span>
                              <span className="font-serif text-sm leading-tight mt-0.5">{T.lobby.guestContinue.bo}</span>
                          </button>
                          <div className="relative flex items-center py-2">
                              <div className={`flex-grow border-t ${isDarkMode ? 'border-stone-800/30' : 'border-stone-200'}`}></div>
                              <div className="flex flex-col items-center mx-4 gap-0.5">
                                  <span className="text-stone-600 text-[10px] uppercase font-bold tracking-widest">{T.common.or.en}</span>
                                  <span className="text-stone-700 font-serif text-[11px] leading-none">{T.common.or.bo}</span>
                              </div>
                              <div className={`flex-grow border-t ${isDarkMode ? 'border-stone-800/30' : 'border-stone-200'}`}></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <button onClick={() => { triggerHaptic(10); setAuthMode('LOGIN'); setIsAuthModalOpen(true); }} className={`py-3 ${isDarkMode ? 'bg-stone-900 border-stone-800 text-stone-300' : 'bg-white border-stone-300 text-stone-700'} border hover:border-amber-600 font-bold rounded-2xl transition-all flex flex-col items-center justify-center`}>
                                  <span className="uppercase tracking-[0.1em] text-[11px] leading-tight">{T.lobby.loginSplash.en}</span>
                                  <span className="font-serif text-[12px] leading-tight mt-0.5">{T.lobby.loginSplash.bo}</span>
                              </button>
                              <button onClick={() => { triggerHaptic(10); setAuthMode('SIGNUP'); setIsAuthModalOpen(true); }} className={`py-3 ${isDarkMode ? 'bg-stone-900 border-stone-800 text-stone-300' : 'bg-white border-stone-300 text-stone-700'} border hover:border-amber-600 font-bold rounded-2xl transition-all flex flex-col items-center justify-center`}>
                                  <span className="uppercase tracking-[0.1em] text-[11px] leading-tight">{T.lobby.signupSplash.en}</span>
                                  <span className="font-serif text-[12px] leading-tight mt-0.5">{T.lobby.signupSplash.bo}</span>
                              </button>
                          </div>
                          <div className="mt-6 flex flex-col gap-2 text-center max-w-[280px] mx-auto">
                              <p className={`${isDarkMode ? 'text-stone-500' : 'text-stone-400'} text-[10px] font-medium leading-relaxed`}>
                                  {T.auth.gateDesc.en}
                              </p>
                              <p className={`${isDarkMode ? 'text-stone-600' : 'text-stone-500'} text-[11px] font-serif leading-tight`}>
                                  {T.auth.gateDesc.bo}
                              </p>
                          </div>
                      </div>
                   </div>
                 </>
               ) : (
                 <>
                    <div className={`fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-[60] ${isDarkMode ? 'bg-gradient-to-b from-stone-950 via-stone-950/80 to-transparent' : 'bg-stone-50/90'}`}>
                        <div className="flex items-center gap-2">
                            <span className="text-amber-600/60 text-[10px] font-cinzel font-bold tracking-[0.3em] hidden sm:block uppercase">EST. 2024</span>
                            {isPro && <span className="ml-4 bg-amber-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full tracking-widest shadow-[0_0_10px_rgba(217,119,6,0.5)]">PRO MEMBER</span>}
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6">
                            {isLoggedIn && (
                                <div className="flex items-center gap-4">
                                    <span className="text-amber-400 font-cinzel text-xs sm:text-sm tracking-widest">ཕེབས་པར་དགའ་བསུ་ཞུ། {getSafePlayerName().toUpperCase()}</span>
                                    <button onClick={handleLogout} className={`border ${isDarkMode ? 'bg-stone-900/80 border-stone-700 text-stone-400' : 'bg-white border-stone-300 text-stone-500'} px-4 py-2 rounded-full text-[10px] uppercase font-bold hover:text-white hover:border-amber-600 transition-all`}>Logout</button>
                                </div>
                            )}
                            <button onClick={() => { triggerHaptic(10); setShowMenu(true); }} className={`border p-2 rounded-xl transition-all shadow-lg flex items-center justify-center ${isDarkMode ? 'bg-stone-800 hover:bg-stone-700 border-stone-600 text-stone-100' : 'bg-white border-stone-300 text-stone-900'}`}>
                              <span className="text-xl">☰</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col items-center flex-shrink-0 w-full max-sm:px-4 mt-16 sm:mt-12">
                        <h1 className={`flex items-center gap-6 mb-1 font-cinzel ${isDarkMode ? 'text-amber-500' : 'text-amber-900'}`}>
                            <span className="text-3xl md:text-5xl drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">{T.lobby.title.bo}</span>
                            <span className="text-lg md:text-2xl tracking-widest drop-shadow-md">{T.lobby.title.en}</span>
                        </h1>
                        <div className={`h-px w-32 ${isDarkMode ? 'bg-amber-900/40' : 'bg-amber-700/30'} mb-2`} />
                        <div className="flex flex-col items-center">
                            <p className={`${isDarkMode ? 'text-stone-400' : 'text-stone-500'} tracking-[0.3em] uppercase text-[10px] md:text-xs text-center font-bold leading-none`}>{T.lobby.subtitle.en}</p>
                            <p className={`${isDarkMode ? 'text-stone-500' : 'text-stone-600'} font-serif text-2xl md:text-3xl mt-1 leading-tight text-center`}>{T.lobby.subtitle.bo}</p>
                        </div>
                    </div>
                    <div className="flex-grow flex flex-col items-center justify-center w-full max-w-md gap-4 md:gap-8 my-2 md:my-4">
                        <div className={`w-full ${isDarkMode ? 'bg-stone-900/30' : 'bg-white/80'} p-5 md:p-8 rounded-[3rem] border border-stone-800/20 backdrop-blur-2xl shadow-2xl`}>
                            <div className="mb-6">
                                <label className="text-stone-500 text-[10px] uppercase block mb-3 tracking-widest font-bold px-1 text-center">
                                    {T.lobby.nameLabel.en} <span className="text-stone-600 font-serif ml-1">{T.lobby.nameLabel.bo}</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={firstName} 
                                    placeholder="PLAYER" 
                                    onChange={(e) => setFirstName(e.target.value)} 
                                    className={`w-full bg-transparent border-b-2 ${firstName.trim() ? 'border-amber-600' : 'border-stone-800/30'} focus:border-amber-500 p-3 outline-none text-center text-xl font-cinzel tracking-widest transition-all ${isDarkMode ? 'text-stone-100' : 'text-stone-900'}`} 
                                    maxLength={20} 
                                />
                            </div>
                            <div>
                                <label className="text-stone-500 text-[10px] uppercase block mb-4 tracking-widest font-bold px-1 text-center">
                                    {T.lobby.colorLabel.en} <span className="text-stone-600 font-serif ml-1">{T.lobby.colorLabel.bo}</span>
                                </label>
                                <div className="flex justify-between px-2 gap-2">
                                {COLOR_PALETTE.map((c) => ( 
                                    <button key={c.hex} onClick={() => { triggerHaptic(10); setSelectedColor(c.hex); }} className={`w-10 h-10 rounded-xl transition-all rotate-45 ${selectedColor === c.hex ? 'border-2 border-white scale-110 shadow-[0_0_25px_rgba(255,255,255,0.2)]' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: c.hex }} /> 
                                ))}
                                </div>
                            </div>
                        </div>
                        {onlineLobbyStatus === 'IDLE' ? (
                            <div className="grid grid-cols-2 gap-3 md:gap-6 w-full px-2">
                                <button 
                                    className={`border-2 ${isDarkMode ? 'bg-stone-900/40 border-stone-800/80' : 'bg-white border-stone-200'} p-4 md:p-6 rounded-[2rem] hover:border-amber-600/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 md:gap-2`} 
                                    onClick={() => { triggerHaptic(20); setGameMode(GameMode.LOCAL); initializeGame({name: getSafePlayerName(), color: selectedColor}, {name: 'Player 2', color: '#999'}); }}
                                >
                                    <span className="text-xl md:text-2xl">👤</span>
                                    <div className="flex flex-col items-center">
                                        <h3 className={`text-xs md:text-sm font-bold uppercase font-cinzel tracking-widest leading-none ${isDarkMode ? 'text-amber-100' : 'text-amber-800'}`}>{T.lobby.modeLocal.en}</h3>
                                        <span className="text-[10px] font-serif mt-0.5">{T.lobby.modeLocal.bo}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-none">{T.lobby.modeLocalSub.en}</span>
                                      <span className="text-[9px] text-stone-500 font-serif">{T.lobby.modeLocalSub.bo}</span>
                                    </div>
                                </button>
                                <button 
                                    className={`border-2 ${isDarkMode ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'} p-4 md:p-6 rounded-[2rem] hover:border-amber-500/80 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 md:gap-2 relative overflow-hidden`} 
                                    onClick={handleOnlineClick}
                                >
                                    {!isPro && <span className="absolute top-2 right-2 text-[8px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
                                    <span className="text-xl md:text-2xl">🌐</span>
                                    <div className="flex flex-col items-center">
                                        <h3 className={`text-xs md:text-sm font-bold uppercase font-cinzel tracking-widest leading-none ${isDarkMode ? 'text-amber-100' : 'text-amber-800'}`}>{T.lobby.modeMulti.en}</h3>
                                        <span className="text-[10px] font-serif mt-0.5">{T.lobby.modeMulti.bo}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-none text-center px-1">{T.lobby.modeMultiSub.en}</span>
                                      <span className="text-[9px] text-stone-500 font-serif">{T.lobby.modeMultiSub.bo}</span>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className={`w-full ${isDarkMode ? 'bg-stone-900/50' : 'bg-white'} border-2 border-amber-700/50 p-6 rounded-[3rem] animate-in fade-in zoom-in duration-300 max-h-[70vh] overflow-y-auto no-scrollbar`}>
                                {onlineLobbyStatus === 'WAITING' && (
                                <div className="flex flex-col items-center gap-6">
                                    <h3 className="text-xl font-cinzel text-amber-500 mb-2">
                                        {T.lobby.roomLobbyTitle.en} <span className="font-serif ml-2">{T.lobby.roomLobbyTitle.bo}</span>
                                    </h3>
                                    <div className="flex flex-col gap-6 w-full">
                                        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-stone-800' : 'bg-stone-50 border-stone-200'} flex flex-col items-center`}>
                                            <div className="text-center mb-4">
                                                <h4 className="text-amber-600 font-cinzel text-sm uppercase tracking-widest font-bold">
                                                    {T.lobby.hostHeader.en} <span className="font-serif ml-1">{T.lobby.hostHeader.bo}</span>
                                                </h4>
                                                <div className="flex flex-col gap-1 mt-2">
                                                    <p className="text-[10px] text-stone-400 uppercase tracking-tight leading-tight">{T.lobby.hostInstruction.en}</p>
                                                    <p className="text-[11px] text-stone-500 font-serif leading-tight">{T.lobby.hostInstruction.bo}</p>
                                                </div>
                                            </div>
                                            <button className="w-full py-4 bg-amber-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors shadow-lg text-sm flex flex-col items-center" onClick={() => { triggerHaptic(20); if(!myPeerId) startOnlineHost(); else { navigator.clipboard.writeText(myPeerId); addLog("Copied Code!", "info"); } }}>
                                                {myPeerId ? (
                                                  <>
                                                    <span className="text-2xl mb-1 tracking-[0.2em]">{myPeerId}</span>
                                                    <span className="text-[10px] opacity-70">CLICK TO COPY CODE 📋</span>
                                                  </>
                                                ) : T.lobby.hostHeader.en}
                                            </button>
                                        </div>

                                        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-stone-800' : 'bg-stone-50 border-stone-200'} flex flex-col items-center`}>
                                            <div className="text-center mb-4">
                                                <h4 className="text-amber-600 font-cinzel text-sm uppercase tracking-widest font-bold">
                                                    {T.lobby.joinHeader.en} <span className="font-serif ml-1">{T.lobby.joinHeader.bo}</span>
                                                </h4>
                                                <div className="flex flex-col gap-1 mt-2">
                                                    <p className="text-[10px] text-stone-400 uppercase tracking-tight leading-tight">{T.lobby.joinInstruction.en}</p>
                                                    <p className="text-[11px] text-stone-500 font-serif leading-tight">{T.lobby.joinInstruction.bo}</p>
                                                </div>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={joinId} 
                                                onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                                                placeholder="6-DIGIT CODE" 
                                                className={`w-full bg-stone-950/40 border-2 border-stone-800 p-3 rounded-xl text-center text-xl font-cinzel tracking-[0.3em] mb-4 outline-none focus:border-amber-600 transition-colors ${isDarkMode ? 'text-white' : 'text-stone-900'}`}
                                                maxLength={6}
                                            />
                                            <button 
                                                disabled={isPeerConnecting || joinId.length < 6}
                                                className="w-full py-4 bg-amber-700 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-amber-600 transition-colors shadow-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                                                onClick={() => joinOnlineMatch(joinId)}
                                            >
                                                {isPeerConnecting ? "CONNECTING..." : T.lobby.joinHeader.en}
                                            </button>
                                        </div>
                                    </div>
                                    <button className="text-stone-500 hover:text-white uppercase text-[10px] tracking-widest font-bold mt-4" onClick={() => { triggerHaptic(10); if(peer) peer.destroy(); setOnlineLobbyStatus('IDLE'); setMyPeerId(''); setJoinId(''); }}>Cancel ཕྱིར་ལོག།</button>
                                </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="w-full flex flex-col items-center gap-6 md:gap-10 mt-2">
                        <div className="flex gap-12 md:gap-16">
                            <button onClick={() => { triggerHaptic(15); setGameMode(GameMode.TUTORIAL); initializeGame({name: getSafePlayerName(), color: selectedColor}, {name: 'Guide', color: '#999'}, true); }} className={`text-stone-500 hover:text-amber-500 flex flex-col items-center group transition-colors`}>
                                <span className="font-bold uppercase text-[10px] md:text-[11px] tracking-widest font-cinzel leading-none">{T.lobby.tutorial.en}</span>
                                <span className="text-[11px] md:text-[13px] font-serif mt-1">{T.lobby.tutorial.bo}</span>
                            </button>
                            <button onClick={() => { triggerHaptic(15); setShowRules(true); }} className="text-stone-500 hover:text-amber-500 flex flex-col items-center group transition-colors">
                                <span className="font-bold uppercase text-[10px] md:text-[11px] tracking-widest font-cinzel leading-none">{T.lobby.rules.en}</span>
                                <span className="text-[11px] md:text-[13px] font-serif mt-1">{T.lobby.rules.bo}</span>
                            </button>
                        </div>
                        <div className="flex flex-col items-center pb-4">
                            <span className="text-stone-600 text-[10px] uppercase tracking-[0.4em] font-bold text-center">
                                {T.lobby.totalPlayed.en} <br/>
                                <span className="font-serif mt-1 block">{T.lobby.totalPlayed.bo}</span>
                            </span>
                            <span className={`text-amber-700/80 font-bold text-3xl md:text-4xl tabular-nums transition-all duration-700 mt-2 ${isCounterPulsing ? 'scale-110 text-amber-500' : ''}`}>{globalPlayCount.toLocaleString()}</span>
                        </div>
                    </div>
                 </>
               )}
          </div>
        )}
        {gameMode && (
            <>
                {(gameMode === GameMode.TUTORIAL || tutorialStep > 0) && tutorialStep > 0 && (
                  <TutorialOverlay 
                    step={tutorialStep} 
                    onNext={handleTutorialNext} 
                    onClose={handleTutorialClose} 
                    isDarkMode={isDarkMode}
                  />
                )}
                <div className={`w-full md:w-1/4 flex flex-col border-b md:border-b-0 md:border-r ${isDarkMode ? 'border-stone-800 bg-stone-950' : 'border-stone-200 bg-white'} z-20 shadow-2xl h-[45dvh] md:h-full order-1 overflow-hidden flex-shrink-0 mobile-landscape-sidebar transition-colors duration-500`}>
                    <div className={`p-1.5 md:p-4 flex flex-col gap-0 md:gap-3 flex-shrink-0 ${isDarkMode ? 'bg-stone-950' : 'bg-white'} mobile-landscape-compact-stats`}>
                        <header className={`flex justify-between items-center border-b ${isDarkMode ? 'border-stone-800' : 'border-stone-200'} pb-1 md:pb-4`}>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={resetToLobby}>
                                <h1 className={`font-cinzel text-[10px] md:text-sm ${isDarkMode ? 'text-amber-500' : 'text-amber-900'}`}>Sho</h1>
                            </div>
                            <div className="flex items-center gap-2 md:gap-4">
                                {(gameMode === GameMode.ONLINE_HOST || gameMode === GameMode.ONLINE_GUEST) && (
                                    <button 
                                        onClick={toggleMic}
                                        className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all ${isMicActive ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : (isDarkMode ? 'bg-stone-800 text-stone-500 border-stone-700' : 'bg-stone-100 text-stone-400 border-stone-200')} border`}
                                        title={isMicActive ? "Mute Microphone" : "Enable Microphone"}
                                    >
                                        <span className={`text-sm md:text-base ${isMicActive ? 'animate-mic-active' : ''}`}>
                                            {isMicActive ? '🎙️' : '🔇'}
                                        </span>
                                    </button>
                                )}
                                <button onClick={() => { triggerHaptic(10); setShowMenu(true); }} className={`border p-1 md:p-2 rounded-xl transition-all shadow-lg flex items-center justify-center ${isDarkMode ? 'bg-stone-800 hover:bg-stone-700 border-stone-600 text-stone-100' : 'bg-white border-stone-300 text-stone-900'}`}>
                                  <span className="text-sm md:text-xl">☰</span>
                                </button>
                                <button onClick={() => { triggerHaptic(10); setShowRules(true); }} className={`w-6 h-6 md:w-8 md:h-8 rounded-full border flex items-center justify-center text-[10px] md:text-xs ${isDarkMode ? 'border-stone-600 text-stone-400' : 'border-stone-300 text-stone-500'}`}>?</button>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 gap-1 md:gap-2 mt-4 md:mt-8 relative px-1">
                            {players.map((p, i) => {
                                const isActive = turnIndex === i;
                                return (
                                    <div key={p.id} className={`relative p-1.5 md:p-3 rounded-xl border transition-all duration-300 ${isActive ? (isDarkMode ? 'bg-stone-800 border-amber-500/50' : 'bg-amber-50 border-amber-200') + ' scale-[1.05] z-10 animate-active-pulse shadow-xl' : (isDarkMode ? 'border-stone-800 opacity-50' : 'border-stone-100 opacity-60')}`}>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.colorHex }}></div>
                                            <h3 className="font-bold transparency-0 truncate text-[9px] md:text-[11px] font-serif" style={{ color: p.colorHex }}>{p.name}</h3>
                                        </div>
                                        <div className={`flex justify-between text-[11px] md:text-[14px] font-bold font-cinzel ${isDarkMode ? 'text-stone-100' : 'text-stone-900'}`}>
                                            <div className="flex flex-col">
                                                <span className="text-[7px] text-stone-500 uppercase">{T.game.inHand.en} <span className="font-serif">{T.game.inHand.bo}</span></span>
                                                <span>{p.coinsInHand}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[7px] text-stone-500 uppercase">{T.game.finished.en} <span className="font-serif">{T.game.finished.bo}</span></span>
                                                <span className="text-amber-500">{p.coinsFinished}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className={`px-2 md:px-4 pb-1 flex flex-col gap-1 flex-shrink-0 ${isDarkMode ? 'bg-stone-950' : 'bg-white'}`}>
                        {phase === GamePhase.GAME_OVER ? ( 
                            <div className={`text-center p-2 rounded-xl border animate-pulse ${isDarkMode ? 'bg-stone-800 border-amber-500' : 'bg-amber-50 border-amber-200'}`}>
                                <h2 className="text-base text-amber-400 font-cinzel">{T.game.victory.en}</h2>
                                <h3 className="text-lg text-amber-500 font-serif leading-none mb-2">{T.game.victory.bo}</h3>
                                <button onClick={resetToLobby} className="bg-amber-600 text-white px-4 py-1.5 rounded-full font-bold uppercase text-[9px] transition-all hover:bg-amber-500">
                                    {T.common.back.en} <span className="font-serif ml-1">{T.common.back.bo}</span>
                                </button>
                            </div> 
                        ) : ( 
                            <div className="flex flex-col gap-1">
                                <DiceArea currentRoll={lastRoll} onRoll={() => { if (tutorialStep === 2) handleTutorialNext(); performRoll(); }} canRoll={(phase === GamePhase.ROLLING) && !isRolling && isLocalTurn} pendingValues={pendingMoveValues} waitingForPaRa={paRaCount > 0} paRaCount={paRaCount} extraRolls={extraRolls} flexiblePool={null} />
                                <div className="flex gap-1">
                                    <div onClick={handleFromHandClick} className={`flex-1 p-2 md:p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${handShake ? 'animate-hand-blocked' : selectedSourceIndex === 0 ? 'border-amber-500 bg-amber-900/40' : (shouldHighlightHand && isLocalTurn) ? 'border-amber-500/80 bg-amber-900/10 animate-pulse' : (isDarkMode ? 'border-stone-800 bg-stone-900/50' : 'border-stone-200 bg-stone-50')}`}>
                                        <span className={`font-bold uppercase font-cinzel text-[11px] md:text-sm`}>{T.game.fromHand.en}</span>
                                        <span className={`text-[11px] md:text-sm font-serif font-bold ${isDarkMode ? 'text-amber-500' : 'text-amber-900'}`}>{T.game.fromHand.bo}</span>
                                        <span className={`text-[11px] font-cinzel mt-1 font-bold ${isDarkMode ? 'text-stone-200' : 'text-stone-700'}`}>({players[turnIndex].coinsInHand})</span>
                                    </div>
                                    {currentValidMovesList.length === 0 && phase === GamePhase.MOVING && !isRolling && paRaCount === 0 && isLocalTurn && ( 
                                        <button onClick={() => { triggerHaptic(10); handleSkipTurn(); }} className="flex-1 bg-amber-800/50 hover:bg-amber-700 text-amber-200 border border-amber-600/50 p-1 rounded-xl font-bold flex flex-col items-center justify-center">
                                            <span className="text-[9px] uppercase font-cinzel">{T.game.skipTurn.en}</span>
                                            <span className="text-[10px] text-amber-500 font-serif leading-none">{T.game.skipTurn.bo}</span>
                                        </button> 
                                    )}
                                </div>
                            </div> 
                        )}
                    </div>
                </div>
                <div className={`flex-grow relative ${isDarkMode ? 'bg-[#1a1715]' : 'bg-[#fcfaf9]'} flex items-center justify-center overflow-hidden order-2 h-[55dvh] md:h-full mobile-landscape-board transition-colors duration-500`} ref={boardContainerRef}>
                    <div style={{ transform: `scale(${boardScale})`, width: 800, height: 800 }} className="transition-transform duration-300">
                        <Board 
                            boardState={board} players={players} validMoves={visualizedMoves} onSelectMove={(m) => { if (isLocalTurn) performMove(m.sourceIndex, m.targetIndex); }} 
                            currentPlayer={players[turnIndex].id} turnPhase={phase} onShellClick={(i) => { if (isLocalTurn) { board.get(i)?.owner === players[turnIndex].id ? setSelectedSourceIndex(i) : setSelectedSourceIndex(null) } }} 
                            selectedSource={selectedSourceIndex} lastMove={lastMove} currentRoll={lastRoll} isRolling={isRolling} isNinerMode={isNinerMode} onInvalidMoveAttempt={() => { SFX.playBlocked(); triggerHaptic(100); }} 
                            isOpeningPaRa={isOpeningPaRa}
                        />
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

export default App;
