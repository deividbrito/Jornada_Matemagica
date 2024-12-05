class Overworld {
 constructor(config) {
   this.element = config.element;
   this.canvas = this.element.querySelector(".game-canvas");
   this.ctx = this.canvas.getContext("2d");
   this.map = null;
 }

  startGameLoop() {
    const step = () => {
      //para que o jogo limpe o canvas a cada frame que se passa (assim, um objeto que se move não vai ter dois frames coexistindo)
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      //estabelecendo o objeto que a câmera deve seguir (p1 sendo o personagem controlado)
      const cameraPerson = this.map.gameObjects.hero;

      //atualiza todos os objetos do mapa antes de serem desenhados
      Object.values(this.map.gameObjects).forEach(object => {
        object.update({
          arrow: this.directionInput.direction,
          map: this.map,
        })
      })

      //desenhar camada baixa
      this.map.drawLowerImage(this.ctx, cameraPerson);

      //desenhar objetos de jogo
      Object.values(this.map.gameObjects).sort((a,b) => {
        return a.y - b.y;
      }).forEach(object => {
        object.sprite.draw(this.ctx, cameraPerson);
      })

      //desenhar camada alta
      // this.map.drawUpperImage(this.ctx, cameraPerson);
      
      if(!this.map.isPaused){
      requestAnimationFrame(() => {
        step();   
      })
    }
  }
    step();
 }

 bindActionInput() {
   new KeyPressListener("Enter", () => {
     //há uma pessoa aqui para se conversar?
     this.map.checkForActionCutscene()
   })
   new KeyPressListener("Escape", () => {
    if(!this.map.isCutscenePlaying){
      this.map.startCutscene([
        {type: "pause"}
      ])
    }
   })
 }

 bindHeroPositionCheck() {
   document.addEventListener("PersonWalkingComplete", e => {
     if (e.detail.whoId === "hero") {
       //a posição do player mudou
       this.map.checkForFootstepCutscene()
     }
   })
 }

 startMap(mapConfig) {
  this.map = new OverworldMap(mapConfig);
  this.map.overworld = this;
  this.map.mountObjects();
 }

 init() {
  this.startMap(window.OverworldMaps.Banheiro);


  this.bindActionInput();
  this.bindHeroPositionCheck();

  this.directionInput = new DirectionInput();
  this.directionInput.init();

  this.startGameLoop();


  // this.map.startCutscene([
  //   {type: "battle"}
  //   //{ type: "changeMap", map: "Mapa1"}
  //   // { type: "textMessage", text: "bla bla bla"}
  // ])

 }
}