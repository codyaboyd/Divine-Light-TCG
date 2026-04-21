const game = {
  players: [],
  turn: 0,
  activePlayer: 0,
  manualDrawUsed: false,
  selectedAttackerId: null,
  pendingSacrifice: null,
  environment: null,
  gameOver: false,
};

const net = {
  mode: "local",
  localPlayerIndex: null,
  peer: null,
  channel: null,
  connected: false,
};

const ids = {
  currentPlayerName: document.getElementById("currentPlayerName"),
  environmentName: document.getElementById("environmentName"),
  actionMessage: document.getElementById("actionMessage"),
  drawBtn: document.getElementById("drawBtn"),
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

const uid = () => Math.random().toString(36).slice(2, 11);

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isOnlineMode() {
  return net.mode === "host" || net.mode === "guest";
}

function canLocalControlPlayer(playerIndex) {
  if (!isOnlineMode()) return true;
  return net.localPlayerIndex === playerIndex;
}

function canLocalTakeTurnActions() {
  if (!isOnlineMode()) return true;
  return net.connected && net.localPlayerIndex === game.activePlayer;
}

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
    manualDrawUsed: game.manualDrawUsed,
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
  game.manualDrawUsed = Boolean(snapshot.manualDrawUsed);
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

function createDeck() {
  const deck = [];
  for (let i = 0; i < 16; i += 1) {
    const hero = clone(HERO_LIBRARY[i % HERO_LIBRARY.length]);
    deck.push({ id: uid(), type: "hero", ...hero, damage: 0, attackMod: 0, fortMod: 0, shielded: false, exhausted: false });
  }
  for (let i = 0; i < 8; i += 1) {
    const mystic = clone(MYSTIC_LIBRARY[i % MYSTIC_LIBRARY.length]);
    deck.push({ id: uid(), type: "mystic", ...mystic });
  }
  for (let i = 0; i < 5; i += 1) {
    const env = clone(ENV_LIBRARY[i % ENV_LIBRARY.length]);
    deck.push({ id: uid(), type: "environment", ...env });
  }
  return shuffle(deck);
}

function createPlayer(name) {
  return {
    name,
    vitality: 30,
    deck: createDeck(),
    hand: [],
    board: [],
    graveyard: [],
    freeSummonReady: false,
  };
}

function setAction(message, isWarn = false) {
  ids.actionMessage.textContent = message;
  ids.actionMessage.className = isWarn ? "warn" : "";
}

function calculateStats(hero) {
  const envAttack = game.environment && game.environment.faction === hero.faction ? game.environment.buffAttack : 0;
  const envFort = game.environment && game.environment.faction === hero.faction ? game.environment.buffFortitude : 0;
  return {
    attack: hero.attack + hero.attackMod + envAttack,
    maxFortitude: hero.fortitude + hero.fortMod + envFort,
  };
}

function drawCard(player) {
  if (player.deck.length === 0) {
    setAction(`${player.name} cannot draw (deck empty).`, true);
    return;
  }
  if (player.hand.length >= 10) {
    setAction(`${player.name}'s hand is full (10 cards).`, true);
    return;
  }
  const drawn = player.deck.pop();
  player.hand.push(drawn);
  setAction(`${player.name} drew ${drawn.name}.`);
}

function startGame() {
  game.players = [createPlayer("Player 1"), createPlayer("Player 2")];
  game.turn = 1;
  game.activePlayer = 0;
  game.manualDrawUsed = false;
  game.selectedAttackerId = null;
  game.pendingSacrifice = null;
  game.environment = null;
  game.gameOver = false;

  for (const player of game.players) {
    for (let i = 0; i < 5; i += 1) {
      drawCard(player);
    }
  }

  resetExhaustion(game.players[0]);
  setAction("New duel started. 1-2 skull heroes are free, 3-5 skull heroes require sacrifices unless bypassed by Mystic cards. Hero combat now includes retaliation, and Draw can be used once each turn.");
  render();
}

function getCurrentPlayer() {
  return game.players[game.activePlayer];
}

function getOpponent() {
  return game.players[1 - game.activePlayer];
}

function removeCardById(collection, cardId) {
  const idx = collection.findIndex((c) => c.id === cardId);
  if (idx >= 0) {
    return collection.splice(idx, 1)[0];
  }
  return null;
}

function moveHeroToGraveyard(owner, hero, pushTop = false) {
  if (pushTop) {
    owner.graveyard.unshift(hero);
  } else {
    owner.graveyard.push(hero);
  }
}

function canPlayHero(player, hero) {
  if (player.board.length >= 5) {
    return { ok: false, reason: "Battlefield is full (max 5 heroes)." };
  }
  if (hero.skull <= 2 || player.freeSummonReady) {
    return { ok: true };
  }
  return { ok: true, needsSacrifice: true };
}

function playHero(player, cardId) {
  const hero = player.hand.find((c) => c.id === cardId && c.type === "hero");
  if (!hero) return;

  const result = canPlayHero(player, hero);
  if (!result.ok) {
    setAction(result.reason, true);
    return;
  }

  if (result.needsSacrifice) {
    game.pendingSacrifice = {
      heroCardId: hero.id,
      cost: hero.skull,
      chosen: new Set(),
    };
    setAction(`Select allied heroes to sacrifice for ${hero.name}. Need ${hero.skull} total skulls, then click Confirm Sacrifice on the hero card.`);
    render();
    return;
  }

  const movedHero = removeCardById(player.hand, cardId);
  movedHero.exhausted = true;
  player.board.push(movedHero);
  if (player.freeSummonReady && movedHero.skull > 2) {
    player.freeSummonReady = false;
  }
  setAction(`${player.name} summoned ${movedHero.name}.`);
  render();
}

function confirmSacrifice(player) {
  if (!game.pendingSacrifice) return;
  const sacrificed = [];
  let skullTotal = 0;

  for (const selectedId of game.pendingSacrifice.chosen) {
    const hero = removeCardById(player.board, selectedId);
    if (hero) {
      sacrificed.push(hero);
      skullTotal += hero.skull;
    }
  }

  if (skullTotal < game.pendingSacrifice.cost) {
    for (const hero of sacrificed) {
      player.board.push(hero);
    }
    setAction(`Not enough sacrifice skulls (${skullTotal}/${game.pendingSacrifice.cost}).`, true);
    return;
  }

  for (const hero of sacrificed) {
    moveHeroToGraveyard(player, hero);
  }

  const heroToPlay = removeCardById(player.hand, game.pendingSacrifice.heroCardId);
  if (!heroToPlay) {
    setAction("Summon failed: hero card no longer in hand.", true);
    game.pendingSacrifice = null;
    render();
    return;
  }

  heroToPlay.exhausted = true;
  player.board.push(heroToPlay);
  game.pendingSacrifice = null;
  setAction(`${player.name} sacrificed ${skullTotal} skulls and summoned ${heroToPlay.name}.`);
  render();
}

function toggleSacrificeSelection(cardId) {
  const pending = game.pendingSacrifice;
  if (!pending) return;
  if (pending.chosen.has(cardId)) {
    pending.chosen.delete(cardId);
  } else {
    pending.chosen.add(cardId);
  }
  render();
}

function playMystic(player, cardId) {
  const card = removeCardById(player.hand, cardId);
  if (!card) return;

  if (card.effect === "boost") {
    if (player.board.length === 0) {
      player.hand.push(card);
      setAction("Need an allied hero on board to boost.", true);
      return;
    }
    const target = player.board[0];
    target.attackMod += 2;
    target.fortMod += 2;
    setAction(`${card.name} boosted ${target.name} (+2/+2).`);
  } else if (card.effect === "freeSummon") {
    player.freeSummonReady = true;
    setAction(`${player.name} can summon one 3-5 skull hero this turn with no sacrifice.`);
  } else if (card.effect === "shield") {
    if (player.board.length === 0) {
      player.hand.push(card);
      setAction("Need an allied hero on board to shield.", true);
      return;
    }
    const target = player.board[0];
    target.shielded = true;
    setAction(`${target.name} is shielded against the next incoming attack.`);
  } else if (card.effect === "revive") {
    if (player.graveyard.length === 0) {
      player.hand.push(card);
      setAction("No heroes in graveyard to revive.", true);
      return;
    }
    if (player.board.length >= 5) {
      player.hand.push(card);
      setAction("Cannot revive: battlefield full (max 5 heroes).", true);
      return;
    }
    const revived = player.graveyard.shift();
    revived.damage = 0;
    revived.exhausted = true;
    revived.shielded = false;
    player.board.push(revived);
    setAction(`${player.name} revived ${revived.name}.`);
  }

  player.graveyard.push(card);
  render();
}

function playEnvironment(player, cardId) {
  const card = removeCardById(player.hand, cardId);
  if (!card) return;
  game.environment = card;
  setAction(`${player.name} changed the environment to ${card.name}. ${card.faction} heroes gain +${card.buffAttack}/+${card.buffFortitude}.`);
  render();
}

function attackHero(attackerOwner, defenderOwner, attackerId, targetId) {
  const attacker = attackerOwner.board.find((h) => h.id === attackerId);
  const target = defenderOwner.board.find((h) => h.id === targetId);
  if (!attacker || !target || attacker.exhausted) return;

  if (target.shielded) {
    target.shielded = false;
    attacker.exhausted = true;
    setAction(`${target.name}'s shield blocked ${attacker.name}'s attack.`);
    return;
  }

  const atk = calculateStats(attacker).attack;
  const retaliation = calculateStats(target).attack;
  const targetStats = calculateStats(target);
  const attackerStats = calculateStats(attacker);
  const attackerFortBefore = attackerStats.maxFortitude - attacker.damage;
  const targetFortBefore = targetStats.maxFortitude - target.damage;
  const currentFort = targetStats.maxFortitude - target.damage;
  const overflow = Math.max(0, atk - currentFort);

  target.damage += atk;
  attacker.damage += retaliation;
  attacker.exhausted = true;
  const targetDefeated = target.damage >= targetStats.maxFortitude;
  const attackerDefeated = attacker.damage >= attackerStats.maxFortitude;

  if (overflow > 0) {
    defenderOwner.vitality -= overflow;
  }

  if (targetDefeated) {
    removeCardById(defenderOwner.board, target.id);
    moveHeroToGraveyard(defenderOwner, target);
  }
  if (attackerDefeated) {
    removeCardById(attackerOwner.board, attacker.id);
    moveHeroToGraveyard(attackerOwner, attacker);
  }

  const targetDamageTaken = Math.min(atk, targetFortBefore);
  const attackerDamageTaken = Math.min(retaliation, attackerFortBefore);
  setAction(
    `${attacker.name} dealt ${targetDamageTaken} to ${target.name}, and ${target.name} retaliated for ${attackerDamageTaken}.` +
      `${targetDefeated ? ` ${target.name} was defeated.` : ""}` +
      `${attackerDefeated ? ` ${attacker.name} was defeated.` : ""}` +
      `${overflow > 0 ? ` ${overflow} overflow damage hit ${defenderOwner.name}'s vitality.` : ""}`
  );

  checkWin();
  render();
}

function attackPlayer(attackerOwner, defenderOwner, attackerId) {
  const attacker = attackerOwner.board.find((h) => h.id === attackerId);
  if (!attacker || attacker.exhausted) return;
  const atk = calculateStats(attacker).attack;
  defenderOwner.vitality -= atk;
  attacker.exhausted = true;
  setAction(`${attacker.name} attacked directly for ${atk} vitality damage.`);
  checkWin();
  render();
}

function checkWin() {
  const living = game.players.filter((p) => p.vitality > 0);
  if (living.length === game.players.length) {
    return;
  }
  game.gameOver = true;
  if (living.length === 0) {
    setAction("The duel ends in a draw!", false);
  } else {
    setAction(`${living[0].name} wins the duel!`, false);
  }
  ids.actionMessage.className = "win";
}

function resetExhaustion(player) {
  for (const hero of player.board) {
    hero.exhausted = false;
  }
}

function endTurn() {
  if (game.gameOver) return;
  game.selectedAttackerId = null;
  game.pendingSacrifice = null;
  game.activePlayer = 1 - game.activePlayer;
  game.turn += 1;
  game.manualDrawUsed = false;

  const current = getCurrentPlayer();
  current.freeSummonReady = false;
  resetExhaustion(current);
  drawCard(current);

  setAction(`${current.name}'s turn. Heroes refreshed and one card drawn.`);
  render();
}

function processIntent(intent, fromRemote = false) {
  const current = getCurrentPlayer();
  const opponent = getOpponent();
  if (!intent || game.gameOver) return;

  if (isOnlineMode()) {
    const controller = fromRemote ? 1 : 0;
    if (controller !== game.activePlayer) {
      return;
    }
  }

  if (intent.type === "play-card") {
    const card = current.hand.find((c) => c.id === intent.cardId);
    if (!card) return;
    if (card.type === "hero") playHero(current, intent.cardId);
    else if (card.type === "mystic") playMystic(current, intent.cardId);
    else playEnvironment(current, intent.cardId);
  } else if (intent.type === "confirm-sacrifice") {
    confirmSacrifice(current);
  } else if (intent.type === "toggle-sacrifice") {
    toggleSacrificeSelection(intent.cardId);
  } else if (intent.type === "select-attacker") {
    game.selectedAttackerId = intent.cardId;
    setAction("Attacker selected. Choose an enemy hero or direct attack.");
    render();
  } else if (intent.type === "target-enemy") {
    attackHero(current, opponent, game.selectedAttackerId, intent.cardId);
    game.selectedAttackerId = null;
  } else if (intent.type === "target-player") {
    attackPlayer(current, opponent, game.selectedAttackerId);
    game.selectedAttackerId = null;
  } else if (intent.type === "draw") {
    if (game.manualDrawUsed) {
      setAction("You may only use Draw once per turn.", true);
      render();
      return;
    }
    game.manualDrawUsed = true;
    drawCard(current);
    render();
  } else if (intent.type === "end-turn") {
    endTurn();
  } else if (intent.type === "reset") {
    startGame();
  }
}

function submitIntent(intent) {
  if (!isOnlineMode()) {
    processIntent(intent, false);
    return;
  }
  if (!canLocalTakeTurnActions() && intent.type !== "reset") {
    setAction("Not your turn.", true);
    return;
  }
  if (net.mode === "host") {
    processIntent(intent, false);
    broadcastState();
    return;
  }
  if (net.mode === "guest" && net.channel && net.channel.readyState === "open") {
    net.channel.send(JSON.stringify({ type: "intent", intent }));
  } else {
    setAction("No host connection yet.", true);
  }
}

function renderHandCard(card, owner, isCurrent) {
  const canPlay = isCurrent && canLocalTakeTurnActions() && canLocalControlPlayer(owner) && !game.gameOver;
  let extra = "";
  if (card.type === "hero") {
    extra = `Skulls: ${card.skull}<br/>ATK ${card.attack} / FORT ${card.fortitude}<br/>Faction: ${card.faction}`;
  } else if (card.type === "mystic") {
    extra = card.text;
  } else {
    extra = `Faction Boost: ${card.faction} +${card.buffAttack}/+${card.buffFortitude}`;
  }

  const btn = canPlay
    ? `<button data-action="play-card" data-card-id="${card.id}" data-owner="${owner}">Play</button>`
    : "";

  const pendingBtn =
    game.pendingSacrifice && card.id === game.pendingSacrifice.heroCardId && canPlay
      ? `<button data-action="confirm-sacrifice" data-owner="${owner}">Confirm Sacrifice</button>`
      : "";

  return `<div class="card ${card.type}"><strong>${card.name}</strong><span class="faint">${card.type.toUpperCase()}</span><span>${extra}</span>${btn}${pendingBtn}</div>`;
}

function renderBoardHero(hero, ownerIndex, isCurrent, enemyTargetable) {
  const stats = calculateStats(hero);
  const currentFortitude = Math.max(0, stats.maxFortitude - hero.damage);
  const selectedForAttack = game.selectedAttackerId === hero.id;
  const selectedForSacrifice = game.pendingSacrifice && game.pendingSacrifice.chosen.has(hero.id);

  const classes = ["card", "hero"];
  if (selectedForAttack || selectedForSacrifice) classes.push("selected");

  const parts = [
    `<div class="${classes.join(" ")}">`,
    `<strong>${hero.name}</strong>`,
    `<span>Skulls: ${hero.skull} | ${hero.faction}</span>`,
    `<span>ATK ${stats.attack} / FORT ${currentFortitude}/${stats.maxFortitude}</span>`,
    `<span>${hero.exhausted ? "Exhausted" : "Ready"}${hero.shielded ? " | Shielded" : ""}</span>`,
  ];

  if (isCurrent && canLocalTakeTurnActions() && canLocalControlPlayer(ownerIndex) && !game.gameOver) {
    if (game.pendingSacrifice) {
      parts.push(`<button data-action="toggle-sacrifice" data-card-id="${hero.id}">Sacrifice</button>`);
    } else if (!hero.exhausted) {
      parts.push(`<button data-action="select-attacker" data-card-id="${hero.id}">Attack</button>`);
    }
  }

  if (enemyTargetable && canLocalTakeTurnActions() && !game.gameOver) {
    parts.push(`<button data-action="target-enemy" data-card-id="${hero.id}">Target</button>`);
  }

  parts.push("</div>");
  return parts.join("");
}

function renderPlayer(index) {
  const player = game.players[index];
  const panel = document.getElementById(`player${index}Panel`);
  const title = document.getElementById(`player${index}Title`);
  const vitality = document.getElementById(`player${index}Vitality`);
  const deck = document.getElementById(`player${index}Deck`);
  const grave = document.getElementById(`player${index}Graveyard`);
  const board = document.getElementById(`player${index}Board`);
  const hand = document.getElementById(`player${index}Hand`);

  const isCurrent = index === game.activePlayer;
  const enemyTargetable = !isCurrent && game.selectedAttackerId !== null;
  const canViewHand = !isOnlineMode() || canLocalControlPlayer(index);

  title.textContent = `${player.name}${isCurrent ? " (Active)" : ""}`;
  vitality.textContent = player.vitality;
  deck.textContent = player.deck.length;
  grave.textContent = player.graveyard.filter((c) => c.type === "hero").length;

  panel.classList.toggle("inactive", !isCurrent);

  board.innerHTML =
    player.board.map((hero) => renderBoardHero(hero, index, isCurrent, enemyTargetable)).join("") +
    (isCurrent && canLocalTakeTurnActions() && canLocalControlPlayer(index) && game.selectedAttackerId
      ? `<div class="card"><strong>Direct Attack</strong><button data-action="target-player" data-owner="${index}">Hit Enemy Vitality</button></div>`
      : "");

  hand.innerHTML = canViewHand
    ? player.hand.map((card) => renderHandCard(card, index, isCurrent)).join("")
    : `<div class="card"><strong>Hidden Hand</strong><span class="faint">${player.hand.length} cards</span></div>`;
}

function render() {
  ids.currentPlayerName.textContent = getCurrentPlayer().name;
  ids.environmentName.textContent = game.environment
    ? `${game.environment.name} (boosts ${game.environment.faction})`
    : "None";

  renderPlayer(0);
  renderPlayer(1);

  ids.drawBtn.disabled = !canLocalTakeTurnActions() || game.gameOver;
  ids.endTurnBtn.disabled = !canLocalTakeTurnActions() || game.gameOver;
}

document.body.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.action;
  if (!action || game.gameOver) return;

  if (action === "play-card") {
    submitIntent({ type: "play-card", cardId: target.dataset.cardId });
  } else if (action === "confirm-sacrifice") {
    submitIntent({ type: "confirm-sacrifice" });
  } else if (action === "toggle-sacrifice") {
    submitIntent({ type: "toggle-sacrifice", cardId: target.dataset.cardId });
  } else if (action === "select-attacker") {
    submitIntent({ type: "select-attacker", cardId: target.dataset.cardId });
  } else if (action === "target-enemy") {
    submitIntent({ type: "target-enemy", cardId: target.dataset.cardId });
  } else if (action === "target-player") {
    submitIntent({ type: "target-player" });
  }
});

