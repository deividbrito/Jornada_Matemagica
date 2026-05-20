// src/XpBar.js
// HUD persistente no canto superior do overworld mostrando rank + XP atual
// + barra de progresso até o próximo rank.
//
// Regra de escala (UX-D): vive DENTRO do canvas (escala 3.5x), junto com o
// resto do HUD do mundo do jogo. Em modo Arcade, é escondido para dar lugar
// ao ArcadeHUD (que tem seu próprio painel de stats).
//
// Visível apenas para jogadores autenticados. Auto-atualiza via evento
// `jm:xp-updated` que o QuizGame emite após cada acerto + na conclusão de fase.

class XpBar {
  constructor() {
    this.element = null;
    this.fillEl = null;
    this.labelEl = null;
    this.rankEl = null;
    this._lastXp = 0;
    this._listener = null;
    this._arcadePoll = null;
  }

  async mount(container) {
    if (!window.api || !window.api.isLogged()) return; // não monta para guest
    if (this.element) return;

    this.element = document.createElement('div');
    this.element.className = 'XpBar';
    this.element.innerHTML = `
      <div class="XpBar_top">
        <span class="XpBar_rank">—</span>
        <span class="XpBar_xp">0 XP</span>
      </div>
      <div class="XpBar_track">
        <div class="XpBar_fill" style="width:0%"></div>
      </div>
    `;
    container.appendChild(this.element);

    this.fillEl = this.element.querySelector('.XpBar_fill');
    this.labelEl = this.element.querySelector('.XpBar_xp');
    this.rankEl = this.element.querySelector('.XpBar_rank');

    // Listener para atualizações vindas do QuizGame / faseConclusao.
    this._listener = (evt) => this._applyRankInfo(evt.detail);
    document.addEventListener('jm:xp-updated', this._listener);

    // Poll leve pra reagir ao modo arcade. OverworldEvent seta/zera
    // `window.arcadeRun` ao entrar/sair da gincana — usamos isso como sinal
    // pra esconder/mostrar a XpBar (no arcade, ArcadeHUD ocupa essa zona).
    this._arcadePoll = setInterval(() => this._updateArcadeVisibility(), 500);
    this._updateArcadeVisibility();

    // Carrega estado inicial do servidor
    await this.refresh();
  }

  _updateArcadeVisibility() {
    if (!this.element) return;
    const inArcade = !!window.arcadeRun;
    // Esconde também durante o PauseMenu (que sobrepõe o topo do canvas)
    // e durante a tela do mapa (ShowMap).
    const pauseOpen = !!document.querySelector('.PauseMenu');
    const mapOpen = !!document.querySelector('.ShowMap');
    this.element.classList.toggle('XpBar--hidden', inArcade || pauseOpen || mapOpen);
  }

  async refresh() {
    try {
      const meta = await window.arcadeMeta.getMeta();
      if (meta && meta.rank) {
        this._lastXp = meta.xp;
        this._applyRankInfo(meta.rank, /*animate*/ false);
      }
    } catch (_) {
      // silencioso — toast já alertaria; XpBar é não-bloqueante
    }
  }

  _applyRankInfo(rank, animate = true) {
    if (!this.element || !rank) return;
    this.rankEl.textContent = rank.name || '—';
    this.labelEl.textContent = `${rank.xp} XP`;
    const pct = Math.round((rank.progress || 0) * 100);
    this.fillEl.style.transition = animate ? 'width 600ms ease-out' : 'none';
    this.fillEl.style.width = `${pct}%`;
  }

  unmount() {
    if (this._listener) {
      document.removeEventListener('jm:xp-updated', this._listener);
      this._listener = null;
    }
    if (this._arcadePoll) {
      clearInterval(this._arcadePoll);
      this._arcadePoll = null;
    }
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

window.xpBar = new XpBar();
window.XpBar = XpBar;
