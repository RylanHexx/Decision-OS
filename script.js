const STORAGE_KEY = "decisionOS.v6";

const defaultDecision = {
  V: 4, I: 4, U: 2, Conf: 0.7, C: 2, D: 2, F: 2, Risk: 2,
  A: true, R: true, Cap: true, N: true,
};

const defaultChoiceB = {
  V: 3, I: 3, U: 3, Conf: 0.6, C: 2, D: 3, F: 2, Risk: 2,
  A: true, R: true, Cap: true, N: true,
};

const state = {
  settings: {
    threshold: 8,
    useHardGate: true,
    showDecimals: true,
  },
  decision: structuredClone(defaultDecision),
  choiceA: structuredClone(defaultDecision),
  choiceB: structuredClone(defaultChoiceB),
  reviewEntries: [],
  slots: [{ name: "Practice", slots: ["Math", "English", "Chess"] }],
  editingSlotIndex: null,
  advanced: {
    adaptiveEnabled: true,
    modeEnabled: true,
    biasEnabled: true,
    weightPreset: "custom",
    decisionMode: "builder",
    maxRanges: { V: 5, I: 5, U: 5, Conf: 1, C: 5, D: 5, F: 5, Risk: 5 },
    weights: { V: 1.2, I: 1.2, U: 1.0, Conf: 1.2, C: 1.0, D: 1.0, F: 1.0, Risk: 1.0 },
    dopamineUrgency: 2.4,
    dopamineNovelty: 2.8,
    dopamineImpulse: false,
    regretIgnore: 5,
    regretPursue: 3,
    opportunityValue: 5,
    recoveryCost: 2,
  }
};

const advancedPresets = {
  custom: { decisionMode: "builder" },
  career: {
    decisionMode: "execution",
    weights: { V: 1.2, I: 1.8, U: 0.7, Conf: 1.5, C: 1.0, D: 1.1, F: 0.9, Risk: 1.1 },
    maxRanges: { V: 10, I: 10, U: 5, Conf: 1, C: 7, D: 7, F: 6, Risk: 7 }
  },
  learning: {
    decisionMode: "learning",
    weights: { V: 1.1, I: 1.7, U: 0.6, Conf: 1.4, C: 1.0, D: 0.9, F: 0.9, Risk: 1.0 },
    maxRanges: { V: 8, I: 10, U: 5, Conf: 1, C: 6, D: 6, F: 6, Risk: 6 }
  },
  recovery: {
    decisionMode: "recovery",
    weights: { V: 1.0, I: 1.1, U: 0.6, Conf: 1.0, C: 1.5, D: 1.3, F: 1.5, Risk: 1.2 },
    maxRanges: { V: 7, I: 8, U: 3, Conf: 1, C: 10, D: 10, F: 10, Risk: 8 }
  },
  exploration: {
    decisionMode: "exploration",
    weights: { V: 1.1, I: 1.0, U: 1.1, Conf: 1.0, C: 1.0, D: 1.0, F: 0.9, Risk: 0.9 },
    maxRanges: { V: 9, I: 8, U: 6, Conf: 1, C: 7, D: 7, F: 7, Risk: 7 }
  }
};

const modePresets = {
  builder: { threshold: 8, weights: { V: 1.2, I: 1.2, U: 1.0, Conf: 1.2, C: 1.0, D: 1.0, F: 1.0, Risk: 1.0 } },
  recovery: { threshold: 10, weights: { V: 1.0, I: 1.1, U: 0.7, Conf: 1.0, C: 1.5, D: 1.3, F: 1.5, Risk: 1.2 } },
  exploration: { threshold: 7, weights: { V: 1.1, I: 1.0, U: 1.1, Conf: 1.0, C: 1.0, D: 1.0, F: 0.9, Risk: 0.9 } },
  execution: { threshold: 9, weights: { V: 1.0, I: 1.2, U: 1.3, Conf: 1.1, C: 1.1, D: 1.1, F: 1.1, Risk: 1.0 } },
  learning: { threshold: 8, weights: { V: 1.0, I: 1.3, U: 0.8, Conf: 1.2, C: 1.0, D: 0.9, F: 1.0, Risk: 1.0 } },
};

