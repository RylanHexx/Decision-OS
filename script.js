const STORAGE_KEY = "decisionOS.v3";

const defaultDecision = {
  V: 4,
  I: 4,
  U: 2,
  Conf: 0.7,
  C: 2,
  D: 2,
  F: 2,
  Risk: 2,
  A: true,
  R: true,
  Cap: true,
  N: true,
};

const defaultChoiceB = {
  V: 3,
  I: 3,
  U: 3,
  Conf: 0.6,
  C: 2,
  D: 3,
  F: 2,
  Risk: 2,
  A: true,
  R: true,
  Cap: true,
  N: true,
};

const state = {
  settings: {
    threshold: 8,
    useHardGate: true,
    showDecimals: true,
    noiseMeansNow: false,
  },
  decision: structuredClone(defaultDecision),
  choiceA: structuredClone(defaultDecision),
  choiceB: structuredClone(defaultChoiceB),
  slots: [
    { name: "Practice", slots: ["Math", "English", "Chess"] },
  ],
  history: [],
  editingSlotIndex: null,
};

const decisionFields = [
  { key: "V", label: "Value", min: 1, max: 5, step: 1, help: "Identity alignment", type: "range" },
  { key: "I", label: "Impact", min: 1, max: 5, step: 1, help: "Long-term payoff", type: "range" },
  { key: "U", label: "Urgency", min: 1, max: 5, step: 1, help: "True time sensitivity", type: "range" },
  { key: "Conf", label: "Confidence", min: 0.1, max: 1, step: 0.05, help: "Evidence strength", type: "range" },
  { key: "C", label: "Cost", min: 1, max: 5, step: 1, help: "Time and energy cost", type: "range" },
  { key: "D", label: "Distraction", min: 1, max: 5, step: 1, help: "Rabbit-hole risk", type: "range" },
  { key: "F", label: "Friction", min: 1, max: 5, step: 1, help: "Starting annoyance", type: "range" },
  { key: "Risk", label: "Risk", min: 1, max: 5, step: 1, help: "Downside if wrong", type: "range" },
  { key: "A", label: "Aligned", help: "Supports your direction", type: "bool" },
  { key: "R", label: "Reversible", help: "Can be undone later", type: "bool" },
  { key: "Cap", label: "Capacity", help: "Enough energy now", type: "bool" },
  { key: "N", label: "Noise-free", help: "Not FOMO-driven", type: "bool" },
];

const presets = {
  small: {
    threshold: 5,
    decision: { V: 2, I: 2, U: 1, Conf: 0.8, C: 1, D: 1, F: 1, Risk: 1, A: true, R: true, Cap: true, N: true },
  },
  medium: {
    threshold: 8,
    decision: { V: 4, I: 3, U: 2, Conf: 0.7, C: 2, D: 2, F: 2, Risk: 2, A: true, R: true, Cap: true, N: true },
  },
  major: {
    threshold: 10,
    decision: { V: 5, I: 5, U: 3, Conf: 0.75, C: 3, D: 2, F: 3, Risk: 3, A: true, R: true, Cap: true, N: true },
  },
};

