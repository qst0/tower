// ---- README/Mechanics Modal Logic ----
const showReadmeBtn = document.getElementById("showReadmeBtn");
const logDiv = document.getElementById("log");
const intentBtn = document.getElementById("intentBtn");
const actionsContainer = document.getElementById("actions");
const debugPanel = document.getElementById("debugPanel");
const toggleDebugBtn = document.getElementById("toggleDebugBtn");
const ponderBtn = document.getElementById("ponderBtn");
const statusList = document.getElementById("statusList");
let logBackup = null;
let readmeActive = false;
const PASSIVE_LORE_RATE = 0.05; // Lore per second of passive study
const INTENT_UNLOCK_MEDITATIONS = 3;
const INTENT_MAX_BONUS = 50;
const INTENT_CLICK_BONUS = 10;
const INTENT_HOLD_DURATION = 1000;
let autoRefreshHandle = null;
let intentSessionEnergy = 0;
let intentHoldTimeout = null;
let intentHoldStart = null;
let intentHoldCompleted = false;
let intentActive = false;
const ACTION_BASE_ORDER = ["focusBtn", "restBtn", "intentBtn", "studyBtn", "climbBtn"];
const ACTION_PRIORITIES = {
  climbBtn: 5,
  studyBtn: 4,
  restBtn: 3,
  intentBtn: 2,
  focusBtn: 1,
};
const PONDER_QUIPS = [
  "You trace the cracks between floors; they form unseen constellations.",
  "The tower hums softly, as if whispering a forgotten lullaby.",
  "A draft of ancient breath circles you, carrying the scent of old wars.",
  "Visions of staircases curling into infinity flicker behind your eyes.",
  "You sense the tower thinking back—quiet, patient, assessing.",
  "Walls breathe in tandem with you, their heartbeat slow and deep.",
  "The floor beneath your feet feels lighter, as if ready to rise.",
  "You recall advice from a forgotten mentor: \"Listen before you climb.\"",
  "Glyphs shimmer in your mind, rearranging themselves into new meanings.",
  "A distant bell tolls once; resonance lingers in your bones."
];


function toggleReadme(force) {
  const shouldShow = typeof force === "boolean" ? force : !readmeActive;
  if (shouldShow) {
    if (readmeActive) return;
    readmeActive = true;
    logBackup = logDiv.innerHTML;
    showReadmeBtn.textContent = "Hide Game Mechanics 📖";
    logDiv.innerHTML =
      '<div id="readmeView" style="background:#181818;padding:16px 12px;border-radius:8px;max-height:60vh;overflow:auto;">' +
      '<button id="closeReadmeBtn" style="float:right;background:#444;margin-left:8px;">Close</button>' +
      '<h2 style="margin-top:0;">Game Mechanics 📖</h2>' +
      '<pre id="readmePlain" style="white-space:pre-wrap;line-height:1.4;"></pre>' +
      '</div>';
    document.getElementById("closeReadmeBtn").onclick = () => toggleReadme(false);
    const readmePlain = document.getElementById("readmePlain");
    if (readmePlain) {
      readmePlain.textContent = "Loading readme.md...";
    }
    fetch('readme.md').then(resp => {
      if (!resp.ok) throw new Error("Failed to load readme.md");
      return resp.text();
    }).then(md => {
      if (!readmeActive) return;
      const contentEl = document.getElementById("readmePlain");
      if (contentEl) contentEl.textContent = md;
    }).catch(err => {
      if (!readmeActive) return;
      const contentEl = document.getElementById("readmePlain");
      if (contentEl) contentEl.textContent = `Failed to load readme.md (${err.message}).`;
    });
  } else {
    if (!readmeActive) return;
    readmeActive = false;
    logDiv.innerHTML = logBackup;
    showReadmeBtn.textContent = "Show Game Mechanics 📖";
  }
  if (typeof game !== "undefined" && game.ui) {
    game.ui.showReadme = readmeActive;
    scheduleAutosave();
  }
}

showReadmeBtn.addEventListener("click", () => toggleReadme());

function setDebugVisibility(visible, skipSave) {
  if (!debugPanel || !toggleDebugBtn) return;
  debugPanel.style.display = visible ? "block" : "none";
  toggleDebugBtn.textContent = visible ? "Hide Debug" : "Show Debug";
  if (typeof game !== "undefined" && game.ui) {
    game.ui.showDebug = visible;
    if (!skipSave) {
      scheduleAutosave();
    }
  }
}
const game = {
  energy: 0,
  mana: 0,
  lore: 0,
  loreProgress: 0,
  unlocked: { study: false, climb: false, intent: false },
  lastTick: Date.now(),
  floor: 1,
  tempo: 0,
  startTime: null,
  floorEnteredAt: Date.now(),
  tempoStartedAt: Date.now(),
  resting: false,
  restMode: null,
  restUntil: null,
  meditationCount: 0,
  inventory: { "Energy Potion": 0, "Mana Crystal": 0, "Glyph Shard": 0 },
  logHistory: [],
  ui: { showReadme: false, showDebug: false },
};

