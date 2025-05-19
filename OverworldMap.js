class OverworldMap {
  constructor(config) {
    this.overworld = null;
    this.gameObjects = config.gameObjects;
    this.cutsceneSpaces = config.cutsceneSpaces || {};
    this.walls = config.walls || {};  //para definir paredes no cenário

    this.lowerImage = new Image();
    this.lowerImage.src = config.lowerSrc;  //camadas baixas, coisas que devem estar aos pés dos personagens/objetos

    this.upperImage = new Image();
    this.upperImage.src = config.upperSrc;  //camadas altas, coisas que devem estar acima da cabeça de personagens/objetos

    this.isCutscenePlaying = false;
    this.isPaused = false;
  }

  //construtor que desenha a camada baixa
  drawLowerImage(ctx, cameraPerson) {
    ctx.drawImage(
      this.lowerImage, 
      utils.withGrid(10.5) - cameraPerson.x, 
      utils.withGrid(6) - cameraPerson.y
      )
  }

  //construtor que desenha a camada alta
  drawUpperImage(ctx, cameraPerson) {
    ctx.drawImage(
      this.upperImage, 
      utils.withGrid(10.5) - cameraPerson.x, 
      utils.withGrid(6) - cameraPerson.y
    )
  } 

  //função para identificar espaços ocupados por paredes ou outros objetos
  isSpaceTaken(currentX, currentY, direction) {
    const {x,y} = utils.nextPosition(currentX, currentY, direction);
    return this.walls[`${x},${y}`] || false;
  }

  mountObjects() {
    Object.keys(this.gameObjects).forEach(key => {
      //atribui uma id a cada objeto através de sua "key", nomeando-os automaticamente
      let object = this.gameObjects[key];
      object.id = key;

      object.mount(this);

    })
  }

  async startCutscene(events) {
    this.isCutscenePlaying = true;

    for (let i=0; i<events.length; i++) {
      const eventHandler = new OverworldEvent({
        event: events[i],
        map: this,
      })
      await eventHandler.init();
    }

    this.isCutscenePlaying = false;

    //reseta NPCs para seu comportamento comum
    Object.values(this.gameObjects).forEach(object => object.doBehaviorEvent(this))
  }

  checkForActionCutscene() {
    const hero = this.gameObjects["hero"];
    const nextCoords = utils.nextPosition(hero.x, hero.y, hero.direction);
    const match = Object.values(this.gameObjects).find(object => {
      return `${object.x},${object.y}` === `${nextCoords.x},${nextCoords.y}`
    });
    if (!this.isCutscenePlaying && match && match.talking.length) {

      const relevantScenario = match.talking.find(scenario => {
        return (scenario.required || []).every(sf => {
          return playerState.storyFlags[sf]
        })
      })
      relevantScenario && this.startCutscene(relevantScenario.events)
    }
  }

  checkForFootstepCutscene() {
    const hero = this.gameObjects["hero"];
    const match = this.cutsceneSpaces[ `${hero.x},${hero.y}` ];
    if (!this.isCutscenePlaying && match) {
      this.startCutscene( match[0].events )
    }
  }

  addWall(x,y) {
    this.walls[`${x},${y}`] = true;
  }

  removeWall(x,y) {
    delete this.walls[`${x},${y}`]
  }

  moveWall(wasX, wasY, direction) {
    this.removeWall(wasX, wasY);
    const {x,y} = utils.nextPosition(wasX, wasY, direction);
    this.addWall(x,y);
  }
}

//aleatorizar questões
// function generateRandomQuestion() {
//   const questions = [
//     { text: "Qual fração represente metade de um bolo?", options: ["1/3", "1/2", "1/4"], correctAnswer: 1 },
//     { text: "Quanto é 1 - 1/4?", options: ["1/3", "1/2", "3/4"], correctAnswer: 2 },
//     { text: "Quanto é 3 x 1/3?", options: ["3", "1", "1/9"], correctAnswer: 1 },
//     { text: "Se você tem 3 chocolates e come 1/3 deles, quantos sobraram?", options: ["2", "1", "Nenhum"], correctAnswer: 0 },
//     { text: "Qual fração equivale a 1/3?", options: ["1/9", "3/14", "2/6"], correctAnswer: 2 },
    
//   ]
//   const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

//   return randomQuestion;
// }