const decisionFields = [
  { key: "V", label: "Value Alignment", min: 1, max: 5, step: 1, help: "Supports your direction.", tooltip: "Does this align with my identity?", type: "range" },
  { key: "I", label: "Long-Term Impact", min: 1, max: 5, step: 1, help: "Matters across years.", tooltip: "Will this matter later?", type: "range" },
  { key: "U", label: "Urgency", min: 1, max: 5, step: 1, help: "Real time pressure.", tooltip: "Is this truly urgent?", type: "range" },
  { key: "Conf", label: "Confidence", min: 0.1, max: 1, step: 0.05, help: "Evidence strength.", tooltip: "How certain am I?", type: "range" },
  { key: "C", label: "Cost", min: 1, max: 5, step: 1, help: "Time and energy required.", tooltip: "How costly is it?", type: "range" },
  { key: "D", label: "Distraction", min: 1, max: 5, step: 1, help: "Rabbit-hole risk.", tooltip: "Will it split my focus?", type: "range" },
  { key: "F", label: "Friction", min: 1, max: 5, step: 1, help: "Annoyance to begin.", tooltip: "How hard is it to start?", type: "range" },
  { key: "Risk", label: "Risk", min: 1, max: 5, step: 1, help: "Downside if wrong.", tooltip: "What if this fails?", type: "range" },
  { key: "A", label: "Aligned", help: "Supports your direction", tooltip: "Aligned with my path?", type: "bool" },
  { key: "R", label: "Reversible", help: "Can be undone later", tooltip: "Can I undo it?", type: "bool" },
  { key: "Cap", label: "Capacity", help: "Enough energy now", tooltip: "Do I have bandwidth?", type: "bool" },
  { key: "N", label: "Noise-free", help: "Not FOMO-driven", tooltip: "Is this just noise?", type: "bool" },
];

const el = (id) => document.getElementById(id);

const els = {
  tabs: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  openSettings: el("openSettings"),
  closeSettings: el("closeSettings"),
  settingsPanel: el("settingsPanel"),
  overlay: el("overlay"),
  thresholdSlider: el("thresholdSlider"),
  thresholdValue: el("thresholdValue"),
  hardGateToggle: el("hardGateToggle"),
  decimalToggle: el("decimalToggle"),
  decisionTitle: el("decisionTitle"),
  decisionControls: el("decisionControls"),
  choiceAControls: el("choiceAControls"),
  choiceBControls: el("choiceBControls"),
  calculateBtn: el("calculateBtn"),
  compareChoicesBtn: el("compareChoicesBtn"),
  resultBox: el("resultBox"),
  choiceResult: el("choiceResult"),
  reviewList: el("reviewList"),
  reviewModalOverlay: el("reviewModalOverlay"),
  reviewModal: el("reviewModal"),
  closeReviewModal: el("closeReviewModal"),
  reviewTitle: el("reviewTitle"),
  reviewOutcome: el("reviewOutcome"),
  reviewSideEffects: el("reviewSideEffects"),
  reviewCollisions: el("reviewCollisions"),
  reviewNotes: el("reviewNotes"),
  reviewRepeat: el("reviewRepeat"),
  saveReviewBtn: el("saveReviewBtn"),
  slotGroupName: el("slotGroupName"),
  slotInputs: el("slotInputs"),
  addSlotInputBtn: el("addSlotInputBtn"),
  saveSlotGroupBtn: el("saveSlotGroupBtn"),
  clearSlotFormBtn: el("clearSlotFormBtn"),
  slotGroups: el("slotGroups"),
  enableAdaptiveWeights: el("enableAdaptiveWeights"),
  enableDecisionMode: el("enableDecisionMode"),
  enableBiasFilters: el("enableBiasFilters"),
  weightPreset: el("weightPreset"),
  decisionMode: el("decisionMode"),
  maxRangeList: el("maxRangeList"),
  dopamineUrgency: el("dopamineUrgency"),
  dopamineNovelty: el("dopamineNovelty"),
  dopamineImpulse: el("dopamineImpulse"),
  regretIgnore: el("regretIgnore"),
  regretPursue: el("regretPursue"),
  opportunityValue: el("opportunityValue"),
  recoveryCost: el("recoveryCost"),
};

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    settings: state.settings,
    decision: state.decision,
    choiceA: state.choiceA,
    choiceB: state.choiceB,
    reviewEntries: state.reviewEntries,
    slots: state.slots,
    editingSlotIndex: state.editingSlotIndex,
    advanced: state.advanced,
  }));
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
    if (saved.advanced) state.advanced = { ...state.advanced, ...saved.advanced };
    if (Array.isArray(saved.reviewEntries)) state.reviewEntries = saved.reviewEntries;
    if (Array.isArray(saved.slots)) state.slots = saved.slots;
    if (typeof saved.editingSlotIndex === "number" || saved.editingSlotIndex === null) state.editingSlotIndex = saved.editingSlotIndex;
  } catch {}
}

function formatScore(value) {
  return state.settings.showDecimals ? value.toFixed(2) : Math.round(value).toString();
}

