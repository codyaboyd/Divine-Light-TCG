# Mythos Ascendant PvP Digital TCG

Mythos Ascendant is a fast, browser-based digital trading card game where gods and mythical beings from multiple pantheons battle in tactical duels.

You can play:
- **Local hotseat** (2 players on one device)
- **Single-player vs PC** (**Easy / Medium / Hard**)
- **Online PvP** via **manual WebRTC signaling** (copy/paste offer/answer)

---

## Table of Contents

- [What You Need](#what-you-need)
- [Quick Start (60 seconds)](#quick-start-60-seconds)
- [How to Start a Match](#how-to-start-a-match)
- [Online PvP Setup (Host + Guest)](#online-pvp-setup-host--guest)
- [How to Play](#how-to-play)
  - [Turn Structure](#turn-structure)
  - [Card Types](#card-types)
  - [Offering (Sacrifice) Rules](#offering-sacrifice-rules)
  - [Combat Rules](#combat-rules)
  - [Keywords](#keywords)
  - [Faction Identity](#faction-identity)
- [UI Guide](#ui-guide)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Customization Notes](#customization-notes)
- [License](#license)

---

## What You Need

- A modern desktop browser (Chrome, Edge, Firefox, Safari)
- No build tools
- No package install
- No backend server (for local play and AI)

For online PvP, both players should use browsers with WebRTC support and be able to exchange text blobs (chat, DM, etc.).

---

## Quick Start (60 seconds)

1. **Download or clone** this repository.
2. Open **`index.html`** in your browser.
3. Choose a mode in **Match Type**.
4. Click **Invoke Match**.
5. Play cards directly from your hand and use **End Turn** when finished.

---

## How to Start a Match

1. Launch `index.html`.
2. In the start menu, choose one:
   - **Two-Player Hotseat**
   - **Single Player vs PC (Easy)**
   - **Single Player vs PC (Medium)**
   - **Single Player vs PC (Hard)**
3. Click **Invoke Match**.
4. Use **New Prophecy** any time to reset and start fresh.

---

## Online PvP Setup (Host + Guest)

> Online mode uses **manual signaling** in the in-game WebRTC panel.

### Host flow

1. Set **Mode** to **Host Conclave**.
2. Click **Apply Mode**.
3. Click **Create Offer**.
4. Copy **Local Signal** and send it to the guest.
5. Paste guest response into **Remote Signal**.
6. Click **Set Remote Description**.

### Guest flow

1. Set **Mode** to **Join Conclave**.
2. Click **Apply Mode**.
3. Paste host offer into **Remote Signal**.
4. Click **Create Answer**.
5. Copy **Local Signal** and send it back to host.

### Important notes

- The connection is **host-authoritative**.
- Host controls **Player 1**.
- Guest controls **Player 2**.
- If desync/disconnect happens, both players should restart with **New Prophecy** and reconnect.

---

## How to Play

### Turn Structure

Each turn you can generally:

- Play up to **1 Deity** card
- Play up to **1 non-Deity** card (**Relic** or **Realm**)
- Attack with ready Deities
- End your turn

A card is usually exhausted after attacking and refreshes later.

### Card Types

- **Deity**: Units placed on your battlefield (max 5). They attack, defend, and use keywords.
- **Relic**: Tactical one-shot effects (buffs, removal, duel effects, damage, healing/filtering, etc.).
- **Realm**: Global battlefield effect; only one Realm can exist at a time. Playing a new one replaces the current Realm.

### Offering (Sacrifice) Rules

Deity skull cost determines summon requirements:

- **1–2 skull**: free to summon
- **3–5 skull**: requires offerings from allied Deities with total skulls that meet/exceed the cost

Some Relic effects can bypass offering requirements for certain costs.

### Combat Rules

- Attack enemy Deities by selecting your attacker, then a target.
- Some effects/keywords can alter targeting rules.
- If valid, direct vitality damage can be dealt to the opposing player.
- Combat can include:
  - retaliation damage
  - overflow interactions
  - shield interactions
- Deities are defeated when damage meets or exceeds current Fortitude.

### Keywords

Common keyword behavior includes:

- **Guard**: Restricts opposing attacks to guard units unless bypassed.
- **Flying**: Can help bypass guard-based targeting limits.
- **Piercing**: Improves ability to pressure vitality directly.
- **Vanguard**: Grants shield on summon.
- **Berserk**: Gains offensive bonus while damaged.
- **Deathburst**: Triggers vitality damage on defeat.

### Faction Identity

- **Olympian**: Aegis/control
- **Aesir**: Aggressive pressure
- **Netjer**: Sacrifice scaling
- **Naga**: Revival loops
- **Yokai**: Tempo/repositioning

---

## UI Guide

- **Current Turn**: Active player indicator
- **Realm**: Current global environment
- **Action**: Live rules/action feedback
- **Player Panels** show:
  - Vitality
  - Deck count
  - Graveyard size
  - Banished size
  - Battlefield
  - Hand
- **Controls**:
  - **End Turn**
  - **New Prophecy** (full reset)

---

## Troubleshooting

### I can open the file, but nothing happens

- Make sure JavaScript is enabled.
- Hard-refresh the page (`Ctrl+Shift+R` or `Cmd+Shift+R`).
- Confirm all project files are in the same folder as `index.html`.

### Online mode won’t connect

- Verify both players applied the correct mode (**Host Conclave** vs **Join Conclave**).
- Ensure offer/answer JSON was pasted fully (no missing braces/characters).
- Retry from scratch using **New Prophecy** and regenerate offer/answer.
- Some strict networks/firewalls may block peer connectivity even with STUN.

### The game state looks wrong in online mode

- Host is authoritative; guest mirrors host snapshots.
- If state appears stale, reconnect and restart the match.

---

## Project Structure

- `index.html` – app shell + UI layout
- `style.css` – visual theme and animations
- `game-state.js` – shared state and DOM references
- `game.js` – core gameplay loop, rules, AI, render flow
- `game-network.js` – WebRTC connect/signaling + state sync
- `game-utils.js` – utility helpers
- `card-roster.js` – card pools and definitions

---

## Customization Notes

Want to tune gameplay quickly?

- Edit card pools in `card-roster.js`.
- Adjust deck composition and match defaults in `game.js`.
- Modify balance through skull costs, attack/fortitude, and Relic effects.

Tip: keep faction identities distinct when balancing so each deck archetype stays meaningful.

---

## License

This project is licensed under the terms in [`LICENSE`](LICENSE).
