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
  // drawUpperImage(ctx, cameraPerson) {
  //   ctx.drawImage(
  //     this.upperImage, 
  //     utils.withGrid(10.5) - cameraPerson.x, 
  //     utils.withGrid(6) - cameraPerson.y
  //   )
  // } 

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
function generateRandomQuestion() {
  const questions = [
    { text: "Qual fração represente metade de um bolo?", options: ["1/3", "1/2", "1/4"], correctAnswer: 1 },
    { text: "Quanto é 1 - 1/4?", options: ["1/3", "1/2", "3/4"], correctAnswer: 2 },
    { text: "Quanto é 3 x 1/3?", options: ["3", "1", "1/9"], correctAnswer: 1 },
    { text: "Se você tem 3 chocolates e come 1/3 deles, quantos sobraram?", options: ["2", "1", "Nenhum"], correctAnswer: 0 },
    { text: "Qual fração equivale a 1/3?", options: ["1/9", "3/14", "2/6"], correctAnswer: 2 },
    
  ]
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

  return randomQuestion;
}

window.OverworldMaps = {
  Mapa1: {
    lowerSrc: "imagens/mapas/sala02.png",
    // upperSrc: "/images/maps/DemoUpper.png",
    gameObjects: {

      //pessoas primeiro mapa
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(9),
        y: utils.withGrid(4),
        src: "imagens/personagens/alice.png",
      }),
      professora: new Person({
        x: utils.withGrid(12),
        y: utils.withGrid(4),
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 800 },
          { type: "stand",  direction: "down", time: 3200 },
        ],
        talking: [
          {
            events: [
              { type: "textMessage", text: "Ótima apresentação, Alice! Parabéns!", faceHero: "professora" },
              { type: "textMessage", text: "Só tome cuidado com a próxima aula... DE MATEMÁTICA!!!"},
            ]
          }
        ]
      }),
      npcA: new Person({
        x: utils.withGrid(16),
        y: utils.withGrid(9),
        src: "imagens/personagens/p2.png",
        behaviorLoop: [
          { type: "walk",  direction: "left" },
          { type: "stand",  direction: "up", time: 3000 },
          { type: "stand",  direction: "right", time: 3000 },
          { type: "walk",  direction: "right" },
          { type: "stand",  direction: "left", time: 3000 },
        ],
        talking: [
          {
          events: [
            {type: "textMessage", text:"Ufa! Mal via a hora dessa aula acabar! Estou morto de fome..", faceHero: "npcA"},
            {type: "textMessage", text: "O que você vai fazer agora que a aula acabou, Alice? Nós podíamos ir no shopping!"},
            {type: "addStoryFlag", flag: "FALOU_COM_PEDRO"},
          ]
        }
      ]
      }),
      npcB: new Person({
        x: utils.withGrid(7),
        y: utils.withGrid(10),
        src: "imagens/personagens/p3.png",
        behaviorLoop: [
          { type: "stand",  direction: "up", time: 3000 },
          { type: "stand",  direction: "right", time: 3000 },
          { type: "stand",  direction: "left", time: 3000 },
        ],
        talking: [
          {
            required: ["FALOU_COM_PEDRO"],
            events:[
            {type: "textMessage", text: "E aí, o que ele queria?"},
            ]
          },
          {
          events: [
            {type: "textMessage", text:"Apresentou m-muito bem, Alice!", faceHero: "npcB"},
            {type: "textMessage", text: "E-eu tenho muita vergonha, tenho medo de apresentações só de ver alguém apresentando..."},
            {type: "textMessage", text: "I-inclusive, o pedro parecia querer falar com você!"},
          ]
        }
      ]
      }),
    },


    //paredes do primeiro mapa
    walls: {
      //paredes
      [utils.asGridCoord(1,1)]: true,
      [utils.asGridCoord(1,2)]: true,
      [utils.asGridCoord(1,3)]: true,
      [utils.asGridCoord(1,4)]: true,
      [utils.asGridCoord(1,5)]: true,
      [utils.asGridCoord(1,6)]: true,
      [utils.asGridCoord(1,7)]: true,
      [utils.asGridCoord(1,8)]: true,
      [utils.asGridCoord(1,9)]: true,
      [utils.asGridCoord(1,10)]: true,
      [utils.asGridCoord(1,11)]: true,
      [utils.asGridCoord(1,12)]: true,
      [utils.asGridCoord(1,13)]: true,
      [utils.asGridCoord(2,1)]: true,
      [utils.asGridCoord(2,2)]: true,
      [utils.asGridCoord(2,3)]: true,
      [utils.asGridCoord(3,1)]: true,
      [utils.asGridCoord(3,2)]: true,
      [utils.asGridCoord(3,3)]: true,
      [utils.asGridCoord(4,1)]: true,
      [utils.asGridCoord(4,2)]: true,
      [utils.asGridCoord(4,3)]: true,
      [utils.asGridCoord(5,1)]: true,
      [utils.asGridCoord(5,2)]: true,
      [utils.asGridCoord(5,3)]: true,
      [utils.asGridCoord(6,1)]: true,
      [utils.asGridCoord(6,2)]: true,
      [utils.asGridCoord(6,3)]: true,
      [utils.asGridCoord(7,1)]: true,
      [utils.asGridCoord(7,2)]: true,
      [utils.asGridCoord(7,3)]: true,
      [utils.asGridCoord(8,1)]: true,
      [utils.asGridCoord(8,2)]: true,
      [utils.asGridCoord(8,3)]: true,
      [utils.asGridCoord(9,1)]: true,
      [utils.asGridCoord(9,2)]: true,
      [utils.asGridCoord(9,3)]: true,
      [utils.asGridCoord(10,1)]: true,
      [utils.asGridCoord(10,2)]: true,
      [utils.asGridCoord(10,3)]: true,
      [utils.asGridCoord(11,1)]: true,
      [utils.asGridCoord(11,2)]: true,
      [utils.asGridCoord(11,3)]: true,
      [utils.asGridCoord(12,1)]: true,
      [utils.asGridCoord(12,2)]: true,
      [utils.asGridCoord(12,3)]: true,
      [utils.asGridCoord(13,1)]: true,
      [utils.asGridCoord(13,2)]: true,
      [utils.asGridCoord(13,3)]: true,
      [utils.asGridCoord(14,1)]: true,
      [utils.asGridCoord(14,2)]: true,
      [utils.asGridCoord(14,3)]: true,
      [utils.asGridCoord(15,1)]: true,
      [utils.asGridCoord(15,2)]: true,
      [utils.asGridCoord(15,3)]: true,
      [utils.asGridCoord(16,1)]: true,
      [utils.asGridCoord(16,2)]: true,
      [utils.asGridCoord(16,3)]: true,
      [utils.asGridCoord(16,4)]: true,
      [utils.asGridCoord(17,1)]: true,
      [utils.asGridCoord(17,2)]: true,
      [utils.asGridCoord(17,3)]: true,
      [utils.asGridCoord(17,4)]: true,
      [utils.asGridCoord(18,1)]: true,
      [utils.asGridCoord(18,2)]: true,
      [utils.asGridCoord(18,3)]: true,
      [utils.asGridCoord(18,4)]: true,
      [utils.asGridCoord(18,5)]: true,
      [utils.asGridCoord(18,6)]: true,
      [utils.asGridCoord(18,7)]: true,
      [utils.asGridCoord(18,8)]: true,
      [utils.asGridCoord(18,9)]: true,
      [utils.asGridCoord(18,10)]: true,
      [utils.asGridCoord(18,11)]: true,
      [utils.asGridCoord(18,12)]: true,
      [utils.asGridCoord(18,13)]: true,
      [utils.asGridCoord(17,13)]: true,
      [utils.asGridCoord(16,13)]: true,
      [utils.asGridCoord(15,13)]: true,
      [utils.asGridCoord(14,13)]: true,
      [utils.asGridCoord(13,13)]: true,
      [utils.asGridCoord(12,13)]: true,
      [utils.asGridCoord(11,13)]: true,
      [utils.asGridCoord(11,14)]: true,
      [utils.asGridCoord(1,13)]: true,
      [utils.asGridCoord(2,13)]: true,
      [utils.asGridCoord(3,13)]: true,
      [utils.asGridCoord(4,13)]: true,
      [utils.asGridCoord(5,13)]: true,
      [utils.asGridCoord(6,13)]: true,
      [utils.asGridCoord(7,13)]: true,
      [utils.asGridCoord(8,13)]: true,
      [utils.asGridCoord(8,14)]: true,

      [utils.asGridCoord(9,15)]: true,
      [utils.asGridCoord(10,15)]: true,

      //mesas
      [utils.asGridCoord(6,5)]: true,
      [utils.asGridCoord(7,5)]: true,
      [utils.asGridCoord(3,5)]: true,
      [utils.asGridCoord(4,5)]: true,

      [utils.asGridCoord(6,8)]: true,
      [utils.asGridCoord(7,8)]: true,
      [utils.asGridCoord(3,8)]: true,
      [utils.asGridCoord(4,8)]: true,

      [utils.asGridCoord(6,11)]: true,
      [utils.asGridCoord(7,11)]: true,
      [utils.asGridCoord(3,11)]: true,
      [utils.asGridCoord(4,11)]: true,

      [utils.asGridCoord(12,5)]: true,
      [utils.asGridCoord(13,5)]: true,
      [utils.asGridCoord(15,5)]: true,
      [utils.asGridCoord(16,5)]: true,

      [utils.asGridCoord(12,8)]: true,
      [utils.asGridCoord(13,8)]: true,
      [utils.asGridCoord(15,8)]: true,
      [utils.asGridCoord(16,8)]: true,

      [utils.asGridCoord(12,11)]: true,
      [utils.asGridCoord(13,11)]: true,
      [utils.asGridCoord(15,11)]: true,
      [utils.asGridCoord(18,11)]: true,
    },
    cutsceneSpaces: {
      [utils.asGridCoord(9,5)]: [
        {
          events: [
            {type: "textMessage", text:"E dessa forma, as margens do rio Ipiranga, Dom Pedro Primeiro declarou a independência!"},
            {who: "professora", type: "walk",  direction: "left" },
            {who: "professora", type: "walk",  direction: "left" },
            {who: "professora", type: "walk",  direction: "left" },
            {who: "hero", type: "walk",  direction: "down" },
            {who: "hero", type: "walk",  direction: "down" },
            {who: "hero", type: "walk",  direction: "down" },
            {who: "hero", type: "walk",  direction: "down" },
            {who: "hero", type: "stand",  direction: "up"},
            {who: "professora", type: "walk",  direction: "down" },
            {type: "textMessage", text:"Ótima apresentação, Alice! Conhecer a história é um passo importantíssimo do aprendizado e é extremamente necessário!"},
            {type: "textMessage", text:"Turma, vocês tem atividades da página 46 no livro didático. Façam até a quinta-feira, por favor."},
            {type: "textMessage", text:"No demais, estão liberados! Até quinta!"},
            // {walls: {[utils.asGridCoord(9,4)]: true}},
            // { who: "npcB", type: "walk",  direction: "left" },
            // { who: "npcB", type: "stand",  direction: "up", time: 500 },
            // { type: "textMessage", text:"Você não pode ficar aí!"},
            // { who: "npcB", type: "walk",  direction: "right" },
            // { who: "hero", type: "walk",  direction: "down" },
            // { who: "hero", type: "walk",  direction: "left" },
          ],
        }
      ],

      //transição de mapa
      [utils.asGridCoord(9,14)]: [
        {
          events: [
            { type: "changeMap", map: "Mapa2" }
          ]
        }
      ],
      [utils.asGridCoord(10,14)]: [
        {
          events: [
            { type: "changeMap", map: "Mapa2" }
          ]
        }
      ]
    }
    
  },
  Mapa2: {
    lowerSrc: "imagens/mapas/corredor.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(4),
        y: utils.withGrid(2),
        src: "imagens/personagens/alice.png",
      }),
      vilao: new Person({
        x: utils.withGrid(19),
        y: utils.withGrid(2),
        src: "imagens/personagens/vilao.png",
      }),
    },
    walls: {
      //paredes segundo mapa
      [utils.asGridCoord(0,1)] : true,
      [utils.asGridCoord(1,1)] : true,
      [utils.asGridCoord(2,1)] : true,
      [utils.asGridCoord(3,1)] : true,
      [utils.asGridCoord(4,0)] : true,
      [utils.asGridCoord(5,1)] : true,
      [utils.asGridCoord(6,1)] : true,
      [utils.asGridCoord(7,1)] : true,
      [utils.asGridCoord(8,1)] : true,
      [utils.asGridCoord(9,1)] : true,
      [utils.asGridCoord(10,1)] : true,
      [utils.asGridCoord(11,1)] : true,
      [utils.asGridCoord(12,1)] : true,
      [utils.asGridCoord(13,1)] : true,
      [utils.asGridCoord(14,1)] : true,
      [utils.asGridCoord(15,1)] : true,
      [utils.asGridCoord(16,1)] : true,
      [utils.asGridCoord(17,1)] : true,
      [utils.asGridCoord(18,1)] : true,
      [utils.asGridCoord(19,1)] : true,
      [utils.asGridCoord(0,2)] : true,
      [utils.asGridCoord(0,3)] : true,
      [utils.asGridCoord(0,4)] : true,
      [utils.asGridCoord(0,4)] : true,
      [utils.asGridCoord(1,4)] : true,
      [utils.asGridCoord(2,4)] : true,
      [utils.asGridCoord(3,4)] : true,
      [utils.asGridCoord(4,4)] : true,
      [utils.asGridCoord(5,4)] : true,
      [utils.asGridCoord(6,4)] : true,
      [utils.asGridCoord(7,4)] : true,
      [utils.asGridCoord(8,4)] : true,
      [utils.asGridCoord(9,4)] : true,
      [utils.asGridCoord(10,4)] : true,
      [utils.asGridCoord(11,4)] : true,
      [utils.asGridCoord(12,4)] : true,
      [utils.asGridCoord(13,4)] : true,
      [utils.asGridCoord(14,4)] : true,
      [utils.asGridCoord(15,4)] : true,
      [utils.asGridCoord(16,4)] : true,
      [utils.asGridCoord(17,4)] : true,
      [utils.asGridCoord(18,4)] : true,
      [utils.asGridCoord(19,4)] : true,
    },

    cutsceneSpaces: {
      [utils.asGridCoord(4,1)] : [{
        events : [
            { type: "changeMap", map: "Mapa1"},
          ]
        }
      ],

      [utils.asGridCoord(5,2)] : [{
        events : [
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },
          {who: "vilao", type: "walk",  direction: "left" },

          {type: "textMessage", text:"???: Então é você..."},
          {type: "textMessage", text:"HAHAHAHAHAAHAHAHHAHAHA! HAHAHAHAHAHHAAHAH! TE ENCONTREI!"},

          {who: "hero", type: "walk",  direction: "left" },
          {who: "hero", type: "walk",  direction: "left" },
          {who: "hero", type: "stand",  direction: "right" },
          {who: "vilao", type: "walk",  direction: "left" },

          {type: "textMessage", text:"Alice: Hum... perdão, mas você deve estar me confundindo..."},
          {type: "textMessage", text:"Alice: Com licença."},
        ]
      }
    ],

    [utils.asGridCoord(5,3)] : [{
      events: [
          {who: "vilao", type: "stand",  direction: "down" },
          {type: "textMessage", text:"???: Permita-me me apresentar..."},
          {who: "hero", type: "stand",  direction: "up" },
          {type: "textMessage", text:"???: O meu nome é Silvônio Lupos. Mas pode me chamar apenas de Lupos."},
          {type: "textMessage", text:"Lupos: Sou um mago fracionário."},
          {type: "textMessage", text:"Lupos: Estou aqui para convencê-la a amar a matemática, da mesma forma que eu amo."},
          {type: "textMessage", text:"Alice: Sem chance, eu detesto matemática. E essa coisa de mago fracionário não existe."},
          {type: "textMessage", text:"Lupos: Tem certeza que vai me ignorar?..."},
          {type: "textMessage", text:"Lupos: Então enfrente seus maiores medos!"},
          {type: "changeMap", map: "Mapa3"},
        ]
      }
    ]
    }
  },
  Mapa2B: {
    lowerSrc: "imagens/mapas/corredor.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(4),
        y: utils.withGrid(3),
        src:"imagens/personagens/alice.png"
      }),
      vilao: new Person({
        x: utils.withGrid(5),
        y: utils.withGrid(2),
        src: "imagens/personagens/vilao.png",
      }),
    },
    cutsceneSpaces: {
      [utils.asGridCoord(4,1)] : [{
        events : [
            { type: "changeMap", map: "Mapa1"},
          ]
        }
      ],
      [utils.asGridCoord(5,3)] : [{
        events: [
            {who: "vilao", type: "stand",  direction: "down" },
            {type: "textMessage", text:"Lupos: EI! Acha que pode simplesmente me ignorar e ir embora?"},
            {who: "hero", type: "stand",  direction: "up" },
            {type: "textMessage", text:"Lupos: De volta ao desafio! E não fuja de mim novamente!"},
            {type: "changeMap", map: "Mapa3"},
          ]
        }
      ]
    },
  },
  Mapa3: {
    lowerSrc: "imagens/mapas/quizGame.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(4),
        y: utils.withGrid(2),
        src: "imagens/personagens/alice.png",
      }),
      bancada: new Person({
        x: utils.withGrid(4),
        y: utils.withGrid(3),
        src:"imagens/personagens/vazio.png",
        talking: [
          {
            events: [
              {who: "vilao", type: "stand",  direction: "up" },
              { type: "textMessage", text: "Lupos: Está pronta para o desafio?", faceHero:"vilao" },
              { type: "quizGame", ...generateRandomQuestion() },
              { type: "quizGame", ...generateRandomQuestion() },
              { type: "quizGame", ...generateRandomQuestion() },
              { type: "textMessage", text: "Lupos: Hmpf. Parece que você estava mais preparada do que o imaginado.", faceHero:"vilao" },
              {type: "changeMap", map: "Mapa4"},
            ]
          }
        ]
      }),
      tutorial: new Person({
        x: utils.withGrid(7),
        y: utils.withGrid(1),
        src:"imagens/personagens/vazio.png",
        talking: [
          {
            events: [
              {type: "textMessage", text: "Este é um cenário de desafio! Aqui, você deverá acertar corretamente todas as perguntas propostas."},
              {type: "textMessage", text: "Caso deseje voltar para o cenário anterior, basta usar a porta!"},
            ]
          }
        ]
      }),
      porta: new Person({
        x: utils.withGrid(4),
        y: utils.withGrid(1),
        src:"imagens/personagens/vazio.png",
        talking: [{
          events: [
            {type: "changeMap", map: "Mapa2B"},
          ]
        }]
      }),
      vilao: new Person({
        x: utils.withGrid(4),
        y: utils.withGrid(6),
        src: "imagens/personagens/vilao.png",
        talking: [{
          events: [
            { type: "textMessage", text: "Alice: Onde estamos?", faceHero:"vilao" },
            { type: "textMessage", text: "Lupos: Essa é a dimensão do desafio! Você está aqui para ser desafiada por mim.", faceHero:"vilao" },
            { type: "textMessage", text: "Lupos: E não te deixarei livre enquanto não terminarmos com isso...", faceHero:"vilao" },
            { type: "textMessage", text: "Alice: E como isso funciona?", faceHero:"vilao" },
            { type: "textMessage", text: "Lupos: Basta ir até o palco e responder as minhas perguntas! Erros não serão admitidos!", faceHero:"vilao" },
          ]
        }]
    }),
  },
  walls:{
    [utils.asGridCoord(0,1)] : true,
    [utils.asGridCoord(1,1)] : true,
    [utils.asGridCoord(2,1)] : true,
    [utils.asGridCoord(3,1)] : true,
    [utils.asGridCoord(5,1)] : true,
    [utils.asGridCoord(6,1)] : true,
    [utils.asGridCoord(8,1)] : true,
    [utils.asGridCoord(9,1)] : true,
    [utils.asGridCoord(-1,2)] : true,
    [utils.asGridCoord(-1,3)] : true,
    [utils.asGridCoord(-1,4)] : true,
    [utils.asGridCoord(-1,5)] : true,
    [utils.asGridCoord(-1,6)] : true,
    [utils.asGridCoord(-1,7)] : true,
    [utils.asGridCoord(-1,8)] : true,
    [utils.asGridCoord(-1,9)] : true,
    [utils.asGridCoord(0,10)] : true,
    [utils.asGridCoord(1,10)] : true,
    [utils.asGridCoord(2,10)] : true,
    [utils.asGridCoord(3,10)] : true,
    [utils.asGridCoord(4,10)] : true,
    [utils.asGridCoord(5,10)] : true,
    [utils.asGridCoord(6,10)] : true,
    [utils.asGridCoord(7,10)] : true,
    [utils.asGridCoord(8,10)] : true,
    [utils.asGridCoord(9,10)] : true,
    [utils.asGridCoord(10,1)] : true,
    [utils.asGridCoord(10,2)] : true,
    [utils.asGridCoord(10,3)] : true,
    [utils.asGridCoord(10,4)] : true,
    [utils.asGridCoord(10,5)] : true,
    [utils.asGridCoord(10,6)] : true,
    [utils.asGridCoord(10,7)] : true,
    [utils.asGridCoord(10,8)] : true,
    [utils.asGridCoord(10,9)] : true,
    [utils.asGridCoord(10,10)] : true,
    [utils.asGridCoord(0,4)] : true,
    [utils.asGridCoord(1,4)] : true,
    [utils.asGridCoord(2,4)] : true,
    [utils.asGridCoord(3,4)] : true,
    [utils.asGridCoord(4,4)] : true,
    [utils.asGridCoord(5,4)] : true,
    [utils.asGridCoord(6,4)] : true,
    [utils.asGridCoord(7,4)] : true,
  }
},
  Mapa4: { 
  lowerSrc: "imagens/mapas/corredor2.png",
  gameObjects: {
    hero: new Person({
      isPlayerControlled: true,
      x: utils.withGrid(5),
      y: utils.withGrid(3),
      src: "imagens/personagens/alice.png",
    }),
    vilao: new Person({
      x: utils.withGrid(5),
      y: utils.withGrid(2),
      src: "imagens/personagens/vilao.png",
      talking: [
        {
          events: [
            { type: "textMessage", text: "Aparentemente, você domina a matemática, por mais que tenha tanto medo da mesma.", faceHero:"vilao" },
            { type: "textMessage", text: "O caminho a frente não será fácil, Alice. Esteja preparada.", faceHero:"vilao" },
            { type: "textMessage", text: "A própria matemática te desafiará.", faceHero:"vilao" },
          ]
        }
      ]
    }),
  },
  walls: {
    //paredes segundo mapa
    [utils.asGridCoord(0,1)] : true,
    [utils.asGridCoord(1,1)] : true,
    [utils.asGridCoord(2,1)] : true,
    [utils.asGridCoord(3,1)] : true,
    [utils.asGridCoord(4,1)] : true,
    [utils.asGridCoord(5,1)] : true,
    [utils.asGridCoord(6,1)] : true,
    [utils.asGridCoord(7,1)] : true,
    [utils.asGridCoord(8,1)] : true,
    [utils.asGridCoord(9,1)] : true,
    [utils.asGridCoord(10,1)] : true,
    [utils.asGridCoord(11,1)] : true,
    [utils.asGridCoord(12,1)] : true,
    [utils.asGridCoord(13,1)] : true,
    [utils.asGridCoord(14,1)] : true,
    [utils.asGridCoord(15,1)] : true,
    [utils.asGridCoord(16,1)] : true,
    [utils.asGridCoord(17,1)] : true,
    [utils.asGridCoord(18,1)] : true,
    [utils.asGridCoord(19,1)] : true,
    [utils.asGridCoord(0,2)] : true,
    [utils.asGridCoord(0,3)] : true,
    [utils.asGridCoord(0,4)] : true,
    [utils.asGridCoord(0,4)] : true,
    [utils.asGridCoord(1,4)] : true,
    [utils.asGridCoord(2,4)] : true,
    [utils.asGridCoord(3,4)] : true,
    [utils.asGridCoord(4,4)] : true,
    [utils.asGridCoord(5,4)] : true,
    [utils.asGridCoord(6,4)] : true,
    [utils.asGridCoord(7,4)] : true,
    [utils.asGridCoord(8,4)] : true,
    [utils.asGridCoord(9,4)] : true,
    [utils.asGridCoord(10,4)] : true,
    [utils.asGridCoord(11,4)] : true,
    [utils.asGridCoord(12,4)] : true,
    [utils.asGridCoord(13,4)] : true,
    [utils.asGridCoord(14,4)] : true,
    [utils.asGridCoord(15,4)] : true,
    [utils.asGridCoord(16,4)] : true,
    [utils.asGridCoord(17,4)] : true,
    [utils.asGridCoord(18,4)] : true,
    [utils.asGridCoord(19,4)] : true,
  },
  }
}