function verdictFromScore(score) {
  if (score >= state.settings.threshold) return { text: "Do it now", cls: "good" };
  if (score >= state.settings.threshold - 4) return { text: "Maybe later", cls: "warn" };
  return { text: "Do not do it", cls: "bad" };
}

function activeMode() {
  return modePresets[state.advanced.decisionMode] || modePresets.builder;
}

function activeWeights() {
  return state.advanced.adaptiveEnabled ? state.advanced.weights : activeMode().weights;
}

function gateValue(obj) {
  if (!state.settings.useHardGate) return 1;
  return Number(!!obj.A) * Number(!!obj.R) * Number(!!obj.Cap) * Number(!!obj.N);
}

function weightedBenefit(obj) {
  const w = activeWeights();
  const confMax = Math.max(state.advanced.maxRanges.Conf || 1, 1);
  const confNorm = obj.Conf / confMax;
  return (
    obj.V * w.V +
    obj.I * w.I +
    obj.U * w.U +
    confNorm * 10 * w.Conf
  ) / (w.V + w.I + w.U + w.Conf);
}

function weightedPenalty(obj) {
  const w = activeWeights();
  return (
    obj.C * w.C +
    obj.D * w.D +
    obj.F * w.F +
    obj.Risk * w.Risk
  ) / (w.C + w.D + w.F + w.Risk);
}

function dopaminePenalty() {
  if (!state.advanced.biasEnabled) return 0;
  return (parseFloat(els.dopamineUrgency.value) * 1.2) + (parseFloat(els.dopamineNovelty.value) * 1.5) + (els.dopamineImpulse.checked ? 2.2 : 0);
}

function regretAdjustment() {
  if (!state.advanced.biasEnabled) return 0;
  const ignore = parseFloat(els.regretIgnore.value) || 0;
  const pursue = parseFloat(els.regretPursue.value) || 0;
  const opportunity = parseFloat(els.opportunityValue.value) || 0;
  const recovery = parseFloat(els.recoveryCost.value) || 0;
  return (ignore + opportunity) - (pursue + recovery);
}

function scoreDecision(obj) {
  const gate = gateValue(obj);
  const benefit = weightedBenefit(obj);
  const penalty = weightedPenalty(obj);
  let score = gate * ((benefit * 2.4) - (penalty * 1.8));

  if (state.advanced.biasEnabled) {
    score -= dopaminePenalty() * 0.45;
    score += regretAdjustment() * 0.18;
  }

  if (state.advanced.modeEnabled) {
    const mode = state.advanced.decisionMode;
    if (mode === "execution") score += obj.U * 0.2;
    if (mode === "recovery") score -= 0.8;
    if (mode === "learning") score += obj.I * 0.1;
    if (mode === "exploration") score += obj.V * 0.08;
  }

  return { score, gate, benefit, penalty };
}

function renderDecisionResult() {
  const result = scoreDecision(state.decision);
  const verdict = verdictFromScore(result.score);
  const title = (els.decisionTitle?.value || "").trim() || `Decision ${new Date().toLocaleDateString()}`;
  const warnings = [];
  if (state.advanced.biasEnabled && dopaminePenalty() > 3.5) warnings.push("⚠ High dopamine risk.");
  if (state.advanced.biasEnabled && regretAdjustment() < 0) warnings.push("⚠ Regret profile is weak.");

  els.resultBox.innerHTML = `
    <div class="result-pill"><span class="${verdict.cls}">${verdict.text}</span></div>
    <div class="result-number">${formatScore(result.score)}</div>
    <div class="result-meta">
      <strong>${escapeHTML(title)}</strong><br>
      Gate: ${result.gate ? "pass" : "fail"} · Benefit ${formatScore(result.benefit)} · Penalty ${formatScore(result.penalty)}
    </div>
    <div class="result-formula">
      Score = WeightedBenefit × 2.4 − WeightedPenalty × 1.8
      ${state.advanced.adaptiveEnabled ? " · adaptive" : ""}
      ${state.advanced.modeEnabled ? " · mode" : ""}
      ${state.advanced.biasEnabled ? " · bias" : ""}
    </div>
    ${warnings.length ? `<div class="warning">${warnings.join(" ")}</div>` : ""}
  `;
  return { score: result.score, verdict, title };
}

function renderChoiceResult() {
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

  return { a: a.score, b: b.score, diff };
}

function entrySummary(entry) {
  const fb = entry.feedback || {};
  const pieces = [];
  if (fb.outcome) pieces.push(`Outcome: ${fb.outcome}`);
  if (fb.repeat) pieces.push(`Repeat: ${fb.repeat}`);
  if (fb.sideEffects) pieces.push("Side effects noted");
  if (fb.collisions) pieces.push("Collisions noted");
  return pieces.length ? pieces.join(" · ") : "No feedback yet";
}

