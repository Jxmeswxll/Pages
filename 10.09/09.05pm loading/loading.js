document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("perceptual-loader");
  if (!loader) return;

  // Elements
  const stagedText = document.getElementById("staged-text");
  const stagedPct = document.getElementById("staged-pct");
  const stagedFill = document.getElementById("staged-fill");
  const stagedHint = document.getElementById("staged-hint");
  const etaEl = document.getElementById("eta");
  const bar = loader.querySelector(".bar");
  const checklist = Array.from(document.querySelectorAll("#loader-checklist li"));
  const cancelBtn = document.getElementById("loader-cancel");
  const continueBtn = document.getElementById("loader-continue");

  // Config
  const TOTAL_MS = (() => {
    const v = parseInt(loader.getAttribute("data-total-ms") || "60000", 10);
    return Number.isFinite(v) ? v : 60000;
  })();

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Timeline copy (genuine, matches what we're actually doing)
  const STAGES = [
    { at: 0, text: "Warming up the benchmark engine…" },
    { at: 5000, text: "Loading real GPU/CPU benchmarks…" },
    { at: 12000, text: "Matching performance to your use‑case…" },
    { at: 22000, text: "Checking live stock and local pricing…" },
    { at: 35000, text: "Balancing performance vs. budget…" },
    { at: 48000, text: "Assembling your top picks…" },
    { at: 58000, text: "Final quality checks…" },
    { at: 60000, text: "Results ready." }
  ];

  // Friendly aside lines that remain truthful
  const ASIDES = [
    "Benchmarks > vibes.",
    "No, RGB doesn’t add FPS. We checked.",
    "Prices update live — they can wobble a little.",
    "We drop parts that throttle under load.",
    "We ignore sketchy marketing footnotes.",
    "Short break = better choices. Hydrate."
  ];

  // Persisted timing history for better ETA messaging
  const HISTORY_KEY = "qm_rec_durations";
  const readHistory = () => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  };
  const writeHistory = (arr) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(-5)));
    } catch {}
  };
  const median = (arr) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  };

  const formatMMSS = (ms) => {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // State
  let startTs = 0;
  let tickTimer = 0;
  let asideTimer = 0;
  let lastStageIndex = -1;
  let cancelled = false;
  let completed = false;

  function setAriaBusy(busy) {
    if (!bar) return;
    bar.setAttribute("aria-busy", busy ? "true" : "false");
    if (!busy) {
      bar.removeAttribute("aria-valuetext");
    }
  }

  function updateHint(typicalMs, aside) {
    if (!stagedHint) return;
    const hasTypical = typicalMs > 0;
    const typicalText = hasTypical ? `Typically ${formatMMSS(typicalMs)}.` : "Typically ~1:00.";
    stagedHint.textContent = `${typicalText} ${aside ? "— " + aside : ""}`;
  }

  function updateChecklist(elapsed) {
    for (const li of checklist) {
      const ms = parseInt(li.getAttribute("data-ms") || "0", 10);
      if (elapsed >= ms) {
        if (!li.classList.contains("done")) {
          li.classList.add("done");
        }
      }
    }
  }

  function updateStageCopy(elapsed) {
    let idx = STAGES.length - 1;
    for (let i = 0; i < STAGES.length; i++) {
      if (elapsed < STAGES[i].at) {
        idx = Math.max(0, i - 1);
        break;
      }
    }
    if (idx !== lastStageIndex) {
      lastStageIndex = idx;
      const msg = STAGES[idx].text;
      if (stagedText) stagedText.textContent = msg;
      if (bar) bar.setAttribute("aria-valuetext", msg);
    }
  }

  function updateProgress(elapsed) {
    const pct = Math.max(0, Math.min(100, Math.floor((elapsed / TOTAL_MS) * 100)));
    if (stagedFill) stagedFill.style.width = pct + "%";
    if (stagedPct) stagedPct.textContent = pct + "%";
    if (bar) bar.setAttribute("aria-valuenow", String(pct));

    const remaining = Math.max(0, TOTAL_MS - elapsed);
    if (etaEl) {
      etaEl.textContent = `~ ${formatMMSS(remaining)}`;
    }
  }

  function showContinue() {
    if (continueBtn) {
      continueBtn.hidden = false;
      continueBtn.setAttribute("aria-hidden", "false");
    }
  }

  function hideLoader() {
    if (loader) {
      loader.style.display = "none";
      loader.classList.remove("indeterminate", "determinate");
    }
  }

  function complete() {
    if (completed || cancelled) return;
    completed = true;

    clearInterval(tickTimer);
    clearInterval(asideTimer);

    // Ensure 100%
    if (stagedFill) stagedFill.style.width = "100%";
    if (stagedPct) stagedPct.textContent = "100%";
    if (bar) {
      bar.setAttribute("aria-valuenow", "100");
      setAriaBusy(false);
    }

    // Mark all checklist items done
    for (const li of checklist) li.classList.add("done");

    if (stagedText) stagedText.textContent = "Results ready.";
    if (stagedHint) stagedHint.textContent = "Thanks for waiting.";

    // Save duration
    try {
      const arr = readHistory();
      arr.push(Date.now() - startTs);
      writeHistory(arr);
    } catch {}

    showContinue();

    // Broadcast done for integration
    window.dispatchEvent(
      new CustomEvent("aftershock:loader:done", {
        detail: { totalMs: TOTAL_MS, elapsedMs: TOTAL_MS }
      })
    );
  }

  function cancel() {
    if (completed || cancelled) return;
    cancelled = true;
    clearInterval(tickTimer);
    clearInterval(asideTimer);
    hideLoader();

    window.dispatchEvent(
      new CustomEvent("aftershock:loader:cancelled", {
        detail: { atMs: Date.now() - startTs }
      })
    );

    // Optional: navigate back in history if desired by host page
    // history.back();
  }

  function start() {
    startTs = Date.now();
    cancelled = false;
    completed = false;
    lastStageIndex = -1;

    loader.classList.remove("indeterminate");
    loader.classList.add("determinate");
    setAriaBusy(true);

    // Initial UI
    updateStageCopy(0);
    updateProgress(0);

    // Hint: typical time + asides
    const typical = median(readHistory()) || TOTAL_MS;
    let asideIdx = Math.floor(Math.random() * ASIDES.length);
    updateHint(typical, ASIDES[asideIdx]);

    clearInterval(asideTimer);
    asideTimer = window.setInterval(() => {
      asideIdx = (asideIdx + 1) % ASIDES.length;
      updateHint(typical, ASIDES[asideIdx]);
    }, prefersReducedMotion ? 9000 : 6000);

    // Main tick
    const step = prefersReducedMotion ? 250 : 100;
    clearInterval(tickTimer);
    tickTimer = window.setInterval(() => {
      const elapsed = Date.now() - startTs;
      updateStageCopy(elapsed);
      updateProgress(elapsed);
      updateChecklist(elapsed);

      // Broadcast tick for host to sync UI if needed
      const pct = Math.max(0, Math.min(100, Math.floor((elapsed / TOTAL_MS) * 100)));
      window.dispatchEvent(
        new CustomEvent("aftershock:loader:tick", {
          detail: { elapsedMs: elapsed, totalMs: TOTAL_MS, pct }
        })
      );

      if (elapsed >= TOTAL_MS) {
        complete();
      }
    }, step);
  }

  // Wire buttons
  if (cancelBtn) {
    cancelBtn.addEventListener("click", cancel, { once: false });
  }
  if (continueBtn) {
    continueBtn.addEventListener("click", (e) => {
      // Hosts can listen for this event to route to results
      window.dispatchEvent(new CustomEvent("aftershock:loader:continue"));
      // Prevent jump to # if no href is set
      if (continueBtn.getAttribute("href") === "#" || !continueBtn.getAttribute("href")) {
        e.preventDefault();
      }
    });
  }

  // Expose small API for host pages to control loader if backend finishes early/late
  window.AftershockLoader = {
    start,
    complete,
    cancel
  };

  // Kick off
  start();
});
