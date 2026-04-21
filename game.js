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
    banished: [],
    freeSummonReady: false,
    olympianAegisUsed: false,
    netjerSacrificeUsed: false,
    nagaReviveUsed: false,
    yokaiAttackUsed: false,
  };
}

function setAction(message, isWarn = false) {
  ids.actionMessage.textContent = message;
  ids.actionMessage.className = isWarn ? "warn" : "";
  triggerCinematicByMessage(message, isWarn);
}

function setTurnBanner(text) {
  ids.turnBanner.textContent = text;
  ids.turnBanner.classList.add("active");
  if (fx.bannerTimer) window.clearTimeout(fx.bannerTimer);
  fx.bannerTimer = window.setTimeout(() => ids.turnBanner.classList.remove("active"), 1200);
}

function triggerCinematic(effect) {
  if (fx.activeClass) {
    document.body.classList.remove(fx.activeClass);
  }
  fx.activeClass = `fx-${effect}`;
  document.body.classList.add(fx.activeClass);
  document.documentElement.style.setProperty("--pulse", "1");
  if (fx.timer) window.clearTimeout(fx.timer);
  fx.timer = window.setTimeout(() => {
    if (fx.activeClass) document.body.classList.remove(fx.activeClass);
    fx.activeClass = null;
    document.documentElement.style.setProperty("--pulse", "0");
  }, effect === "win" ? 950 : 620);
}

function triggerCinematicByMessage(message, isWarn) {
  const msg = String(message || "").toLowerCase();
  if (isWarn) {
    triggerCinematic("warn");
    return;
  }
  if (msg.includes("wins the duel")) {
    triggerCinematic("win");
    return;
  }
  if (msg.includes("summoned")) {
    triggerCinematic("summon");
    return;
  }
  if (msg.includes("attacked") || msg.includes("retaliated") || msg.includes("dealt")) {
    triggerCinematic("attack");
    return;
  }
  if (msg.includes("turn")) {
    triggerCinematic("turn");
    return;
  }
  if (msg.includes("boost") || msg.includes("shield") || msg.includes("revived") || msg.includes("environment")) {
    triggerCinematic("mystic");
  }
}

function calculateStats(hero, ownerIndex = null) {
  const envAttack = game.environment && game.environment.faction === hero.faction ? game.environment.buffAttack : 0;
  const envFort = game.environment && game.environment.faction === hero.faction ? game.environment.buffFortitude : 0;
  const flameAttack =
    hero.faction === "Aesir" &&
    !hero.shielded &&
    ownerIndex !== null &&
    ownerIndex === game.activePlayer
      ? 1
      : 0;
  const berserkAttack = hasKeyword(hero, "Berserk") && hero.damage > 0 ? 2 : 0;
  return {
    attack: hero.attack + hero.attackMod + envAttack + flameAttack + berserkAttack,
    maxFortitude: hero.fortitude + hero.fortMod + envFort,
  };
}

function hasGuardHero(board) {
  return board.some((hero) => hasKeyword(hero, "Guard"));
}

function applySummonKeywords(hero) {
  const notes = [];
  if (hasKeyword(hero, "Vanguard")) {
    hero.shielded = true;
    notes.push("Vanguard granted Shield");
  }
  return notes;
}

function resolveDeathKeywords(hero, owner, opponent) {
  const notes = [];
  if (hasKeyword(hero, "Deathburst")) {
    opponent.vitality -= 1;
    notes.push(`${hero.name} triggered Deathburst for 1 vitality damage to ${opponent.name}`);
  }
  return notes;
}

function resetFactionTurnFlags(player) {
  player.olympianAegisUsed = false;
  player.netjerSacrificeUsed = false;
  player.nagaReviveUsed = false;
  player.yokaiAttackUsed = false;
}

function applyOlympianAegisOnSummon(player, hero) {
  if (hero.faction === "Olympian" && !player.olympianAegisUsed) {
    hero.shielded = true;
    player.olympianAegisUsed = true;
    return true;
  }
  return false;
}

function applyNetjerSacrificeBonus(player) {
  if (player.netjerSacrificeUsed) return null;
  const candidates = player.board.filter((hero) => hero.faction === "Netjer");
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.skull - b.skull);
  const target = candidates[0];
  target.attackMod += 1;
  target.fortMod += 1;
  player.netjerSacrificeUsed = true;
  return target;
}

