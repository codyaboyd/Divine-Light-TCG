# Divine Light PvP Digital TCG

A lightweight JavaScript digital trading card battle game with local hotseat and online WebRTC PvP.

## Features

- **Hero cards** with 1-5 skull ratings, attack, and fortitude.
- **Play tempo layer**:
  - You may play up to **one Hero card per turn**.
  - You may also play up to **one non-Hero card per turn** (Mystic or Environment).
- **Sacrifice system**:
  - 1-2 skull heroes can be played freely.
  - 3-5 skull heroes require sacrificing heroes whose skull total meets or exceeds the card's skull cost.
- **Mystic cards** with effects:
  - Stat boost
  - Free 3-4 skull summon (no sacrifice)
  - Shield against one attack
  - Revival from graveyard
- **Environment cards**:
  - Exactly one global environment at a time.
  - Playing a new one replaces the old one, regardless of owner.
  - Environment boosts a specific faction's heroes.
- **Faction identity package**: every faction now has a gameplay keyword and combat style that informs deckbuilding.
- **Vitality and overflow damage**:
  - Players start with vitality.
  - Overkill damage to a hero spills over to player vitality.
- **Combat pacing rules for balance**:
  - Direct attacks can only be made when the defending player controls no heroes.
  - Free summon effects cannot bypass sacrifice costs for 5-skull heroes.
- **Online PvP over WebRTC**:
  - Host/join modes with manual SDP exchange (copy/paste).
  - Peer-to-peer sync using a data channel (host-authoritative game state).
  - Opponent hand is hidden during online matches.

## Detailed Rules

### 1) Objective
- Reduce the opponent's **Vitality** to 0.
- Each player starts at **30 Vitality**.
- If both players drop to 0 or less at the same time, the duel is a draw.

### 2) Deck and Starting Setup
- Each player's deck is generated with:
  - **16 Hero cards**
  - **8 Mystic cards**
  - **5 Environment cards**
- At game start, both players draw **5 cards**.
- There is no mulligan system.

### 3) Board, Hand, and Limits
- **Battlefield limit:** up to **5 heroes** per player.
- **Hand limit:** up to **10 cards**.
- If your deck is empty, you cannot draw.

### 4) Card Types

#### Heroes
- Have **Skulls** (cost/rank), **Attack**, **Fortitude**, and **Faction**.
- Enter play **exhausted** (cannot attack immediately that turn).

#### Mystics
Mystics are cast from hand, then go to graveyard after resolving:
- **Runic Surge (boost):** Gives an allied hero +2 Attack and +2 Fortitude.
- **Forbidden Gate (free summon):** Lets you summon one 3-4 skull hero this turn without sacrifice.
- **Aegis Veil (shield):** Gives one allied hero a one-time shield against the next incoming attack.
- **Soul Recall (revive):** Revives one hero from your graveyard to your battlefield (if space is available).

#### Environments
- Only **one** environment exists globally.
- Playing a new environment replaces the current one.
- Environment buffs apply to matching faction heroes: **+1 Attack / +1 Fortitude**.

#### Faction identities
Each faction has a baseline style and keyword hook so deck themes are mechanically distinct:

- **Flame — Aggression / Burn:** Flame heroes gain **+1 Attack during your turn** while they are unshielded. This faction is tuned for pressure and fast lethality.
- **Radiant — Shield / Control:** The first time each turn you play a Radiant hero, give it **Ward** (blocks the next incoming attack this turn). Radiant decks stall and win through favorable trades.
- **Umbral — Sacrifice Value:** Once per turn, when one of your heroes is sacrificed, your lowest-skull Umbral hero gets **+1/+1 permanently**. Umbral decks convert board resources into scaling threats.
- **Tide — Revival Loop:** The first Tide hero you revive each turn enters **ready** instead of exhausted. Tide decks grind with recursion and repeated value.
- **Lunar — Tempo / Reposition:** The first time each turn a Lunar hero attacks, it may **ready one allied hero with 2 or less skulls**. Lunar decks emphasize sequencing and multi-action turns.

These faction hooks are additive with Environment buffs and are intended to define archetypes (aggro, control, sacrifice-midrange, recursion, tempo-combo).

### 5) Summoning and Sacrifice Rules
- **Play cap each turn:**
  - Up to **1 Hero play**.
  - Up to **1 non-Hero play** (Mystic or Environment).
- **1-2 skull heroes:** free summon (no sacrifice needed).
- **3-5 skull heroes:** require sacrifice unless bypassed by a free-summon effect.
- To sacrifice:
  - Select allied heroes on your board.
  - Total selected skulls must be **at least** the summoned hero's skull value.
  - Selected heroes are moved to your graveyard.
- **Forbidden Gate restriction:**
  - Can bypass sacrifice only for **3-4 skull** heroes.
  - **Cannot** bypass sacrifice for **5-skull** heroes.
- Free summon status expires if unused by end of turn.

### 6) Turn Structure
On your turn you can:
- Play up to **one Hero** and up to **one non-Hero** card.
- Attack with ready heroes.
- Draw manually once.
- End turn.

At **end turn**:
1. Active player switches.
2. New active player's heroes are refreshed (exhaustion removed).
3. New active player draws **1 card**.
4. New turn begins.

### 7) Drawing Cards
- Each player draws 5 at game start.
- At the start of each player's turn (after turn passes), they draw 1 automatically.
- There is a **Draw button** that can be used **once per turn** for an additional draw.

### 8) Combat Rules

#### Attacking heroes
- An attacker must be unexhausted.
- Hero combat is simultaneous:
  - Attacker deals damage to target.
  - Target retaliates with its Attack.
- Both units can be defeated in the same battle.

#### Shield interaction
- If the defender is shielded, the attack is fully blocked:
  - Shield is removed.
  - Attacker still becomes exhausted.
  - No combat damage is exchanged.

#### Direct attacks
- You can attack the opposing player directly **only if they control no heroes**.

#### Overflow damage
- If attack damage exceeds a target hero's remaining fortitude, excess damage is dealt to the defending player's Vitality.

### 9) Damage and Defeat
- Heroes track accumulated damage.
- A hero is defeated when damage is greater than or equal to its current max fortitude.
- Defeated heroes are sent to graveyard.

### 10) Graveyard and Revival
- Sacrificed heroes and defeated cards go to graveyard.
- **Soul Recall** revives the top hero in graveyard order to the battlefield:
  - Revived hero enters exhausted.
  - Revived hero has no damage.
  - Revived hero is not shielded.

### 11) Faction Identity Rules Clarifications
- Faction identity effects are always active unless a card specifically overrides them.
- "First time each turn" resets at the start of the active player's turn.
- If multiple effects trigger simultaneously, the active player orders their own triggers first, then the defending player orders theirs.
- A hero can only have one shield instance at a time (from Ward/Aegis Veil); additional shield grants refresh, not stack.

### 12) Online PvP Rules (WebRTC)
- Host is authoritative for game state.
- Guest sends intents (play card, attack, etc.) to host.
- Host validates actions and broadcasts the updated state.
- In online mode:
  - Host controls Player 1.
  - Guest controls Player 2.
  - You can only act on your own turn.
  - Opponent hand contents are hidden.

## Run

Open `index.html` in any modern browser.

No build step is required.

For online play:
1. Host chooses **Host Match**, then clicks **Create Offer** and shares the local signal blob.
2. Guest chooses **Join Match**, pastes the host offer in **Remote Signal**, clicks **Create Answer**, and shares their local signal.
3. Host pastes the guest answer into **Remote Signal** and clicks **Set Remote Description**.
