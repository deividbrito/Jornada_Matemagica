class OverworldEvent {
  constructor({ map, event}) {
    this.map = map;
    this.event = event;

    this.init = this.init.bind(this);
  }

  stand(resolve) {
    const who = this.map.gameObjects[ this.event.who ];
    who.startBehavior({
      map: this.map
    }, {
      type: "stand",
      direction: this.event.direction,
      time: this.event.time
    })
    
    //Construção de um "ajudante" para quando a entidade parar de andar, concluir o evento
    const completeHandler = e => {
      if (e.detail.whoId === this.event.who) {
        document.removeEventListener("PersonStandComplete", completeHandler);
        resolve();
      }
    }
    document.addEventListener("PersonStandComplete", completeHandler)
  }

  walk(resolve) {
    const who = this.map.gameObjects[ this.event.who ];
    who.startBehavior({
      map: this.map
    }, {
      type: "walk",
      direction: this.event.direction,
      retry: true
    })

    const completeHandler = e => {
      if (e.detail.whoId === this.event.who) {
        document.removeEventListener("PersonWalkingComplete", completeHandler);
        resolve();
      }
    }
    document.addEventListener("PersonWalkingComplete", completeHandler)

  }

  textMessage(resolve) {

    if (this.event.faceHero) {
      const obj = this.map.gameObjects[this.event.faceHero];
      obj.direction = utils.oppositeDirection(this.map.gameObjects["hero"].direction);
    }

    const message = new TextMessage({
      text: this.event.text,
      onComplete: () => resolve()
    })
    message.init( document.querySelector(".game-container") )
  }

  quizGame(resolve) {
    if (this.event.faceHero) {
      const obj = this.map.gameObjects[this.event.faceHero];
      obj.direction = utils.oppositeDirection(this.map.gameObjects["hero"].direction);
    }

    const assunto = this.event.idAssunto || null;

    // se evento define uma dificuldade fixa, use-a; senão, pergunte ao playerState
    let dificuldadeSolicitada = this.event.dificuldade || window.playerState.getDifficultyForAssunto(assunto);

    // NOVO: lê a campanha do progresso global (definida na tela de título)
    const campanha = window.progress?.campanha || "fundamental";
    console.log("[DEBUG] campanha no progress:", window.progress?.campanha);
    console.log("[DEBUG] campanha que vai pro QuizGame:", campanha);

    const quizGame = new QuizGame({
      onComplete: (result) => {
        // result: { isCorrect, idAssunto, dificuldade, timeTaken }
        if (result && typeof result.isCorrect === "boolean") {
          
          window.playerState.adjustSkill(
            result.idAssunto, 
            result.isCorrect, 
            result.dificuldade,
            result.timeTaken
          );
        }
        resolve();
      },
      idAssunto: assunto,
      dificuldade: dificuldadeSolicitada,
      campanha, // NOVO
    });

    quizGame.init(document.querySelector(".game-container"));
  }

  
  changeMap(resolve) {
    const sceneTransition = new SceneTransition();
    sceneTransition.init(document.querySelector(".game-container"), () => {
        
        // Resolve o mapa correto de acordo com a campanha (fundamental/medio)
        const resolvedMapId = utils.resolveMapId(this.event.map);
        window.currentMapName = resolvedMapId;

        this.map.overworld.startMap( window.OverworldMaps[resolvedMapId], {
            x: this.event.x,
            y: this.event.y,
            direction: this.event.direction,
        });

        resolve();
        sceneTransition.fadeOut();
    });
  }

  choiceMessage(resolve) {
    const choiceMessage = new ChoiceMessage({
      text: this.event.text,
      choices: this.event.options,
      onComplete: (chosenEvents) => {
        const eventChain = new OverworldEventRunner({
          map: this.map,
          events: chosenEvents
        });
        eventChain.init().then(() => resolve());
      }
    });
    choiceMessage.init(document.querySelector(".game-container"));
  }


  addStoryFlag(resolve) {
    window.playerState.storyFlags[this.event.flag] = true;
    resolve();
  }

  pause(resolve){
    console.log("JOGO PAUSADO!");
    this.map.isPaused = true;
    const menu = new PauseMenu({
      progress: this.map.overworld.progress,
      onComplete: () => {
        resolve();
        this.map.isPaused = false;
        this.map.overworld.startGameLoop();
      }
    });
    menu.init(document.querySelector(".game-container"));
  }

  init() {
    return new Promise(resolve => {
      (() => this[this.event.type](resolve))();
    });
  }
}