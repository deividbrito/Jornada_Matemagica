class GameObject {
  constructor(config) {
    this.id = null;
    this.isMounted = false;
    this.x = config.x || 0; //uma posição precisa ser inserida, caso não seja, o objeto aparecerá na posição zero
    this.y = config.y || 0;
    this.direction = config.direction || "down";  //define a direção do objeto, setando ela como padrão "baixo"
    this.sprite = new Sprite({  //o "sprite" dá a chamada de como um objeto deve parecer dentro da interface
      gameObject: this,
      src: config.src || "imagens/personagens/p1.png",  //caso uma fonte não seja informada, a imagem do personagem é chamada
    });

    this.behaviorLoop = config.behaviorLoop || [];
    this.behaviorLoopIndex = 0;

    //define a existência de um loop de comportamento para qualquer um dos objetos do jogo
    this.talking = config.talking || [];

  }

  mount(map) {
    console.log("mounting!")
    this.isMounted = true;
    map.addWall(this.x, this.y);

    //se um comportamento de objeto existir, só deve acontecer após um curto delay
    setTimeout(() => {
      this.doBehaviorEvent(map);
    }, 10)
  }

  update() {
  }

  async doBehaviorEvent(map) { 
    //NÃO FAZER NADA caso tenha uma cutscene acontecendo ou se não existe configuração de comportamento
    if (map.isCutscenePlaying || this.behaviorLoop.length === 0 || this.isStanding) {
      return;
    }

    //preparando o evento com informações relevantes
    let eventConfig = this.behaviorLoop[this.behaviorLoopIndex];
    eventConfig.who = this.id;

    //criar uma instância de evento a partir da config do evento
    const eventHandler = new OverworldEvent({ map, event: eventConfig });
    await eventHandler.init(); 

    //fazendo com que novo evento aconteça
    this.behaviorLoopIndex += 1;
    if (this.behaviorLoopIndex === this.behaviorLoop.length) {
      this.behaviorLoopIndex = 0;
    } 

    //fazer novamente
    this.doBehaviorEvent(map);
  }
}