let autosavePending = false;
function scheduleAutosave() {
  if (autosavePending) return;
  autosavePending = true;
  const flush = () => {
    autosavePending = false;
    saveGame();
  };
  if (typeof queueMicrotask === "function") {
    queueMicrotask(flush);
  } else {
    setTimeout(flush, 0);
  }
}

// ---- Helpers for logging ----
function pad(num, size) {
  let s = num.toString();
  while (s.length < size) s = "0" + s;
  return s;
}

function getTimestamp() {
  const d = new Date();
  return d.getFullYear().toString() +
         pad(d.getMonth() + 1, 2) +
         pad(d.getDate(), 2) +
         pad(d.getHours(), 2) +
         pad(d.getMinutes(), 2) +
         pad(d.getSeconds(), 2) +
         pad(d.getMilliseconds(), 3).slice(0,2); // NN = first two digits of ms
}

function getRandomHex(len) {
  let result = "";
  const hexChars = "0123456789abcdef";
  for (let i = 0; i < len; i++) {
    result += hexChars[Math.floor(Math.random() * 16)];
  }
  return result;
}

function getTempoTopFloor(tempo) {
  return 10 * (tempo + 1);
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes, 2)}:${pad(seconds, 2)}`;
}

function getRemainingSeconds(until) {
  if (typeof until !== "number" || !Number.isFinite(until)) return null;
  const diff = until - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 1000);
}

function advanceTempo(topFloor) {
  const newTempo = game.tempo + 1;
  log(`You conquer Floor ${topFloor}. Tempo rises to ${newTempo}!`);
  game.tempo = newTempo;
  game.tempoStartedAt = Date.now();
  game.lore = 0;
  game.loreProgress = 0;
  log("The tower resets, drawing you back to Floor 0.");
  game.floor = 0;
  game.floorEnteredAt = Date.now();
  game.startTime = null;
}

function maybeAdvanceTempo() {
  const topFloor = getTempoTopFloor(game.tempo);
  if (game.floor < topFloor) return false;
  advanceTempo(topFloor);
  return true;
}

// ---- Log function with timestamp and hash ----
function log(text) {
  const timestamp = getTimestamp();
  const hash = getRandomHex(8);
  const entry = `[${timestamp}][${hash}] ${text}`;
  // Add new log entry to the top
  game.logHistory.unshift(entry);
  const logDiv = document.getElementById("log");
  // Render newest at top
  logDiv.textContent = game.logHistory.join('\n');
  logDiv.scrollTop = 0;
  scheduleAutosave();
}

function ponderLog(text) {
  const extra = `[PONDER] ${text}`;
  log(extra);
}

// ---- Game Loop ----
function tick() {
  const now = Date.now();
  const elapsed = (now - game.lastTick) / 1000;
  game.lastTick = now;

  // passive regen (increased for early progress)
  game.energy += elapsed * 0.2; // +0.2 energy/sec
  game.mana += elapsed * 0.1;  // +0.1 mana/sec
  game.loreProgress += elapsed * PASSIVE_LORE_RATE;
  if (game.loreProgress >= 1) {
    const gainedLore = Math.floor(game.loreProgress);
    game.lore += gainedLore;
    game.loreProgress -= gainedLore;
    ensureLoreUnlocks();
  }

  updateUI();
  scheduleAutosave();
}

setInterval(tick, 1000);

// ---- UI Updates ----
function disableActions(state) {
  const nextFloor = game.floor + 1;
  const loreRequirement = getFloorLoreRequirement(nextFloor);
  document.getElementById("focusBtn").disabled = state;
  document.getElementById("restBtn").disabled = state;
  document.getElementById("studyBtn").disabled = state || (!game.unlocked.study || game.mana < 5);
  document.getElementById("climbBtn").disabled =
    state || (!game.unlocked.climb || game.energy < getFloorCost(game.floor) || game.lore < loreRequirement);
}

function canUseIntent() {
  return game.resting && game.unlocked.intent && intentActive && intentSessionEnergy < INTENT_MAX_BONUS;
}

function updateIntentUI() {
  const btn = document.getElementById("intentBtn");
  if (!btn) return;
  if (game.resting && game.unlocked.intent && intentActive) {
    const remaining = Math.max(0, INTENT_MAX_BONUS - intentSessionEnergy);
    btn.style.display = "inline-block";
    btn.disabled = remaining <= 0;
    btn.textContent = remaining <= 0
      ? "Intent (Maxed) ⚡"
      : `Intent (+${remaining} Energy) ⚡`;
  } else {
    btn.style.display = "none";
    btn.disabled = true;
  }
}

function updateStatusPanel() {
  if (!statusList) return;
  const statuses = [];

  if (game.resting) {
    const remaining = getRemainingSeconds(game.restUntil);
    const label = game.restMode === "forced-rest" ? "Forced Rest" : "Meditating";
    if (remaining && remaining > 0) {
      statuses.push(`${label} – ${remaining}s remaining`);
    } else {
      statuses.push(label);
    }
  }

  if (game.unlocked.intent && intentActive) {
    const remaining = Math.max(0, INTENT_MAX_BONUS - intentSessionEnergy);
    if (remaining > 0) {
      statuses.push(`Intent channel open – +${remaining} Energy available`);
    } else {
      statuses.push("Intent reserves maxed for this rest.");
    }
  }

  if (!game.resting && intentSessionEnergy > 0) {
    statuses.push(`Intent energy banked: +${intentSessionEnergy}`);
  }

  if (game.startTime && game.floor > 0) {
    const elapsed = Date.now() - game.startTime;
    statuses.push(`Tempo sprint: ${formatDuration(elapsed)} elapsed`);
  }

  const topFloor = getTempoTopFloor(game.tempo);
  if (game.floor >= topFloor) {
    statuses.push("Tempo peak reached – prepare to reset the tower.");
  }

  statusList.innerHTML = "";
  if (!statuses.length) {
    const empty = document.createElement("li");
    empty.className = "status-empty";
    empty.textContent = "No active effects.";
    statusList.appendChild(empty);
    return;
  }

  statuses.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    statusList.appendChild(li);
  });
}

function resetIntentHold() {
  if (intentHoldTimeout) {
    clearTimeout(intentHoldTimeout);
    intentHoldTimeout = null;
  }
  intentHoldStart = null;
  intentHoldCompleted = false;
}

function startIntentSession() {
  if (!game.unlocked.intent) {
    intentActive = false;
    resetIntentHold();
    updateIntentUI();
    updateStatusPanel();
    return;
  }
  intentSessionEnergy = 0;
  intentActive = true;
  resetIntentHold();
  updateIntentUI();
  updateStatusPanel();
}

function endIntentSession() {
  intentActive = false;
  resetIntentHold();
  updateIntentUI();
  updateStatusPanel();
}

function applyActionOrdering(featuredId) {
  if (!actionsContainer) return;
  const fragment = document.createDocumentFragment();
  ACTION_BASE_ORDER.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove("featured-action");
  });
  if (featuredId) {
    const featuredBtn = document.getElementById(featuredId);
    if (featuredBtn) {
      featuredBtn.classList.add("featured-action");
      fragment.appendChild(featuredBtn);
    }
  }
  ACTION_BASE_ORDER.forEach(id => {
    if (id === featuredId) return;
    const btn = document.getElementById(id);
    if (btn) fragment.appendChild(btn);
  });
  actionsContainer.appendChild(fragment);
}

if (toggleDebugBtn) {
  toggleDebugBtn.addEventListener("click", () => {
    if (!debugPanel) return;
    const willShow = debugPanel.style.display === "none";
    setDebugVisibility(willShow);
  });
  setDebugVisibility(false, true);
}

function updateUI() {
  updateStatusPanel();
  document.getElementById("energy").textContent = Math.floor(game.energy);
  document.getElementById("mana").textContent = Math.floor(game.mana);
  document.getElementById("lore").textContent = game.lore;
  document.getElementById("floor").textContent = game.floor;
  document.getElementById("tempo").textContent = game.tempo;
  const nextFloor = game.floor + 1;
  const nextLoreRequirement = getFloorLoreRequirement(nextFloor);
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.textContent = `Next floor requires Lore ${nextLoreRequirement} (you have ${Math.floor(game.lore)}).`;
  }
  const floorStatsEl = document.getElementById("floorStats");
  if (floorStatsEl) {
    const elapsedMs = Date.now() - (game.floorEnteredAt || game.lastTick || Date.now());
    const tempoElapsedMs = Date.now() - (game.tempoStartedAt || game.lastTick || Date.now());
    const tempoTop = getTempoTopFloor(game.tempo);
    floorStatsEl.textContent = `Time on Floor: ${formatDuration(elapsedMs)} | Time on Tempo: ${formatDuration(tempoElapsedMs)} (Top Floor: ${tempoTop})`;
  }

  document.getElementById("studyBtn").style.display = game.unlocked.study ? "inline-block" : "none";
  document.getElementById("studyBtn").disabled = game.resting || game.mana < 5;

  document.getElementById("climbBtn").style.display = game.unlocked.climb ? "inline-block" : "none";
  document.getElementById("climbBtn").disabled =
    game.resting || game.energy < getFloorCost(game.floor) || game.lore < nextLoreRequirement || game.floor >= getTempoTopFloor(game.tempo);

  if (game.resting) {
    disableActions(true);
  } else {
    disableActions(false);
  }
  updateIntentUI();
  let featuredActionId = null;
  let bestPriority = -Infinity;
  for (const id of ACTION_BASE_ORDER) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    const isHidden = btn.style.display === "none";
    if (isHidden || btn.disabled) continue;
    const priority = ACTION_PRIORITIES[id] ?? 0;
    if (priority > bestPriority) {
      bestPriority = priority;
      featuredActionId = id;
    }
  }
  applyActionOrdering(featuredActionId);

  const debugPanel = document.getElementById("debugPanel");
  if (debugPanel) {
    const debugData = {
      game: {
        energy: game.energy,
        mana: game.mana,
        lore: game.lore,
        loreProgress: game.loreProgress,
        floor: game.floor,
        tempo: game.tempo,
        tempoStartedAt: game.tempoStartedAt,
        startTime: game.startTime,
        lastTick: game.lastTick,
        resting: game.resting,
        meditationCount: game.meditationCount,
        unlocked: game.unlocked,
        nextFloorLoreRequirement: nextLoreRequirement,
        nextFloor: nextFloor,
        floorEnteredAt: game.floorEnteredAt,
        inventory: game.inventory,
        logHistoryLength: game.logHistory.length,
        featuredAction: featuredActionId,
        ui: game.ui
      },
      globals: {
        readmeActive,
        autosavePending,
        intentSessionEnergy,
        intentActive,
        intentHoldStart,
        intentHoldCompleted,
        PASSIVE_LORE_RATE,
        INTENT_UNLOCK_MEDITATIONS,
        INTENT_MAX_BONUS,
        INTENT_CLICK_BONUS,
        INTENT_HOLD_DURATION,
        autoRefreshScheduled: Boolean(autoRefreshHandle)
      }
    };
    debugPanel.textContent = JSON.stringify(debugData, null, 2);
  }
}

// ---- Helpers ----
function getFloorCost(floor) {
  if (floor <= 0) return 4;
  if (floor >= 1 && floor <= 3) return 4;
  if (floor >= 4 && floor <= 6) return 6;
  if (floor >= 7 && floor <= 10) return 8;
  return 8; // default for beyond floor 10 if needed
}

function getFloorLoreRequirement(targetFloor) {
  if (targetFloor <= 1) return 0;
  if (targetFloor <= 3) return 4;
  if (targetFloor <= 6) return 6;
  if (targetFloor <= 10) return 8;
  const extraSteps = Math.max(0, targetFloor - 10);
  return 8 + Math.ceil(extraSteps / 3) * 2;
}

// ---- Inventory ----
function addItem(item) {
  if (!game.inventory[item]) game.inventory[item] = 0;
  game.inventory[item]++;
  log(`You found a ${item}! Inventory now: ${item} x${game.inventory[item]}`);
  console.log(`Inventory: ${item} x${game.inventory[item]}`);
}

function useItem(item) {
  if (game.inventory[item] > 0) {
    game.inventory[item]--;
    log(`You used a ${item}. Inventory now: ${item} x${game.inventory[item]}`);
    console.log(`Inventory: ${item} x${game.inventory[item]}`);
    return true;
  }
  return false;
}

// ---- Random Floor Events ----
function randomFloorEvent() {
  const events = [
    () => { 
      game.energy += 2; 
      log(`You found a hidden energy spring! Energy +2 (Energy: ${Math.floor(game.energy)})`); 
    },
    () => { 
      game.mana += 2; 
      log(`A mana crystal glows nearby. Mana +2 (Mana: ${Math.floor(game.mana)})`); 
    },
    () => { 
      game.lore++; 
      log(`You discover ancient runes. Lore +1 (Lore: ${game.lore})`); 
      ensureLoreUnlocks();
    },
    () => {
      const lost = Math.min(2, Math.floor(game.energy));
      game.energy -= lost;
      log(`A sudden chill drains your strength. Energy -${lost} (Energy: ${Math.floor(game.energy)})`);
    },
    () => {
      const lost = Math.min(2, Math.floor(game.mana));
      game.mana -= lost;
      log(`A magical backlash saps your mana. Mana -${lost} (Mana: ${Math.floor(game.mana)})`);
    },
    () => {
      log("A mysterious force forces you to rest!");
      game.resting = true;
      game.restMode = "forced-rest";
      game.restUntil = Date.now() + 5000;
      disableActions(true);
      startIntentSession();
      const timerMsgEl = document.getElementById("timerMessage");
      let remaining = 5;
      timerMsgEl.textContent = "Forced Rest... " + remaining + "s remaining";
      updateStatusPanel();
      const interval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
          timerMsgEl.textContent = "Forced Rest... " + remaining + "s remaining";
        } else {
          clearInterval(interval);
          timerMsgEl.textContent = "";
          game.resting = false;
          game.restMode = null;
          game.restUntil = null;
          endIntentSession();
          disableActions(false);
          log("You recover from the forced rest.");
          updateStatusPanel();
          updateUI();
        }
      }, 1000);
    }
  ];
  const eventIndex = Math.floor(Math.random() * events.length);
  events[eventIndex]();
}

// ---- Actions ----

function grantIntentEnergy(amount, mode) {
  const remaining = INTENT_MAX_BONUS - intentSessionEnergy;
  if (remaining <= 0) return;
  const grant = Math.min(amount, remaining);
  if (grant <= 0) return;
  const message = mode === "hold"
    ? "You sustain your intent, drawing deeply on the stillness."
    : "A burst of intent surges through you as you focus your will.";
  intentSessionEnergy += grant;
  log(`${message} Intent stores +${grant} Energy (pending ${intentSessionEnergy}/${INTENT_MAX_BONUS}).`);
  updateIntentUI();
  updateStatusPanel();
}

// Repeated action helper for focus
function performFocusRepeatedly() {
  if (game.energy < 1) {
    log("You are too tired to focus.");
    return 0;
  }
  let count = 0;
  while (game.energy >= 1) {
    game.energy -= 1;
    game.mana++;
    count++;
  }
  if (count > 0) {
    gainLoreIfFirst("focus", "You feel a pulse of magic. Mana flows at the cost of your strength.");
    log(`Focused ${count} times: Energy -${count} (Energy: ${Math.floor(game.energy)}), Mana +${count} (Mana: ${Math.floor(game.mana)})`);
  }
  return count;
}

// Repeated action helper for study
function performStudyRepeatedly() {
  if (!game.unlocked.study || game.mana < 5) {
    return 0;
  }
  let count = 0;
  while (game.mana >= 5) {
    game.mana -= 5;
    gainLoreIfFirst("study", "You study the glyphs and glimpse deeper knowledge...");
    game.lore++;
    ensureLoreUnlocks();
    count++;
  }
  if (count > 0) {
    log(`You study ancient glyphs ${count} times. Mana -${count * 5} (Mana: ${Math.floor(game.mana)}), Lore +${count} (Lore: ${game.lore})`);
  }
  return count;
}

// Focus button repeated action on mousedown/up
let focusInterval = null;
document.getElementById("focusBtn").addEventListener("mousedown", () => {
  if (game.resting) return;
  if (focusInterval) return;
  // Perform once immediately
  performFocusRepeatedly();
  updateUI();
  focusInterval = setInterval(() => {
    if (game.resting) {
      clearInterval(focusInterval);
      focusInterval = null;
      return;
    }
    if (game.energy < 1) {
      clearInterval(focusInterval);
      focusInterval = null;
      return;
    }
    performFocusRepeatedly();
    updateUI();
  }, 250);
});
document.getElementById("focusBtn").addEventListener("mouseup", () => {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }
});
document.getElementById("focusBtn").addEventListener("mouseleave", () => {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }
});

// Study button repeated action on mousedown/up
let studyInterval = null;
document.getElementById("studyBtn").addEventListener("mousedown", () => {
  if (game.resting) return;
  if (studyInterval) return;
  // Perform once immediately
  performStudyRepeatedly();
  studyInterval = setInterval(() => {
    if (game.resting) {
      clearInterval(studyInterval);
      studyInterval = null;
      return;
    }
    if (!game.unlocked.study || game.mana < 5) {
      clearInterval(studyInterval);
      studyInterval = null;
      return;
    }
    performStudyRepeatedly();
    updateUI();
  }, 500);
});
document.getElementById("studyBtn").addEventListener("mouseup", () => {
  if (studyInterval) {
    clearInterval(studyInterval);
    studyInterval = null;
  }
});
document.getElementById("studyBtn").addEventListener("mouseleave", () => {
  if (studyInterval) {
    clearInterval(studyInterval);
    studyInterval = null;
  }
});

// Meditate button (formerly Rest) repeated action on mousedown/up
// For meditate, the behavior is a 5 second meditation with delayed energy gain; repeating is not meaningful.
// We keep single click behavior and update all text/logs.
document.getElementById("restBtn").onclick = () => {
  if (game.resting) {
    log("You are already meditating...");
    return;
  }
  game.resting = true;
  game.restMode = "meditation";
  game.restUntil = Date.now() + 5000;
  updateStatusPanel();
  log("You begin to meditate for 5 seconds...");
  disableActions(true);
  startIntentSession();
  const timerMsgEl = document.getElementById("timerMessage");
  let remaining = 5;
  timerMsgEl.textContent = "Meditating... " + remaining + "s remaining";
  const interval = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      timerMsgEl.textContent = "Meditating... " + remaining + "s remaining";
    } else {
      clearInterval(interval);
      timerMsgEl.textContent = "";
    }
  }, 1000);
  setTimeout(() => {
    const medGain = 5;
    const intentBonus = intentSessionEnergy;
    game.energy += medGain + intentBonus;
    game.resting = false;
    game.restMode = null;
    game.restUntil = null;
    intentSessionEnergy = 0;
    endIntentSession();
    const finalEnergy = Math.floor(game.energy);
    const totalGain = medGain + intentBonus;
    log(`You feel renewed. Energy +${totalGain} (Energy: ${finalEnergy})`);
    game.meditationCount++;
    checkIntentUnlock();
    disableActions(false);
    gainLoreIfFirst("meditate", "Your mind clears and energy flows anew.");
    timerMsgEl.textContent = "";
    updateStatusPanel();
    updateUI();
  }, 5000);
};

function handleIntentPressStart(event) {
  if (!canUseIntent()) return;
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  resetIntentHold();
  const remaining = INTENT_MAX_BONUS - intentSessionEnergy;
  if (remaining <= 0) {
    updateIntentUI();
    return;
  }
  intentHoldStart = Date.now();
  intentHoldTimeout = setTimeout(() => {
    intentHoldTimeout = null;
    intentHoldStart = null;
    if (!canUseIntent()) return;
    intentHoldCompleted = true;
    grantIntentEnergy(INTENT_MAX_BONUS - intentSessionEnergy, "hold");
  }, INTENT_HOLD_DURATION);
}

function handleIntentPressEnd(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (intentHoldTimeout) {
    clearTimeout(intentHoldTimeout);
    intentHoldTimeout = null;
  }
  const completed = intentHoldCompleted;
  const remaining = INTENT_MAX_BONUS - intentSessionEnergy;
  if (!completed && canUseIntent() && remaining > 0) {
    grantIntentEnergy(Math.min(INTENT_CLICK_BONUS, remaining), "click");
  }
  resetIntentHold();
  updateIntentUI();
}

function handleIntentCancel(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (intentHoldTimeout) {
    clearTimeout(intentHoldTimeout);
    intentHoldTimeout = null;
  }
  resetIntentHold();
  updateIntentUI();
}

if (intentBtn) {
  intentBtn.addEventListener("mousedown", handleIntentPressStart);
  intentBtn.addEventListener("mouseup", handleIntentPressEnd);
  intentBtn.addEventListener("mouseleave", handleIntentCancel);
  intentBtn.addEventListener("touchstart", handleIntentPressStart, { passive: false });
  intentBtn.addEventListener("touchend", handleIntentPressEnd);
  intentBtn.addEventListener("touchcancel", handleIntentCancel);
}

if (ponderBtn) {
  ponderBtn.addEventListener("click", () => {
    ponderLog("You pause your ascent to ponder the tower's mysteries.");
    ponderLog(PONDER_QUIPS[Math.floor(Math.random() * PONDER_QUIPS.length)]);
    try {
      saveGame();
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("mages_tower_flavored_refresh", "1");
      }
    } catch (err) {
      ponderLog("Your reflections are interrupted; the tower resists being remembered.");
    }
    location.reload();
  });
}

// Climb button repeated action on mousedown/up
// Because climbing involves prompts and random events, repeated climbing on hold is not practical or user-friendly.
// We will keep original single click behavior only.
document.getElementById("climbBtn").onclick = () => {
  const targetFloor = game.floor + 1;
  const loreRequirement = getFloorLoreRequirement(targetFloor);
  if (game.lore < loreRequirement) {
    log(`The tower's wards reject you. Lore ${loreRequirement} is required to reach Floor ${targetFloor}.`);
    return;
  }
  const floorCost = getFloorCost(game.floor);
  if (game.energy < floorCost) {
    log("You are too tired to climb.");
    return;
  }

  // Special floor 5 event: choose path
  if (game.floor === 5) {
    let choice = prompt("You reach Floor 5: Choose your path (left/right):");
    if (choice) choice = choice.toLowerCase();
    while (choice !== "left" && choice !== "right") {
      choice = prompt("Invalid choice. Please choose 'left' or 'right':");
      if (choice) choice = choice.toLowerCase();
    }
    if (choice === "left") {
      // left path costs more energy but gives mana
      const leftCost = floorCost + 2;
      if (game.energy < leftCost) {
        log("You don't have enough energy for the left path. You take the right path instead.");
        // right path: safe, normal cost
        game.energy -= floorCost;
        log(`You take the right path, safe but uneventful. Energy -${floorCost} (Energy: ${Math.floor(game.energy)})`);
      } else {
        game.energy -= leftCost;
        game.mana += 3;
        log(`You take the left path, draining but mana-rich. Energy -${leftCost} (Energy: ${Math.floor(game.energy)}), Mana +3 (Mana: ${Math.floor(game.mana)})`);
      }
    } else {
      // right path: safe, normal cost
      game.energy -= floorCost;
      log(`You take the right path, safe but uneventful. Energy -${floorCost} (Energy: ${Math.floor(game.energy)})`);
    }
  }
  // Special floor 8 event: mystical trap
  else if (game.floor === 8) {
    if (game.inventory["Glyph Shard"] > 0) {
      useItem("Glyph Shard");
      log("A mystical trap triggers but your Glyph Shard protects you.");
      game.energy -= floorCost;
      log(`Energy -${floorCost} (Energy: ${Math.floor(game.energy)})`);
    } else {
      game.energy -= floorCost;
      const lostEnergy = Math.min(2, Math.floor(game.energy));
      game.energy -= lostEnergy;
      log(`A mystical trap drains your energy! Energy -${floorCost + lostEnergy} (Energy: ${Math.floor(game.energy)})`);
    }
  }
  else {
    // normal floors
    game.energy -= floorCost;
    log(`Energy -${floorCost} (Energy: ${Math.floor(game.energy)})`);
  }

  if (!game.startTime) game.startTime = Date.now();
  game.floor++;
  game.floorEnteredAt = Date.now();
  log(`You ascend to Floor ${game.floor}. (Floor: ${game.floor})`);

  // Random event (50% chance)
  if (Math.random() < 0.5) {
    randomFloorEvent();
  }

  // Random drop chance (30%)
  if (Math.random() < 0.3) {
    const items = ["Energy Potion", "Mana Crystal", "Glyph Shard"];
    const foundItem = items[Math.floor(Math.random() * items.length)];
    addItem(foundItem);
  }

  if (game.floor % 3 === 0) {
    game.lore++;
    log(`You uncover new lore as you climb. Lore +1 (Lore: ${game.lore})`);
    ensureLoreUnlocks();
  }

  if (game.floor >= getTempoTopFloor(game.tempo)) {
    const elapsed = (Date.now() - game.startTime) / 1000;
    const tempoBefore = game.tempo;
    if (elapsed <= 120) {
      // Use unified tempo advance so floor resets to 0
      advanceTempo(getTempoTopFloor(tempoBefore));
    } else {
      log("You’ve reached the top floor. The tower hums with quiet power...");
      // Even without speed bonus, still advance tempo and reset floor to 0
      advanceTempo(getTempoTopFloor(tempoBefore));
    }
  }
  updateUI();
};

