const HERO_LIBRARY = [
  { name: "Acolyte of Embers", skull: 1, attack: 2, fortitude: 2, faction: "Flame" },
  { name: "Moonblade Scout", skull: 1, attack: 1, fortitude: 3, faction: "Lunar" },
  { name: "Sanctum Defender", skull: 2, attack: 2, fortitude: 4, faction: "Radiant" },
  { name: "Grave Oath Knight", skull: 2, attack: 3, fortitude: 3, faction: "Umbral" },
  { name: "Solar Templar", skull: 3, attack: 4, fortitude: 4, faction: "Radiant" },
  { name: "Ashfang Titan", skull: 4, attack: 6, fortitude: 5, faction: "Flame" },
  { name: "Night Crown Tyrant", skull: 5, attack: 7, fortitude: 7, faction: "Umbral" },
  { name: "Tide Oracle", skull: 3, attack: 3, fortitude: 5, faction: "Tide" },
  { name: "Deep Leviathan", skull: 5, attack: 8, fortitude: 6, faction: "Tide" },
  { name: "Lunar Ascendant", skull: 4, attack: 5, fortitude: 6, faction: "Lunar" },
];

const MYSTIC_LIBRARY = [
  { name: "Runic Surge", effect: "boost", text: "+2 Attack and +2 Fortitude to one allied hero." },
  { name: "Forbidden Gate", effect: "freeSummon", text: "Next hero this turn ignores sacrifice requirements." },
  { name: "Aegis Veil", effect: "shield", text: "One allied hero blocks the next incoming attack." },
  { name: "Soul Recall", effect: "revive", text: "Revive one hero from your graveyard to battlefield." },
];

const ENV_LIBRARY = [
  { name: "Sunlit Bastion", faction: "Radiant", buffAttack: 1, buffFortitude: 1 },
  { name: "Crimson Wastes", faction: "Flame", buffAttack: 1, buffFortitude: 1 },
  { name: "Midnight Eclipse", faction: "Umbral", buffAttack: 1, buffFortitude: 1 },
  { name: "Moonwell Grove", faction: "Lunar", buffAttack: 1, buffFortitude: 1 },
  { name: "Abyssal Current", faction: "Tide", buffAttack: 1, buffFortitude: 1 },
];

const game = {
  players: [],
  turn: 0,
  activePlayer: 0,
  selectedAttackerId: null,
  pendingSacrifice: null,
  environment: null,
  gameOver: false,
};

const ids = {
  currentPlayerName: document.getElementById("currentPlayerName"),
  environmentName: document.getElementById("environmentName"),
  actionMessage: document.getElementById("actionMessage"),
  drawBtn: document.getElementById("drawBtn"),
  endTurnBtn: document.getElementById("endTurnBtn"),
  resetBtn: document.getElementById("resetBtn"),
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
  setAction("New duel started. 1-2 skull heroes are free, 3-5 skull heroes require sacrifices unless bypassed by Mystic cards.");
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
  const targetStats = calculateStats(target);
  const currentFort = targetStats.maxFortitude - target.damage;
  const overflow = Math.max(0, atk - currentFort);

  target.damage += atk;
  attacker.exhausted = true;

  if (target.damage >= targetStats.maxFortitude) {
    removeCardById(defenderOwner.board, target.id);
    moveHeroToGraveyard(defenderOwner, target);
    setAction(`${attacker.name} defeated ${target.name}${overflow > 0 ? ` and ${overflow} overflow damage hit ${defenderOwner.name}'s vitality.` : "."}`);
  } else {
    setAction(`${attacker.name} dealt ${atk} to ${target.name}.`);
  }

  if (overflow > 0) {
    defenderOwner.vitality -= overflow;
  }

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
  for (const p of game.players) {
    if (p.vitality <= 0) {
      game.gameOver = true;
      const winner = game.players.find((x) => x.vitality > 0) || p;
      setAction(`${winner.name} wins the duel!`, false);
      ids.actionMessage.className = "win";
    }
  }
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

  const current = getCurrentPlayer();
  current.freeSummonReady = false;
  resetExhaustion(current);
  drawCard(current);

  setAction(`${current.name}'s turn. Heroes refreshed and one card drawn.`);
  render();
}

function renderHandCard(card, owner, isCurrent) {
  const canPlay = isCurrent && !game.gameOver;
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

  if (isCurrent && !game.gameOver) {
    if (game.pendingSacrifice) {
      parts.push(`<button data-action="toggle-sacrifice" data-card-id="${hero.id}">Sacrifice</button>`);
    } else if (!hero.exhausted) {
      parts.push(`<button data-action="select-attacker" data-card-id="${hero.id}">Attack</button>`);
    }
  }

  if (enemyTargetable && !game.gameOver) {
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

  title.textContent = `${player.name}${isCurrent ? " (Active)" : ""}`;
  vitality.textContent = player.vitality;
  deck.textContent = player.deck.length;
  grave.textContent = player.graveyard.filter((c) => c.type === "hero").length;

  panel.classList.toggle("inactive", !isCurrent);

  board.innerHTML =
    player.board.map((hero) => renderBoardHero(hero, index, isCurrent, enemyTargetable)).join("") +
    (isCurrent && game.selectedAttackerId ? `<div class="card"><strong>Direct Attack</strong><button data-action="target-player" data-owner="${index}">Hit Enemy Vitality</button></div>` : "");

  hand.innerHTML = player.hand.map((card) => renderHandCard(card, index, isCurrent)).join("");
}

function render() {
  ids.currentPlayerName.textContent = getCurrentPlayer().name;
  ids.environmentName.textContent = game.environment
    ? `${game.environment.name} (boosts ${game.environment.faction})`
    : "None";

  renderPlayer(0);
  renderPlayer(1);
}

document.body.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.action;
  if (!action || game.gameOver) return;

  const current = getCurrentPlayer();
  const opponent = getOpponent();

  if (action === "play-card") {
    const cardId = target.dataset.cardId;
    const card = current.hand.find((c) => c.id === cardId);
    if (!card) return;
    if (card.type === "hero") {
      playHero(current, cardId);
    } else if (card.type === "mystic") {
      playMystic(current, cardId);
    } else {
      playEnvironment(current, cardId);
    }
  } else if (action === "confirm-sacrifice") {
    confirmSacrifice(current);
  } else if (action === "toggle-sacrifice") {
    toggleSacrificeSelection(target.dataset.cardId);
  } else if (action === "select-attacker") {
    game.selectedAttackerId = target.dataset.cardId;
    setAction("Attacker selected. Choose an enemy hero or direct attack.");
    render();
  } else if (action === "target-enemy") {
    attackHero(current, opponent, game.selectedAttackerId, target.dataset.cardId);
    game.selectedAttackerId = null;
  } else if (action === "target-player") {
    attackPlayer(current, opponent, game.selectedAttackerId);
    game.selectedAttackerId = null;
  }
});

ids.drawBtn.addEventListener("click", () => {
  if (game.gameOver) return;
  drawCard(getCurrentPlayer());
  render();
});

ids.endTurnBtn.addEventListener("click", endTurn);
ids.resetBtn.addEventListener("click", startGame);

startGame();
