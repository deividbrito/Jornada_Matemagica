class Overworld {
  constructor(config) {
    this.element = config.element;
    this.canvas = this.element.querySelector(".game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.map = null;
  }

  startGameLoop() {
    const step = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const cameraPerson = this.map.gameObjects.hero;

      Object.values(this.map.gameObjects).forEach(object => {
        object.update({
          arrow: this.directionInput.direction,
          map: this.map,
        });
      });

      this.map.drawLowerImage(this.ctx, cameraPerson);

      Object.values(this.map.gameObjects)
        .sort((a, b) => a.y - b.y)
        .forEach(object => {
          object.sprite.draw(this.ctx, cameraPerson);
        });

      this.map.drawUpperImage(this.ctx, cameraPerson);
      
      if (!this.map.isPaused) {
        requestAnimationFrame(() => {
          step();
        });
      }
    };
    step();
  }

  bindActionInput() {
    new window.KeyPressListener("Enter", () => {
      this.map.checkForActionCutscene();
    });

    new window.KeyPressListener("Escape", () => {
      if (!this.map.isCutscenePlaying) {
        this.map.startCutscene([
          { type: "pause" },
        ]);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "f" || e.key === "F") {
        this.toggleFullscreen();
      }
    });

    window.addEventListener("resize", () => {
      this.checkResponsive();
    });
  }

  bindHeroPositionCheck() {
    document.addEventListener("PersonWalkingComplete", e => {
      if (e.detail.whoId === "hero") {
        this.map.checkForFootstepCutscene();
      }
    });
  }

  startMap(mapConfig, heroInitialState=null) {
    this.map = new window.OverworldMap(mapConfig);
    this.map.overworld = this;
    this.map.mountObjects();

    if (heroInitialState) {
      const {hero} = this.map.gameObjects;
      this.map.removeWall(hero.x, hero.y);
      hero.x = heroInitialState.x;
      hero.y = heroInitialState.y;
      hero.direction = heroInitialState.direction;
      this.map.addWall(hero.x, hero.y);
    }

    this.progress.mapId = mapConfig.id;
    // progress.startingHero* é sempre GRID coord (ex.: 4, não 64). Quem
    // carrega aplica withGrid() pra converter pra pixel. Salvamos hero.x/16
    // pra manter a invariante.
    this.progress.startingHeroX = this.map.gameObjects.hero.x / 16;
    this.progress.startingHeroY = this.map.gameObjects.hero.y / 16;
    this.progress.startingHeroDirection = this.map.gameObjects.hero.direction;

    // Troca sprite do mago da sala se a fase correspondente já foi concluída.
    this._applyVilaoSprites();

    // entryCutscene aceita objeto (1 cena) ou array (múltiplas cenas com
    // required diferentes — roda a PRIMEIRA que satisfaz, em ordem).
    const cutscenes = Array.isArray(mapConfig.entryCutscene)
      ? mapConfig.entryCutscene
      : (mapConfig.entryCutscene ? [mapConfig.entryCutscene] : []);
    const satisfies = (sf) => {
      if (typeof sf !== "string") return true;
      if (sf.startsWith("!")) return !playerState.storyFlags[sf.slice(1)];
      return !!playerState.storyFlags[sf];
    };
    for (const cs of cutscenes) {
      const shouldPlay = (cs.required || []).every(satisfies);
      if (shouldPlay) {
        this.map.startCutscene(cs.events);
        break;
      }
    }
  }

  // Para cada sala com mago, troca o sprite do NPC se a fase foi concluída.
  // Roda no startMap após mountObjects. Mantém o estado visual em sincronia
  // com playerState.storyFlags (que foi populado por syncFaseFlags no boot).
  _applyVilaoSprites() {
    const map = this.map;
    if (!map || !map.gameObjects) return;
    const CFG = {
      Sala1:      { who: "mago", src: "imagens/personagens/vilao2_derrotado.png", flag: "MAGO_DECIMAIS_DERROTADO" },
      Sala2:      { who: "mago", src: "imagens/personagens/vilao3_derrotado.png", flag: "MAGO_APROXIMACAO_DERROTADO" },
      Gremio:     { who: "mago", src: "imagens/personagens/vilao4_derrotado.png", flag: "MAGO_PRIMOS_DERROTADO" },
      Biblioteca: { who: "mago", src: "imagens/personagens/vilao5_derrotado.png", flag: "MAGO_FRACOES_DERROTADO" },
      Patio:      { who: "mago", src: "imagens/personagens/vilao6_derrotado.png", flag: "MAGO_RACIONAIS_DERROTADO" },
      Jardim:     { who: "mago", src: "imagens/personagens/vilao7_derrotado.png", flag: "MAGO_PORCENTAGEM_DERROTADO" },
    };
    const cfg = CFG[map.id];
    if (!cfg) return;
    if (!window.playerState.storyFlags[cfg.flag]) return;
    const obj = map.gameObjects[cfg.who];
    if (obj && obj.sprite && obj.sprite.image) {
      obj.sprite.image.src = cfg.src;
    }
  }

  checkResponsive() {
    const widthBase = 352;
    const heightBase = 198;
    
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;

    const margin = document.fullscreenElement ? 0 : 30;
    
    const scaleX = (availableWidth - margin) / widthBase;
    const scaleY = (availableHeight - margin) / heightBase;

    let scale = Math.min(scaleX, scaleY);

    scale = Math.max(1, scale);

    this.element.style.transform = `scale(${scale})`;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.body.requestFullscreen().then(() => {
        this.checkResponsive();
      }).catch(err => {
        console.error(`Erro Fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.checkResponsive();
      });
    }
  }

  async init() {
    const container = document.querySelector(".game-container");

    this.progress = new window.Progress();

    // CORREÇÃO: garante que window.progress aponta para o mesmo objeto
    // que o TitleScreen vai modificar. Sem isso, OverworldEvent leria
    // o objeto antigo criado pelo Progress.js no carregamento da página.
    window.progress = this.progress;

    // Re-hidrata sessão se o token sobreviveu em localStorage (post-reload).
    // Sem isso, hasRemoteSession() retorna false e o LoginForm aparece toda
    // vez que o jogador volta — mesmo após fase reprovada (que faz reload).
    await this.progress.rehydrateSession();

    // Flag setada pelo FaseRunner antes do reload quando o jogador estava
    // numa run longa. Pula TitleScreen e vai direto pro Corredor.
    let skipTitle = false;
    try {
      if (window.sessionStorage.getItem("jm_skip_title") === "1") {
        window.sessionStorage.removeItem("jm_skip_title");
        skipTitle = true;
      }
    } catch (_) {}

    let initialHeroState = null;

    if (skipTitle) {
      // Continua direto da run longa: sem TitleScreen, sem LoginForm.
      await this.progress.load();
      initialHeroState = {
        x: window.utils.withGrid(this.progress.startingHeroX),
        y: window.utils.withGrid(this.progress.startingHeroY),
        direction: this.progress.startingHeroDirection,
      };
    } else {
      this.titleScreen = new window.TitleScreen({
        progress: this.progress
      });

      // TitleScreen retorna { action, fase? }. 3 caminhos explícitos:
      //   - "continue": carrega save existente (run longa em andamento)
      //   - "new":      reseta tudo, começa do Corredor (dispara intro)
      //   - "fase":     atalho via FaseSelector → teleporta direto pra arena
      const result = await this.titleScreen.init(container);

      if (result && result.action === "fase" && result.fase) {
        // Selecionar Fase: NÃO passa pelo Corredor. Vai direto pra arena.
        this.progress.mapId = result.fase.mapId;
        initialHeroState = {
          x: window.utils.withGrid(8),
          y: window.utils.withGrid(8),
          direction: "up",
        };
      } else if (result && result.action === "continue") {
        // Continuar Jogo: save já foi carregado pelo handler do menu.
        initialHeroState = {
          x: window.utils.withGrid(this.progress.startingHeroX),
          y: window.utils.withGrid(this.progress.startingHeroY),
          direction: this.progress.startingHeroDirection,
        };
      } else {
        // Novo Jogo (ou fallback): reseta pra posição inicial no Corredor.
        // Salva IMEDIATAMENTE pra sobrescrever qualquer save antigo da
        // mesma conta — evita "Continuar" oferecer estado de run abandonada.
        this.progress.reset();
        try { await this.progress.save(); } catch (_) { /* offline ok */ }
      }
    }

    // storyFlags vêm do save (carregado em progress.load) ou estão vazios
    // (Novo Jogo). NÃO sincronizamos do backend — caso contrário, "Novo Jogo"
    // herdaria magos derrotados em runs anteriores. O backend mantém histórico
    // pra Selecionar Fase mostrar estrelas, mas a narrativa é local ao save.

    this.startMap(window.OverworldMaps[window.utils.resolveMapId(this.progress.mapId)], initialHeroState);

    this.bindActionInput();
    this.bindHeroPositionCheck();

    this.directionInput = new window.DirectionInput();
    this.directionInput.init();

    this.startGameLoop();
    
    this.checkResponsive();

    this.touchControls = new window.TouchControls({
      directionInput: this.directionInput
    });
    this.touchControls.init(container);

    // XpBar persistente — só mostra se logado (XpBar valida internamente).
    if (window.xpBar && typeof window.xpBar.mount === "function") {
      window.xpBar.mount(container);
    }

    // FaseHUD — só aparece quando há fase ativa em progress.faseRun.
    if (window.faseHUD && typeof window.faseHUD.mount === "function") {
      window.faseHUD.mount(container);
    }
  }
}
// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.Overworld = Overworld;
