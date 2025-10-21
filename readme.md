# Tower – Design Notes

## Current Gameplay Loop
- Focus converts 1 Energy → 1 Mana; can be held for repeated pulses.
- Meditate restores 5 Energy over 5 seconds and temporarily locks other actions.
- Studying unlocks at Lore 2; trades 5 Mana for 1 Lore with repeat-on-hold support.
- Climbing unlocks at Lore 4; floor cost scales and can trigger random events, drops, or tempo gains.

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
- [ ] Dedicated status panel for active buffs/debuffs.
- [ ] Sound/visual cues when buttons enable/disable.
- [ ] Lore codex that records discovered entries.

### Testing & Polish
- [ ] Add automated tick regression tests (energy/mana math).
- [ ] Verify autosave integrity across browsers.
- [ ] Localize strings (en → other languages).

Feel free to expand each checkbox with details, mock values, or quick notes as ideas develop.