function triggerYokaiReposition(attackerOwner, attacker) {
  if (attacker.faction !== "Yokai" || attackerOwner.yokaiAttackUsed) return null;
  const target = attackerOwner.board.find((hero) => hero.skull <= 2 && hero.exhausted);
  if (!target) return null;
  target.exhausted = false;
  attackerOwner.yokaiAttackUsed = true;
  return target;
}

function hasKeyword(hero, keyword) {
  return Boolean(hero) && Array.isArray(hero.keywords) && hero.keywords.includes(keyword);
}


function applyStateBasedDefeats() {
  const notes = [];
  for (let ownerIndex = 0; ownerIndex < game.players.length; ownerIndex += 1) {
    const owner = game.players[ownerIndex];
    const opponent = game.players[1 - ownerIndex];
    const defeated = owner.board.filter((hero) => hero.damage >= calculateStats(hero, ownerIndex).maxFortitude);
    for (const hero of defeated) {
      removeCardById(owner.board, hero.id);
      moveHeroToGraveyard(owner, hero);
      notes.push(`${hero.name} was defeated because its damage met or exceeded its current Fortitude.`);
      notes.push(...resolveDeathKeywords(hero, owner, opponent));
    }
  }
  return notes;
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
  game.heroPlayUsed = false;
  game.nonHeroPlayUsed = false;
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
  setAction("New mythic clash started. You may play up to 1 deity and 1 non-deity card (Relic or Realm) each turn. 1-2 skull deities are free, 3-5 skull deities require offerings unless bypassed by Relic cards (3-4 skull only). Direct strikes usually require a clear enemy board unless the attacker has Piercing. Combat includes retaliation + overflow, and you draw automatically at the beginning of each turn.");
  setTurnBanner("Player 1 Turn");
  render();
}

function launchGameFromMenu() {
  document.body.classList.add("gameStarted");
  startGame();
}

