const CARD_ASSET_BASE_URL = "https://cards.divine-light-tcg.workers.dev";

function withAsset(card, number) {
  return {
    ...card,
    number,
    asset: `${CARD_ASSET_BASE_URL}/${number}.webp`,
  };
}

const HERO_LIBRARY = [
  withAsset({ name: "Acolyte of Embers", skull: 1, attack: 2, fortitude: 2, faction: "Flame", keywords: ["Berserk"] }, 1),
  withAsset({ name: "Moonblade Scout", skull: 1, attack: 1, fortitude: 3, faction: "Lunar", keywords: ["Piercing", "Flying"] }, 2),
  withAsset({ name: "Sanctum Defender", skull: 2, attack: 2, fortitude: 4, faction: "Radiant", keywords: ["Guard"] }, 3),
  withAsset({ name: "Grave Oath Knight", skull: 2, attack: 3, fortitude: 3, faction: "Umbral", keywords: ["Deathburst"] }, 4),
  withAsset({ name: "Solar Templar", skull: 3, attack: 4, fortitude: 4, faction: "Radiant", keywords: ["Vanguard"] }, 5),
  withAsset({ name: "Ashfang Titan", skull: 4, attack: 6, fortitude: 5, faction: "Flame", keywords: ["Piercing", "Shattershield"] }, 6),
  withAsset({ name: "Night Crown Tyrant", skull: 5, attack: 7, fortitude: 7, faction: "Umbral", keywords: ["Deathburst", "Berserk"] }, 7),
  withAsset({ name: "Tide Oracle", skull: 3, attack: 3, fortitude: 5, faction: "Tide", keywords: ["Retaliate"] }, 8),
  withAsset({ name: "Deep Leviathan", skull: 5, attack: 8, fortitude: 6, faction: "Tide", keywords: ["Piercing", "Guard"] }, 9),
  withAsset({ name: "Lunar Ascendant", skull: 4, attack: 5, fortitude: 6, faction: "Lunar", keywords: ["Flying", "Vanguard"] }, 10),
];

const MYSTIC_LIBRARY = [
  withAsset({ name: "Runic Surge", effect: "boost", text: "+2 Attack and +2 Fortitude to your weakest allied hero." }, 11),
  withAsset({ name: "Forbidden Gate", effect: "freeSummon", text: "Next hero this turn ignores sacrifice requirements." }, 12),
  withAsset({ name: "Aegis Veil", effect: "shield", text: "Your most damaged allied hero blocks the next incoming attack." }, 13),
  withAsset({ name: "Soul Recall", effect: "revive", text: "Revive one hero from your graveyard to battlefield." }, 14),
  withAsset({ name: "Null Hex", effect: "debuff", text: "Enemy hero with highest Attack gets -2 Attack and becomes exhausted." }, 15),
  withAsset({ name: "Sever Thread", effect: "removal", text: "Destroy the weakest enemy hero." }, 16),
  withAsset({ name: "Blood Oath Challenge", effect: "forcedDuel", text: "Highest-Attack allied and enemy heroes immediately duel." }, 17),
  withAsset({ name: "Cinder Volley", effect: "directDamage", text: "Deal 3 damage directly to enemy vitality." }, 18),
  withAsset({ name: "Wellspring Rite", effect: "healFilter", text: "Heal 3 Fortitude to your most damaged hero, then draw 1 and discard 1." }, 19),
  withAsset({ name: "Rift Collapse", effect: "graveDenyEnv", text: "Banish up to 2 heroes from enemy graveyard, then refresh the environment." }, 20),
];

const ENV_LIBRARY = [
  withAsset({ name: "Sunlit Bastion", faction: "Radiant", buffAttack: 1, buffFortitude: 1 }, 21),
  withAsset({ name: "Crimson Wastes", faction: "Flame", buffAttack: 1, buffFortitude: 1 }, 22),
  withAsset({ name: "Midnight Eclipse", faction: "Umbral", buffAttack: 1, buffFortitude: 1 }, 23),
  withAsset({ name: "Moonwell Grove", faction: "Lunar", buffAttack: 1, buffFortitude: 1 }, 24),
  withAsset({ name: "Abyssal Current", faction: "Tide", buffAttack: 1, buffFortitude: 1 }, 25),
];
