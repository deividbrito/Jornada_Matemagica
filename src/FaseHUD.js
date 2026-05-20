// src/FaseHUD.js
// HUD persistente dentro do canvas (junto com XpBar) que mostra o nome da
// fase ativa + progresso de questões respondidas / meta + acertos.
//
// Aparece somente quando `window.progress.faseRun` está populado (jogador
// entrou via FaseSelector). Some no arcade, PauseMenu e ShowMap (mesma regra
// da XpBar, pra não poluir o canvas).
//
// Não decide nada — só reflete o estado. A lógica de fim de fase vive em
// OverworldEvent.quizGame (que chama Progress.recordFaseAnswer).

class FaseHUD {
  constructor() {
    this.element = null;
    this.poll = null;
  }

  mount(container) {
    if (this.element) return;
    this.element = document.createElement("div");
    this.element.className = "FaseHUD FaseHUD--hidden";
    this.element.innerHTML = `
      <div class="FaseHUD_name"></div>
      <div class="FaseHUD_stats">
        <span class="FaseHUD_progress">0/0</span>
        <span class="FaseHUD_sep">·</span>
        <span class="FaseHUD_correct">✓ 0</span>
      </div>
    `;
    container.appendChild(this.element);

    // Poll leve — segue o mesmo padrão da XpBar (sem dependência de eventos
    // novos). A faseRun muda raramente, então 300ms é mais que suficiente.
    this.poll = setInterval(() => this.refresh(), 300);
    this.refresh();
  }

  refresh() {
    if (!this.element) return;
    const run = window.progress && window.progress.faseRun;
    const inArcade = !!window.arcadeRun;
    const pauseOpen = !!document.querySelector(".PauseMenu");
    const mapOpen = !!document.querySelector(".ShowMap");
    const hide = !run || inArcade || pauseOpen || mapOpen;
    this.element.classList.toggle("FaseHUD--hidden", hide);
    if (!run) return;

    this.element.querySelector(".FaseHUD_name").textContent = run.nome;
    this.element.querySelector(".FaseHUD_progress").textContent =
      `${run.answered}/${run.metaQuestoes}`;
    this.element.querySelector(".FaseHUD_correct").textContent = `✓ ${run.correct}`;
  }

  unmount() {
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = null;
    }
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

window.faseHUD = new FaseHUD();
window.FaseHUD = FaseHUD;