function renderReviewList() {
  els.reviewList.innerHTML = "";
  if (!state.reviewEntries.length) {
    els.reviewList.innerHTML = `<div class="review-empty"><strong>No saved decisions yet</strong><small>Run a decision or comparison to populate the Review tab.</small></div>`;
    return;
  }

  state.reviewEntries.forEach(entry => {
    const card = document.createElement("div");
    card.className = "review-card";
    const badge = entry.type === "choice" ? "Choice" : "Decision";
    const reviewStatus = entry.feedback?.outcome ? "Reviewed" : "Pending review";
    card.innerHTML = `
      <div class="review-card-head">
        <div>
          <div class="review-title">${escapeHTML(entry.title)}</div>
          <div class="review-meta">${escapeHTML(new Date(entry.createdAt).toLocaleString())}</div>
        </div>
        <div class="review-badge">${badge}</div>
      </div>
      <div class="review-summary">
        <span class="review-badge">${escapeHTML(entry.verdictText || "—")}</span>
        <span class="review-badge">${escapeHTML(formatScore(entry.score))}</span>
        <span class="review-badge">${escapeHTML(reviewStatus)}</span>
      </div>
      <div class="review-meta">${escapeHTML(entrySummary(entry))}</div>
    `;
    card.addEventListener("click", () => openReviewModal(entry.id));
    els.reviewList.appendChild(card);
  });
}

function addReviewEntry(entry) {
  state.reviewEntries.unshift(entry);
  saveState();
  renderReviewList();
}

function openReviewModal(id) {
  const entry = state.reviewEntries.find(item => item.id === id);
  if (!entry) return;
  state.activeReviewId = id;
  els.reviewTitle.value = entry.title || "";
  els.reviewOutcome.value = entry.feedback?.outcome || "";
  els.reviewSideEffects.value = entry.feedback?.sideEffects || "";
  els.reviewCollisions.value = entry.feedback?.collisions || "";
  els.reviewNotes.value = entry.feedback?.notes || "";
  els.reviewRepeat.value = entry.feedback?.repeat || "";
  els.reviewModalOverlay.hidden = false;
  els.reviewModal.hidden = false;
  els.reviewModalOverlay.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeReviewModal() {
  els.reviewModalOverlay.classList.remove("show");
  els.reviewModal.hidden = true;
  els.reviewModalOverlay.hidden = true;
  document.body.style.overflow = "";
  state.activeReviewId = null;
}

function saveReviewFeedback() {
  const entry = state.reviewEntries.find(item => item.id === state.activeReviewId);
  if (!entry) return;
  entry.title = els.reviewTitle.value.trim() || entry.title;
  entry.feedback = {
    outcome: els.reviewOutcome.value,
    sideEffects: els.reviewSideEffects.value.trim(),
    collisions: els.reviewCollisions.value.trim(),
    notes: els.reviewNotes.value.trim(),
    repeat: els.reviewRepeat.value,
    reviewedAt: new Date().toISOString(),
  };
  entry.updatedAt = new Date().toISOString();
  saveState();
  renderReviewList();
  closeReviewModal();
}

function createControls(container, sourceState) {
  container.innerHTML = "";
  decisionFields.forEach(field => {
    const tpl = document.getElementById("controlTemplate");
    const node = tpl.content.cloneNode(true);
    const title = node.querySelector(".control-title");
    const value = node.querySelector(".control-value");
    const range = node.querySelector(".control-range");
    const note = node.querySelector(".control-note");
    const boolWrap = node.querySelector(".control-boolean");
    const boolNote = boolWrap.querySelector(".control-note");
    const toggle = node.querySelector(".control-toggle");

    let titleHTML = escapeHTML(field.label);
    if (field.tooltip) titleHTML += ` <span class="info-dot" data-tooltip="${escapeHTML(field.tooltip)}">i</span>`;
    title.innerHTML = titleHTML;
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
        refreshAll();
      });
    } else {
      boolWrap.remove();
      const max = state.advanced.maxRanges[field.key] || field.max;
      range.min = field.min;
      range.max = max;
      range.step = field.step || 1;
      sourceState[field.key] = Math.min(sourceState[field.key], max);
      range.value = sourceState[field.key];
      value.textContent = field.key === "Conf" ? Number(range.value).toFixed(2) : range.value;
      range.addEventListener("input", () => {
        sourceState[field.key] = parseFloat(range.value);
        value.textContent = field.key === "Conf" ? Number(range.value).toFixed(2) : range.value;
        saveState();
        refreshAll();
      });
    }

    container.appendChild(node);
  });
}

