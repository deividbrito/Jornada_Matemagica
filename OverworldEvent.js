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
          // Rastreia acertos/erros na sessão arcade
          if (window.progress?.campanha === "medio") {
            window.arcadeStats = window.arcadeStats || { total: 0, correct: 0 };
            window.arcadeStats.total++;
            if (result.isCorrect) window.arcadeStats.correct++;
          }

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


  popup(resolve) {
    const popup = new PopupWindow({
      title: this.event.title || "",
      text: this.event.text || "",
      onComplete: () => resolve(),
    });
    popup.init(document.querySelector(".game-container"));
  }

  addStoryFlag(resolve) {
    window.playerState.storyFlags[this.event.flag] = true;
    resolve();
  }

  changeSprite(resolve) {
    const who = this.map.gameObjects[this.event.who];
    if (who) {
      who.sprite.image.src = this.event.src;
    }
    resolve();
  }

  arcadeStart(resolve) {
    // Popup para escolher quantidade de questões por mago
    const popup = new PopupWindow({
      title: "Configuração",
      text: "Quantas questões por mago?",
      buttons: [
        { label: "3", value: "3" },
        { label: "5", value: "5" },
        { label: "7", value: "7" },
        { label: "10", value: "10" },
      ],
      onComplete: (value) => {
        const count = parseInt(value) || 5;
        window.arcadeStats = {
          total: 0, correct: 0,
          startTime: Date.now(),
          questionsPerMage: count,
        };

        // Música ambiente do arcade
        window.audioManager.playBgm("audio/bgm/arcade.mp3");

        // Cria o HUD do timer
        let timerEl = document.querySelector(".ArcadeTimer");
        if (!timerEl) {
          timerEl = document.createElement("div");
          timerEl.classList.add("ArcadeTimer");
          document.querySelector(".game-container").appendChild(timerEl);
        }
        timerEl.textContent = "0:00";

        // Atualiza a cada segundo
        clearInterval(window.arcadeTimerInterval);
        window.arcadeTimerInterval = setInterval(() => {
          const elapsed = Date.now() - window.arcadeStats.startTime;
          const m = Math.floor(elapsed / 60000);
          const s = Math.floor((elapsed % 60000) / 1000);
          timerEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;
        }, 1000);

        resolve();
      },
    });
    popup.init(document.querySelector(".game-container"));
  }

  arcadeQuiz(resolve) {
    const count = (window.arcadeStats && window.arcadeStats.questionsPerMage) || 5;
    const idAssunto = this.event.idAssunto || null;
    let completed = 0;

    // Troca para música de batalha
    window.audioManager.playBgm("audio/bgm/battle.mp3");

    const runNext = () => {
      if (completed >= count) {
        // Volta para música ambiente
        window.audioManager.playBgm("audio/bgm/arcade.mp3");
        resolve();
        return;
      }

      const dificuldade = this.event.dificuldade || window.playerState.getDifficultyForAssunto(idAssunto);
      const campanha = window.progress?.campanha || "fundamental";

      const quizGame = new QuizGame({
        onComplete: (result) => {
          if (result && typeof result.isCorrect === "boolean") {
            if (window.progress?.campanha === "medio") {
              window.arcadeStats = window.arcadeStats || { total: 0, correct: 0 };
              window.arcadeStats.total++;
              if (result.isCorrect) window.arcadeStats.correct++;
            }
            window.playerState.adjustSkill(
              result.idAssunto,
              result.isCorrect,
              result.dificuldade,
              result.timeTaken
            );
          }
          completed++;
          runNext();
        },
        idAssunto,
        dificuldade,
        campanha,
      });
      quizGame.init(document.querySelector(".game-container"));
    };

    runNext();
  }

  arcadeComplete(resolve) {
    const flags = [
      "ARCADE_FUNCOES_COMPLETO",
      "ARCADE_TRIGONOMETRIA_COMPLETO",
      "ARCADE_LOGARITMOS_COMPLETO",
      "ARCADE_GEOMETRIA_COMPLETO",
      "ARCADE_PROBABILIDADE_COMPLETO",
      "ARCADE_MATRIZES_COMPLETO",
    ];
    const allDone = flags.every(f => window.playerState.storyFlags[f]);
    if (!allDone) {
      resolve();
      return;
    }

    const stats = window.arcadeStats || { total: 0, correct: 0, startTime: Date.now() };
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

    // Para o timer e a música
    clearInterval(window.arcadeTimerInterval);
    window.audioManager.stopBgm();

    // Calcula tempo decorrido
    const elapsedMs = Date.now() - (stats.startTime || Date.now());
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    const timeStr = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

    // Salva sessão no histórico
    const historyKey = "JornadaMatemagica_ArcadeHistory";
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    history.push({
      date: new Date().toLocaleString("pt-BR"),
      correct: stats.correct,
      total: stats.total,
      pct,
      time: timeStr,
      elapsedMs,
      questionsPerMage: stats.questionsPerMage || 5,
    });
    localStorage.setItem(historyKey, JSON.stringify(history));

    const popup = new PopupWindow({
      title: "Parabéns!",
      text: `Você derrotou todos os magos do Ginásio!<br><br>`
        + `<b>Acertos:</b> ${stats.correct}/${stats.total} (${pct}%)<br>`
        + `<b>Tempo:</b> ${timeStr}<br><br>`
        + `O que deseja fazer?`,
      buttons: [
        { label: "Jogar novamente", value: "replay" },
        { label: "Voltar ao menu", value: "menu" },
      ],
      onComplete: (value) => {
        if (value === "replay") {
          // Reseta flags e stats do arcade
          flags.forEach(f => delete window.playerState.storyFlags[f]);
          window.arcadeStats = { total: 0, correct: 0, startTime: Date.now() };
          const oldTimer = document.querySelector(".ArcadeTimer");
          if (oldTimer) oldTimer.remove();
          // Recarrega o mapa
          this.map.overworld.startMap(
            window.OverworldMaps["Corredor_M"]
          );
          this.map.overworld.startGameLoop();
          resolve();
        } else {
          location.reload();
        }
      },
    });
    popup.init(document.querySelector(".game-container"));
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