const els = {
  tabs: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  openSettings: document.getElementById("openSettings"),
  closeSettings: document.getElementById("closeSettings"),
  settingsPanel: document.getElementById("settingsPanel"),
  overlay: document.getElementById("overlay"),
  thresholdSlider: document.getElementById("thresholdSlider"),
  thresholdValue: document.getElementById("thresholdValue"),
  hardGateToggle: document.getElementById("hardGateToggle"),
  decimalToggle: document.getElementById("decimalToggle"),
  noiseNowToggle: document.getElementById("noiseNowToggle"),
  decisionControls: document.getElementById("decisionControls"),
  choiceAControls: document.getElementById("choiceAControls"),
  choiceBControls: document.getElementById("choiceBControls"),
  calculateDecisionBtn: document.getElementById("calculateDecisionBtn"),
  compareChoicesBtn: document.getElementById("compareChoicesBtn"),
  decisionVerdict: document.getElementById("decisionVerdict"),
  decisionScore: document.getElementById("decisionScore"),
  decisionMeta: document.getElementById("decisionMeta"),
  decisionFormula: document.getElementById("decisionFormula"),
  choiceResult: document.getElementById("choiceResult"),
  slotGroupName: document.getElementById("slotGroupName"),
  slotInputs: document.getElementById("slotInputs"),
  addSlotInputBtn: document.getElementById("addSlotInputBtn"),
  saveSlotGroupBtn: document.getElementById("saveSlotGroupBtn"),
  clearSlotFormBtn: document.getElementById("clearSlotFormBtn"),
  slotGroups: document.getElementById("slotGroups"),
  historyList: document.getElementById("historyList"),
};

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    if (saved.settings) state.settings = { ...state.settings, ...saved.settings };
    if (saved.decision) state.decision = { ...state.decision, ...saved.decision };
    if (saved.choiceA) state.choiceA = { ...state.choiceA, ...saved.choiceA };
    if (saved.choiceB) state.choiceB = { ...state.choiceB, ...saved.choiceB };
    if (Array.isArray(saved.slots)) state.slots = saved.slots;
    if (Array.isArray(saved.history)) state.history = saved.history;
  } catch {
    // Ignore corrupted localStorage.
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    settings: state.settings,
    decision: state.decision,
    choiceA: state.choiceA,
    choiceB: state.choiceB,
    slots: state.slots,
    history: state.history.slice(0, 12),
  }));
}

function formatScore(value) {
  return state.settings.showDecimals ? value.toFixed(2) : Math.round(value).toString();
}

function gateValue(obj) {
  if (!state.settings.useHardGate) return 1;
  return Number(!!obj.A) * Number(!!obj.R) * Number(!!obj.Cap) * Number(!!obj.N);
}

function scoreDecision(obj) {
  const gate = gateValue(obj);
  const benefit = (obj.V + obj.I + obj.U + (obj.Conf * 5)) / 4;
  const penalty = (obj.C + obj.D + obj.F + obj.Risk) / 4;
  let score = gate * ((benefit - penalty) * 5);

  if (state.settings.noiseMeansNow && obj.N) score += 1.5;

  return { score, gate, benefit, penalty };
}

function verdictFromScore(score) {
  if (score >= state.settings.threshold) return { text: "Do it now", cls: "good" };
  if (score >= state.settings.threshold - 4) return { text: "Maybe later", cls: "warn" };
  return { text: "Do not do it", cls: "bad" };
}

function addHistoryItem(title, score, details) {
  state.history.unshift({
    title,
    score,
    details,
    time: new Date().toLocaleString(),
  });
  state.history = state.history.slice(0, 12);
  saveState();
  renderHistory();
}