function gainLoreIfFirst(action, message) {
  // For backwards compatibility: treat both "rest" and "meditate" as the same unlock
  const key = action === "rest" ? "meditate" : action;
  if (!game.unlocked[key]) {
    game.unlocked[key] = true;
    log(message);
    game.lore++;
    ensureLoreUnlocks();
  }
  updateUI();
}

function ensureLoreUnlocks() {
  if (game.lore >= 2 && !game.unlocked.study) {
    game.unlocked.study = true;
    log("You’ve unlocked the ability to Study Glyphs!");
  }
  if (game.lore >= 4 && !game.unlocked.climb) {
    game.unlocked.climb = true;
    log("You feel the pull of the tower above you... You may now climb!");
  }
}

function checkIntentUnlock() {
  if (!game.unlocked.intent && game.meditationCount >= INTENT_UNLOCK_MEDITATIONS) {
    game.unlocked.intent = true;
    log("Your meditations crystallize into intent. You can now channel extra energy while resting.");
  }
}

// ---- Save / Load ----
function saveGame() {
  localStorage.setItem("tower_autosave", JSON.stringify(game));
}

// Load game from localStorage or imported save, restoring flavored refresh/sessionStorage logic
function loadGame(imported, options = {}) {
  const { manual = false } = options;
  let saveObj = null;
  let loadedFromImport = false;
  if (typeof imported === "object" && imported !== null) {
    saveObj = imported;
    loadedFromImport = true;
  } else {
    const storageKeys = ["tower_autosave", "mages_tower_save"];
    for (const key of storageKeys) {
      const data = localStorage.getItem(key);
      if (!data) continue;
      try {
        saveObj = JSON.parse(data);
        break;
      } catch (e) {
        saveObj = null;
      }
    }
  }
  if (saveObj) {
    // Restore all main properties
    if (typeof saveObj.energy === "number") game.energy = saveObj.energy;
    if (typeof saveObj.mana === "number") game.mana = saveObj.mana;
    if (typeof saveObj.lore === "number") game.lore = saveObj.lore;
    if (typeof saveObj.loreProgress === "number") {
      game.loreProgress = saveObj.loreProgress;
    } else {
      game.loreProgress = 0;
    }
    if (typeof saveObj.floor === "number") game.floor = saveObj.floor;
    if (typeof saveObj.tempo === "number") game.tempo = saveObj.tempo;
    if (typeof saveObj.resting === "boolean") game.resting = saveObj.resting;
    if (typeof saveObj.startTime === "number" || saveObj.startTime === null) game.startTime = saveObj.startTime;
    if (typeof saveObj.lastTick === "number") game.lastTick = saveObj.lastTick;
    if (typeof saveObj.floorEnteredAt === "number") {
      game.floorEnteredAt = saveObj.floorEnteredAt;
    } else {
      game.floorEnteredAt = Date.now();
    }
    if (typeof saveObj.unlocked === "object" && saveObj.unlocked) {
      game.unlocked = Object.assign({ study: false, climb: false, intent: false }, saveObj.unlocked);
    } else {
      game.unlocked = { study: false, climb: false, intent: false };
    game.floorEnteredAt = Date.now();
    }
    if (typeof saveObj.inventory === "object" && saveObj.inventory) {
      game.inventory = Object.assign({ "Energy Potion": 0, "Mana Crystal": 0, "Glyph Shard": 0 }, saveObj.inventory);
    }
    if (typeof saveObj.meditationCount === "number") {
      game.meditationCount = saveObj.meditationCount;
    } else {
      game.meditationCount = 0;
    }
    if (typeof saveObj.tempoStartedAt === "number") {
      game.tempoStartedAt = saveObj.tempoStartedAt;
    } else {
      game.tempoStartedAt = Date.now();
    }
    if (typeof saveObj.ui === "object" && saveObj.ui) {
      game.ui = Object.assign({ showReadme: false, showDebug: false }, saveObj.ui);
    } else {
      game.ui = { showReadme: false, showDebug: false };
    }
    // Log history (restore newest-first order)
    if (Array.isArray(saveObj.logHistory)) {
      let hist = saveObj.logHistory.slice();
      if (hist.length > 1) {
        const getTS = s => s && s[0] === "[" ? s.slice(1, 15) : "";
        if (getTS(hist[0]) < getTS(hist[1])) {
          hist.reverse();
        }
      }
      game.logHistory = hist;
    } else {
      game.logHistory = [];
    }
    // Render logHistory newest at top
    const logDiv = document.getElementById("log");
    logDiv.textContent = game.logHistory.join('\n');
    logDiv.scrollTop = 0;
    // Flavored refresh/sessionStorage logic
    let flavored = false;
    if (!loadedFromImport && typeof sessionStorage !== "undefined") {
      // If sessionStorage.mages_tower_flavored_refresh is set, show flavored message and clear it
      if (sessionStorage.getItem("mages_tower_flavored_refresh")) {
        sessionStorage.removeItem("mages_tower_flavored_refresh");
        log("You awaken, memories of your ascent swirling in your mind. (Game state restored after refresh)");
        flavored = true;
      }
    }
    if (!flavored && !loadedFromImport) {
      log(manual ? "Save loaded from browser storage." : "Save loaded.");
    }
  } else {
    if (!manual) {
      game.logHistory = [];
      document.getElementById("log").textContent = "";
    }
    if (manual) {
      log("No saved game was found.");
    } else {
      log("A new journey begins...");
    }
    game.loreProgress = 0;
    game.meditationCount = 0;
    game.unlocked = { study: false, climb: false, intent: false };
    game.ui = { showReadme: false, showDebug: false };
    game.tempoStartedAt = Date.now();
  }
  game.lastTick = Date.now();
  ensureLoreUnlocks();
  checkIntentUnlock();
  // Clear transient rest/meditation state that cannot resume after reload
  if (game.resting) {
    game.resting = false;
  }
  game.restMode = null;
  game.restUntil = null;
  const timerMsgEl = document.getElementById("timerMessage");
  if (timerMsgEl) {
    timerMsgEl.textContent = "";
  }
  if (game.ui) {
    setDebugVisibility(!!game.ui.showDebug, true);
    if (game.ui.showReadme) {
      readmeActive = false;
      toggleReadme(true);
    } else {
      readmeActive = false;
      showReadmeBtn.textContent = "Show Game Mechanics 📖";
    }
  }
  endIntentSession();
  updateUI();
  scheduleAutosave();
  return !!saveObj;
}

function setupAutoRefresh() {
  if (autoRefreshHandle) {
    clearInterval(autoRefreshHandle);
  }
  autoRefreshHandle = setInterval(() => {
    try {
      saveGame();
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("mages_tower_flavored_refresh", "1");
      }
    } catch (err) {
      // Ignore storage errors; reload still proceeds.
    }
    location.reload();
  }, 30000);
}

// ---- Export / Import ----
document.getElementById("saveBtn").onclick = () => {
  saveGame();
  log("Game saved to your browser.");
};

document.getElementById("loadBtn").onclick = () => {
  loadGame(null, { manual: true });
};

document.getElementById("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(game, null, 2)], {type: "application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tower_autosave.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
  }, 100);
};

document.getElementById("importBtn").onclick = () => {
  document.getElementById("fileInput").click();
};

document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      loadGame(imported);
    } catch (err) {
      log("Failed to import save file.");
    }
  };
  reader.readAsText(file);
});

window.onload = () => {
  loadGame();
  setupAutoRefresh();
};
