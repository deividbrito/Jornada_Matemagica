class AudioManager {
  constructor() {
    this.sfxVolume = 0.5;
    this.bgmVolume = 0.3;
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
    // Lógica para parar a música atual e tocar a nova em loop
  }
}

// Injetamos na engine global para qualquer arquivo poder chamar
window.audioManager = new AudioManager();