function renderBiasControls() {
  [
    "dopamineUrgency","dopamineNovelty","regretIgnore","regretPursue","opportunityValue","recoveryCost"
  ].forEach(id => {
    const node = document.getElementById(id);
    if (node) node.addEventListener("input", () => { saveState(); refreshAll(); });
  });
  if (els.dopamineImpulse) els.dopamineImpulse.addEventListener("change", () => { saveState(); refreshAll(); });
}

function renderMaxRanges() {
  const items = [
    { key: "V", label: "Value", min: 3, max: 10, help: "Upper cap for value slider." },
    { key: "I", label: "Impact", min: 3, max: 10, help: "Upper cap for impact slider." },
    { key: "U", label: "Urgency", min: 3, max: 10, help: "Upper cap for urgency slider." },
    { key: "Conf", label: "Confidence", min: 1, max: 10, help: "Upper cap for confidence slider." },
    { key: "C", label: "Cost", min: 3, max: 10, help: "Upper cap for cost slider." },
    { key: "D", label: "Distraction", min: 3, max: 10, help: "Upper cap for distraction slider." },
    { key: "F", label: "Friction", min: 3, max: 10, help: "Upper cap for friction slider." },
    { key: "Risk", label: "Risk", min: 3, max: 10, help: "Upper cap for risk slider." },
  ];
  els.maxRangeList.innerHTML = "";
  items.forEach(item => {
    const wrap = document.createElement("div");
    wrap.className = "range-item";
    const current = state.advanced.maxRanges[item.key] ?? item.max;
    wrap.innerHTML = `
      <div class="range-item-head">
        <label>${escapeHTML(item.label)}</label>
        <small>${current}</small>
      </div>
      <input type="range" min="${item.min}" max="${item.max}" step="1" value="${current}">
      <div class="meta">${escapeHTML(item.help)}</div>
    `;
    const input = wrap.querySelector("input");
    const small = wrap.querySelector("small");
    input.addEventListener("input", () => {
      state.advanced.maxRanges[item.key] = parseInt(input.value, 10);
      small.textContent = input.value;
      saveState();
      refreshAll();
    });
    els.maxRangeList.appendChild(wrap);
  });
}

function syncAdvancedUI() {
  els.enableAdaptiveWeights.checked = state.advanced.adaptiveEnabled;
  els.enableDecisionMode.checked = state.advanced.modeEnabled;
  els.enableBiasFilters.checked = state.advanced.biasEnabled;
  els.weightPreset.value = state.advanced.weightPreset;
  els.decisionMode.value = state.advanced.decisionMode;
  els.dopamineUrgency.value = state.advanced.dopamineUrgency;
  els.dopamineNovelty.value = state.advanced.dopamineNovelty;
  els.dopamineImpulse.checked = state.advanced.dopamineImpulse;
  els.regretIgnore.value = state.advanced.regretIgnore;
  els.regretPursue.value = state.advanced.regretPursue;
  els.opportunityValue.value = state.advanced.opportunityValue;
  els.recoveryCost.value = state.advanced.recoveryCost;
}

function setAdvancedPreset(name) {
  const preset = advancedPresets[name];
  state.advanced.weightPreset = name;
  if (preset) {
    if (preset.weights) state.advanced.weights = { ...state.advanced.weights, ...preset.weights };
    if (preset.maxRanges) state.advanced.maxRanges = { ...state.advanced.maxRanges, ...preset.maxRanges };
    if (preset.decisionMode) state.advanced.decisionMode = preset.decisionMode;
  }
  syncAdvancedUI();
  renderMaxRanges();
  saveState();
  refreshAll();
}

function refreshAll() {
  renderDecisionResult();
  renderChoiceResult();
  renderReviewList();
  renderSlots();
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
    renderDecisionResult();
  });

  els.hardGateToggle.addEventListener("change", () => {
    state.settings.useHardGate = els.hardGateToggle.checked;
    saveState();
    refreshAll();
  });

  els.decimalToggle.addEventListener("change", () => {
    state.settings.showDecimals = els.decimalToggle.checked;
    saveState();
    refreshAll();
  });
}