function pulseMenu() {
  document.body.classList.remove("menuPulse");
  window.requestAnimationFrame(() => {
    document.body.classList.add("menuPulse");
    window.setTimeout(() => document.body.classList.remove("menuPulse"), 650);
  });
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

function findMostDamagedHero(board, ownerIndex = null) {
  if (board.length === 0) return null;
  const scored = board
    .map((hero) => {
      const stats = calculateStats(hero, ownerIndex);
      const damageTaken = Math.min(hero.damage, stats.maxFortitude);
      return { hero, damageTaken };
    })
    .sort((a, b) => b.damageTaken - a.damageTaken || a.hero.skull - b.hero.skull);
  return scored[0].hero;
}

function findWeakestHero(board, ownerIndex = null) {
  if (board.length === 0) return null;
  const scored = board
    .map((hero) => {
      const stats = calculateStats(hero, ownerIndex);
      return { hero, currentFort: stats.maxFortitude - hero.damage };
    })
    .sort((a, b) => a.currentFort - b.currentFort || a.hero.skull - b.hero.skull);
  return scored[0].hero;
}

function findHighestAttackHero(board, ownerIndex = null) {
  if (board.length === 0) return null;
  const scored = board
    .map((hero) => {
      const stats = calculateStats(hero, ownerIndex);
      return { hero, attack: stats.attack };
    })
    .sort((a, b) => b.attack - a.attack || b.hero.skull - a.hero.skull);
  return scored[0].hero;
}

function canPlayHero(player, hero) {
  if (player.board.length >= 5) {
    return { ok: false, reason: "Battlefield is full (max 5 deities)." };
  }
  if (hero.skull <= 2) {
    return { ok: true };
  }
  if (player.freeSummonReady && hero.skull <= 4) {
    return { ok: true };
  }
  if (player.freeSummonReady && hero.skull >= 5) {
    return { ok: false, reason: "Divine Gateway can only bypass offerings for 3-4 skull deities." };
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
    setAction(`Select allied deities to offer for ${hero.name}. Need ${hero.skull} total skulls, then click Confirm Sacrifice on the deity card.`);
    render();
    return false;
  }

  const movedHero = removeCardById(player.hand, cardId);
  movedHero.exhausted = true;
  player.board.push(movedHero);
  const gotWard = applyOlympianAegisOnSummon(player, movedHero);
  const summonNotes = applySummonKeywords(movedHero);
  if (player.freeSummonReady && movedHero.skull > 2) {
    player.freeSummonReady = false;
  }
  setAction(
    `${player.name} summoned ${movedHero.name}.` +
      `${gotWard ? " Aegis granted." : ""}` +
      `${summonNotes.length ? ` ${summonNotes.join(". ")}.` : ""}`
  );
  render();
  return true;
}

function confirmSacrifice(player) {
  if (!game.pendingSacrifice) return false;
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
    return false;
  }

  for (const hero of sacrificed) {
    moveHeroToGraveyard(player, hero);
  }
  const opponent = getOpponent();
  const deathNotes = sacrificed.flatMap((hero) => resolveDeathKeywords(hero, player, opponent));
  const umbralBuffTarget = applyNetjerSacrificeBonus(player);

  const heroToPlay = removeCardById(player.hand, game.pendingSacrifice.heroCardId);
  if (!heroToPlay) {
    setAction("Summon failed: deity card no longer in hand.", true);
    game.pendingSacrifice = null;
    render();
    return false;
  }

  heroToPlay.exhausted = true;
  player.board.push(heroToPlay);
  const gotWard = applyOlympianAegisOnSummon(player, heroToPlay);
  const summonNotes = applySummonKeywords(heroToPlay);
  game.pendingSacrifice = null;
  setAction(
    `${player.name} sacrificed ${skullTotal} skulls and summoned ${heroToPlay.name}.` +
      `${umbralBuffTarget ? ` ${umbralBuffTarget.name} gained +1/+1 from Netjer rite.` : ""}` +
      `${gotWard ? " Aegis granted." : ""}` +
      `${summonNotes.length ? ` ${summonNotes.join(". ")}.` : ""}` +
      `${deathNotes.length ? ` ${deathNotes.join(". ")}.` : ""}`
  );
  render();
  return true;
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
  const opponent = getOpponent();

  if (card.effect === "boost") {
    if (player.board.length === 0) {
      player.hand.push(card);
      setAction("Need an allied deity on board to empower.", true);
      return false;
    }
    const target = findWeakestHero(player.board, game.activePlayer);
    target.attackMod += 2;
    target.fortMod += 2;
    setAction(`${card.name} boosted ${target.name} (+2/+2).`);
  } else if (card.effect === "freeSummon") {
    player.freeSummonReady = true;
    setAction(`${player.name} can summon one 3-4 skull deity this turn with no offering.`);
  } else if (card.effect === "shield") {
    if (player.board.length === 0) {
      player.hand.push(card);
      setAction("Need an allied deity on board for divine shield.", true);
      return false;
    }
    const target = findMostDamagedHero(player.board, game.activePlayer);
    target.shielded = true;
    setAction(`${target.name} is shielded against the next incoming attack.`);
  } else if (card.effect === "revive") {
    if (player.graveyard.length === 0) {
      player.hand.push(card);
      setAction("No deities in the underworld to revive.", true);
      return false;
    }
    if (player.board.length >= 5) {
      player.hand.push(card);
      setAction("Cannot revive: battlefield full (max 5 deities).", true);
      return false;
    }
    const revived = player.graveyard.shift();
    revived.damage = 0;
    const tideReady = revived.faction === "Naga" && !player.nagaReviveUsed;
    revived.exhausted = !tideReady;
    revived.shielded = false;
    player.board.push(revived);
    if (tideReady) {
      player.nagaReviveUsed = true;
    }
    setAction(`${player.name} revived ${revived.name}.${tideReady ? " It entered ready (Naga legacy)." : ""}`);
  } else if (card.effect === "debuff") {
    if (opponent.board.length === 0) {
      player.hand.push(card);
      setAction("No enemy deity to curse.", true);
      return false;
    }
    const target = findHighestAttackHero(opponent.board, 1 - game.activePlayer);
    target.attackMod -= 2;
    target.exhausted = true;
    setAction(`${card.name} weakened ${target.name} (-2 Attack) and exhausted it.`);
  } else if (card.effect === "removal") {
    if (opponent.board.length === 0) {
      player.hand.push(card);
      setAction("No enemy deity to banish.", true);
      return false;
    }
    const target = findWeakestHero(opponent.board, 1 - game.activePlayer);
    removeCardById(opponent.board, target.id);
    moveHeroToGraveyard(opponent, target, true);
    const deathNotes = resolveDeathKeywords(target, opponent, player);
    setAction(`${card.name} destroyed ${target.name}.${deathNotes.length ? ` ${deathNotes.join(". ")}.` : ""}`);
  } else if (card.effect === "forcedDuel") {
    if (player.board.length === 0 || opponent.board.length === 0) {
      player.hand.push(card);
      setAction("Divine duel requires both players to control at least one deity.", true);
      return false;
    }

    const allied = findHighestAttackHero(player.board, game.activePlayer);
    const enemy = findHighestAttackHero(opponent.board, 1 - game.activePlayer);
    const alliedStats = calculateStats(allied, game.activePlayer);
    const enemyStats = calculateStats(enemy, 1 - game.activePlayer);
    const alliedFortBefore = alliedStats.maxFortitude - allied.damage;
    const enemyFortBefore = enemyStats.maxFortitude - enemy.damage;

    enemy.damage += alliedStats.attack;
    allied.damage += enemyStats.attack;

    const alliedDefeated = allied.damage >= alliedStats.maxFortitude;
    const enemyDefeated = enemy.damage >= enemyStats.maxFortitude;
    if (alliedDefeated) {
      removeCardById(player.board, allied.id);
      moveHeroToGraveyard(player, allied);
    }
    if (enemyDefeated) {
      removeCardById(opponent.board, enemy.id);
      moveHeroToGraveyard(opponent, enemy);
    }
    const deathNotes = [
      ...(alliedDefeated ? resolveDeathKeywords(allied, player, opponent) : []),
      ...(enemyDefeated ? resolveDeathKeywords(enemy, opponent, player) : []),
    ];

    setAction(
      `${card.name} forced ${allied.name} and ${enemy.name} to duel.` +
        ` ${allied.name} took ${Math.min(enemyStats.attack, alliedFortBefore)}.` +
        ` ${enemy.name} took ${Math.min(alliedStats.attack, enemyFortBefore)}.` +
        `${alliedDefeated ? ` ${allied.name} was defeated.` : ""}` +
        `${enemyDefeated ? ` ${enemy.name} was defeated.` : ""}` +
        `${deathNotes.length ? ` ${deathNotes.join(". ")}.` : ""}`
    );
  } else if (card.effect === "directDamage") {
    opponent.vitality -= 3;
    setAction(`${card.name} hit ${opponent.name} for 3 direct vitality damage.`);
    checkWin();
  } else if (card.effect === "healFilter") {
    const healTarget = findMostDamagedHero(player.board, game.activePlayer);
    let healText = "";
    if (healTarget && healTarget.damage > 0) {
      healTarget.damage = Math.max(0, healTarget.damage - 3);
      healText = ` ${healTarget.name} recovered up to 3 Fortitude.`;
    }

    if (player.deck.length === 0) {
      player.hand.push(card);
      setAction("Cannot resolve Wellspring Rite: deck is empty.", true);
      return false;
    }

    drawCard(player);
    const discard = player.hand
      .slice()
      .sort((a, b) => (b.skull || 0) - (a.skull || 0))
      .find((c) => c.id !== card.id);
    if (discard) {
      removeCardById(player.hand, discard.id);
      player.graveyard.push(discard);
      setAction(`${card.name} resolved.${healText} Discarded ${discard.name}.`);
    } else {
      setAction(`${card.name} resolved.${healText}`);
    }
  } else if (card.effect === "graveDenyEnv") {
    const heroCards = opponent.graveyard.filter((c) => c.type === "hero");
    const toBanish = heroCards.slice(0, 2);
    for (const hero of toBanish) {
      const removed = removeCardById(opponent.graveyard, hero.id);
      if (removed) {
        opponent.banished.push(removed);
      }
    }

    const nextEnvIndex = player.deck.findIndex((c) => c.type === "environment");
    let envText = "";
    if (nextEnvIndex >= 0) {
      const [newEnvironment] = player.deck.splice(nextEnvIndex, 1);
      game.environment = newEnvironment;
      envText = ` Realm shifted to ${newEnvironment.name}.`;
    } else {
      game.environment = null;
      envText = " Realm was cleared.";
    }

    const collapseDefeatNotes = applyStateBasedDefeats();

    setAction(
      `${card.name} banished ${toBanish.length} enemy deit${toBanish.length === 1 ? "y" : "ies"} from the graveyard.${envText}` +
        `${collapseDefeatNotes.length ? ` ${collapseDefeatNotes.join(" ")}` : ""}`
    );
  }

  player.graveyard.push(card);
  render();
  return true;
}

