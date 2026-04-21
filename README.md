# Mythos Ascendant PvP Digital TCG

A lightweight JavaScript digital trading card battle game where gods and mythical creatures from world mythologies clash in local hotseat, single-player vs PC, or online WebRTC PvP.

## Features

- **Deity cards** with 1-5 skull ratings, attack, fortitude, faction, and keywords.
- **Play tempo layer**:
  - Up to **one Deity card per turn**.
  - Up to **one non-Deity card per turn** (Relic or Realm).
- **Offering system**:
  - 1-2 skull deities can be played freely.
  - 3-5 skull deities require offering allied deities whose skull total meets or exceeds the card's skull cost.
- **Relic cards** with tactical effects:
  - Empowering, shielding, revival, debuffs, removal, forced duels, direct vitality damage, healing/filtering, and grave denial.
- **Realm cards**:
  - Exactly one global realm at a time.
  - Playing a new one replaces the old one.
  - Realm blessings buff one faction's units.
- **Faction identity package** with five world-myth inspired factions:
  - **Olympian** (aegis control)
  - **Aesir** (aggression)
  - **Netjer** (sacrifice scaling)
  - **Naga** (revival loop)
  - **Yokai** (tempo repositioning)
- **Vitality and overflow damage** support, plus combat keyword interactions.
- **Single-player mode vs PC** with random decks and three AI difficulties (Easy, Medium, Hard).
- **Online PvP over WebRTC** with host/join and host-authoritative state sync.

## Run

Open `index.html` in any modern browser.

No build step is required.

For online play:
1. Host chooses **Host Conclave**, then clicks **Create Offer** and shares the local signal blob.
2. Guest chooses **Join Conclave**, pastes the host offer in **Remote Signal**, clicks **Create Answer**, and shares their local signal.
3. Host pastes the guest answer into **Remote Signal** and clicks **Set Remote Description**.
