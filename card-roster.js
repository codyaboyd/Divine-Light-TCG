const CARD_ASSET_BASE_URL = "https://cards.divine-light-tcg.workers.dev";

function withAsset(card, number) {
  return {
    ...card,
    number,
    asset: `${CARD_ASSET_BASE_URL}/${number}.webp`,
  };
}

const HERO_LIBRARY = [
  withAsset({ name: "Zeus, Thunder Sovereign", skull: 1, attack: 2, fortitude: 2, faction: "Olympian", keywords: ["Berserk"] }, 1),
  withAsset({ name: "Tengu Windblade", skull: 1, attack: 1, fortitude: 3, faction: "Yokai", keywords: ["Piercing", "Flying"] }, 2),
  withAsset({ name: "Anubis Gatekeeper", skull: 2, attack: 2, fortitude: 4, faction: "Netjer", keywords: ["Guard"] }, 3),
  withAsset({ name: "Valkyrie of Fallen Oaths", skull: 2, attack: 3, fortitude: 3, faction: "Aesir", keywords: ["Deathburst"] }, 4),
  withAsset({ name: "Athena Aegisbearer", skull: 3, attack: 4, fortitude: 4, faction: "Olympian", keywords: ["Vanguard"] }, 5),
  withAsset({ name: "Fenrir World-Breaker", skull: 4, attack: 6, fortitude: 5, faction: "Aesir", keywords: ["Piercing", "Shattershield"] }, 6),
  withAsset({ name: "Set, Lord of Red Storm", skull: 5, attack: 7, fortitude: 7, faction: "Netjer", keywords: ["Deathburst", "Berserk"] }, 7),
  withAsset({ name: "Shesha, Endless Coil", skull: 3, attack: 3, fortitude: 5, faction: "Naga", keywords: ["Retaliate"] }, 8),
  withAsset({ name: "Yamata no Orochi", skull: 5, attack: 8, fortitude: 6, faction: "Yokai", keywords: ["Piercing", "Guard"] }, 9),
  withAsset({ name: "Garuda, Sky Judge", skull: 4, attack: 5, fortitude: 6, faction: "Naga", keywords: ["Flying", "Vanguard"] }, 10),
];

const MYSTIC_LIBRARY = [
  withAsset({ name: "Ambrosial Benediction", effect: "boost", text: "+2 Attack and +2 Fortitude to your weakest allied deity." }, 11),
  withAsset({ name: "Bifröst Descent", effect: "freeSummon", text: "Next deity this turn ignores offering requirements." }, 12),
  withAsset({ name: "Mirror of Yata", effect: "shield", text: "Your most damaged allied deity blocks the next incoming attack." }, 13),
  withAsset({ name: "Book of Returning Souls", effect: "revive", text: "Revive one deity from your graveyard to battlefield." }, 14),
  withAsset({ name: "Curse of the Dullahan", effect: "debuff", text: "Enemy deity with highest Attack gets -2 Attack and becomes exhausted." }, 15),
  withAsset({ name: "Moirai's Severed Thread", effect: "removal", text: "Destroy the weakest enemy deity." }, 16),
  withAsset({ name: "Trial of Heroes", effect: "forcedDuel", text: "Highest-Attack allied and enemy deities immediately duel." }, 17),
  withAsset({ name: "Raijin's Bolt", effect: "directDamage", text: "Deal 3 damage directly to enemy vitality." }, 18),
  withAsset({ name: "Soma Renewal", effect: "healFilter", text: "Heal 3 Fortitude to your most damaged deity, then draw 1 and discard 1." }, 19),
  withAsset({ name: "Ereshkigal's Edict", effect: "graveDenyEnv", text: "Banish up to 2 deities from enemy graveyard, then refresh the realm." }, 20),
];

const ENV_LIBRARY = [
  withAsset({ name: "Mount Olympus", faction: "Olympian", buffAttack: 1, buffFortitude: 1 }, 21),
  withAsset({ name: "Asgardian Warfield", faction: "Aesir", buffAttack: 1, buffFortitude: 1 }, 22),
  withAsset({ name: "Duat Necropolis", faction: "Netjer", buffAttack: 1, buffFortitude: 1 }, 23),
  withAsset({ name: "Palace of the Naga", faction: "Naga", buffAttack: 1, buffFortitude: 1 }, 24),
  withAsset({ name: "Hyakki Twilight", faction: "Yokai", buffAttack: 1, buffFortitude: 1 }, 25),
];
