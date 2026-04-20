# Divine Light PvP Digital TCG

A lightweight JavaScript PvP (hotseat) digital trading card battle game.

## Features

- **Hero cards** with 1-5 skull ratings, attack, and fortitude.
- **Sacrifice system**:
  - 1-2 skull heroes can be played freely.
  - 3-5 skull heroes require sacrificing heroes whose skull total meets or exceeds the card's skull cost.
- **Mystic cards** with effects:
  - Stat boost
  - Free high-skull summon (no sacrifice)
  - Shield against one attack
  - Revival from graveyard
- **Environment cards**:
  - Exactly one global environment at a time.
  - Playing a new one replaces the old one, regardless of owner.
  - Environment boosts a specific faction's heroes.
- **Vitality and overflow damage**:
  - Players start with vitality.
  - Overkill damage to a hero spills over to player vitality.

## Run

Open `index.html` in any modern browser.

No build step is required.