window.OverworldMaps = {
  Corredor: {
    id: "Corredor",
    lowerSrc: "imagens/mapas/corredor.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(4),
        y: utils.withGrid(3),
        src: "imagens/personagens/alice.png",
      }),
      personagem: new Person({
        x: utils.withGrid(1),
        y: utils.withGrid(6),
        src: "imagens/personagens/p1.png",
        behaviorLoop: [
          { type: "stand",  direction: "right", time: 3200 },
        ],
        talking: [
          {
            events: [
              { type: "textMessage", text: "Teste."},
            ]
          }
        ]
      }),
      vazio: new Person({
        x: utils.withGrid(4),
        y: utils.withGrid(2),
        src: "imagens/personagens/vazio.png",
        talking: [
          {
            events: [
              { type: "changeMap", map: "Patio"},
            ]
          }
        ]
      }),

      //figurantes
      figurante1: new Person({
        x: utils.withGrid(1),
        y: utils.withGrid(11),
        src: "imagens/personagens/figurante1.png",
        behaviorLoop: [
          { type: "stand",  direction: "right", time: 3200 },
          { type: "stand",  direction: "down", time: 800 },
        ],
      }),
      figurante2: new Person({
        x: utils.withGrid(8),
        y: utils.withGrid(4),
        src: "imagens/personagens/figurante2.png",
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 3200 },
          { type: "stand",  direction: "up", time: 800 },
        ],
      }),
      figurante3: new Person({
        x: utils.withGrid(5),
        y: utils.withGrid(17),
        src: "imagens/personagens/figurante3.png",
        behaviorLoop: [
          { type: "stand",  direction: "right", time: 3200 },
        ],
      }),
      figurante4: new Person({
        x: utils.withGrid(6),
        y: utils.withGrid(17),
        src: "imagens/personagens/figurante4.png",
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 3200 },
        ],
      }),
      figurante5: new Person({
        x: utils.withGrid(4),
        y: utils.withGrid(38),
        src: "imagens/personagens/figurante5.png",
        behaviorLoop: [
          { type: "stand",  direction: "up", time: 3200 },
          { type: "stand",  direction: "right", time: 1200 },
        ],
      }),
      figurante6: new Person({
        x: utils.withGrid(1),
        y: utils.withGrid(3),
        src: "imagens/personagens/figurante6.png",
        behaviorLoop: [
          { type: "stand",  direction: "right", time: 3200 },
          { type: "stand",  direction: "down", time: 1200 },
        ],
      }),
      figurante7: new Person({
        x: utils.withGrid(2),
        y: utils.withGrid(4),
        src: "imagens/personagens/figurante7.png",
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 3200 },
          { type: "stand",  direction: "up", time: 1200 },
          { type: "stand",  direction: "right", time: 3200 },
          { type: "stand",  direction: "down", time: 1200 },
        ],
      }),
      figurante8: new Person({
        x: utils.withGrid(6),
        y: utils.withGrid(24),
        src: "imagens/personagens/figurante8.png",
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 3200 },
          { type: "stand",  direction: "up", time: 1200 },
          { type: "stand",  direction: "right", time: 3200 },
          { type: "stand",  direction: "down", time: 1200 },
        ],
      }),
      figurante9: new Person({
        x: utils.withGrid(6),
        y: utils.withGrid(35),
        src: "imagens/personagens/figurante9.png",
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 3200 },
          { type: "stand",  direction: "up", time: 1200 },
        ],
      }),
    },

    cutsceneSpaces: {
      //acesso sala1
      [utils.asGridCoord(0,12)]: [
        {
          events: [
            { type: "changeMap", map: "Sala1" }
          ]
        }
      ],
      [utils.asGridCoord(0,13)]: [
        {
          events: [
            { type: "changeMap", map: "Sala1" }
          ]
        }
      ],
      [utils.asGridCoord(0,14)]: [
        {
          events: [
            { type: "changeMap", map: "Sala1" }
          ]
        }
      ],

      //acesso sala2
      [utils.asGridCoord(9,12)]: [
        {
          events: [
            { type: "changeMap", map: "Sala2" }
          ]
        }
      ],
      [utils.asGridCoord(9,13)]: [
        {
          events: [
            { type: "changeMap", map: "Sala2" }
          ]
        }
      ],
      [utils.asGridCoord(9,14)]: [
        {
          events: [
            { type: "changeMap", map: "Sala2" }
          ]
        }
      ],

      //acesso gremio
      [utils.asGridCoord(0,19)]: [
        {
          events: [
            { type: "changeMap", map: "Gremio" }
          ]
        }
      ],
      [utils.asGridCoord(0,20)]: [
        {
          events: [
            { type: "changeMap", map: "Gremio" }
          ]
        }
      ],
      [utils.asGridCoord(0,21)]: [
        {
          events: [
            { type: "changeMap", map: "Gremio" }
          ]
        }
      ],

      //acesso sala de estudos
      [utils.asGridCoord(9,19)]: [
        {
          events: [
            { type: "changeMap", map: "SalaEstudos" }
          ]
        }
      ],
      [utils.asGridCoord(9,20)]: [
        {
          events: [
            { type: "changeMap", map: "SalaEstudos" }
          ]
        }
      ],
      [utils.asGridCoord(9,21)]: [
        {
          events: [
            { type: "changeMap", map: "SalaEstudos" }
          ]
        }
      ],

      //acesso banheiro
      [utils.asGridCoord(0,27)]: [
        {
          events: [
            { type: "changeMap", map: "Banheiro" }
          ]
        }
      ],
      [utils.asGridCoord(0,28)]: [
        {
          events: [
            { type: "changeMap", map: "Banheiro" }
          ]
        }
      ],
      [utils.asGridCoord(0,29)]: [
        {
          events: [
            { type: "changeMap", map: "Banheiro" }
          ]
        }
      ],

      //acesso biblioteca
      [utils.asGridCoord(9,27)]: [
        {
          events: [
            { type: "changeMap", map: "Biblioteca" }
          ]
        }
      ],
      [utils.asGridCoord(9,28)]: [
        {
          events: [
            { type: "changeMap", map: "Biblioteca" }
          ]
        }
      ],
      [utils.asGridCoord(9,29)]: [
        {
          events: [
            { type: "changeMap", map: "Biblioteca" }
          ]
        }
      ],
    },

    walls:{
      //parede superior
      [utils.asGridCoord(1,2)]: true, [utils.asGridCoord(2,2)]: true,
      [utils.asGridCoord(3,2)]: true, [utils.asGridCoord(4,2)]: true,
      [utils.asGridCoord(5,2)]: true, [utils.asGridCoord(6,2)]: true,
      [utils.asGridCoord(7,2)]: true, [utils.asGridCoord(8,2)]: true,

      //parede esquerda
      [utils.asGridCoord(0,3)]: true, [utils.asGridCoord(0,4)]: true,
      [utils.asGridCoord(0,5)]: true, [utils.asGridCoord(0,6)]: true,
      [utils.asGridCoord(0,7)]: true, [utils.asGridCoord(0,8)]: true,
      [utils.asGridCoord(0,9)]: true, [utils.asGridCoord(0,10)]: true,
      [utils.asGridCoord(0,11)]: true, [utils.asGridCoord(0,15)]: true, 
      [utils.asGridCoord(0,16)]: true, [utils.asGridCoord(0,17)]: true,
      [utils.asGridCoord(0,18)]: true, [utils.asGridCoord(0,22)]: true, 
      [utils.asGridCoord(0,23)]: true, [utils.asGridCoord(0,24)]: true,
      [utils.asGridCoord(0,25)]: true, [utils.asGridCoord(0,26)]: true,
      [utils.asGridCoord(0,30)]: true, [utils.asGridCoord(0,31)]: true,
      [utils.asGridCoord(0,32)]: true, [utils.asGridCoord(0,33)]: true,
      [utils.asGridCoord(0,34)]: true, [utils.asGridCoord(0,35)]: true,
      [utils.asGridCoord(0,36)]: true, [utils.asGridCoord(0,37)]: true,
      [utils.asGridCoord(0,38)]: true, 
    
      //parede inferior 
      [utils.asGridCoord(1,39)]: true, [utils.asGridCoord(2,39)]: true,
      [utils.asGridCoord(3,39)]: true, [utils.asGridCoord(4,39)]: true,
      [utils.asGridCoord(5,39)]: true, [utils.asGridCoord(6,39)]: true,
      [utils.asGridCoord(7,39)]: true, [utils.asGridCoord(8,39)]: true,

      //paredes direita
      [utils.asGridCoord(9,3)]: true, [utils.asGridCoord(9,4)]: true,
      [utils.asGridCoord(9,5)]: true, [utils.asGridCoord(9,6)]: true,
      [utils.asGridCoord(9,7)]: true, [utils.asGridCoord(9,8)]: true,
      [utils.asGridCoord(9,9)]: true, [utils.asGridCoord(9,10)]: true,
      [utils.asGridCoord(9,11)]: true, [utils.asGridCoord(9,15)]: true, 
      [utils.asGridCoord(9,16)]: true, [utils.asGridCoord(9,17)]: true,
      [utils.asGridCoord(9,18)]: true, [utils.asGridCoord(9,22)]: true, 
      [utils.asGridCoord(9,23)]: true, [utils.asGridCoord(9,24)]: true,
      [utils.asGridCoord(9,25)]: true, [utils.asGridCoord(9,26)]: true,
      [utils.asGridCoord(9,30)]: true, [utils.asGridCoord(9,31)]: true,
      [utils.asGridCoord(9,32)]: true, [utils.asGridCoord(9,33)]: true,
      [utils.asGridCoord(9,34)]: true, [utils.asGridCoord(9,35)]: true,
      [utils.asGridCoord(9,36)]: true, [utils.asGridCoord(9,37)]: true,
      [utils.asGridCoord(9,38)]: true, 

      //armários
      [utils.asGridCoord(1,8)]: true, [utils.asGridCoord(1,9)]: true, [utils.asGridCoord(1,10)]: true, 
      [utils.asGridCoord(8,6)]: true, [utils.asGridCoord(8,7)]: true, [utils.asGridCoord(8,8)]: true, 

      [utils.asGridCoord(1,15)]: true, [utils.asGridCoord(1,16)]: true, [utils.asGridCoord(1,17)]: true,
      [utils.asGridCoord(8,16)]: true, [utils.asGridCoord(8,17)]: true, [utils.asGridCoord(8,18)]: true,

      [utils.asGridCoord(1,24)]: true, [utils.asGridCoord(1,25)]: true, [utils.asGridCoord(1,26)]: true, 
      [utils.asGridCoord(8,23)]: true, [utils.asGridCoord(8,24)]: true, [utils.asGridCoord(8,25)]: true, 

      [utils.asGridCoord(1,33)]: true, [utils.asGridCoord(1,34)]: true, [utils.asGridCoord(1,35)]: true,
      [utils.asGridCoord(8,30)]: true, [utils.asGridCoord(8,31)]: true, [utils.asGridCoord(8,32)]: true,

      //maquininha de refris
      [utils.asGridCoord(6,3)]: true, [utils.asGridCoord(7,3)]: true, 
    }
  },
  Jardim: {
    id: "Jardim",
    lowerSrc: "imagens/mapas/jardim.png",
    upperSrc: "imagens/mapas/jardimUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(14),
        y: utils.withGrid(7),
        src: "imagens/personagens/alice.png",
      }),
      p3: new Person({
        x: utils.withGrid(12),
        y: utils.withGrid(7),
        src: "imagens/personagens/p3.png",
        talking: [
          {
            events: [
              { type: "textMessage", text: "Teste."},
            ]
          }
        ]
      }),
      vilao5: new Person({
        x: utils.withGrid(5),
        y: utils.withGrid(10),
        src: "imagens/personagens/vilao5.png",
        talking: [
          {
            events: [
              { type: "textMessage", text: "Teste."},
            ]
          }
        ]
      }),
      figurante1: new Person({
        x: utils.withGrid(6),
        y: utils.withGrid(4),
        src: "imagens/personagens/figurante6.png",
        behaviorLoop: [
          { type: "stand",  direction: "down", time: 3200 },
        ],
      }),
      figurante2: new Person({
        x: utils.withGrid(7),
        y: utils.withGrid(4),
        src: "imagens/personagens/figurante7.png",
        behaviorLoop: [
          { type: "stand",  direction: "down", time: 3200 },
        ],
      }),
    }, 

    walls: {
      //limite de mapa superior
      [utils.asGridCoord(1,-1)]: true, [utils.asGridCoord(2,-1)]: true,
      [utils.asGridCoord(3,-1)]: true, [utils.asGridCoord(4,-1)]: true,
      [utils.asGridCoord(5,-1)]: true, [utils.asGridCoord(6,-1)]: true,
      [utils.asGridCoord(7,-1)]: true, [utils.asGridCoord(8,-1)]: true,
      [utils.asGridCoord(9,-1)]: true, [utils.asGridCoord(10,-1)]: true,
      [utils.asGridCoord(11,-1)]: true, [utils.asGridCoord(12,-1)]: true,
      [utils.asGridCoord(13,-1)]: true, [utils.asGridCoord(14,-1)]: true,
      [utils.asGridCoord(0,-1)]: true, [utils.asGridCoord(15,-1)]: true,

      //limite de mapa inferior
      [utils.asGridCoord(1,16)]: true, [utils.asGridCoord(2,16)]: true,
      [utils.asGridCoord(3,16)]: true, [utils.asGridCoord(4,16)]: true,
      [utils.asGridCoord(5,16)]: true, [utils.asGridCoord(6,16)]: true,
      [utils.asGridCoord(7,16)]: true, [utils.asGridCoord(8,16)]: true,
      [utils.asGridCoord(9,16)]: true, [utils.asGridCoord(10,16)]: true,
      [utils.asGridCoord(11,16)]: true, [utils.asGridCoord(12,16)]: true,
      [utils.asGridCoord(13,16)]: true, [utils.asGridCoord(14,16)]: true,
      [utils.asGridCoord(0,16)]: true, [utils.asGridCoord(15,16)]: true,

      //limite de mapa esquerda
      [utils.asGridCoord(-1,0)]: true, [utils.asGridCoord(-1,1)]: true,
      [utils.asGridCoord(-1,2)]: true, [utils.asGridCoord(-1,3)]: true,
      [utils.asGridCoord(-1,4)]: true, [utils.asGridCoord(-1,5)]: true,
      [utils.asGridCoord(-1,6)]: true, [utils.asGridCoord(-1,7)]: true,
      [utils.asGridCoord(-1,8)]: true, [utils.asGridCoord(-1,9)]: true,
      [utils.asGridCoord(-1,10)]: true, [utils.asGridCoord(-1,11)]: true,
      [utils.asGridCoord(-1,12)]: true, [utils.asGridCoord(-1,13)]: true,
      [utils.asGridCoord(-1,14)]: true, [utils.asGridCoord(-1,15)]: true,

      //limite de mapa direita
      [utils.asGridCoord(16,0)]: true, [utils.asGridCoord(16,1)]: true,
      [utils.asGridCoord(16,2)]: true, [utils.asGridCoord(16,3)]: true,
      [utils.asGridCoord(16,4)]: true, [utils.asGridCoord(16,5)]: true,
      [utils.asGridCoord(16,6)]: true, [utils.asGridCoord(16,7)]: true,
      [utils.asGridCoord(16,8)]: true, [utils.asGridCoord(16,9)]: true,
      [utils.asGridCoord(16,10)]: true, [utils.asGridCoord(16,11)]: true,
      [utils.asGridCoord(16,12)]: true, [utils.asGridCoord(16,13)]: true,
      [utils.asGridCoord(16,14)]: true, [utils.asGridCoord(16,15)]: true,

      //árvore
      [utils.asGridCoord(12,4)]: true, [utils.asGridCoord(11,4)]: true,

      //poste
      [utils.asGridCoord(1,3)]: true, [utils.asGridCoord(1,4)]: true,
    },
    cutsceneSpaces: {
      [utils.asGridCoord(15,7)]: [
        {
          events: [
            { type: "changeMap", map: "Patio" }
          ]
        }
      ],
      [utils.asGridCoord(15,8)]: [
        {
          events: [
            { type: "changeMap", map: "Patio" }
          ]
        }
      ],
    }
  },
  Banheiro: {
    id: "Banheiro",
    lowerSrc: "imagens/mapas/banheiro.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(4),
        y: utils.withGrid(4),
        src: "imagens/personagens/alice.png",
      }),
      vilao: new Person({
        x: utils.withGrid(6),
        y: utils.withGrid(4),
        src: "imagens/personagens/vilao.png",
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 800 },
          { type: "stand",  direction: "down", time: 3200 },
        ],
        talking: [
          {
            required: ["RESOLVEU_DESAFIO_3"],
            events:[
            {type: "textMessage", text: "Mago: Bom, você venceu! Mas só desta vez!"},
            ]
          },
          {
            required: ["RESOLVEU_DESAFIO_2"],
            events:[
            {type: "textMessage", text: "Mago: Você é muito boa, mas não é nada impressionante!", faceHero: "vilao"},
            {type: "textMessage", text: "Mago: Hora de um desafio ainda maior!"},
            {type: "textMessage", text: "[Terceiro desafio ocorre aqui]"},
            {type: "addStoryFlag", flag: "RESOLVEU_DESAFIO_3"}
            ]
          },
          {
            required: ["RESOLVEU_DESAFIO_1"],
            events:[
            {type: "textMessage", text: "Mago: Eu ainda nem usei todo o potencial da mágica dos banheiros!", faceHero: "vilao"},
            {type: "textMessage", text: "Mago: Pereça perante a mágica das privadas!"},
            {type: "textMessage", text: "[Segundo desafio ocorre aqui]"},
            {type: "addStoryFlag", flag: "RESOLVEU_DESAFIO_2"}
            ]
          },
          {
            events: [
              { type: "textMessage", text: "Mago: Ahá! Você me encontrou! Eu sou Decimalicus, o Sábio do Sanitário!", faceHero: "vilao" },
              { type: "textMessage", text: "Alice: Você... está se escondendo? E isso é um desentupidor?"},
              { type: "textMessage", text: "Mago: Não subestime meu cetro! Este é o Desentopex do Conhecimento! Agora pereça diante meus desafios!"},
              { type: "textMessage", text: "[Primeiro desafio ocorre aqui]"},
              {type: "addStoryFlag", flag: "RESOLVEU_DESAFIO_1"},
            ]
          }
        ]
      }),
    },
    walls : {
      //parede superior
      [utils.asGridCoord(1,2)]: true, [utils.asGridCoord(2,2)]: true,
      [utils.asGridCoord(3,2)]: true, [utils.asGridCoord(4,2)]: true,
      [utils.asGridCoord(5,2)]: true, [utils.asGridCoord(6,2)]: true,

      //parede esquerda
      [utils.asGridCoord(0,3)]: true, [utils.asGridCoord(0,4)]: true,
      [utils.asGridCoord(0,5)]: true, [utils.asGridCoord(0,6)]: true,

      //parede inferior
      [utils.asGridCoord(1,7)]: true, [utils.asGridCoord(2,7)]: true,
      [utils.asGridCoord(5,7)]: true, [utils.asGridCoord(6,7)]: true,

      //parede direita
      [utils.asGridCoord(7,3)]: true, [utils.asGridCoord(7,4)]: true,
      [utils.asGridCoord(7,5)]: true, [utils.asGridCoord(7,6)]: true,
    },
    cutsceneSpaces: {
      [utils.asGridCoord(3,7)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(4,7)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
    }
  },
  Sala1: { 
    id: "Sala1",
    lowerSrc: "imagens/mapas/sala1.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(15),
        y: utils.withGrid(18),
        src: "imagens/personagens/alice.png",
      }),
    },
    walls: {
      //parede de cima
      [utils.asGridCoord(1,4)]: true, [utils.asGridCoord(2,4)]: true,
      [utils.asGridCoord(3,4)]: true, [utils.asGridCoord(4,4)]: true,
      [utils.asGridCoord(5,4)]: true, [utils.asGridCoord(6,4)]: true,
      [utils.asGridCoord(7,4)]: true, [utils.asGridCoord(8,4)]: true,
      [utils.asGridCoord(9,4)]: true, [utils.asGridCoord(10,4)]: true,
      [utils.asGridCoord(11,4)]: true, [utils.asGridCoord(12,4)]: true,
      [utils.asGridCoord(13,4)]: true, [utils.asGridCoord(14,4)]: true,
      [utils.asGridCoord(15,4)]: true, [utils.asGridCoord(16,4)]: true,
      [utils.asGridCoord(17,4)]: true, [utils.asGridCoord(18,4)]: true,
      [utils.asGridCoord(19,4)]: true, [utils.asGridCoord(20,4)]: true,
      [utils.asGridCoord(21,4)]: true, [utils.asGridCoord(22,4)]: true,
      [utils.asGridCoord(23,4)]: true, [utils.asGridCoord(24,4)]: true,
      [utils.asGridCoord(25,4)]: true, [utils.asGridCoord(26,4)]: true,
      [utils.asGridCoord(27,4)]: true, [utils.asGridCoord(28,4)]: true,

      //parede esquerda
      [utils.asGridCoord(0,5)]: true, [utils.asGridCoord(0,6)]: true,
      [utils.asGridCoord(1,7)]: true, [utils.asGridCoord(1,8)]: true,
      [utils.asGridCoord(1,9)]: true, [utils.asGridCoord(0,10)]: true,
      [utils.asGridCoord(0,11)]: true, [utils.asGridCoord(1,12)]: true,
      [utils.asGridCoord(1,13)]: true, [utils.asGridCoord(1,14)]: true,
      [utils.asGridCoord(0,15)]: true, [utils.asGridCoord(1 ,16)]: true,
      [utils.asGridCoord(1,17)]: true, [utils.asGridCoord(1,18)]: true,

      //parede direita
      [utils.asGridCoord(29,5)]: true, [utils.asGridCoord(29,6)]: true,
      [utils.asGridCoord(29,7)]: true, [utils.asGridCoord(29,8)]: true,
      [utils.asGridCoord(29,9)]: true, [utils.asGridCoord(29,10)]: true,
      [utils.asGridCoord(29,11)]: true, [utils.asGridCoord(29,12)]: true,
      [utils.asGridCoord(29,13)]: true, [utils.asGridCoord(29,14)]: true,
      [utils.asGridCoord(29,15)]: true, [utils.asGridCoord(29,16)]: true,
      [utils.asGridCoord(29,17)]: true, [utils.asGridCoord(29,18)]: true,

      //parede inferior
      [utils.asGridCoord(1,19)]: true, [utils.asGridCoord(2,19)]: true,
      [utils.asGridCoord(3,19)]: true, [utils.asGridCoord(4,19)]: true,
      [utils.asGridCoord(5,19)]: true, [utils.asGridCoord(6,19)]: true,
      [utils.asGridCoord(7,19)]: true, [utils.asGridCoord(8,19)]: true,
      [utils.asGridCoord(9,19)]: true, [utils.asGridCoord(10,19)]: true,
      [utils.asGridCoord(11,19)]: true, [utils.asGridCoord(12,19)]: true,
      [utils.asGridCoord(17,19)]: true, [utils.asGridCoord(18,19)]: true,
      [utils.asGridCoord(19,19)]: true, [utils.asGridCoord(20,19)]: true,
      [utils.asGridCoord(21,19)]: true, [utils.asGridCoord(22,19)]: true,
      [utils.asGridCoord(23,19)]: true, [utils.asGridCoord(24,19)]: true,
      [utils.asGridCoord(25,19)]: true, [utils.asGridCoord(26,19)]: true,
      [utils.asGridCoord(27,19)]: true, [utils.asGridCoord(28,19)]: true,
    },
    cutsceneSpaces: {
      //acesso sala1
      [utils.asGridCoord(13,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(14,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(15,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(16,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
    }
  },
  Sala2: {
    id: "Sala2",
    lowerSrc: "imagens/mapas/sala2.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(15),
        y: utils.withGrid(18),
        src: "imagens/personagens/alice.png",
      }),
      p4: new Person({
        x: utils.withGrid(11),
        y: utils.withGrid(5),
        src: "imagens/personagens/p4.png",
        talking: [
          {
            events: [
              { type: "textMessage", text: "Teste."},
            ]
          }
        ]
      }),
      vilao2: new Person({
        x: utils.withGrid(15),
        y: utils.withGrid(14),
        src: "imagens/personagens/vilao2.png",
        talking: [
          {
            events: [
              { type: "textMessage", text: "Teste."},
            ]
          }
        ]
      }),
    },
    walls: {
      //parede de cima
      [utils.asGridCoord(1,3)]: true, [utils.asGridCoord(2,3)]: true,
      [utils.asGridCoord(3,3)]: true, [utils.asGridCoord(4,3)]: true,
      [utils.asGridCoord(5,3)]: true, [utils.asGridCoord(6,3)]: true,
      [utils.asGridCoord(7,3)]: true, [utils.asGridCoord(8,3)]: true,
      [utils.asGridCoord(9,3)]: true, [utils.asGridCoord(10,3)]: true,
      [utils.asGridCoord(11,3)]: true, [utils.asGridCoord(12,3)]: true,
      [utils.asGridCoord(13,3)]: true, [utils.asGridCoord(14,3)]: true,
      [utils.asGridCoord(15,3)]: true, [utils.asGridCoord(16,3)]: true,
      [utils.asGridCoord(17,3)]: true, [utils.asGridCoord(18,3)]: true,
      [utils.asGridCoord(19,3)]: true, [utils.asGridCoord(20,3)]: true,
      [utils.asGridCoord(21,3)]: true, [utils.asGridCoord(22,3)]: true,
      [utils.asGridCoord(23,3)]: true, [utils.asGridCoord(24,3)]: true,
      [utils.asGridCoord(25,3)]: true, [utils.asGridCoord(26,3)]: true,
      [utils.asGridCoord(27,3)]: true, [utils.asGridCoord(28,3)]: true,

      //parede esquerda
      [utils.asGridCoord(0,4)]: true,
      [utils.asGridCoord(0,5)]: true, [utils.asGridCoord(0,6)]: true,
      [utils.asGridCoord(0,7)]: true, [utils.asGridCoord(0,8)]: true,
      [utils.asGridCoord(0,9)]: true, [utils.asGridCoord(0,10)]: true,
      [utils.asGridCoord(0,11)]: true, [utils.asGridCoord(0,12)]: true,
      [utils.asGridCoord(0,13)]: true, [utils.asGridCoord(0,14)]: true,
      [utils.asGridCoord(0,15)]: true, [utils.asGridCoord(0,16)]: true,
      [utils.asGridCoord(0,17)]: true, [utils.asGridCoord(0,18)]: true,

      //parede direita
      [utils.asGridCoord(29,4)]: true,
      [utils.asGridCoord(29,5)]: true, [utils.asGridCoord(29,6)]: true,
      [utils.asGridCoord(29,7)]: true, [utils.asGridCoord(29,8)]: true,
      [utils.asGridCoord(29,9)]: true, [utils.asGridCoord(29,10)]: true,
      [utils.asGridCoord(29,11)]: true, [utils.asGridCoord(29,12)]: true,
      [utils.asGridCoord(29,13)]: true, [utils.asGridCoord(29,14)]: true,
      [utils.asGridCoord(29,15)]: true, [utils.asGridCoord(29,16)]: true,
      [utils.asGridCoord(29,17)]: true, [utils.asGridCoord(29,18)]: true,

      //parede inferior
      [utils.asGridCoord(1,19)]: true, [utils.asGridCoord(2,19)]: true,
      [utils.asGridCoord(3,19)]: true, [utils.asGridCoord(4,19)]: true,
      [utils.asGridCoord(5,19)]: true, [utils.asGridCoord(6,19)]: true,
      [utils.asGridCoord(7,19)]: true, [utils.asGridCoord(8,19)]: true,
      [utils.asGridCoord(9,19)]: true, [utils.asGridCoord(10,19)]: true,
      [utils.asGridCoord(11,19)]: true, [utils.asGridCoord(12,19)]: true,
      [utils.asGridCoord(17,19)]: true, [utils.asGridCoord(18,19)]: true,
      [utils.asGridCoord(19,19)]: true, [utils.asGridCoord(20,19)]: true,
      [utils.asGridCoord(21,19)]: true, [utils.asGridCoord(22,19)]: true,
      [utils.asGridCoord(23,19)]: true, [utils.asGridCoord(24,19)]: true,
      [utils.asGridCoord(25,19)]: true, [utils.asGridCoord(26,19)]: true,
      [utils.asGridCoord(27,19)]: true, [utils.asGridCoord(28,19)]: true,
    },
    cutsceneSpaces: {
      //acesso sala1
      [utils.asGridCoord(13,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(14,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(15,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(16,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
    }
  },
  SalaEstudos: {
    id: "SalaEstudos",
    lowerSrc: "imagens/mapas/salaestudos.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(2),
        y: utils.withGrid(4),
        src: "imagens/personagens/alice.png",
      }),
      professora: new Person({
        x: utils.withGrid(4),
        y: utils.withGrid(5),
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 800 },
          { type: "stand",  direction: "down", time: 3200 },
        ],
        talking: [
          {
            required: ["FALOU_COM_PEDRO"],
            events:[
            {type: "textMessage", text: "Alice: Professora, o que aconteceu com o Pedro?"},
            {type: "textMessage", text: "Professora: Ele foi atormentado por um dos magos e agora está amendrotado. Estou fazendo tudo que posso paara acalmá-lo."},
            ]
          },
          {
            events: [
              { type: "textMessage", text: "Alice: Professora! O que está acontecendo?", faceHero: "professora" },
              { type: "textMessage", text: "Professora: Não sei ao certo, Alice... "},
              { type: "textMessage", text: "Professora: Mas seja lá quem são estes magos... você deve enfrentá-los."},
              { type: "textMessage", text: "Professora: Enfrente e vença seus desafios, para que este pesadelo acabe."},
              { type: "textMessage", text: "Alice: Como, professora? Como venço esses desafios?"},
              { type: "textMessage", text: "Professora: Jogue pelas regras deles e responda cada pergunta da forma correta."},
              {type: "addStoryFlag", flag: "FALOU_COM_PROFESSORA"},
            ]
          }
        ]
      }),
      npcA: new Person({
        x: utils.withGrid(8),
        y: utils.withGrid(3),
        src: "imagens/personagens/p2.png",
        behaviorLoop: [
          { type: "stand",  direction: "right"},
        ],
        talking: [
          {
            required: ["FALOU_COM_PROFESSORA"],
            events: [
              {type: "textMessage", text:"Pedro: E-eu não sei.. não sei o que fazer...", faceHero: "npcA"},
              {type: "textMessage", text: "Alice: Pedro? Tudo bem?"},
              {type: "textMessage", text: "Pedro: ..."},
              {type: "addStoryFlag", flag: "FALOU_COM_PEDRO"},
            ]
          },
          {
            events:[
            {type: "textMessage", text: "Pedro: ..."},
            ]
          }
      ]
      }),
      vazio: new Person({
        x: utils.withGrid(5),
        y: utils.withGrid(2),
        src: "imagens/personagens/vazio.png",
        talking: [
          {
            events: [
              { type: "changeMap", map: "Corredor"},
            ]
          }
        ]
      }),
    },
    walls: {
      //parede superior
      [utils.asGridCoord(1,2)]: true, [utils.asGridCoord(2,2)]: true,
      [utils.asGridCoord(3,2)]: true, [utils.asGridCoord(4,2)]: true,
      [utils.asGridCoord(5,2)]: true, [utils.asGridCoord(6,2)]: true,
      [utils.asGridCoord(7,2)]: true, [utils.asGridCoord(8,2)]: true,

      //parede direita
      [utils.asGridCoord(9,3)]: true, [utils.asGridCoord(9,4)]: true,
      [utils.asGridCoord(9,5)]: true, [utils.asGridCoord(9,6)]: true,
      [utils.asGridCoord(9,7)]: true, [utils.asGridCoord(9,8)]: true,

      //parede inferior
      [utils.asGridCoord(8,9)]: true, [utils.asGridCoord(7,9)]: true,
      [utils.asGridCoord(6,9)]: true, [utils.asGridCoord(5,9)]: true, 
      [utils.asGridCoord(4,9)]: true, [utils.asGridCoord(3,9)]: true, 
      [utils.asGridCoord(2,9)]: true, [utils.asGridCoord(1,9)]: true,

      //parede esquerda
      [utils.asGridCoord(0,3)]: true, [utils.asGridCoord(0,4)]: true,
      [utils.asGridCoord(0,5)]: true, [utils.asGridCoord(0,6)]: true,
      [utils.asGridCoord(0,7)]: true, [utils.asGridCoord(0,8)]: true,

      //mesas
      [utils.asGridCoord(5,4)]: true, [utils.asGridCoord(5,5)]: true,
      [utils.asGridCoord(6,4)]: true, [utils.asGridCoord(6,5)]: true,

      [utils.asGridCoord(2,6)]: true, [utils.asGridCoord(3,6)]: true,
      [utils.asGridCoord(2,7)]: true, [utils.asGridCoord(3,7)]: true,
    }
  },
  Gremio: {
    id: "Gremio",
    lowerSrc: "imagens/mapas/gremio.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(2),
        y: utils.withGrid(4),
        src: "imagens/personagens/alice.png",
      }),
      vilao4: new Person({
        x: utils.withGrid(1),
        y: utils.withGrid(3),
        src: "imagens/personagens/vilao4.png",
        talking: [
          {
            required: ["DESAFIO1D3_COMPLETO"],
            events: [
              {type: "textMessage", text: "Mago: Você...me derrotou?"},
            ]
          },
          {
            required: ["DESAFIO1D2_COMPLETO"],
            events: [
              { type: "changeMap", map: "Desafio1d3"}
            ]
          },
          {
            required: ["DESAFIO1D1_COMPLETO"],
            events: [
              { type: "changeMap", map: "Desafio1d2"}
            ]
          },
          {
            events: [
              { type: "changeMap", map: "Desafio1d1"}
            ]
          },
        ]
      }),
    },
    walls: {
      //parede superior
      [utils.asGridCoord(1,2)]: true, [utils.asGridCoord(2,2)]: true,
      [utils.asGridCoord(3,2)]: true, [utils.asGridCoord(4,2)]: true,
      [utils.asGridCoord(5,2)]: true, [utils.asGridCoord(6,2)]: true,
      [utils.asGridCoord(7,2)]: true, [utils.asGridCoord(8,2)]: true,

      //escrivaninha e sofá
      [utils.asGridCoord(8,3)]: true,
      [utils.asGridCoord(7,4)]: true, [utils.asGridCoord(7,5)]: true,
      [utils.asGridCoord(7,6)]: true, [utils.asGridCoord(8,6)]: true,

      //parede direita
      [utils.asGridCoord(9,7)]: true, [utils.asGridCoord(9,8)]: true,

      //parede inferior
      [utils.asGridCoord(8,9)]: true, [utils.asGridCoord(7,9)]: true,
      [utils.asGridCoord(6,9)]: true, [utils.asGridCoord(3,9)]: true,
      [utils.asGridCoord(2,9)]: true, [utils.asGridCoord(1,9)]: true,

      //parede esquerda
      [utils.asGridCoord(0,3)]: true, [utils.asGridCoord(0,4)]: true,
      [utils.asGridCoord(0,5)]: true, [utils.asGridCoord(0,6)]: true,
      [utils.asGridCoord(0,7)]: true, [utils.asGridCoord(0,8)]: true,
    },
    cutsceneSpaces: {
      //acesso sala1
      [utils.asGridCoord(4,9)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(5,9)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
    }
  },
  Biblioteca: {
    id: "Biblioteca",
    lowerSrc: "imagens/mapas/biblioteca.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(14),
        y: utils.withGrid(18),
        src: "imagens/personagens/alice.png",
      }),
      vilao3: new Person({
        x: utils.withGrid(14),
        y: utils.withGrid(14),
        src: "imagens/personagens/vilao3.png",
        talking: [
          {
            events: [
              { type: "textMessage", text: "Teste."},
            ]
          }
        ]
      }),
    },
    //paredes biblioteca
    walls : {
      //parede superior
      [utils.asGridCoord(1,3)]: true, [utils.asGridCoord(4,3)]: true,
      [utils.asGridCoord(5,3)]: true, [utils.asGridCoord(6,3)]: true,
      [utils.asGridCoord(7,3)]: true, [utils.asGridCoord(8,3)]: true,
      [utils.asGridCoord(9,3)]: true, [utils.asGridCoord(10,3)]: true,
      [utils.asGridCoord(11,3)]: true, [utils.asGridCoord(12,3)]: true,
      [utils.asGridCoord(13,3)]: true, [utils.asGridCoord(14,3)]: true,
      [utils.asGridCoord(15,3)]: true, [utils.asGridCoord(16,3)]: true,
      [utils.asGridCoord(17,3)]: true,

      //prateleiras 1
      [utils.asGridCoord(18,4)]: true, [utils.asGridCoord(19,5)]: true,
      [utils.asGridCoord(19,6)]: true, [utils.asGridCoord(20,6)]: true,
      [utils.asGridCoord(21,6)]: true, [utils.asGridCoord(22,6)]: true,
      [utils.asGridCoord(23,6)]: true, [utils.asGridCoord(24,6)]: true,
      [utils.asGridCoord(25,6)]: true, [utils.asGridCoord(26,6)]: true,
      [utils.asGridCoord(27,6)]: true, [utils.asGridCoord(27,5)]: true,
      [utils.asGridCoord(28,4)]: true,

      //prateleiras 2
      [utils.asGridCoord(18,8)]: true, [utils.asGridCoord(18,9)]: true,
      [utils.asGridCoord(19,8)]: true, [utils.asGridCoord(19,9)]: true,
      [utils.asGridCoord(20,8)]: true, [utils.asGridCoord(20,9)]: true,
      [utils.asGridCoord(21,8)]: true, [utils.asGridCoord(21,9)]: true,
      [utils.asGridCoord(22,8)]: true, [utils.asGridCoord(22,9)]: true,
      [utils.asGridCoord(23,8)]: true, [utils.asGridCoord(23,9)]: true,
      [utils.asGridCoord(24,8)]: true, [utils.asGridCoord(24,9)]: true,
      [utils.asGridCoord(25,8)]: true, [utils.asGridCoord(25,9)]: true,
      [utils.asGridCoord(26,8)]: true, [utils.asGridCoord(26,9)]: true,
      [utils.asGridCoord(27,8)]: true, [utils.asGridCoord(27,9)]: true,
      [utils.asGridCoord(28,8)]: true, [utils.asGridCoord(28,9)]: true,

      //prateleiras 3
      [utils.asGridCoord(19,11)]: true, [utils.asGridCoord(19,12)]: true,
      [utils.asGridCoord(20,11)]: true, [utils.asGridCoord(20,12)]: true,
      [utils.asGridCoord(21,11)]: true, [utils.asGridCoord(21,12)]: true,
      [utils.asGridCoord(22,11)]: true, [utils.asGridCoord(22,12)]: true,
      [utils.asGridCoord(23,11)]: true, [utils.asGridCoord(23,12)]: true,
      [utils.asGridCoord(24,11)]: true, [utils.asGridCoord(24,12)]: true,
      [utils.asGridCoord(25,11)]: true, [utils.asGridCoord(25,12)]: true, 

      //prateleiras 4
      [utils.asGridCoord(21,15)]: true, [utils.asGridCoord(21,16)]: true,
      [utils.asGridCoord(22,15)]: true, [utils.asGridCoord(22,16)]: true,
      [utils.asGridCoord(23,15)]: true, [utils.asGridCoord(23,16)]: true,
      [utils.asGridCoord(24,15)]: true, [utils.asGridCoord(24,16)]: true,
      [utils.asGridCoord(25,15)]: true, [utils.asGridCoord(25,16)]: true,
      [utils.asGridCoord(26,15)]: true, [utils.asGridCoord(26,16)]: true,
      [utils.asGridCoord(27,15)]: true, [utils.asGridCoord(27,16)]: true,
      [utils.asGridCoord(28,15)]: true, [utils.asGridCoord(28,16)]: true,

      [utils.asGridCoord(21,14)]: true, [utils.asGridCoord(22,14)]: true,
      [utils.asGridCoord(23,14)]: true, [utils.asGridCoord(24,14)]: true,
      [utils.asGridCoord(25,14)]: true, [utils.asGridCoord(26,14)]: true,
      [utils.asGridCoord(27,14)]: true, [utils.asGridCoord(28,14)]: true,

      //armário canto superior-esquerdo
      [utils.asGridCoord(2,4)]: true, [utils.asGridCoord(3,4)]: true,

      //parede esquerda
      [utils.asGridCoord(0,4)]: true, [utils.asGridCoord(0,5)]: true,
      [utils.asGridCoord(0,6)]: true, [utils.asGridCoord(0,7)]: true,
      [utils.asGridCoord(0,8)]: true, [utils.asGridCoord(0,9)]: true,
      [utils.asGridCoord(0,10)]: true, [utils.asGridCoord(0,11)]: true,
      [utils.asGridCoord(0,12)]: true, [utils.asGridCoord(0,13)]: true,
      [utils.asGridCoord(0,14)]: true, [utils.asGridCoord(0,15)]: true,
      [utils.asGridCoord(0,16)]: true, [utils.asGridCoord(0,17)]: true,
      [utils.asGridCoord(0,18)]: true,

      //parede baixo
      [utils.asGridCoord(1,19)]: true, [utils.asGridCoord(2,19)]: true,
      [utils.asGridCoord(3,19)]: true, [utils.asGridCoord(4,19)]: true,
      [utils.asGridCoord(5,19)]: true, [utils.asGridCoord(6,19)]: true,
      [utils.asGridCoord(7,19)]: true, [utils.asGridCoord(8,19)]: true,
      [utils.asGridCoord(9,19)]: true, [utils.asGridCoord(10,19)]: true,
      [utils.asGridCoord(11,19)]: true, [utils.asGridCoord(12,19)]: true,
      [utils.asGridCoord(13,19)]: true, [utils.asGridCoord(16,19)]: true, 
      [utils.asGridCoord(17,19)]: true, [utils.asGridCoord(18,19)]: true,
      [utils.asGridCoord(19,19)]: true, [utils.asGridCoord(20,19)]: true,
      [utils.asGridCoord(21,19)]: true, [utils.asGridCoord(22,19)]: true,
      [utils.asGridCoord(23,19)]: true, [utils.asGridCoord(24,19)]: true,
      [utils.asGridCoord(25,19)]: true, [utils.asGridCoord(26,19)]: true,
      [utils.asGridCoord(27,19)]: true, [utils.asGridCoord(28,19)]: true,

      //parede direita
      [utils.asGridCoord(29,1)]: true, [utils.asGridCoord(29,2)]: true,
      [utils.asGridCoord(29,3)]: true, [utils.asGridCoord(29,4)]: true,
      [utils.asGridCoord(29,5)]: true, [utils.asGridCoord(29,6)]: true,
      [utils.asGridCoord(29,7)]: true, [utils.asGridCoord(29,8)]: true,
      [utils.asGridCoord(29,9)]: true, [utils.asGridCoord(29,10)]: true,
      [utils.asGridCoord(29,11)]: true, [utils.asGridCoord(29,12)]: true,
      [utils.asGridCoord(29,13)]: true, [utils.asGridCoord(29,14)]: true,
      [utils.asGridCoord(29,15)]: true, [utils.asGridCoord(29,16)]: true,
      [utils.asGridCoord(29,17)]: true, [utils.asGridCoord(29,18)]: true,
    },
    cutsceneSpaces: {
      //acesso sala1
      [utils.asGridCoord(14,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(15,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
    }
  },
  Patio: { 
    id: "Patio",
    lowerSrc: "imagens/mapas/patio2.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(9),
        y: utils.withGrid(17),
        src: "imagens/personagens/alice.png",
      }),
      p5: new Person({
        x: utils.withGrid(11),
        y: utils.withGrid(5),
        src: "imagens/personagens/p5.png",
        talking: [
          {
            events: [
              { type: "textMessage", text: "Teste."},
            ]
          }
        ]
      }),
      figurante1: new Person({
        x: utils.withGrid(11),
        y: utils.withGrid(16),
        src: "imagens/personagens/figurante6.png",
        behaviorLoop: [
          { type: "stand",  direction: "right", time: 3200 },
        ],
      }),
      figurante2: new Person({
        x: utils.withGrid(12),
        y: utils.withGrid(16),
        src: "imagens/personagens/figurante7.png",
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 3200 },
        ],
      }),
      figurante3: new Person({
        x: utils.withGrid(10),
        y: utils.withGrid(10),
        src: "imagens/personagens/figurante8.png",
        behaviorLoop: [
          { type: "stand",  direction: "up", time: 3200 },
        ],
      }),
      figurante4: new Person({
        x: utils.withGrid(6),
        y: utils.withGrid(7),
        src: "imagens/personagens/figurante1.png",
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 3200 },
        ],
      }),
    },
    walls:{
      //parede superior
      [utils.asGridCoord(1,0)]: true, [utils.asGridCoord(2,0)]: true,
      [utils.asGridCoord(3,0)]: true, [utils.asGridCoord(4,0)]: true,
      [utils.asGridCoord(5,0)]: true, [utils.asGridCoord(6,0)]: true,
      [utils.asGridCoord(7,0)]: true, [utils.asGridCoord(8,0)]: true,
      [utils.asGridCoord(9,0)]: true, [utils.asGridCoord(10,0)]: true,
      [utils.asGridCoord(11,0)]: true, [utils.asGridCoord(12,0)]: true,
      [utils.asGridCoord(13,0)]: true, [utils.asGridCoord(14,0)]: true,
      [utils.asGridCoord(15,0)]: true, [utils.asGridCoord(16,0)]: true,
      [utils.asGridCoord(17,0)]: true, [utils.asGridCoord(18,0)]: true,

      //parede direita
      [utils.asGridCoord(20,1)]: true, [utils.asGridCoord(20,2)]: true,
      [utils.asGridCoord(20,3)]: true, [utils.asGridCoord(20,4)]: true,
      [utils.asGridCoord(20,5)]: true, [utils.asGridCoord(20,6)]: true,
      [utils.asGridCoord(20,7)]: true, [utils.asGridCoord(20,8)]: true,
      [utils.asGridCoord(20,9)]: true, [utils.asGridCoord(20,10)]: true,
      [utils.asGridCoord(20,11)]: true, [utils.asGridCoord(20,12)]: true,
      [utils.asGridCoord(20,13)]: true, [utils.asGridCoord(20,14)]: true,
      [utils.asGridCoord(20,15)]: true, [utils.asGridCoord(20,16)]: true,
      [utils.asGridCoord(20,17)]: true, [utils.asGridCoord(20,18)]: true,
      [utils.asGridCoord(20,19)]: true,

      //parede esquerda
      [utils.asGridCoord(-1,1)]: true, [utils.asGridCoord(-1,2)]: true,
      [utils.asGridCoord(-1,3)]: true, [utils.asGridCoord(-1,4)]: true,
      [utils.asGridCoord(-1,5)]: true, [utils.asGridCoord(-1,6)]: true,
      [utils.asGridCoord(-1,7)]: true, [utils.asGridCoord(-1,8)]: true,
      [utils.asGridCoord(-1,9)]: true, [utils.asGridCoord(-1,10)]: true,
      [utils.asGridCoord(-1,11)]: true, [utils.asGridCoord(-1,12)]: true,
      [utils.asGridCoord(-1,13)]: true, [utils.asGridCoord(-1,14)]: true,
      [utils.asGridCoord(-1,15)]: true, [utils.asGridCoord(-1,16)]: true,
      [utils.asGridCoord(-1,17)]: true, [utils.asGridCoord(-1,18)]: true,
      [utils.asGridCoord(-1,19)]: true,

      //parede inferior
      [utils.asGridCoord(1,20)]: true, [utils.asGridCoord(2,20)]: true,
      [utils.asGridCoord(3,20)]: true, [utils.asGridCoord(4,20)]: true,
      [utils.asGridCoord(5,20)]: true, [utils.asGridCoord(6,20)]: true,
      [utils.asGridCoord(7,20)]: true, [utils.asGridCoord(8,20)]: true,
      [utils.asGridCoord(9,20)]: true, [utils.asGridCoord(10,20)]: true,
      [utils.asGridCoord(11,20)]: true, [utils.asGridCoord(12,20)]: true,
      [utils.asGridCoord(13,20)]: true, [utils.asGridCoord(14,20)]: true,
      [utils.asGridCoord(15,20)]: true, [utils.asGridCoord(16,20)]: true,
      [utils.asGridCoord(17,20)]: true, [utils.asGridCoord(18,20)]: true,
    },
    cutsceneSpaces: {
      [utils.asGridCoord(0,6)]: [
        {
          events: [
            { type: "changeMap", map: "Jardim" }
          ]
        }
      ],
      [utils.asGridCoord(0,7)]: [
        {
          events: [
            { type: "changeMap", map: "Jardim" }
          ]
        }
      ],
      [utils.asGridCoord(0,8)]: [
        {
          events: [
            { type: "changeMap", map: "Jardim" }
          ]
        }
      ],
      [utils.asGridCoord(0,9)]: [
        {
          events: [
            { type: "changeMap", map: "Jardim" }
          ]
        }
      ],
      [utils.asGridCoord(0,10)]: [
        {
          events: [
            { type: "changeMap", map: "Jardim" }
          ]
        }
      ],
      [utils.asGridCoord(0,11)]: [
        {
          events: [
            { type: "changeMap", map: "Jardim" }
          ]
        }
      ],
      [utils.asGridCoord(0,12)]: [
        {
          events: [
            { type: "changeMap", map: "Jardim" }
          ]
        }
      ],
      [utils.asGridCoord(5,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(6,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(7,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(8,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(9,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ]
      ,[utils.asGridCoord(10,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(11,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(12,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(13, 19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
      [utils.asGridCoord(14,19)]: [
        {
          events: [
            { type: "changeMap", map: "Corredor" }
          ]
        }
      ],
    }
  },
  Desafio1d1: {
    id: "Desafio1d1",
    upperSrc: "imagens/personagens/vazio.png",
    lowerSrc: "imagens/mapas/desafio3.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(8),
        y: utils.withGrid(8),
        src: "imagens/personagens/vazio.png",
      }),
      bancada: new Person({
        x: utils.withGrid(8),
        y: utils.withGrid(9),
        src:"imagens/personagens/vazio.png",
        talking: [
          {
            events: [
              { type: "textMessage", text: "Mago: Está pronta para o desafio?" },
              { type: "quizGame", idAssunto: 1, dificuldade: "1" },
              { type: "quizGame", idAssunto: 1, dificuldade: "1" },
              { type: "quizGame", idAssunto: 1, dificuldade: "1" },
              { type: "textMessage", text: "Mago: Hmpf. Parece que você estava mais preparada do que o imaginado." },
              {type: "addStoryFlag", flag: "DESAFIO1D1_COMPLETO"},
              { type: "changeMap", map: "Gremio" },
            ]
          }
        ]
    }),
  },
},
  Desafio1d2: {
    id: "Desafio1d2",
    upperSrc: "imagens/personagens/vazio.png",
    lowerSrc: "imagens/mapas/desafio3.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(8),
        y: utils.withGrid(8),
        src: "imagens/personagens/vazio.png",
      }),
      bancada: new Person({
        x: utils.withGrid(8),
        y: utils.withGrid(9),
        src:"imagens/personagens/vazio.png",
        talking: [
          {
            events: [
              { type: "textMessage", text: "Mago: Está pronta para um desafio maior?" },
              { type: "quizGame", idAssunto: 1, dificuldade: "2" },
              { type: "quizGame", idAssunto: 1, dificuldade: "2" },
              { type: "quizGame", idAssunto: 1, dificuldade: "2" },
              { type: "textMessage", text: "Mago: Hmpf. Parece que você estava mais preparada do que o imaginado." },
              {type: "addStoryFlag", flag: "DESAFIO1D2_COMPLETO"},
              { type: "changeMap", map: "Gremio" },
            ]
          }
        ]
    }),
  },
},
  Desafio1d3: {
    id: "Desafio1d3",
    upperSrc: "imagens/personagens/vazio.png",
    lowerSrc: "imagens/mapas/desafio3.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(8),
        y: utils.withGrid(8),
        src: "imagens/personagens/vazio.png",
      }),
      bancada: new Person({
        x: utils.withGrid(8),
        y: utils.withGrid(9),
        src:"imagens/personagens/vazio.png",
        talking: [
          {
            events: [
              { type: "textMessage", text: "Mago: Este é o meu desafio supremo!" },
              { type: "quizGame", idAssunto: 1, dificuldade: "3" },
              { type: "quizGame", idAssunto: 1, dificuldade: "3" },
              { type: "quizGame", idAssunto: 1, dificuldade: "3" },
              { type: "textMessage", text: "Mago: Hmpf. Parece que você estava mais preparada do que o imaginado." },
              {type: "addStoryFlag", flag: "DESAFIO1D3_COMPLETO"},
              { type: "changeMap", map: "Gremio" },
            ]
          }
        ]
    }),
  },
},
}