function renderHistory() {
  els.historyList.innerHTML = "";

  if (!state.history.length) {
    els.historyList.innerHTML = `<div class="history-item"><div><strong>No history yet</strong><small>Your calculations will appear here.</small></div></div>`;
    return;
  }

  state.history.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <div>
        <strong>${escapeHTML(item.title)}</strong>
        <small>${escapeHTML(item.details)} · ${escapeHTML(item.time)}</small>
      </div>
      <div class="history-score">${formatScore(item.score)}</div>
    `;
    els.historyList.appendChild(div);
  });
}

function createControls(container, sourceState) {
  container.innerHTML = "";

  decisionFields.forEach(field => {
    const tpl = document.getElementById("decisionControlTemplate");
    const node = tpl.content.cloneNode(true);

    const title = node.querySelector(".control-title");
    const value = node.querySelector(".control-value");
    const range = node.querySelector(".control-range");
    const note = node.querySelector(".control-note");
    const boolWrap = node.querySelector(".control-boolean");
    const boolNote = boolWrap.querySelector(".control-note");
    const toggle = node.querySelector(".control-toggle");

    title.textContent = field.label;
    note.textContent = field.help;
    boolNote.textContent = field.help;

    if (field.type === "bool") {
      range.remove();
      value.remove();
      boolWrap.classList.remove("hidden");
      toggle.checked = !!sourceState[field.key];
      toggle.addEventListener("change", () => {
        sourceState[field.key] = toggle.checked;
        saveState();
        renderDecisionOutput();
        renderChoiceOutput();
      });
    } else {
      boolWrap.remove();
      range.min = field.min;
      range.max = field.max;
      range.step = field.step ?? 1;
      range.value = sourceState[field.key];
      value.textContent = field.key === "Conf" ? Number(range.value).toFixed(2) : range.value;
      range.addEventListener("input", () => {
        sourceState[field.key] = parseFloat(range.value);
        value.textContent = field.key === "Conf" ? Number(range.value).toFixed(2) : range.value;
        saveState();
        renderDecisionOutput();
        renderChoiceOutput();
      });
    }

    container.appendChild(node);
  });
}

function renderDecisionOutput() {
  const result = scoreDecision(state.decision);
  const verdict = verdictFromScore(result.score);

  els.decisionVerdict.innerHTML = `<span class="${verdict.cls}">${verdict.text}</span>`;
  els.decisionScore.textContent = formatScore(result.score);
  els.decisionMeta.textContent = `Gate: ${result.gate ? "pass" : "fail"} · Benefit ${formatScore(result.benefit)} · Penalty ${formatScore(result.penalty)}`;
  els.decisionFormula.textContent = `Score = HardGate × ((V + I + U + Conf×5) / 4 − (C + D + F + Risk) / 4) × 5`;

  return result.score;
}

function renderChoiceOutput() {
  const a = scoreDecision(state.choiceA);
  const b = scoreDecision(state.choiceB);
  const diff = a.score - b.score;

  if (Math.abs(diff) < 1.5) {
    els.choiceResult.textContent = `Very close call. A: ${formatScore(a.score)} | B: ${formatScore(b.score)}.`;
  } else if (diff > 0) {
    els.choiceResult.textContent = `Choice A wins by ${formatScore(diff)} points.`;
  } else {
    els.choiceResult.textContent = `Choice B wins by ${formatScore(Math.abs(diff))} points.`;
  }
}

function rebuildAllControls() {
  createControls(els.decisionControls, state.decision);
  createControls(els.choiceAControls, state.choiceA);
  createControls(els.choiceBControls, state.choiceB);
}

function syncSettingsUI() {
  els.thresholdSlider.value = state.settings.threshold;
  els.thresholdValue.textContent = state.settings.threshold;
  els.hardGateToggle.checked = state.settings.useHardGate;
  els.decimalToggle.checked = state.settings.showDecimals;
  els.noiseNowToggle.checked = state.settings.noiseMeansNow;
}

function renderSlotFormInputs(values = ["", "", ""]) {
  els.slotInputs.innerHTML = "";
  values.forEach(value => addSlotInput(value));
}

function addSlotInput(value = "") {
  const row = document.createElement("div");
  row.className = "slot-input-row";
  row.innerHTML = `
    <input class="text-input slot-name-input" type="text" placeholder="Slot name" value="${escapeHTML(value)}" />
    <button class="ghost-btn remove-slot-btn" type="button">Remove</button>
  `;
  row.querySelector(".remove-slot-btn").addEventListener("click", () => row.remove());
  els.slotInputs.appendChild(row);
}

function renderSlotGroups() {
  els.slotGroups.innerHTML = "";

  if (!state.slots.length) {
    els.slotGroups.innerHTML = `<div class="empty-state">No slot groups yet.</div>`;
    return;
  }

  state.slots.forEach((group, index) => {
    const card = document.createElement("div");
    card.className = "slot-group";
    card.innerHTML = `
      <div class="slot-group-head">
        <div>
          <h4>${escapeHTML(group.name)}</h4>
          <p>${group.slots.length} slot${group.slots.length === 1 ? "" : "s"}</p>
        </div>
        <div class="hero-chip">Group ${index + 1}</div>
      </div>
      <div class="slot-tags">
        ${group.slots.map(slot => `<span class="tag">${escapeHTML(slot)}</span>`).join("")}
      </div>
      <div class="slot-actions">
        <button class="mini-btn" data-load="${index}">Load</button>
        <button class="mini-btn" data-edit="${index}">Edit</button>
        <button class="mini-btn delete-btn" data-delete="${index}">Delete</button>
      </div>
    `;
    els.slotGroups.appendChild(card);
  });

  els.slotGroups.querySelectorAll("[data-load]").forEach(btn => {
    btn.addEventListener("click", () => {
      const group = state.slots[Number(btn.dataset.load)];
      renderSlotFormInputs(group.slots);
      els.slotGroupName.value = group.name;
      state.editingSlotIndex = null;
    });
  });

  els.slotGroups.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.edit);
      const group = state.slots[idx];
      renderSlotFormInputs(group.slots);
      els.slotGroupName.value = group.name;
      state.editingSlotIndex = idx;
    });
  });

  els.slotGroups.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.delete);
      if (!confirm("Delete this slot group?")) return;
      state.slots.splice(idx, 1);
      if (state.editingSlotIndex === idx) {
        state.editingSlotIndex = null;
        els.slotGroupName.value = "";
        renderSlotFormInputs();
      }
      saveState();
      renderSlotGroups();
    });
  });
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;

  state.settings.threshold = preset.threshold;
  state.decision = structuredClone(preset.decision);
  state.choiceA = structuredClone(preset.decision);
  state.choiceB = name === "major"
    ? structuredClone(presets.medium.decision)
    : structuredClone(defaultChoiceB);

  syncSettingsUI();
  rebuildAllControls();
  renderDecisionOutput();
  renderChoiceOutput();
  saveState();
}

function setDecisionPreset(kind) {
  const source = kind === "major"
    ? { V: 5, I: 5, U: 3, Conf: 0.8, C: 3, D: 2, F: 3, Risk: 3, A: true, R: true, Cap: true, N: true }
    : kind === "medium"
      ? { V: 4, I: 3, U: 2, Conf: 0.7, C: 2, D: 2, F: 2, Risk: 2, A: true, R: true, Cap: true, N: true }
      : { V: 2, I: 2, U: 1, Conf: 0.85, C: 1, D: 1, F: 1, Risk: 1, A: true, R: true, Cap: true, N: true };

  Object.assign(state.decision, source);
  saveState();
  rebuildAllControls();
  renderDecisionOutput();
  renderChoiceOutput();
}

function wireSettings() {
  els.openSettings.addEventListener("click", () => {
    els.settingsPanel.classList.add("open");
    els.overlay.classList.add("show");
    els.settingsPanel.setAttribute("aria-hidden", "false");
  });

  function closeSettings() {
    els.settingsPanel.classList.remove("open");
    els.overlay.classList.remove("show");
    els.settingsPanel.setAttribute("aria-hidden", "true");
  }

  els.closeSettings.addEventListener("click", closeSettings);
  els.overlay.addEventListener("click", closeSettings);

  els.thresholdSlider.addEventListener("input", () => {
    state.settings.threshold = parseInt(els.thresholdSlider.value, 10);
    els.thresholdValue.textContent = state.settings.threshold;
    saveState();
    renderDecisionOutput();
  });

  els.hardGateToggle.addEventListener("change", () => {
    state.settings.useHardGate = els.hardGateToggle.checked;
    saveState();
    renderDecisionOutput();
    renderChoiceOutput();
  });

  els.decimalToggle.addEventListener("change", () => {
    state.settings.showDecimals = els.decimalToggle.checked;
    saveState();
    renderDecisionOutput();
    renderChoiceOutput();
    renderHistory();
  });

  els.noiseNowToggle.addEventListener("change", () => {
    state.settings.noiseMeansNow = els.noiseNowToggle.checked;
    saveState();
    renderDecisionOutput();
    renderChoiceOutput();
  });

  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });
}

function wireTabs() {
  els.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      els.tabs.forEach(t => t.classList.remove("active"));
      els.tabPanels.forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });
}

function wireDecisionButtons() {
  els.calculateDecisionBtn.addEventListener("click", () => {
    const score = renderDecisionOutput();
    const verdict = verdictFromScore(score);
    addHistoryItem("Decision Maker", score, verdict.text);
  });

  els.compareChoicesBtn.addEventListener("click", () => {
    const a = scoreDecision(state.choiceA);
    const b = scoreDecision(state.choiceB);
    const diff = a.score - b.score;

    renderChoiceOutput();

    const label = Math.abs(diff) < 1.5
      ? "Choice comparison: very close"
      : diff > 0
        ? "Choice comparison: A wins"
        : "Choice comparison: B wins";

    addHistoryItem("Choice Maker", diff, label);
  });

  document.querySelectorAll("[data-fill]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.fill;
      if (action === "decisionSmall") setDecisionPreset("small");
      if (action === "decisionMedium") setDecisionPreset("medium");
      if (action === "decisionMajor") setDecisionPreset("major");
      if (action === "decisionReset") {
        state.decision = structuredClone(defaultDecision);
        saveState();
        rebuildAllControls();
        renderDecisionOutput();
        renderChoiceOutput();
      }
    });
  });
}

function wireSlots() {
  els.addSlotInputBtn.addEventListener("click", () => addSlotInput());

  els.clearSlotFormBtn.addEventListener("click", () => {
    state.editingSlotIndex = null;
    els.slotGroupName.value = "";
    renderSlotFormInputs();
  });

  els.saveSlotGroupBtn.addEventListener("click", () => {
    const name = els.slotGroupName.value.trim();
    const slots = [...els.slotInputs.querySelectorAll(".slot-name-input")]
      .map(input => input.value.trim())
      .filter(Boolean);

    if (!name) {
      alert("Please enter a group name.");
      return;
    }

    if (!slots.length) {
      alert("Add at least one slot.");
      return;
    }

    const group = { name, slots };

    if (state.editingSlotIndex === null) {
      state.slots.push(group);
    } else {
      state.slots[state.editingSlotIndex] = group;
      state.editingSlotIndex = null;
    }

    saveState();
    els.slotGroupName.value = "";
    renderSlotFormInputs();
    renderSlotGroups();
  });
}

function addHistoryItem(title, score, details) {
  state.history.unshift({
    title,
    score,
    details,
    time: new Date().toLocaleString(),
  });
  state.history = state.history.slice(0, 12);
  saveState();
  renderHistory();
}

function renderHistory() {
  els.historyList.innerHTML = "";

  if (!state.history.length) {
    els.historyList.innerHTML = `<div class="history-item"><div><strong>No history yet</strong><small>Your calculations will appear here.</small></div></div>`;
    return;
  }

  state.history.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <div>
        <strong>${escapeHTML(item.title)}</strong>
        <small>${escapeHTML(item.details)} · ${escapeHTML(item.time)}</small>
      </div>
      <div class="history-score">${formatScore(item.score)}</div>
    `;
    els.historyList.appendChild(div);
  });
}

function init() {
  loadState();
  wireTabs();
  wireSettings();
  wireDecisionButtons();
  wireSlots();

  syncSettingsUI();
  rebuildAllControls();
  renderDecisionOutput();
  renderChoiceOutput();
  renderHistory();
  renderSlotFormInputs();
  renderSlotGroups();
  saveState();
}

init();
