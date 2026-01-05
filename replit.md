# Sho - Traditional Tibetan Dice Game

## Overview
Sho is a traditional Tibetan dice game where players race to move their coins through 64 shells. The game features rolling dice, stacking coins for bonus turns, and the special "Pa Ra" roll (double 1s) for extra bonuses.

## Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS (via CDN)
- **Networking**: PeerJS for online multiplayer
- **Audio**: Web Audio API for sound effects

## Project Structure
```
/
├── App.tsx              # Main game component with all game logic
├── index.tsx            # React entry point
├── index.html           # HTML entry with Tailwind and fonts
├── types.ts             # TypeScript type definitions
├── constants.ts         # Game constants (shells, coins, colors)
├── translations.ts      # Tibetan translations
├── vite.config.ts       # Vite configuration (port 5000)
├── tsconfig.json        # TypeScript configuration
├── components/
│   ├── Board.tsx        # Game board component
│   ├── DiceArea.tsx     # Dice rolling area
│   ├── MusicPlayer.tsx  # Background music player
│   ├── RulesModal.tsx   # Game rules modal
│   ├── ShoLogo.tsx      # Logo component
│   └── TutorialOverlay.tsx  # Tutorial overlay
├── sw.js                # Service worker for PWA
└── manifest.json        # PWA manifest
```

## Development
- **Run dev server**: `npm run dev` (port 5000)
- **Build**: `npm run build`

## Game Modes
- **Local**: Two players on same device
- **AI**: Play against computer opponent
- **Online**: Peer-to-peer multiplayer via PeerJS

## Environment Variables
- `GEMINI_API_KEY` - Optional, for AI features
