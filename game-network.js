function setNetStatus(message, isWarn = false) {
  ids.netStatus.textContent = message;
  ids.netStatus.className = isWarn ? "warn" : "";
}

function syncSignalOutput() {
  if (!net.peer || !net.peer.localDescription) return;
  ids.localSignal.value = JSON.stringify(net.peer.localDescription);
}

function closeConnection() {
  if (net.channel) {
    net.channel.close();
  }
  if (net.peer) {
    net.peer.close();
  }
  net.peer = null;
  net.channel = null;
  net.connected = false;
}

function serializeGame() {
  return {
    players: game.players,
    turn: game.turn,
    activePlayer: game.activePlayer,
    heroPlayUsed: game.heroPlayUsed,
    nonHeroPlayUsed: game.nonHeroPlayUsed,
    selectedAttackerId: game.selectedAttackerId,
    pendingSacrifice: game.pendingSacrifice
      ? {
          heroCardId: game.pendingSacrifice.heroCardId,
          cost: game.pendingSacrifice.cost,
          chosen: Array.from(game.pendingSacrifice.chosen),
        }
      : null,
    environment: game.environment,
    gameOver: game.gameOver,
  };
}

function applySnapshot(snapshot) {
  game.players = snapshot.players;
  game.turn = snapshot.turn;
  game.activePlayer = snapshot.activePlayer;
  game.heroPlayUsed = Boolean(snapshot.heroPlayUsed);
  game.nonHeroPlayUsed = Boolean(snapshot.nonHeroPlayUsed);
  game.selectedAttackerId = snapshot.selectedAttackerId;
  game.pendingSacrifice = snapshot.pendingSacrifice
    ? {
        heroCardId: snapshot.pendingSacrifice.heroCardId,
        cost: snapshot.pendingSacrifice.cost,
        chosen: new Set(snapshot.pendingSacrifice.chosen),
      }
    : null;
  game.environment = snapshot.environment;
  game.gameOver = snapshot.gameOver;
}

function broadcastState() {
  if (net.mode !== "host" || !net.channel || net.channel.readyState !== "open") return;
  net.channel.send(JSON.stringify({ type: "state", state: serializeGame() }));
}

function setupDataChannel(channel) {
  net.channel = channel;
  net.channel.onopen = () => {
    net.connected = true;
    setNetStatus("Connected");
    setAction("Peer connected. Host controls Player 1, guest controls Player 2.");
    if (net.mode === "host") {
      broadcastState();
    }
    render();
  };
  net.channel.onclose = () => {
    net.connected = false;
    setNetStatus("Disconnected", true);
    render();
  };
  net.channel.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    if (payload.type === "intent" && net.mode === "host") {
      processIntent(payload.intent, true);
      broadcastState();
    } else if (payload.type === "state" && net.mode === "guest") {
      applySnapshot(payload.state);
      render();
    }
  };
}

function ensurePeer() {
  if (net.peer) return;
  net.peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  net.peer.onicecandidate = (event) => {
    if (!event.candidate) {
      syncSignalOutput();
    }
  };
  if (net.mode === "guest") {
    net.peer.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };
  }
}
