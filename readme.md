# Tower – Design Notes

## Current Gameplay Loop
- Focus converts 1 Energy → 1 Mana; can be held for repeated pulses.
- Meditate restores 5 Energy over 5 seconds, incrementing a meditation counter used for later unlocks.
- Intent unlocks after 3 completed meditations; while resting, quick taps grant +10 Energy (up to +50 total) or hold 1 s to channel the full remaining bonus.
- Studying unlocks at Lore 2; trades 5 Mana for 1 Lore with repeat-on-hold support.
- Climbing unlocks at Lore 4; each ascent also requires enough Lore for the next floor, removing energy only if the requirement is met. Random events, drops, and tempo gains can trigger during climbs.
- Passive Lore trickles in at 0.05 per second; reaching Floor 10 fast grants Tempo but resets Lore and passive progress.

## Save & Session Helpers
- Autosaves after every tick and log entry.
- Manual save/load buttons plus JSON import/export.
- Refresh wake-up message uses `sessionStorage` flag.

## Brainstorming: Future Mechanics

### Resource Layer
- [ ] New resource? (e.g. `Focus`, `Resolve`, `Courage`) – define producers/consumers.
- [ ] Passive regen tuning knobs (different per floor, weather, fatigue).
- [ ] Consumables craft system using inventory drops.

### Floor Events
- [ ] Branching story beats with persistent choices.
- [ ] Timed challenges (respond within N seconds).
- [ ] Companion NPC encounters that add buffs/debuffs.

### Progression & Unlocks
- [ ] Skill tree tied to Lore milestones.
- [ ] Tempo-based prestige loop rewarding quick runs.
- [ ] Tower “wings” that reset specific stats for alternative climbs.

### UI & Feedback
- [x] Dedicated status panel for active buffs/debuffs.
- [ ] Sound/visual cues when buttons enable/disable.
- [ ] Lore codex that records discovered entries.

### Testing & Polish
- [ ] Add automated tick regression tests (energy/mana math).
- [ ] Verify autosave integrity across browsers.
- [ ] Localize strings (en → other languages).

Feel free to expand each checkbox with details, mock values, or quick notes as ideas develop.

## Local Development

Serve over HTTP so the in‑page Readme fetch works:

1) Install Wrangler (Cloudflare Workers CLI):

```
npm i -g wrangler
```

2) From the project root, start a local server:

```
wrangler dev --local
```

This serves the folder defined by `assets.directory` in `wrangler.jsonc` (currently `./`).

3) Open the printed localhost URL. The "Show Game Mechanics" button will load `readme.md` via fetch.

Notes
- Opening `tower.html` directly via `file://` may block `fetch('readme.md')` due to browser restrictions.
- Deploy to Cloudflare:

```
wrangler deploy
```
