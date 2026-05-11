// HUD do Modo Gincana Acadêmica — overlay DOM sobre .game-container.
// Mostra tentativas, streak, multiplicador, pontos e progresso da etapa atual.

class ArcadeHUD {
  constructor() {
    this.element = null;
    this.visible = false;
  }

  show(container) {
    if (this.element) return;
    this.element = document.createElement("div");
    this.element.classList.add("ArcadeHUD");
    this.element.innerHTML = `
      <div class="ArcadeHUD_topleft">
        <div class="ArcadeHUD_row ArcadeHUD_topRow">
          <span class="ArcadeHUD_lives" data-lives></span>
          <span class="ArcadeHUD_buffs" data-buffs></span>
        </div>
        <div class="ArcadeHUD_row ArcadeHUD_statsRow">
          <span class="ArcadeHUD_streak">🔥<span data-streak>0</span></span>
          <span class="ArcadeHUD_mult">×<span data-mult>1.0</span></span>
          <span class="ArcadeHUD_score">Pts<span data-score>0</span></span>
        </div>
      </div>
      <div class="ArcadeHUD_topcenter ArcadeHUD_hidden" data-etapa>
        <div class="ArcadeHUD_etapaBar">
          <div class="ArcadeHUD_etapaBarFill" data-etapa-fill></div>
          <div class="ArcadeHUD_etapaBarText" data-etapa-text></div>
        </div>
      </div>
    `;
    (container || document.querySelector(".game-container")).appendChild(this.element);
    this.visible = true;
    this.refresh();
  }

  hide() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.visible = false;
  }

  refresh() {
    if (!this.element || !window.arcadeRun) return;
    const run = window.arcadeRun;

    // Tentativas (losangos azuis em vez de corações)
    const livesEl = this.element.querySelector("[data-lives]");
    const prevLives = parseInt(livesEl.dataset.prev || run.lives, 10);
    let tokens = "";
    for (let i = 0; i < run.maxLives; i++) {
      tokens += i < run.lives ? "◆" : "◇";
    }
    livesEl.textContent = tokens;
    livesEl.dataset.prev = String(run.lives);
    if (run.lives < prevLives) {
      livesEl.classList.remove("ArcadeHUD_livesPulse");
      void livesEl.offsetWidth;
      livesEl.classList.add("ArcadeHUD_livesPulse");
    }

    // Streak / multiplicador / pontos
    this.element.querySelector("[data-streak]").textContent = run.streak;
    this.element.querySelector("[data-mult]").textContent = this.computeMultiplier(run.streak).toFixed(1);
    this.element.querySelector("[data-score]").textContent = run.score;

    // Buffs ativos
    const buffsEl = this.element.querySelector("[data-buffs]");
    const active = [];
    if (run.freeAnswers > 0) active.push("📘" + run.freeAnswers);
    if (run.nextFiftyFifty) active.push("✂");
    if (run.focusRemaining > 0) active.push("⏸" + run.focusRemaining);
    if (run.nextDouble) active.push("✦");
    buffsEl.textContent = active.join(" ");
  }

  computeMultiplier(streak) {
    return Math.min(3.0, 1.0 + Math.min(streak, 20) * 0.1);
  }

  // Nova API: mostra barra de progresso da gincana.
  setEtapa(total) {
    if (!this.element) return;
    const wrap = this.element.querySelector("[data-etapa]");
    wrap.classList.remove("ArcadeHUD_hidden");
    this.updateEtapa(0, total);
  }

  updateEtapa(current, total) {
    if (!this.element) return;
    const fill = this.element.querySelector("[data-etapa-fill]");
    const text = this.element.querySelector("[data-etapa-text]");
    const pct = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
    // "Etapa X / N" = questão que está ativa agora (1-indexada).
    // Ao começar, current=0 → Etapa 1/N. Ao terminar a última, current=N → Etapa N/N.
    const active = total > 0 ? Math.min(current + 1, total) : 0;
    fill.style.width = (pct * 100) + "%";
    text.textContent = `Etapa ${active} / ${total}`;
  }

  hideEtapa() {
    if (!this.element) return;
    this.element.querySelector("[data-etapa]").classList.add("ArcadeHUD_hidden");
  }

  // Aliases para callers antigos (mago* → etapa*)
  setMago(_name, hp, hpMax) { this.setEtapa(hpMax); this.updateEtapa(hpMax - hp, hpMax); }
  updateMagoHp(hp, hpMax) { this.updateEtapa(hpMax - hp, hpMax); }
  hideMago() { this.hideEtapa(); }

  // Feedback visual agressivo foi removido (minimalista): no-ops mantidos por compat.
  floatDamage() { /* no-op */ }
  shakeMago() { /* no-op */ }
  shakeScreen() { /* no-op */ }

  showRewardToast(text) {
    if (!this.element) return;
    const toast = document.createElement("div");
    toast.classList.add("ArcadeHUD_toast");
    toast.textContent = text;
    this.element.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  }
}

window.arcadeHUD = new ArcadeHUD();
