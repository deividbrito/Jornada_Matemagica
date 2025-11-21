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
    new KeyPressListener("Enter", () => {
      this.map.checkForActionCutscene();
    });

    new KeyPressListener("Escape", () => {
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
    this.map = new OverworldMap(mapConfig);
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
    this.progress.startingHeroX = this.map.gameObjects.hero.x;
    this.progress.startingHeroY = this.map.gameObjects.hero.y;
    this.progress.startingHeroDirection = this.map.gameObjects.hero.direction;
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

    this.progress = new Progress();

    this.titleScreen = new TitleScreen({
      progress: this.progress
    });

    const useSaveFile = await this.titleScreen.init(container);

    let initialHeroState = null;

    if (useSaveFile === true) {
      await this.progress.load();

      initialHeroState = {
        x: this.progress.startingHeroX,
        y: this.progress.startingHeroY,
        direction: this.progress.startingHeroDirection,
      };
    } else {
      this.progress.reset();
    }

    this.startMap(window.OverworldMaps[this.progress.mapId], initialHeroState);

    this.bindActionInput();
    this.bindHeroPositionCheck();

    this.directionInput = new DirectionInput();
    this.directionInput.init();

    this.startGameLoop();
    
    this.checkResponsive();
  }
}