function wireDecision() {
  createControls(els.decisionControls, state.decision);

  document.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset;
      if (preset === "small") {
        state.decision = { V: 2, I: 2, U: 1, Conf: 0.85, C: 1, D: 1, F: 1, Risk: 1, A: true, R: true, Cap: true, N: true };
        state.settings.threshold = 5;
      }
      if (preset === "medium") {
        state.decision = { V: 4, I: 3, U: 2, Conf: 0.7, C: 2, D: 2, F: 2, Risk: 2, A: true, R: true, Cap: true, N: true };
        state.settings.threshold = 8;
      }
      if (preset === "major") {
        state.decision = { V: 5, I: 5, U: 3, Conf: 0.8, C: 3, D: 2, F: 3, Risk: 3, A: true, R: true, Cap: true, N: true };
        state.settings.threshold = 10;
      }
      if (preset === "reset") {
        state.decision = structuredClone(defaultDecision);
        state.choiceA = structuredClone(defaultDecision);
        state.choiceB = structuredClone(defaultChoiceB);
        state.settings = { threshold: 8, useHardGate: true, showDecimals: true };
        state.advanced = {
          adaptiveEnabled: true,
          modeEnabled: true,
          biasEnabled: true,
          weightPreset: "custom",
          decisionMode: "builder",
          maxRanges: { V: 5, I: 5, U: 5, Conf: 1, C: 5, D: 5, F: 5, Risk: 5 },
          weights: { V: 1.2, I: 1.2, U: 1.0, Conf: 1.2, C: 1.0, D: 1.0, F: 1.0, Risk: 1.0 },
          dopamineUrgency: 2.4,
          dopamineNovelty: 2.8,
          dopamineImpulse: false,
          regretIgnore: 5,
          regretPursue: 3,
          opportunityValue: 5,
          recoveryCost: 2,
        };
        els.decisionTitle.value = "";
      }
      syncAdvancedUI();
      renderMaxRanges();
      createControls(els.decisionControls, state.decision);
      createControls(els.choiceAControls, state.choiceA);
      createControls(els.choiceBControls, state.choiceB);
      saveState();
      refreshAll();
    });
  });

  els.calculateBtn.addEventListener("click", () => {
    const result = renderDecisionResult();
    const title = result.title || `Decision ${new Date().toLocaleDateString()}`;
    addReviewEntry({
      id: crypto.randomUUID(),
      type: "decision",
      title,
      score: result.score,
      verdictText: result.verdict.text,
      createdAt: new Date().toISOString(),
      summary: `Mode: ${state.advanced.decisionMode} · ${result.verdict.text}`,
      inputs: {
        decision: structuredClone(state.decision),
        settings: structuredClone(state.settings),
        advanced: structuredClone(state.advanced),
      },
      feedback: {},
    });
    saveState();
  });
}

function wireChoice() {
  createControls(els.choiceAControls, state.choiceA);
  createControls(els.choiceBControls, state.choiceB);

  els.compareChoicesBtn.addEventListener("click", () => {
    const result = renderChoiceResult();
    addReviewEntry({
      id: crypto.randomUUID(),
      type: "choice",
      title: "Choice Comparison",
      score: result.diff,
      verdictText: result.diff > 0 ? "Choice A wins" : (result.diff < 0 ? "Choice B wins" : "Very close call"),
      createdAt: new Date().toISOString(),
      summary: `A: ${formatScore(result.a)} · B: ${formatScore(result.b)}`,
      inputs: {
        choiceA: structuredClone(state.choiceA),
        choiceB: structuredClone(state.choiceB),
        settings: structuredClone(state.settings),
      },
      feedback: {},
    });
    saveState();
  });
}

function wireReview() {
  els.closeReviewModal.addEventListener("click", closeReviewModal);
  els.reviewModalOverlay.addEventListener("click", closeReviewModal);
  els.saveReviewBtn.addEventListener("click", saveReviewFeedback);

  els.reviewList.addEventListener("click", (e) => {
    const card = e.target.closest("[data-review-id]");
    if (!card) return;
    openReviewModal(card.dataset.reviewId);
  });
}

function renderReviewList() {
  els.reviewList.innerHTML = "";
  if (!state.reviewEntries.length) {
    els.reviewList.innerHTML = `<div class="review-empty"><strong>No saved decisions yet</strong><small>Run a decision or comparison to populate the Review tab.</small></div>`;
    return;
  }

  state.reviewEntries.forEach(entry => {
    const card = document.createElement("div");
    card.className = "review-card";
    card.dataset.reviewId = entry.id;
    const badge = entry.type === "choice" ? "Choice" : "Decision";
    const reviewStatus = entry.feedback?.outcome ? "Reviewed" : "Pending review";
    card.innerHTML = `
      <div class="review-card-head">
        <div>
          <div class="review-title">${escapeHTML(entry.title)}</div>
          <div class="review-meta">${escapeHTML(new Date(entry.createdAt).toLocaleString())}</div>
        </div>
        <div class="review-badge">${badge}</div>
      </div>
      <div class="review-summary">
        <span class="review-badge">${escapeHTML(entry.verdictText || "—")}</span>
        <span class="review-badge">${escapeHTML(formatScore(entry.score))}</span>
        <span class="review-badge">${escapeHTML(reviewStatus)}</span>
      </div>
      <div class="review-meta">${escapeHTML(entry.summary || "No summary yet")}</div>
    `;
    els.reviewList.appendChild(card);
  });
}