ids.drawBtn.addEventListener("click", () => {
  submitIntent({ type: "draw" });
});

ids.endTurnBtn.addEventListener("click", () => submitIntent({ type: "end-turn" }));
ids.resetBtn.addEventListener("click", () => submitIntent({ type: "reset" }));

ids.applyNetModeBtn.addEventListener("click", () => {
  closeConnection();
  ids.localSignal.value = "";
  ids.remoteSignal.value = "";
  net.mode = ids.netMode.value;
  net.localPlayerIndex = net.mode === "host" ? 0 : net.mode === "guest" ? 1 : null;
  setNetStatus(
    net.mode === "local"
      ? "Local mode"
      : net.mode === "host"
        ? "Host mode (create offer)"
        : "Guest mode (paste offer, then create answer)"
  );
  setAction(
    net.mode === "local"
      ? "Local hotseat enabled."
      : net.mode === "host"
        ? "Host mode enabled. Create an offer and share it."
        : "Guest mode enabled. Paste host offer, create answer, and share it back."
  );
  render();
});

ids.createOfferBtn.addEventListener("click", async () => {
  if (net.mode !== "host") {
    setAction("Switch to Host mode before creating an offer.", true);
    return;
  }
  ensurePeer();
  setupDataChannel(net.peer.createDataChannel("pvp"));
  const offer = await net.peer.createOffer();
  await net.peer.setLocalDescription(offer);
  setNetStatus("Offer created. Share local signal.");
});

ids.createAnswerBtn.addEventListener("click", async () => {
  if (net.mode !== "guest") {
    setAction("Switch to Guest mode before creating an answer.", true);
    return;
  }
  ensurePeer();
  const offerText = ids.remoteSignal.value.trim();
  if (!offerText) {
    setAction("Paste host offer into Remote Signal first.", true);
    return;
  }
  await net.peer.setRemoteDescription(JSON.parse(offerText));
  const answer = await net.peer.createAnswer();
  await net.peer.setLocalDescription(answer);
  setNetStatus("Answer created. Share local signal.");
});

ids.setRemoteBtn.addEventListener("click", async () => {
  const text = ids.remoteSignal.value.trim();
  if (!text) {
    setAction("Remote signal is empty.", true);
    return;
  }
  ensurePeer();
  await net.peer.setRemoteDescription(JSON.parse(text));
  setNetStatus("Remote description applied. Awaiting connection...");
});

startGame();
