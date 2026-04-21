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