function saveReviewFeedback() {
  const entry = state.reviewEntries.find(item => item.id === state.activeReviewId);
  if (!entry) return;
  entry.title = els.reviewTitle.value.trim() || entry.title;
  entry.feedback = {
    outcome: els.reviewOutcome.value,
    sideEffects: els.reviewSideEffects.value.trim(),
    collisions: els.reviewCollisions.value.trim(),
    notes: els.reviewNotes.value.trim(),
    repeat: els.reviewRepeat.value,
    reviewedAt: new Date().toISOString(),
  };
  entry.updatedAt = new Date().toISOString();
  saveState();
  renderReviewList();
  closeReviewModal();
}

function wireSlots() {
  const addSlotInput = (value = "") => {
    const row = document.createElement("div");
    row.className = "slot-input-row";
    row.innerHTML = `
      <input class="text-input slot-name-input" type="text" placeholder="Slot name" value="${escapeHTML(value)}" />
      <button class="ghost-btn remove-slot-btn" type="button">Remove</button>
    `;
    row.querySelector(".remove-slot-btn").addEventListener("click", () => row.remove());
    els.slotInputs.appendChild(row);
  };

  const renderSlotForm = (values = ["", "", ""]) => {
    els.slotInputs.innerHTML = "";
    values.forEach(v => addSlotInput(v));
  };

  const renderSlots = () => {
    els.slotGroups.innerHTML = "";
    if (!state.slots.length) {
      els.slotGroups.innerHTML = `<div class="review-empty"><strong>No slot groups yet</strong><small>Create one to start organizing focus.</small></div>`;
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
          <div class="pill">Group ${index + 1}</div>
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
        renderSlotForm(group.slots);
        els.slotGroupName.value = group.name;
        state.editingSlotIndex = null;
      });
    });

    els.slotGroups.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.edit);
        const group = state.slots[idx];
        renderSlotForm(group.slots);
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
          renderSlotForm();
        }
        saveState();
        renderSlots();
      });
    });
  };

  addSlotInput();
  addSlotInput();
  addSlotInput();

  els.addSlotInputBtn.addEventListener("click", () => addSlotInput());
  els.clearSlotFormBtn.addEventListener("click", () => {
    state.editingSlotIndex = null;
    els.slotGroupName.value = "";
    renderSlotForm();
  });

  els.saveSlotGroupBtn.addEventListener("click", () => {
    const name = els.slotGroupName.value.trim();
    const slots = [...els.slotInputs.querySelectorAll(".slot-name-input")]
      .map(input => input.value.trim())
      .filter(Boolean);

    if (!name) return alert("Please enter a group name.");
    if (!slots.length) return alert("Add at least one slot.");

    const group = { name, slots };
    if (state.editingSlotIndex === null) {
      state.slots.push(group);
    } else {
      state.slots[state.editingSlotIndex] = group;
      state.editingSlotIndex = null;
    }

    saveState();
    els.slotGroupName.value = "";
    renderSlotForm();
    renderSlots();
  });

  renderSlots();
}

function wireAdvanced() {
  els.enableAdaptiveWeights.addEventListener("change", () => {
    state.advanced.adaptiveEnabled = els.enableAdaptiveWeights.checked;
    saveState();
    refreshAll();
  });
  els.enableDecisionMode.addEventListener("change", () => {
    state.advanced.modeEnabled = els.enableDecisionMode.checked;
    saveState();
    refreshAll();
  });
  els.enableBiasFilters.addEventListener("change", () => {
    state.advanced.biasEnabled = els.enableBiasFilters.checked;
    saveState();
    refreshAll();
  });

  els.weightPreset.addEventListener("change", () => {
    setAdvancedPreset(els.weightPreset.value);
  });

  els.decisionMode.addEventListener("change", () => {
    state.advanced.decisionMode = els.decisionMode.value;
    if (modePresets[state.advanced.decisionMode]) {
      state.settings.threshold = modePresets[state.advanced.decisionMode].threshold;
      state.advanced.weights = { ...state.advanced.weights, ...modePresets[state.advanced.decisionMode].weights };
    }
    syncAdvancedUI();
    renderMaxRanges();
    saveState();
    refreshAll();
  });

  renderBiasControls();
}

