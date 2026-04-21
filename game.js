function createDeck() {
  const deck = [];
  const heroCount = 16;
  const mysticCount = 8;
  const environmentCount = 5;
  if (HERO_LIBRARY.length < heroCount || MYSTIC_LIBRARY.length < mysticCount || ENV_LIBRARY.length < environmentCount) {
    throw new Error("Card libraries are smaller than deck composition requirements.");
  }
  const heroPool = shuffle(clone(HERO_LIBRARY)).slice(0, heroCount);
  const mysticPool = shuffle(clone(MYSTIC_LIBRARY)).slice(0, mysticCount);
  const environmentPool = shuffle(clone(ENV_LIBRARY)).slice(0, environmentCount);

  for (let i = 0; i < heroPool.length; i += 1) {
    const hero = clone(heroPool[i]);
    deck.push({ id: uid(), type: "hero", ...hero, damage: 0, attackMod: 0, fortMod: 0, shielded: false, exhausted: false });
  }
  for (let i = 0; i < mysticPool.length; i += 1) {
    const mystic = clone(mysticPool[i]);
    deck.push({ id: uid(), type: "mystic", ...mystic });
  }
  for (let i = 0; i < environmentPool.length; i += 1) {
    const env = clone(environmentPool[i]);
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

function configureMatchMode() {
  const mode = ids.gameModeSelect ? ids.gameModeSelect.value : "local";
  if (mode.startsWith("ai-")) {
    const difficulty = mode.replace("ai-", "");
    game.ai.enabled = true;
    game.ai.playerIndex = 1;
    game.ai.difficulty = difficulty;
  } else {
    game.ai.enabled = false;
    game.ai.playerIndex = null;
    game.ai.difficulty = null;
  }
  game.ai.thinking = false;
}

function canAiUseMystic(card, player, opponent) {
  if (card.effect === "boost" || card.effect === "shield") return player.board.length > 0;
  if (card.effect === "revive") return player.graveyard.length > 0 && player.board.length < 5;
  if (card.effect === "debuff" || card.effect === "removal") return opponent.board.length > 0;
  if (card.effect === "forcedDuel") return player.board.length > 0 && opponent.board.length > 0;
  if (card.effect === "healFilter") return player.deck.length > 0;
  if (card.effect === "graveDenyEnv") return true;
  return true;
}

function evaluateBoardAdvantage(player, opponent, playerIndex) {
  const allyPower = player.board.reduce((sum, hero) => {
    const stats = calculateStats(hero, playerIndex);
    const remainingFort = Math.max(0, stats.maxFortitude - hero.damage);
    return sum + stats.attack * 1.35 + remainingFort;
  }, 0);
  const enemyPower = opponent.board.reduce((sum, hero) => {
    const stats = calculateStats(hero, 1 - playerIndex);
    const remainingFort = Math.max(0, stats.maxFortitude - hero.damage);
    return sum + stats.attack * 1.35 + remainingFort;
  }, 0);
  return allyPower - enemyPower + (player.vitality - opponent.vitality) * 1.6;
}

function scoreAiNonHeroCard(card, player, opponent, difficulty, playerIndex) {
  if (card.type === "environment") {
    const alliedFactionUnits = player.board.filter((hero) => hero.faction === card.faction).length;
    const enemyFactionUnits = opponent.board.filter((hero) => hero.faction === card.faction).length;
    return 1 + alliedFactionUnits * 2.5 - enemyFactionUnits;
  }

  const boardDelta = evaluateBoardAdvantage(player, opponent, playerIndex);
  const enemyThreat = opponent.board.reduce((sum, hero) => {
    const stats = calculateStats(hero, 1 - playerIndex);
    return sum + stats.attack;
  }, 0);
  const damagedAllies = player.board.filter((hero) => hero.damage > 0).length;

  if (card.effect === "directDamage") {
    const lethal = opponent.vitality <= 3 ? 1000 : 0;
    return lethal + (opponent.board.length === 0 ? 9 : 6);
  }
  if (card.effect === "removal") {
    if (!opponent.board.length) return -50;
    const highestThreat = opponent.board.reduce((max, hero) => {
      const stats = calculateStats(hero, 1 - playerIndex);
      return Math.max(max, stats.attack + (stats.maxFortitude - hero.damage) * 0.4);
    }, 0);
    return 8 + highestThreat * 0.5;
  }
  if (card.effect === "forcedDuel") {
    if (!player.board.length || !opponent.board.length) return -50;
    const alliedBest = findHighestAttackHero(player.board, playerIndex);
    const enemyBest = findHighestAttackHero(opponent.board, 1 - playerIndex);
    const alliedAtk = calculateStats(alliedBest, playerIndex).attack;
    const enemyAtk = calculateStats(enemyBest, 1 - playerIndex).attack;
    return 4 + (alliedAtk - enemyAtk) * 1.4;
  }
  if (card.effect === "debuff") return 5 + enemyThreat * 0.35;
  if (card.effect === "revive") return 5 + (5 - player.board.length) * 1.6;
  if (card.effect === "shield") return 2 + (enemyThreat > 8 ? 4 : 0);
  if (card.effect === "boost") return 2 + (player.board.length >= 2 ? 2 : 0) + (boardDelta < 0 ? 1 : 0);
  if (card.effect === "healFilter") return 2 + damagedAllies * 1.8 + (player.deck.length <= 6 ? -2 : 0);
  if (card.effect === "freeSummon") {
    const expensiveHeroInHand = player.hand.some((handCard) => handCard.type === "hero" && handCard.skull >= 3 && handCard.skull <= 4);
    return expensiveHeroInHand ? 7 : 1;
  }
  if (card.effect === "graveDenyEnv") {
    const banishable = opponent.graveyard.filter((graveCard) => graveCard.type === "hero").length;
    return 1 + banishable * 2;
  }

  return difficulty === "hard" ? 2 : 1;
}

function chooseAiSacrificeIds(board, cost, difficulty) {
  if (!board.length) return [];
  if (difficulty === "easy") {
    const shuffled = shuffle(board.slice());
    const selected = [];
    let total = 0;
    for (const hero of shuffled) {
      selected.push(hero.id);
      total += hero.skull;
      if (total >= cost) break;
    }
    return total >= cost ? selected : [];
  }

  const combos = [];
  const limit = 1 << board.length;
  for (let mask = 1; mask < limit; mask += 1) {
    let skulls = 0;
    const ids = [];
    for (let i = 0; i < board.length; i += 1) {
      if (mask & (1 << i)) {
        skulls += board[i].skull;
        ids.push(board[i].id);
      }
    }
    if (skulls >= cost) {
      combos.push({ ids, skulls, overpay: skulls - cost, count: ids.length });
    }
  }
  if (!combos.length) return [];

  combos.sort((a, b) => {
    if (difficulty === "hard") {
      return a.overpay - b.overpay || a.count - b.count || a.skulls - b.skulls;
    }
    return a.count - b.count || a.skulls - b.skulls;
  });
  return combos[0].ids;
}

function chooseAiHeroCard(player, difficulty) {
  const heroes = player.hand.filter((card) => card.type === "hero");
  const playable = heroes.filter((hero) => {
    const rules = canPlayHero(player, hero);
    if (!rules.ok) return false;
    if (!rules.needsSacrifice) return true;
    const boardSkulls = player.board.reduce((sum, unit) => sum + unit.skull, 0);
    return boardSkulls >= hero.skull;
  });
  if (!playable.length) return null;

  if (difficulty === "easy") {
    return playable[Math.floor(Math.random() * playable.length)];
  }

  const ranked = playable
    .slice()
    .sort((a, b) => {
      const aTempo = a.attack + a.fortitude + (hasKeyword(a, "Guard") ? 2 : 0) + (hasKeyword(a, "Flying") ? 1 : 0);
      const bTempo = b.attack + b.fortitude + (hasKeyword(b, "Guard") ? 2 : 0) + (hasKeyword(b, "Flying") ? 1 : 0);
      if (difficulty === "hard") {
        return bTempo - aTempo || b.skull - a.skull;
      }
      return b.skull - a.skull || bTempo - aTempo;
    });
  return ranked[0];
}

function chooseAiNonHeroCard(player, opponent, difficulty) {
  const candidates = player.hand.filter((card) => card.type !== "hero");
  const usable = candidates.filter((card) => card.type === "environment" || canAiUseMystic(card, player, opponent));
  if (!usable.length) return null;

  if (difficulty === "easy") {
    return usable[Math.floor(Math.random() * usable.length)];
  }

  const aiIndex = game.activePlayer;
  return usable
    .slice()
    .sort((a, b) => scoreAiNonHeroCard(b, player, opponent, difficulty, aiIndex) - scoreAiNonHeroCard(a, player, opponent, difficulty, aiIndex))[0];
}

function chooseAiTarget(attacker, defenderOwner) {
  const aiIndex = game.activePlayer;
  const difficulty = game.ai.difficulty || "easy";
  const enemyBoard = defenderOwner.board.slice();
  const guardOnly = hasGuardHero(enemyBoard) && !hasKeyword(attacker, "Flying");
  const legalTargets = guardOnly ? enemyBoard.filter((hero) => hasKeyword(hero, "Guard")) : enemyBoard;
  const canDirect =
    (!hasGuardHero(enemyBoard) || hasKeyword(attacker, "Flying")) &&
    (enemyBoard.length === 0 || hasKeyword(attacker, "Piercing"));

  if (difficulty === "easy") {
    if (canDirect && Math.random() < 0.4) return { type: "player" };
    if (!legalTargets.length) return canDirect ? { type: "player" } : null;
    return { type: "enemy", cardId: legalTargets[Math.floor(Math.random() * legalTargets.length)].id };
  }

  if (difficulty === "hard" && canDirect) {
    const directAtk = calculateStats(attacker, aiIndex).attack;
    const directDamage = enemyBoard.length > 0 ? Math.max(1, Math.floor(directAtk / 2)) : directAtk;
    if (defenderOwner.vitality <= directDamage) {
      return { type: "player" };
    }
  }

  if (!legalTargets.length) return canDirect ? { type: "player" } : null;
  const scored = legalTargets
    .map((hero) => {
      const heroStats = calculateStats(hero, 1 - aiIndex);
      const incoming = calculateStats(attacker, aiIndex).attack;
      const remaining = heroStats.maxFortitude - hero.damage;
      const killBonus = incoming >= remaining ? 100 : 0;
      const threat = heroStats.attack;
      const retaliation = Math.max(0, threat);
      const attackerStats = calculateStats(attacker, aiIndex);
      const attackerRemaining = attackerStats.maxFortitude - attacker.damage;
      const tradesWell = retaliation >= attackerRemaining ? -20 : 12;
      return { hero, score: killBonus + threat + tradesWell };
    })
    .sort((a, b) => b.score - a.score);

  if (difficulty === "hard" && canDirect) {
    const bestTradeScore = scored[0].score;
    const directAtk = calculateStats(attacker, aiIndex).attack;
    const directDamage = defenderOwner.board.length > 0 ? Math.max(1, Math.floor(directAtk / 2)) : directAtk;
    if (defenderOwner.vitality <= 8 && directDamage >= 2 && bestTradeScore < 120) {
      return { type: "player" };
    }
  }

  if (difficulty === "medium" && canDirect && defenderOwner.board.length === 0) {
    return { type: "player" };
  }
  return { type: "enemy", cardId: scored[0].hero.id };
}

function maybeScheduleAiTurn() {
  if (!game.ai.enabled || game.gameOver || isOnlineMode() || !isAiPlayer(game.activePlayer) || game.ai.thinking) return;
  game.ai.thinking = true;
  setAction(`${getCurrentPlayer().name} is plotting a move...`);
  render();
  window.setTimeout(runAiTurn, 550);
}

function runAiTurn() {
  if (!game.ai.enabled || game.gameOver || !isAiPlayer(game.activePlayer)) {
    game.ai.thinking = false;
    return;
  }

  const current = getCurrentPlayer();
  const opponent = getOpponent();
  const difficulty = game.ai.difficulty || "easy";

  const heroCard = chooseAiHeroCard(current, difficulty);
  if (heroCard && !game.heroPlayUsed) {
    processIntent({ type: "play-card", cardId: heroCard.id });
    if (game.pendingSacrifice) {
      const sacrificeIds = chooseAiSacrificeIds(current.board, game.pendingSacrifice.cost, difficulty);
      game.pendingSacrifice.chosen = new Set(sacrificeIds);
      processIntent({ type: "confirm-sacrifice" });
    }
  }

  const nonHeroCard = chooseAiNonHeroCard(current, opponent, difficulty);
  if (nonHeroCard && !game.nonHeroPlayUsed) {
    processIntent({ type: "play-card", cardId: nonHeroCard.id });
  }

  const attackers = current.board.filter((hero) => !hero.exhausted).map((hero) => hero.id);
  for (const attackerId of attackers) {
    if (game.gameOver) break;
    const attacker = current.board.find((hero) => hero.id === attackerId);
    if (!attacker || attacker.exhausted) continue;
    const choice = chooseAiTarget(attacker, opponent);
    if (!choice) continue;
    processIntent({ type: "select-attacker", cardId: attacker.id });
    if (choice.type === "enemy") {
      processIntent({ type: "target-enemy", cardId: choice.cardId });
    } else {
      processIntent({ type: "target-player" });
    }
  }

  game.ai.thinking = false;
  if (!game.gameOver && isAiPlayer(game.activePlayer)) {
    processIntent({ type: "end-turn" });
  }
}

function startGame() {
  configureMatchMode();
  const playerTwoName = game.ai.enabled ? `PC (${game.ai.difficulty[0].toUpperCase()}${game.ai.difficulty.slice(1)})` : "Player 2";
  game.players = [createPlayer("Player 1"), createPlayer(playerTwoName)];
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
  maybeScheduleAiTurn();
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
  maybeScheduleAiTurn();
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
  const canViewHand = (!isOnlineMode() || canLocalControlPlayer(index)) && !isAiPlayer(index);

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
