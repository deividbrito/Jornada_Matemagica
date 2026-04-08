class AudioManager {
  constructor() {
    this.sfxVolume = 0.25;
    this.bgmVolume = 0.15;
    this.currentBgm = null;
    
    // Dicionário de efeitos sonoros pré-carregados
    this.sfx = {
      click: new Audio("audio/sfx/click.mp3"),
      correct: new Audio("audio/sfx/acerto.mp3"),
      wrong: new Audio("audio/sfx/erro.mp3"),
      // ... outros sons
    };
  }

  playSfx(soundName) {
    if (this.sfx[soundName]) {
      // Clona o áudio para permitir que o mesmo som toque em cima dele mesmo (ex: cliques rápidos)
      const sound = this.sfx[soundName].cloneNode(); 
      sound.volume = this.sfxVolume;
      sound.play();
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
    this.currentBgm.play().catch(() => {});
  }

  stopBgm() {
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm.currentTime = 0;
      this.currentBgm = null;
    }
  }
}

// Injetamos na engine global para qualquer arquivo poder chamar
window.audioManager = new AudioManager();