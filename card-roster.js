const HERO_LIBRARY = [
  { name: "Acolyte of Embers", skull: 1, attack: 2, fortitude: 2, faction: "Flame", keywords: ["Berserk"] },
  { name: "Moonblade Scout", skull: 1, attack: 1, fortitude: 3, faction: "Lunar", keywords: ["Piercing", "Flying"] },
  { name: "Sanctum Defender", skull: 2, attack: 2, fortitude: 4, faction: "Radiant", keywords: ["Guard"] },
  { name: "Grave Oath Knight", skull: 2, attack: 3, fortitude: 3, faction: "Umbral", keywords: ["Deathburst"] },
  { name: "Solar Templar", skull: 3, attack: 4, fortitude: 4, faction: "Radiant", keywords: ["Vanguard"] },
  { name: "Ashfang Titan", skull: 4, attack: 6, fortitude: 5, faction: "Flame", keywords: ["Piercing", "Shattershield"] },
  { name: "Night Crown Tyrant", skull: 5, attack: 7, fortitude: 7, faction: "Umbral", keywords: ["Deathburst", "Berserk"] },
  { name: "Tide Oracle", skull: 3, attack: 3, fortitude: 5, faction: "Tide", keywords: ["Retaliate"] },
  { name: "Deep Leviathan", skull: 5, attack: 8, fortitude: 6, faction: "Tide", keywords: ["Piercing", "Guard"] },
  { name: "Lunar Ascendant", skull: 4, attack: 5, fortitude: 6, faction: "Lunar", keywords: ["Flying", "Vanguard"] },
];

const MYSTIC_LIBRARY = [
  { name: "Runic Surge", effect: "boost", text: "+2 Attack and +2 Fortitude to your weakest allied hero." },
  { name: "Forbidden Gate", effect: "freeSummon", text: "Next hero this turn ignores sacrifice requirements." },
  { name: "Aegis Veil", effect: "shield", text: "Your most damaged allied hero blocks the next incoming attack." },
  { name: "Soul Recall", effect: "revive", text: "Revive one hero from your graveyard to battlefield." },
  { name: "Null Hex", effect: "debuff", text: "Enemy hero with highest Attack gets -2 Attack and becomes exhausted." },
  { name: "Sever Thread", effect: "removal", text: "Destroy the weakest enemy hero." },
  { name: "Blood Oath Challenge", effect: "forcedDuel", text: "Highest-Attack allied and enemy heroes immediately duel." },
  { name: "Cinder Volley", effect: "directDamage", text: "Deal 3 damage directly to enemy vitality." },
  { name: "Wellspring Rite", effect: "healFilter", text: "Heal 3 Fortitude to your most damaged hero, then draw 1 and discard 1." },
  { name: "Rift Collapse", effect: "graveDenyEnv", text: "Banish up to 2 heroes from enemy graveyard, then refresh the environment." },
];

const ENV_LIBRARY = [
  { name: "Sunlit Bastion", faction: "Radiant", buffAttack: 1, buffFortitude: 1 },
  { name: "Crimson Wastes", faction: "Flame", buffAttack: 1, buffFortitude: 1 },
  { name: "Midnight Eclipse", faction: "Umbral", buffAttack: 1, buffFortitude: 1 },
  { name: "Moonwell Grove", faction: "Lunar", buffAttack: 1, buffFortitude: 1 },
  { name: "Abyssal Current", faction: "Tide", buffAttack: 1, buffFortitude: 1 },
];
