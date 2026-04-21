const game = {
  players: [],
  turn: 0,
  activePlayer: 0,
  heroPlayUsed: false,
  nonHeroPlayUsed: false,
  selectedAttackerId: null,
  pendingSacrifice: null,
  environment: null,
  gameOver: false,
  ai: {
    enabled: false,
    playerIndex: null,
    difficulty: null,
    thinking: false,
  },
};

const net = {
  mode: "local",
  localPlayerIndex: null,
  peer: null,
  channel: null,
  connected: false,
};

const ids = {
  turnBanner: document.getElementById("turnBanner"),
  launchGameBtn: document.getElementById("launchGameBtn"),
  menuPulseBtn: document.getElementById("menuPulseBtn"),
  gameModeSelect: document.getElementById("gameModeSelect"),
  currentPlayerName: document.getElementById("currentPlayerName"),
  environmentName: document.getElementById("environmentName"),
  actionMessage: document.getElementById("actionMessage"),
  endTurnBtn: document.getElementById("endTurnBtn"),
  resetBtn: document.getElementById("resetBtn"),
  netMode: document.getElementById("netMode"),
  applyNetModeBtn: document.getElementById("applyNetModeBtn"),
  netStatus: document.getElementById("netStatus"),
  createOfferBtn: document.getElementById("createOfferBtn"),
  createAnswerBtn: document.getElementById("createAnswerBtn"),
  setRemoteBtn: document.getElementById("setRemoteBtn"),
  localSignal: document.getElementById("localSignal"),
  remoteSignal: document.getElementById("remoteSignal"),
};

const fx = {
  knownCardIds: new Set(),
  prevDamage: new Map(),
  prevExhausted: new Map(),
  prevBoardCards: new Set(),
  activeClass: null,
  timer: null,
  bannerTimer: null,
};