function playEnvironment(player, cardId) {
  const card = removeCardById(player.hand, cardId);
  if (!card) return false;
  game.environment = card;
  const envDefeatNotes = applyStateBasedDefeats();
  setAction(
    `${player.name} invoked the realm ${card.name}. ${card.faction} units gain +${card.buffAttack}/+${card.buffFortitude}.` +
      `${envDefeatNotes.length ? ` ${envDefeatNotes.join(" ")}` : ""}`
  );
  checkWin();
  render();
  return true;
}

function attackHero(attackerOwner, defenderOwner, attackerId, targetId) {
  const attacker = attackerOwner.board.find((h) => h.id === attackerId);
  const target = defenderOwner.board.find((h) => h.id === targetId);
  if (!attacker || !target || attacker.exhausted) return;

  if (hasGuardHero(defenderOwner.board) && !hasKeyword(target, "Guard") && !hasKeyword(attacker, "Flying")) {
    setAction("A Guardian deity must be targeted first (unless the attacker has Flying).", true);
    render();
    return;
  }

  if (target.shielded) {
    target.shielded = false;
    if (!hasKeyword(attacker, "Shattershield")) {
      attacker.exhausted = true;
      const lunarTarget = triggerYokaiReposition(attackerOwner, attacker);
      setAction(
        `${target.name}'s shield blocked ${attacker.name}'s attack.` +
          `${lunarTarget ? ` ${lunarTarget.name} was readied by Yokai trickery.` : ""}`
      );
      return;
    }
  }

  const atk = calculateStats(attacker, game.activePlayer).attack;
  const retaliation = calculateStats(target, 1 - game.activePlayer).attack + (hasKeyword(target, "Retaliate") ? 1 : 0);
  const targetStats = calculateStats(target, 1 - game.activePlayer);
  const attackerStats = calculateStats(attacker, game.activePlayer);
  const attackerFortBefore = attackerStats.maxFortitude - attacker.damage;
  const targetFortBefore = targetStats.maxFortitude - target.damage;
  const currentFort = targetStats.maxFortitude - target.damage;
  const overflow = Math.max(0, atk - currentFort);

  target.damage += atk;
  attacker.damage += retaliation;
  attacker.exhausted = true;
  const lunarTarget = triggerYokaiReposition(attackerOwner, attacker);
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
  const deathNotes = [
    ...(targetDefeated ? resolveDeathKeywords(target, defenderOwner, attackerOwner) : []),
    ...(attackerDefeated ? resolveDeathKeywords(attacker, attackerOwner, defenderOwner) : []),
  ];

  const targetDamageTaken = Math.min(atk, targetFortBefore);
  const attackerDamageTaken = Math.min(retaliation, attackerFortBefore);
  setAction(
    `${attacker.name} dealt ${targetDamageTaken} to ${target.name}, and ${target.name} retaliated for ${attackerDamageTaken}.` +
      `${targetDefeated ? ` ${target.name} was defeated.` : ""}` +
      `${attackerDefeated ? ` ${attacker.name} was defeated.` : ""}` +
      `${overflow > 0 ? ` ${overflow} overflow damage hit ${defenderOwner.name}'s vitality.` : ""}` +
      `${lunarTarget ? ` ${lunarTarget.name} was readied by Yokai trickery.` : ""}` +
      `${deathNotes.length ? ` ${deathNotes.join(". ")}.` : ""}`
  );

  checkWin();
  render();
}

