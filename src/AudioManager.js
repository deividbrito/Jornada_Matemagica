class AudioManager {
  constructor() {
    this.sfxVolume = 0.25;
    this.bgmVolume = 0.15;
    this.currentBgm = null;

    // Dicionário de efeitos sonoros pré-carregados. Reusamos os 3 sons
    // existentes em mais eventos de UI (rank-up, menus, transições, etc.).
    this.sfx = {
      click: new Audio("audio/sfx/click.mp3"),
      correct: new Audio("audio/sfx/acerto.mp3"),
      wrong: new Audio("audio/sfx/erro.mp3"),
    };

    // Pausa o BGM quando a aba perde o foco — evita música tocando enquanto
    // o jogador está em outro app/aba. Retoma quando volta. Só afeta o BGM,
    // SFX (curtos) não sofrem com isso.
    document.addEventListener("visibilitychange", () => this._onVisibilityChange());
  }

  playSfx(soundName) {
    if (this.sfx[soundName]) {
      // Clona o áudio para permitir que o mesmo som toque em cima dele mesmo (ex: cliques rápidos)
      const sound = this.sfx[soundName].cloneNode();
      sound.volume = this.sfxVolume;
      sound.play().catch(() => {});
    }
  }

  playBgm(bgmSrc) {
    if (this.currentBgm && this.currentBgm.src.includes(bgmSrc)) {
      return; // já está tocando essa música
    }
    this.stopBgm();
    this.currentBgm = new Audio(bgmSrc);
    this.currentBgm.volume = this.bgmVolume;
    this.currentBgm.loop = true;
    this._tryPlayBgm();
  }

  // O autoplay é bloqueado quando o BGM inicia sem interação prévia na página
  // (ex.: reload pós-fase com jm_skip_title, que pula a TitleScreen). Nesse
  // caso, tenta de novo a cada interação do jogador até conseguir. Usa
  // pointerup (pointerdown de toque ainda não concede user activation) e
  // rearma se falhar — Esc e keydowns sintéticos dos TouchControls também
  // não concedem activation.
  _tryPlayBgm() {
    const bgm = this.currentBgm;
    if (!bgm) return;
    const arm = () => {
      document.addEventListener("pointerup", retry, { once: true });
      document.addEventListener("keydown", retry, { once: true });
    };
    const retry = () => {
      document.removeEventListener("pointerup", retry);
      document.removeEventListener("keydown", retry);
      // Só retoma se este áudio ainda for o BGM atual (pode ter trocado).
      if (this.currentBgm !== bgm) return;
      if (document.hidden) { arm(); return; } // visível de novo → _onVisibilityChange
      bgm.play().catch(arm);
    };
    bgm.play().catch(arm);
  }

  stopBgm() {
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm.currentTime = 0;
      this.currentBgm = null;
    }
  }

  _onVisibilityChange() {
    if (!this.currentBgm) return;
    if (document.hidden) {
      this.currentBgm.pause();
    } else {
      // .play() pode rejeitar se o usuário ainda não interagiu — silencioso ok.
      this.currentBgm.play().catch(() => {});
    }
  }
}

// Injetamos na engine global para qualquer arquivo poder chamar
window.audioManager = new AudioManager();
// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.AudioManager = AudioManager;