function wireMisc() {
  document.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset;
      if (preset === "small") {
        state.decision = { V: 2, I: 2, U: 1, Conf: 0.85, C: 1, D: 1, F: 1, Risk: 1, A: true, R: true, Cap: true, N: true };
        state.settings.threshold = 5;
      }
      if (preset === "medium") {
        state.decision = { V: 4, I: 3, U: 2, Conf: 0.7, C: 2, D: 2, F: 2, Risk: 2, A: true, R: true, Cap: true, N: true };
        state.settings.threshold = 8;
      }
      if (preset === "major") {
        state.decision = { V: 5, I: 5, U: 3, Conf: 0.8, C: 3, D: 2, F: 3, Risk: 3, A: true, R: true, Cap: true, N: true };
        state.settings.threshold = 10;
      }
      if (preset === "reset") {
        state.decision = structuredClone(defaultDecision);
        state.choiceA = structuredClone(defaultDecision);
        state.choiceB = structuredClone(defaultChoiceB);
        state.settings = { threshold: 8, useHardGate: true, showDecimals: true };
        state.advanced = {
          adaptiveEnabled: true,
          modeEnabled: true,
          biasEnabled: true,
          weightPreset: "custom",
          decisionMode: "builder",
          maxRanges: { V: 5, I: 5, U: 5, Conf: 1, C: 5, D: 5, F: 5, Risk: 5 },
          weights: { V: 1.2, I: 1.2, U: 1.0, Conf: 1.2, C: 1.0, D: 1.0, F: 1.0, Risk: 1.0 },
          dopamineUrgency: 2.4,
          dopamineNovelty: 2.8,
          dopamineImpulse: false,
          regretIgnore: 5,
          regretPursue: 3,
          opportunityValue: 5,
          recoveryCost: 2,
        };
        els.decisionTitle.value = "";
      }

      syncAdvancedUI();
      renderMaxRanges();
      createControls(els.decisionControls, state.decision);
      createControls(els.choiceAControls, state.choiceA);
      createControls(els.choiceBControls, state.choiceB);
      saveState();
      refreshAll();
    });
  });

  els.calculateBtn.addEventListener("click", () => {
    const result = renderDecisionResult();
    addReviewEntry({
      id: crypto.randomUUID(),
      type: "decision",
      title: result.title,
      score: result.score,
      verdictText: result.verdict.text,
      createdAt: new Date().toISOString(),
      summary: `Mode: ${state.advanced.decisionMode} · ${result.verdict.text}`,
      inputs: {
        decision: structuredClone(state.decision),
        settings: structuredClone(state.settings),
        advanced: structuredClone(state.advanced),
      },
      feedback: {},
    });
    saveState();
  });

  els.compareChoicesBtn.addEventListener("click", () => {
    const result = renderChoiceResult();
    addReviewEntry({
      id: crypto.randomUUID(),
      type: "choice",
      title: "Choice Comparison",
      score: result.diff,
      verdictText: result.diff > 0 ? "Choice A wins" : (result.diff < 0 ? "Choice B wins" : "Very close call"),
      createdAt: new Date().toISOString(),
      summary: `A: ${formatScore(result.a)} · B: ${formatScore(result.b)}`,
      inputs: {
        choiceA: structuredClone(state.choiceA),
        choiceB: structuredClone(state.choiceB),
        settings: structuredClone(state.settings),
      },
      feedback: {},
    });
    saveState();
  });

  els.reviewTitle.addEventListener("input", saveState);
  els.reviewOutcome.addEventListener("change", saveState);
  els.reviewSideEffects.addEventListener("input", saveState);
  els.reviewCollisions.addEventListener("input", saveState);
  els.reviewNotes.addEventListener("input", saveState);
  els.reviewRepeat.addEventListener("change", saveState);
}

function setupDecisionControls() {
  createControls(els.decisionControls, state.decision);
  createControls(els.choiceAControls, state.choiceA);
  createControls(els.choiceBControls, state.choiceB);
}

function init() {
  loadState();
  if (!state.advanced.weightPreset) state.advanced.weightPreset = "custom";
  if (!state.advanced.decisionMode) state.advanced.decisionMode = "builder";
  if (state.settings.threshold === undefined) state.settings.threshold = 8;

  wireTabs();
  wireSettings();
  wireAdvanced();
  wireMisc();
  wireReview();
  wireSlots();
  setupDecisionControls();
  syncAdvancedUI();
  renderMaxRanges();
  renderDecisionResult();
  renderChoiceResult();
  renderReviewList();
  saveState();
}

init();
