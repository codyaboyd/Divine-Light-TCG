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

function isAiPlayer(playerIndex) {
  return game.ai.enabled && game.ai.playerIndex === playerIndex;
}

function canLocalControlPlayer(playerIndex) {
  if (isAiPlayer(playerIndex)) return false;
  if (!isOnlineMode()) return true;
  return net.localPlayerIndex === playerIndex;
}

function canLocalTakeTurnActions() {
  if (!isOnlineMode() && isAiPlayer(game.activePlayer)) return false;
  if (!isOnlineMode()) return true;
  return net.connected && net.localPlayerIndex === game.activePlayer;
}