function attackPlayer(attackerOwner, defenderOwner, attackerId) {
  const attacker = attackerOwner.board.find((h) => h.id === attackerId);
  if (!attacker || attacker.exhausted) return;
  const canPierce = hasKeyword(attacker, "Piercing");
  const canBypassGuard = hasKeyword(attacker, "Flying");
  if (hasGuardHero(defenderOwner.board) && !canBypassGuard) {
    setAction("Direct attack is blocked while the opponent controls Guardian deities (unless attacker has Flying).", true);
    render();
    return;
  }
  if (defenderOwner.board.length > 0 && !canPierce) {
    setAction("Direct attack is blocked while the opponent controls deities (unless attacker has Piercing).", true);
    render();
    return;
  }
  const atk = calculateStats(attacker, game.activePlayer).attack;
  const directDamage = defenderOwner.board.length > 0 ? Math.max(1, Math.floor(atk / 2)) : atk;
  defenderOwner.vitality -= directDamage;
  attacker.exhausted = true;
  const lunarTarget = triggerYokaiReposition(attackerOwner, attacker);
  setAction(
    `${attacker.name} attacked directly for ${directDamage} vitality damage.` +
      `${defenderOwner.board.length > 0 ? " Piercing reduced the damage through defenders." : ""}` +
      `${lunarTarget ? ` ${lunarTarget.name} was readied by Yokai trickery.` : ""}`
  );
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
  game.heroPlayUsed = false;
  game.nonHeroPlayUsed = false;

  const current = getCurrentPlayer();
  current.freeSummonReady = false;
  resetFactionTurnFlags(current);
  resetExhaustion(current);
  drawCard(current);

  setAction(`${current.name}'s turn. Deities refreshed and one card drawn.`);
  setTurnBanner(`${current.name} Turn`);
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
    if (card.type === "hero") {
      if (game.heroPlayUsed) {
        setAction("You may only play one deity each turn.", true);
        render();
        return;
      }
      const played = playHero(current, intent.cardId);
      if (played) game.heroPlayUsed = true;
    } else {
      if (game.nonHeroPlayUsed) {
        setAction("You may only play one non-deity card (Relic or Realm) each turn.", true);
        render();
        return;
      }
      const played = card.type === "mystic" ? playMystic(current, intent.cardId) : playEnvironment(current, intent.cardId);
      if (played) game.nonHeroPlayUsed = true;
    }
  } else if (intent.type === "confirm-sacrifice") {
    const played = confirmSacrifice(current);
    if (played) game.heroPlayUsed = true;
  } else if (intent.type === "toggle-sacrifice") {
    toggleSacrificeSelection(intent.cardId);
  } else if (intent.type === "select-attacker") {
    game.selectedAttackerId = intent.cardId;
    setAction("Attacker selected. Choose an enemy deity or direct attack.");
    render();
  } else if (intent.type === "target-enemy") {
    attackHero(current, opponent, game.selectedAttackerId, intent.cardId);
    game.selectedAttackerId = null;
  } else if (intent.type === "target-player") {
    attackPlayer(current, opponent, game.selectedAttackerId);
    game.selectedAttackerId = null;
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
  const entering = fx.knownCardIds.has(card.id) ? "" : " entering";
  fx.knownCardIds.add(card.id);
  const canPlay = isCurrent && canLocalTakeTurnActions() && canLocalControlPlayer(owner) && !game.gameOver;
  let extra = "";
  if (card.type === "hero") {
    const keywords = card.keywords && card.keywords.length ? `<br/>Keywords: ${card.keywords.join(", ")}` : "";
    extra = `Skulls: ${card.skull}<br/>ATK ${card.attack} / FORT ${card.fortitude}<br/>Faction: ${card.faction}${keywords}`;
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

  const art = card.asset
    ? `<img class="cardArt" src="${card.asset}" alt="${card.name} art" loading="lazy" onerror="this.style.display='none'" />`
    : "";

  return `<div class="card ${card.type}${entering}">${art}<strong>${card.name}</strong><span class="faint">#${card.number || "?"} · ${card.type.toUpperCase()}</span><span>${extra}</span>${btn}${pendingBtn}</div>`;
}

function renderBoardHero(hero, ownerIndex, isCurrent, enemyTargetable) {
  const stats = calculateStats(hero, ownerIndex);
  const currentFortitude = Math.max(0, stats.maxFortitude - hero.damage);
  const selectedForAttack = game.selectedAttackerId === hero.id;
  const selectedForSacrifice = game.pendingSacrifice && game.pendingSacrifice.chosen.has(hero.id);

  const classes = ["card", "hero"];
  if (!fx.knownCardIds.has(hero.id)) classes.push("entering");
  if (!fx.prevBoardCards.has(hero.id)) classes.push("summoned");
  const previousDamage = fx.prevDamage.get(hero.id);
  if (Number.isFinite(previousDamage) && hero.damage > previousDamage) classes.push("tookDamage");
  if (Number.isFinite(previousDamage) && hero.damage < previousDamage) classes.push("healed");
  const previousExhausted = fx.prevExhausted.get(hero.id);
  if (previousExhausted === false && hero.exhausted) classes.push("swing");
  fx.knownCardIds.add(hero.id);
  if (selectedForAttack || selectedForSacrifice) classes.push("selected");

  const parts = [
    `<div class="${classes.join(" ")}">`,
    `${hero.asset ? `<img class="cardArt" src="${hero.asset}" alt="${hero.name} art" loading="lazy" onerror="this.style.display='none'" />` : ""}`,
    `<strong>${hero.name}</strong>`,
    `<span>#${hero.number || "?"} · Skulls: ${hero.skull} | ${hero.faction}</span>`,
    `<span>ATK ${stats.attack} / FORT ${currentFortitude}/${stats.maxFortitude}</span>`,
    `<span>${hero.exhausted ? "Exhausted" : "Ready"}${hero.shielded ? " | Shielded" : ""}</span>`,
    `${hero.keywords && hero.keywords.length ? `<span>Keywords: ${hero.keywords.join(", ")}</span>` : ""}`,
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
  const banished = document.getElementById(`player${index}Banished`);
  const board = document.getElementById(`player${index}Board`);
  const hand = document.getElementById(`player${index}Hand`);

  const isCurrent = index === game.activePlayer;
  const enemyTargetable = !isCurrent && game.selectedAttackerId !== null;
  const canViewHand = !isOnlineMode() || canLocalControlPlayer(index);

  title.textContent = `${player.name}${isCurrent ? " (Active)" : ""}`;
  vitality.textContent = player.vitality;
  deck.textContent = player.deck.length;
  grave.textContent = player.graveyard.filter((c) => c.type === "hero").length;
  banished.textContent = player.banished.length;

  panel.classList.toggle("inactive", !isCurrent);

  board.innerHTML =
    player.board.map((hero) => renderBoardHero(hero, index, isCurrent, enemyTargetable)).join("") +
    (isCurrent &&
    canLocalTakeTurnActions() &&
    canLocalControlPlayer(index) &&
    game.selectedAttackerId &&
    (game.players[1 - index].board.length === 0 ||
      hasKeyword(player.board.find((hero) => hero.id === game.selectedAttackerId), "Piercing"))
      ? `<div class="card"><strong>Direct Attack</strong><button data-action="target-player" data-owner="${index}">Strike Enemy Vitality</button></div>`
      : "");

  hand.innerHTML = canViewHand
    ? player.hand.map((card) => renderHandCard(card, index, isCurrent)).join("")
    : `<div class="card"><strong>Hidden Hand</strong><span class="faint">${player.hand.length} cards</span></div>`;
}

function render() {
  ids.currentPlayerName.textContent = getCurrentPlayer().name;
  ids.environmentName.textContent = game.environment
    ? `${game.environment.name} (blesses ${game.environment.faction})`
    : "None";

  renderPlayer(0);
  renderPlayer(1);
  captureFxSnapshot();

  ids.endTurnBtn.disabled = !canLocalTakeTurnActions() || game.gameOver;
}

function captureFxSnapshot() {
  fx.prevDamage.clear();
  fx.prevExhausted.clear();
  fx.prevBoardCards.clear();
  for (const player of game.players) {
    for (const hero of player.board) {
      fx.prevDamage.set(hero.id, hero.damage);
      fx.prevExhausted.set(hero.id, hero.exhausted);
      fx.prevBoardCards.add(hero.id);
    }
  }
}

function initializeHighFidelityFx() {
  const updatePointer = (clientX, clientY) => {
    const mx = Math.min(1, Math.max(0, clientX / window.innerWidth));
    const my = Math.min(1, Math.max(0, clientY / window.innerHeight));
    document.documentElement.style.setProperty("--mx", mx.toFixed(3));
    document.documentElement.style.setProperty("--my", my.toFixed(3));
  };

  window.addEventListener("pointermove", (event) => {
    updatePointer(event.clientX, event.clientY);
  });

  window.addEventListener("deviceorientation", (event) => {
    if (typeof event.gamma !== "number" || typeof event.beta !== "number") return;
    const mx = (event.gamma + 90) / 180;
    const my = (event.beta + 180) / 360;
    updatePointer(mx * window.innerWidth, my * window.innerHeight);
  });
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
      ? "Local council mode enabled."
      : net.mode === "host"
        ? "Host conclave enabled. Create an offer and share it."
        : "Guest conclave enabled. Paste host offer, create answer, and share it back."
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

ids.launchGameBtn.addEventListener("click", launchGameFromMenu);
ids.menuPulseBtn.addEventListener("click", pulseMenu);
initializeHighFidelityFx();
