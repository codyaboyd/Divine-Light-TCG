# Divine Light PvP Digital TCG

A lightweight JavaScript digital trading card battle game with local hotseat and online WebRTC PvP.

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
- **Online PvP over WebRTC**:
  - Host/join modes with manual SDP exchange (copy/paste).
  - Peer-to-peer sync using a data channel (host-authoritative game state).
  - Opponent hand is hidden during online matches.

## Run

Open `index.html` in any modern browser.

No build step is required.

For online play:
1. Host chooses **Host Match**, then clicks **Create Offer** and shares the local signal blob.
2. Guest chooses **Join Match**, pastes the host offer in **Remote Signal**, clicks **Create Answer**, and shares their local signal.
3. Host pastes the guest answer into **Remote Signal** and clicks **Set Remote Description**.
