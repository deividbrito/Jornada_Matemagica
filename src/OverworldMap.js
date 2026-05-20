// Avalia uma entrada do array `required` de cenários/eventos.
// Prefix `!` significa "flag NÃO setada". Sem prefix = flag setada.
function _flagSatisfied(sf) {
  if (typeof sf !== "string") return true;
  if (sf.startsWith("!")) return !window.playerState.storyFlags[sf.slice(1)];
  return !!window.playerState.storyFlags[sf];
}

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
      window.utils.withGrid(10.5) - cameraPerson.x, 
      window.utils.withGrid(6) - cameraPerson.y
      )
  }

  //construtor que desenha a camada alta
  drawUpperImage(ctx, cameraPerson) {
    ctx.drawImage(
      this.upperImage, 
      window.utils.withGrid(10.5) - cameraPerson.x, 
      window.utils.withGrid(6) - cameraPerson.y
    )
  } 

  //função para identificar espaços ocupados por paredes ou outros objetos
  isSpaceTaken(currentX, currentY, direction) {
    const {x,y} = window.utils.nextPosition(currentX, currentY, direction);
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
      const eventHandler = new window.OverworldEvent({
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
    const nextCoords = window.utils.nextPosition(hero.x, hero.y, hero.direction);
    const match = Object.values(this.gameObjects).find(object => {
      return `${object.x},${object.y}` === `${nextCoords.x},${nextCoords.y}`
    });
    if (!this.isCutscenePlaying && match && match.talking.length) {

      const relevantScenario = match.talking.find(scenario => {
        return (scenario.required || []).every((sf) => _flagSatisfied(sf));
      })
      relevantScenario && this.startCutscene(relevantScenario.events)
    }
  }

  checkForFootstepCutscene() {
    const hero = this.gameObjects["hero"];
    const match = this.cutsceneSpaces[ `${hero.x},${hero.y}` ];
    if (!this.isCutscenePlaying && match) {
      const relevantScenario = match.find(scenario => {
        return (scenario.required || []).every((sf) => _flagSatisfied(sf));
      });
      relevantScenario && this.startCutscene(relevantScenario.events);
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
    const {x,y} = window.utils.nextPosition(wasX, wasY, direction);
    this.addWall(x,y);
  }
}

// Utilitário para gerar paredes em regiões retangulares [x1, y1, x2, y2]
function generateWallRegion(regions) {
  const walls = {};
  for (const [x1, y1, x2, y2] of regions) {
    for (let x = Math.min(x1,x2); x <= Math.max(x1,x2); x++) {
      for (let y = Math.min(y1,y2); y <= Math.max(y1,y2); y++) {
        walls[window.utils.asGridCoord(x, y)] = true;
      }
    }
  }
  return walls;
}

window.OverworldMaps = {
  Corredor: {
    id: "Corredor",
    lowerSrc: "imagens/mapas/corredor.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(4),
        y: window.utils.withGrid(3),
        src: "imagens/personagens/alice.png",
      }),
      // Professor Mentor — guia narrativo, posicionado no centro do Corredor
      // (acessível em qualquer momento). Na intro, anda até Alice e volta.
      // Ordem importa: o primeiro `required` que satisfaz é usado.
      // `faceHero` no início de cada cenário garante que ele encara Alice
      // antes de falar, independente do lado em que ela se aproxima.
      mentor: new window.Person({
        x: window.utils.withGrid(4),
        y: window.utils.withGrid(8),
        direction: "up",
        src: "imagens/personagens/p3.png",
        behaviorLoop: [
          { type: "stand", direction: "up", time: 3200 },
        ],
        talking: [
          { required: ["epilogo_done"], events: [
              { type: "faceHero", who: "mentor" },
              { type: "textMessage", text: "Mentor: Que tipo de matemágico você quer ser hoje, Alice?" },
          ]},
          { required: ["MAGO_PORCENTAGEM_DERROTADO", "boss_revelado"], events: [
              { type: "faceHero", who: "mentor" },
              { type: "textMessage", text: "Mentor: Você fez o impossível. Venha, vamos conversar." },
          ]},
          { required: ["MAGO_RACIONAIS_DERROTADO", "antes_jardim_done"], events: [
              { type: "faceHero", who: "mentor" },
              { type: "textMessage", text: "Mentor: Apenas o Jardim resta. Eu não posso ir junto. Volte inteira." },
          ]},
          { required: ["MAGO_RACIONAIS_DERROTADO"], events: [
              { type: "faceHero", who: "mentor" },
              { type: "textMessage", text: "Mentor: Cinco magos. Apenas o Jardim resta. Atravesse o Pátio para chegar lá." },
          ]},
          { required: ["MAGO_FRACOES_DERROTADO"], events: [
              { type: "faceHero", who: "mentor" },
              { type: "textMessage", text: "Mentor: A Biblioteca está mais leve. As páginas voltam a se colar. Vá ao Pátio." },
          ]},
          { required: ["MAGO_PRIMOS_DERROTADO", "metade_caminho_done"], events: [
              { type: "faceHero", who: "mentor" },
              { type: "textMessage", text: "Mentor: Metade do caminho. Você sabe quem é o Sombrio agora. Não tema; saiba." },
          ]},
          { required: ["MAGO_APROXIMACAO_DERROTADO"], events: [
              { type: "faceHero", who: "mentor" },
              { type: "textMessage", text: "Mentor: Três salas, três magos. O Grêmio é o próximo. A Sentinela conta números — e pessoas — friamente." },
          ]},
          { required: ["MAGO_DECIMAIS_DERROTADO"], events: [
              { type: "faceHero", who: "mentor" },
              { type: "textMessage", text: "Mentor: Bom. A Sala 2 te espera. O Mestre da Aproximação é... vago. Não se distraia." },
          ]},
          { events: [
              { type: "faceHero", who: "mentor" },
              { type: "textMessage", text: "Mentor: Comece pela Sala 1, Alice. O Conde está esperando." },
          ]},
        ]
      }),
      // Acesso ao Pátio — só liberado durante a fase 5 (após Bibliófilo).
      // Pátio continua acessível APÓS derrota do Trapaceiro porque é caminho
      // pro Jardim (boss final).
      vazio: new window.Person({
        x: window.utils.withGrid(4),
        y: window.utils.withGrid(2),
        src: "imagens/personagens/vazio.png",
        talking: [
          { required: ["!MAGO_FRACOES_DERROTADO"], events: [
            { type: "textMessage", text: "Alice: Ainda não posso sair. Devia ir até a Biblioteca primeiro." }
          ]},
          // Aviso 5.A — primeira vez indo ao Pátio (Trapaceiro Racional).
          { required: ["MAGO_FRACOES_DERROTADO", "!mago5_aviso"], events: [
            { type: "textMessage", text: "[Vozes do Pátio. Risadas exageradas. Algo desencaixado nelas.]" },
            { type: "textMessage", text: "Aluna (encostada na parede): O Trapaceiro me convenceu de que três vezes dois era cinco." },
            { type: "textMessage", text: "Aluna: E eu ri junto. Eu RI. Como se fosse engraçado." },
            { type: "textMessage", text: "Aluna: Ele faz parecer que regra é piada. Não caia nisso, Alice." },
            { type: "addStoryFlag", flag: "mago5_aviso" },
            { type: "changeMap", map: "Patio", x: window.utils.withGrid(9), y: window.utils.withGrid(17), direction: "up" }
          ]},
          { events: [
            { type: "changeMap", map: "Patio", x: window.utils.withGrid(9), y: window.utils.withGrid(17), direction: "up" }
          ]}
        ]
      }),

      //figurantes (cada um com 1 fala de ambientação fixa)
      figurante1: new window.Person({
        x: window.utils.withGrid(1),
        y: window.utils.withGrid(11),
        src: "imagens/personagens/figurante1.png",
        behaviorLoop: [
          { type: "stand", direction: "right", time: 3200 },
          { type: "stand", direction: "down", time: 800 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluno: Eu vi um número se mexer. Sério. Estava no quadro e... pulou." }] },
        ],
      }),
      figurante2: new window.Person({
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(4),
        src: "imagens/personagens/figurante2.png",
        behaviorLoop: [
          { type: "stand", direction: "left", time: 3200 },
          { type: "stand", direction: "up", time: 800 },
        ],
        talking: [
          { required: ["epilogo_done"], events: [{ type: "textMessage", text: "Aluna: A diretora destrancou o gabinete. A escola voltou ao normal, graças a você." }] },
          { events: [{ type: "textMessage", text: "Aluna: A diretora trancou o gabinete. Ninguém sabe se ela está bem." }] },
        ],
      }),
      figurante3: new window.Person({
        x: window.utils.withGrid(5),
        y: window.utils.withGrid(17),
        src: "imagens/personagens/figurante3.png",
        behaviorLoop: [
          { type: "stand", direction: "right", time: 3200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluno: Tentei contar as vírgulas no quadro da Sala 1. Não consegui chegar ao fim." }] },
        ],
      }),
      figurante4: new window.Person({
        x: window.utils.withGrid(6),
        y: window.utils.withGrid(17),
        src: "imagens/personagens/figurante4.png",
        behaviorLoop: [
          { type: "stand", direction: "left", time: 3200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluna: Na Sala 2 tudo é 'mais ou menos'. Sinto falta do exato." }] },
        ],
      }),
      figurante5: new window.Person({
        x: window.utils.withGrid(4),
        y: window.utils.withGrid(38),
        src: "imagens/personagens/figurante5.png",
        behaviorLoop: [
          { type: "stand", direction: "up", time: 3200 },
          { type: "stand", direction: "right", time: 1200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluno: Eu estava na lista da Sentinela. Acho que eu sumi por um tempo... ainda não me lembro de tudo." }] },
        ],
      }),
      figurante6: new window.Person({
        x: window.utils.withGrid(1),
        y: window.utils.withGrid(3),
        src: "imagens/personagens/figurante6.png",
        behaviorLoop: [
          { type: "stand", direction: "right", time: 3200 },
          { type: "stand", direction: "down", time: 1200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluno: Esse livro daqui... metade tá faltando. Achei o resto rasgado no chão da Biblioteca." }] },
        ],
      }),
      figurante7: new window.Person({
        x: window.utils.withGrid(2),
        y: window.utils.withGrid(4),
        src: "imagens/personagens/figurante7.png",
        behaviorLoop: [
          { type: "stand", direction: "left", time: 3200 },
          { type: "stand", direction: "up", time: 1200 },
          { type: "stand", direction: "right", time: 3200 },
          { type: "stand", direction: "down", time: 1200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluna: O Trapaceiro me convenceu de uma piada que ainda dói. Não caia nas dele." }] },
        ],
      }),
      figurante8: new window.Person({
        x: window.utils.withGrid(6),
        y: window.utils.withGrid(24),
        src: "imagens/personagens/figurante8.png",
        behaviorLoop: [
          { type: "stand", direction: "left", time: 3200 },
          { type: "stand", direction: "up", time: 1200 },
          { type: "stand", direction: "right", time: 3200 },
          { type: "stand", direction: "down", time: 1200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluno: Eu fui até o Jardim. As plantas pararam de crescer. Tudo congelado em 100%." }] },
        ],
      }),
      figurante9: new window.Person({
        x: window.utils.withGrid(6),
        y: window.utils.withGrid(35),
        src: "imagens/personagens/figurante9.png",
        behaviorLoop: [
          { type: "stand", direction: "left", time: 3200 },
          { type: "stand", direction: "up", time: 1200 },
        ],
        talking: [
          { required: ["epilogo_done"], events: [{ type: "textMessage", text: "Aluna: A escola voltou. Você é a Alice, né? Obrigada." }] },
          { events: [{ type: "textMessage", text: "Aluna: Você é a Alice, né? Por favor... a gente precisa de você." }] },
        ],
      }),
      // figurante10 — só fala depois do epílogo (pré-epílogo fica silencioso).
      figurante10: new window.Person({
        x: window.utils.withGrid(3),
        y: window.utils.withGrid(35),
        src: "imagens/personagens/figurante10.png",
        behaviorLoop: [
          { type: "stand", direction: "right", time: 3200 },
          { type: "stand", direction: "down", time: 1200 },
        ],
        talking: [
          { required: ["epilogo_done"], events: [{ type: "textMessage", text: "Aluno: Quer dividir meu lanche? Eu sei calcular as porções agora — graças a você." }] },
        ],
      }),
    },

    cutsceneSpaces: {
      //acesso sala2 — só acessível durante a fase 2 (mago1 derrotado, mago2 não)
      [window.utils.asGridCoord(0,12)]: [
        { required: ["MAGO_APROXIMACAO_DERROTADO"], events: [
          { type: "textMessage", text: "[A porta vibra como uma respiração que finalmente parou. A Sala 2 selou-se.]" }
        ]},
        { required: ["!MAGO_DECIMAIS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: ...ainda não. Eu devia ir até a Sala 1 primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Sala2", x: window.utils.withGrid(15), y: window.utils.withGrid(18), direction: "up" }
        ]}
      ],
      [window.utils.asGridCoord(0,13)]: [
        { required: ["MAGO_APROXIMACAO_DERROTADO"], events: [
          { type: "textMessage", text: "[A porta vibra como uma respiração que finalmente parou. A Sala 2 selou-se.]" }
        ]},
        { required: ["!MAGO_DECIMAIS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: ...ainda não. Eu devia ir até a Sala 1 primeiro." }
        ]},
        { required: ["MAGO_DECIMAIS_DERROTADO", "!mago2_aviso"], events: [
          { type: "textMessage", text: "[O ar perto da Sala 2 parece fora de foco. Tudo lá dentro fica meio aproximado.]" },
          { type: "textMessage", text: "Alice: ...o Mestre da Aproximação me espera." },
          { type: "addStoryFlag", flag: "mago2_aviso" },
        ]},
        { events: [
          { type: "changeMap", map: "Sala2", x: window.utils.withGrid(15), y: window.utils.withGrid(18), direction: "up" }
        ]}
      ],
      [window.utils.asGridCoord(0,14)]: [
        { required: ["MAGO_APROXIMACAO_DERROTADO"], events: [
          { type: "textMessage", text: "[A porta vibra como uma respiração que finalmente parou. A Sala 2 selou-se.]" }
        ]},
        { required: ["!MAGO_DECIMAIS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: ...ainda não. Eu devia ir até a Sala 1 primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Sala2", x: window.utils.withGrid(15), y: window.utils.withGrid(18), direction: "up" }
        ]}
      ],

      //acesso sala1 — bloqueia após derrota; aviso (1ª vez) no tile central
      [window.utils.asGridCoord(9,12)]: [
        { required: ["MAGO_DECIMAIS_DERROTADO"], events: [
          { type: "textMessage", text: "[A porta está fria ao toque. O Conde foi liberto — a Sala 1 selou-se atrás dele.]" }
        ]},
        { events: [
          { type: "changeMap", map: "Sala1", x: window.utils.withGrid(15), y: window.utils.withGrid(18), direction: "up" }
        ]}
      ],
      [window.utils.asGridCoord(9,13)]: [
        { required: ["MAGO_DECIMAIS_DERROTADO"], events: [
          { type: "textMessage", text: "[A porta está fria ao toque. O Conde foi liberto — a Sala 1 selou-se atrás dele.]" }
        ]},
        { required: ["!mago1_aviso"], events: [
          { type: "textMessage", text: "[Vozes baixas vêm de dentro da Sala 1.]" },
          { type: "textMessage", text: "[Você ouve um murmurar contínuo de números... vírgulas, decimais.]" },
          { type: "textMessage", text: "Alice: ...o Conde dos Decimais está lá dentro." },
          { type: "textMessage", text: "Alice: Preciso preparar minha cabeça antes de entrar." },
          { type: "addStoryFlag", flag: "mago1_aviso" },
        ]},
        { events: [
          { type: "changeMap", map: "Sala1", x: window.utils.withGrid(15), y: window.utils.withGrid(18), direction: "up" }
        ]}
      ],
      [window.utils.asGridCoord(9,14)]: [
        { required: ["MAGO_DECIMAIS_DERROTADO"], events: [
          { type: "textMessage", text: "[A porta está fria ao toque. O Conde foi liberto — a Sala 1 selou-se atrás dele.]" }
        ]},
        { events: [
          { type: "changeMap", map: "Sala1", x: window.utils.withGrid(15), y: window.utils.withGrid(18), direction: "up" }
        ]}
      ],

      //acesso gremio — só acessível durante a fase 3 (mago2 derrotado, mago3 não)
      [window.utils.asGridCoord(0,19)]: [
        { required: ["MAGO_PRIMOS_DERROTADO"], events: [
          { type: "textMessage", text: "[O Grêmio está em silêncio. Os papéis pararam de cair. A porta não cede.]" }
        ]},
        { required: ["!MAGO_APROXIMACAO_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Ainda não. Eu devia ir até a Sala 2 primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Gremio", x: window.utils.withGrid(4), y: window.utils.withGrid(8), direction: "up" }
        ]}
      ],
      [window.utils.asGridCoord(0,20)]: [
        { required: ["MAGO_PRIMOS_DERROTADO"], events: [
          { type: "textMessage", text: "[O Grêmio está em silêncio. Os papéis pararam de cair. A porta não cede.]" }
        ]},
        { required: ["!MAGO_APROXIMACAO_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Ainda não. Eu devia ir até a Sala 2 primeiro." }
        ]},
        { required: ["MAGO_APROXIMACAO_DERROTADO", "!mago3_aviso"], events: [
          { type: "textMessage", text: "[Papéis rasgados saem por baixo da porta do Grêmio.]" },
          { type: "textMessage", text: "[Uma voz fria conta números: 'dois, três, cinco...']" },
          { type: "textMessage", text: "Alice: A Sentinela dos Primos. Hora de contar com ela." },
          { type: "addStoryFlag", flag: "mago3_aviso" },
        ]},
        { events: [
          { type: "changeMap", map: "Gremio", x: window.utils.withGrid(4), y: window.utils.withGrid(8), direction: "up" }
        ]}
      ],
      [window.utils.asGridCoord(0,21)]: [
        { required: ["MAGO_PRIMOS_DERROTADO"], events: [
          { type: "textMessage", text: "[O Grêmio está em silêncio. Os papéis pararam de cair. A porta não cede.]" }
        ]},
        { required: ["!MAGO_APROXIMACAO_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Ainda não. Eu devia ir até a Sala 2 primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Gremio", x: window.utils.withGrid(4), y: window.utils.withGrid(8), direction: "up" }
        ]}
      ],

      //acesso sala de estudos
      [window.utils.asGridCoord(9,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "SalaEstudos",
              x: window.utils.withGrid(2),
              y: window.utils.withGrid(4),
              direction: "up"
             }
          ]
        }
      ],
      [window.utils.asGridCoord(9,20)]: [
        {
          events: [
            { type: "changeMap", 
              map: "SalaEstudos",
              x: window.utils.withGrid(2),
              y: window.utils.withGrid(4),
              direction: "up"
             }
          ]
        }
      ],
      [window.utils.asGridCoord(9,21)]: [
        {
          events: [
            { type: "changeMap", 
              map: "SalaEstudos",
              x: window.utils.withGrid(2),
              y: window.utils.withGrid(4),
              direction: "up"
             }
          ]
        }
      ],

      //acesso toalete — trancado durante todo o arco (fora de escopo)
      [window.utils.asGridCoord(0,27)]: [
        { events: [
          { type: "textMessage", text: "[A porta do toalete está trancada por dentro. Alguém ainda se esconde lá.]" }
        ]}
      ],
      [window.utils.asGridCoord(0,28)]: [
        { events: [
          { type: "textMessage", text: "[A porta do toalete está trancada por dentro. Alguém ainda se esconde lá.]" }
        ]}
      ],
      [window.utils.asGridCoord(0,29)]: [
        { events: [
          { type: "textMessage", text: "[A porta do toalete está trancada por dentro. Alguém ainda se esconde lá.]" }
        ]}
      ],

      //acesso biblioteca — só acessível durante a fase 4 (mago3 derrotado, mago4 não)
      [window.utils.asGridCoord(9,27)]: [
        { required: ["MAGO_FRACOES_DERROTADO"], events: [
          { type: "textMessage", text: "[As páginas pararam de voar. A Biblioteca está inteira. A porta não se abre.]" }
        ]},
        { required: ["!MAGO_PRIMOS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Não ainda. Eu devia ir até o Grêmio primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Biblioteca", x: window.utils.withGrid(14), y: window.utils.withGrid(18), direction: "up" }
        ]}
      ],
      [window.utils.asGridCoord(9,28)]: [
        { required: ["MAGO_FRACOES_DERROTADO"], events: [
          { type: "textMessage", text: "[As páginas pararam de voar. A Biblioteca está inteira. A porta não se abre.]" }
        ]},
        { required: ["!MAGO_PRIMOS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Não ainda. Eu devia ir até o Grêmio primeiro." }
        ]},
        { required: ["MAGO_PRIMOS_DERROTADO", "!mago4_aviso"], events: [
          { type: "textMessage", text: "[Páginas voam pela fresta da porta da Biblioteca.]" },
          { type: "textMessage", text: "[Tudo está dividido em pedaços. Nada inteiro sobrevive lá dentro.]" },
          { type: "textMessage", text: "Alice: O Bibliófilo das Frações. Vou recompor o que ele rasgou." },
          { type: "addStoryFlag", flag: "mago4_aviso" },
        ]},
        { events: [
          { type: "changeMap", map: "Biblioteca", x: window.utils.withGrid(14), y: window.utils.withGrid(18), direction: "up" }
        ]}
      ],
      [window.utils.asGridCoord(9,29)]: [
        { required: ["MAGO_FRACOES_DERROTADO"], events: [
          { type: "textMessage", text: "[As páginas pararam de voar. A Biblioteca está inteira. A porta não se abre.]" }
        ]},
        { required: ["!MAGO_PRIMOS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Não ainda. Eu devia ir até o Grêmio primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Biblioteca", x: window.utils.withGrid(14), y: window.utils.withGrid(18), direction: "up" }
        ]}
      ],
    },

    walls:{
      //parede superior
      [window.utils.asGridCoord(1,2)]: true, [window.utils.asGridCoord(2,2)]: true,
      [window.utils.asGridCoord(3,2)]: true, [window.utils.asGridCoord(4,2)]: true,
      [window.utils.asGridCoord(5,2)]: true, [window.utils.asGridCoord(6,2)]: true,
      [window.utils.asGridCoord(7,2)]: true, [window.utils.asGridCoord(8,2)]: true,

      //parede esquerda
      [window.utils.asGridCoord(0,3)]: true, [window.utils.asGridCoord(0,4)]: true,
      [window.utils.asGridCoord(0,5)]: true, [window.utils.asGridCoord(0,6)]: true,
      [window.utils.asGridCoord(0,7)]: true, [window.utils.asGridCoord(0,8)]: true,
      [window.utils.asGridCoord(0,9)]: true, [window.utils.asGridCoord(0,10)]: true,
      [window.utils.asGridCoord(0,11)]: true, [window.utils.asGridCoord(0,15)]: true, 
      [window.utils.asGridCoord(0,16)]: true, [window.utils.asGridCoord(0,17)]: true,
      [window.utils.asGridCoord(0,18)]: true, [window.utils.asGridCoord(0,22)]: true, 
      [window.utils.asGridCoord(0,23)]: true, [window.utils.asGridCoord(0,24)]: true,
      [window.utils.asGridCoord(0,25)]: true, [window.utils.asGridCoord(0,26)]: true,
      [window.utils.asGridCoord(0,30)]: true, [window.utils.asGridCoord(0,31)]: true,
      [window.utils.asGridCoord(0,32)]: true, [window.utils.asGridCoord(0,33)]: true,
      [window.utils.asGridCoord(0,34)]: true, [window.utils.asGridCoord(0,35)]: true,
      [window.utils.asGridCoord(0,36)]: true, [window.utils.asGridCoord(0,37)]: true,
      [window.utils.asGridCoord(0,38)]: true, 
    
      //parede inferior 
      [window.utils.asGridCoord(1,39)]: true, [window.utils.asGridCoord(2,39)]: true,
      [window.utils.asGridCoord(3,39)]: true, [window.utils.asGridCoord(4,39)]: true,
      [window.utils.asGridCoord(5,39)]: true, [window.utils.asGridCoord(6,39)]: true,
      [window.utils.asGridCoord(7,39)]: true, [window.utils.asGridCoord(8,39)]: true,

      //paredes direita
      [window.utils.asGridCoord(9,3)]: true, [window.utils.asGridCoord(9,4)]: true,
      [window.utils.asGridCoord(9,5)]: true, [window.utils.asGridCoord(9,6)]: true,
      [window.utils.asGridCoord(9,7)]: true, [window.utils.asGridCoord(9,8)]: true,
      [window.utils.asGridCoord(9,9)]: true, [window.utils.asGridCoord(9,10)]: true,
      [window.utils.asGridCoord(9,11)]: true, [window.utils.asGridCoord(9,15)]: true, 
      [window.utils.asGridCoord(9,16)]: true, [window.utils.asGridCoord(9,17)]: true,
      [window.utils.asGridCoord(9,18)]: true, [window.utils.asGridCoord(9,22)]: true, 
      [window.utils.asGridCoord(9,23)]: true, [window.utils.asGridCoord(9,24)]: true,
      [window.utils.asGridCoord(9,25)]: true, [window.utils.asGridCoord(9,26)]: true,
      [window.utils.asGridCoord(9,30)]: true, [window.utils.asGridCoord(9,31)]: true,
      [window.utils.asGridCoord(9,32)]: true, [window.utils.asGridCoord(9,33)]: true,
      [window.utils.asGridCoord(9,34)]: true, [window.utils.asGridCoord(9,35)]: true,
      [window.utils.asGridCoord(9,36)]: true, [window.utils.asGridCoord(9,37)]: true,
      [window.utils.asGridCoord(9,38)]: true, 

      //armários
      [window.utils.asGridCoord(1,8)]: true, [window.utils.asGridCoord(1,9)]: true, [window.utils.asGridCoord(1,10)]: true, 
      [window.utils.asGridCoord(8,6)]: true, [window.utils.asGridCoord(8,7)]: true, [window.utils.asGridCoord(8,8)]: true, 

      [window.utils.asGridCoord(1,15)]: true, [window.utils.asGridCoord(1,16)]: true, [window.utils.asGridCoord(1,17)]: true,
      [window.utils.asGridCoord(8,16)]: true, [window.utils.asGridCoord(8,17)]: true, [window.utils.asGridCoord(8,18)]: true,

      [window.utils.asGridCoord(1,24)]: true, [window.utils.asGridCoord(1,25)]: true, [window.utils.asGridCoord(1,26)]: true, 
      [window.utils.asGridCoord(8,23)]: true, [window.utils.asGridCoord(8,24)]: true, [window.utils.asGridCoord(8,25)]: true, 

      [window.utils.asGridCoord(1,33)]: true, [window.utils.asGridCoord(1,34)]: true, [window.utils.asGridCoord(1,35)]: true,
      [window.utils.asGridCoord(8,30)]: true, [window.utils.asGridCoord(8,31)]: true, [window.utils.asGridCoord(8,32)]: true,

      //maquininha de refris
      [window.utils.asGridCoord(6,3)]: true, [window.utils.asGridCoord(7,3)]: true,
    },
    // entryCutscene é array de cenas — a PRIMEIRA cujo `required` satisfaz roda.
    // Ordem: epílogo > transição 1 > intro (mais específico antes do genérico).
    entryCutscene: [
      // Boss revelado + Epílogo — primeira volta ao Corredor após derrota do 6º mago.
      // A revelação do Sombrio acontece aqui (não no Jardim) porque FaseRunner
      // sempre manda o jogador de volta ao Corredor.
      {
        required: ["MAGO_PORCENTAGEM_DERROTADO", "!epilogo_done"],
        events: [
          { type: "stand", who: "hero", direction: "down", time: 400 },
          { type: "textMessage", text: "[Um vento frio percorre o Corredor. As luzes piscam uma vez. Duas. Param.]" },
          { type: "textMessage", text: "[Uma voz vem de todas as direções ao mesmo tempo.]" },
          { type: "textMessage", text: "Sombrio: Impressionante, Alice. Não acreditei quando soube que você ainda pensava." },
          { type: "textMessage", text: "Sombrio: Vinte anos. Vinte anos esta escola me esqueceu." },
          { type: "textMessage", text: "Sombrio: Eu organizei tudo, sabe? Cada nota. Cada matrícula. Cada nome." },
          { type: "textMessage", text: "Sombrio: E quando me aposentaram... apagaram o meu nome também." },
          { type: "textMessage", text: "Alice: Você usou meus colegas. Eles eram só ferramentas pra você." },
          { type: "textMessage", text: "Sombrio: Eles eram instrumentos. Eu sou o regente." },
          { type: "textMessage", text: "Sombrio: Mas você... você sabe somar, dividir, fracionar. Você lembra." },
          { type: "textMessage", text: "Sombrio: Por isso, hoje, eu te deixo viver. Nos vemos no próximo colégio, Alice." },
          { type: "textMessage", text: "[A voz se dissolve. O Corredor volta a respirar.]" },
          { type: "addStoryFlag", flag: "boss_revelado" },
          // Mentor caminha até Alice (de (4,8) até (4,6), parando 1 tile abaixo dela).
          { type: "walk", who: "mentor", direction: "up" },
          { type: "walk", who: "mentor", direction: "up" },
          { type: "stand", who: "mentor", direction: "up", time: 300 },
          { type: "textMessage", text: "Mentor: Você conseguiu, Alice. A escola respira de novo." },
          { type: "textMessage", text: "[Pelos cantos do Corredor, alunos voltam a circular. O Conde acena de longe. O Bibliófilo abraça um livro inteiro.]" },
          { type: "textMessage", text: "Alice: Ele vai voltar?" },
          { type: "textMessage", text: "Mentor: Provavelmente. Esquecimento é um feitiço difícil de quebrar de vez." },
          { type: "textMessage", text: "Mentor: Mas hoje, ele deixou uma prova: ser apagado não dá direito a apagar os outros." },
          { type: "textMessage", text: "Mentor: Há outros colégios, Alice. Outras escolas com magos. Você só começou." },
          // Mentor recua pra posição original (4,8)
          { type: "walk", who: "mentor", direction: "down" },
          { type: "walk", who: "mentor", direction: "down" },
          { type: "stand", who: "mentor", direction: "up", time: 200 },
          { type: "addStoryFlag", flag: "epilogo_done" },
          // Encerramento — popup com escolha de voltar ao menu ou ficar.
          { type: "endGame" },
        ]
      },
      // Transição 1 — após 3 magos derrotados (revelação do Sombrio)
      {
        required: ["MAGO_PRIMOS_DERROTADO", "!metade_caminho_done"],
        events: [
          { type: "stand", who: "hero", direction: "down", time: 400 },
          // Mentor caminha até Alice (de (4,8) até (4,6), parando 1 abaixo).
          { type: "walk", who: "mentor", direction: "up" },
          { type: "walk", who: "mentor", direction: "up" },
          { type: "stand", who: "mentor", direction: "up", time: 300 },
          { type: "textMessage", text: "Mentor: Três magos. Três colegas libertos." },
          { type: "textMessage", text: "Mentor: Você é mais forte do que eu esperava, Alice. Por isso preciso ser honesto com você." },
          { type: "textMessage", text: "Alice: Sobre quem está por trás disso?" },
          { type: "textMessage", text: "Mentor: O nome dele saiu dos registros há vinte anos. A escola tentou esquecer." },
          { type: "textMessage", text: "Mentor: Ele era vice-diretor. Adorava ordem. Listas. Hierarquia." },
          { type: "textMessage", text: "Mentor: Quando o aposentaram contra a vontade... ele descobriu algo na biblioteca." },
          { type: "textMessage", text: "Mentor: Um livro que esta escola devia ter queimado." },
          { type: "textMessage", text: "Alice: Por que ele está fazendo isso? Vinte anos depois?" },
          { type: "textMessage", text: "Mentor: Porque magia da raiva não envelhece. Só amadurece." },
          { type: "textMessage", text: "Mentor: Os próximos magos vão sentir o cheiro dele em você. Cuidado redobrado." },
          // Mentor recua pra posição original (4,8)
          { type: "walk", who: "mentor", direction: "down" },
          { type: "walk", who: "mentor", direction: "down" },
          { type: "stand", who: "mentor", direction: "up", time: 200 },
          { type: "addStoryFlag", flag: "metade_caminho_done" },
        ]
      },
      // Intro — primeiro boot do save. Mentor caminha até Alice, conversa,
      // e depois recua pra sua posição habitual no centro do Corredor.
      {
        required: ["!intro_done"],
        events: [
          { type: "stand", who: "hero", direction: "down", time: 400 },
          { type: "textMessage", text: "Alice: ...onde estão todos?" },
          { type: "textMessage", text: "[Passos lentos ecoam no Corredor. Alguém se aproxima.]" },
          // Mentor caminha 4 tiles pra cima: (4,8) → (4,4), parando abaixo de Alice
          { type: "walk", who: "mentor", direction: "up" },
          { type: "walk", who: "mentor", direction: "up" },
          { type: "walk", who: "mentor", direction: "up" },
          { type: "walk", who: "mentor", direction: "up" },
          { type: "stand", who: "mentor", direction: "up", time: 300 },
          { type: "textMessage", text: "Mentor: Alice. Que bom que você acordou." },
          { type: "textMessage", text: "Mentor: Você dormiu na biblioteca. Quando despertou, a escola não era mais a mesma." },
          { type: "textMessage", text: "Alice: O que aconteceu?" },
          { type: "textMessage", text: "Mentor: Seis colegas — alunos, professores — foram tomados por uma magia antiga." },
          { type: "textMessage", text: "Mentor: Cada um se trancou numa sala, dominado por um conceito que amava em vida." },
          { type: "textMessage", text: "Mentor: Você é a única que ainda pensa com clareza. Sabe o que isso significa?" },
          { type: "textMessage", text: "Alice: ...que sou a única que pode trazê-los de volta." },
          { type: "textMessage", text: "Mentor: Exatamente. E precisa começar agora, antes que o feitiço se aprofunde." },
          { type: "textMessage", text: "Mentor: Vá pela Sala 1. O Conde dos Decimais já sente o cheiro de quem ainda pensa." },
          { type: "textMessage", text: "Mentor: Use as setas pra andar. Encoste em alguém e aperte Enter pra falar." },
          { type: "textMessage", text: "Mentor: Quando os seis estiverem livres, volte aqui. Há algo maior por trás de tudo isso." },
          { type: "textMessage", text: "Alice: Algo maior?" },
          { type: "textMessage", text: "Mentor: A tempo. Vá, Alice. Cada minuto a mais aqui é um aluno a menos lá dentro." },
          // Mentor recua 4 tiles pra sua posição
          { type: "walk", who: "mentor", direction: "down" },
          { type: "walk", who: "mentor", direction: "down" },
          { type: "walk", who: "mentor", direction: "down" },
          { type: "walk", who: "mentor", direction: "down" },
          { type: "stand", who: "mentor", direction: "up", time: 200 },
          { type: "addStoryFlag", flag: "intro_done" },
        ]
      },
    ]
  },
  Jardim: {
    id: "Jardim",
    lowerSrc: "imagens/mapas/jardim.png",
    upperSrc: "imagens/mapas/jardimUpper.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(14),
        y: window.utils.withGrid(7),
        src: "imagens/personagens/alice.png",
      }),
      p3: new window.Person({
        x: window.utils.withGrid(12),
        y: window.utils.withGrid(7),
        src: "imagens/personagens/p3.png",
        talking: [
          { required: ["MAGO_PORCENTAGEM_DERROTADO"], events: [
            { type: "textMessage", text: "Sobrevivente: Você foi a fração que ele não previu. Eu acho que vou conseguir voltar pra casa." },
          ]},
          { events: [
            { type: "textMessage", text: "Sobrevivente: Ele... ele falou que 100% dos que entrassem viraria adubo." },
            { type: "textMessage", text: "Sobrevivente: Por favor, Alice, não vire mais um número na estatística dele." },
          ]},
        ]
      }),
      // Mestre das Porcentagens — NPC visível no Jardim (boss final).
      mago: new window.Person({
        x: window.utils.withGrid(5),
        y: window.utils.withGrid(6),
        direction: "down",
        src: "imagens/personagens/vilao7.png",
        talking: [
          // Pós-luta — Mestre lúcido
          { required: ["MAGO_PORCENTAGEM_DERROTADO"], events: [
            { type: "textMessage", text: "Mestre: Você... é a exceção. 100% da minha confiança. Eu estava errado." },
            { type: "textMessage", text: "Mestre: O Sombrio se foi. Mas ele deixou marcas." },
            { type: "textMessage", text: "Mestre: Eu fui coordenador. Eu ordenava as listas, os horários, as filas." },
            { type: "textMessage", text: "Mestre: O Sombrio me ofereceu hierarquia eterna. Eu aceitei sem pensar." },
            { type: "textMessage", text: "Mestre: Volte ao Corredor. A escola te espera." },
          ]},
          // Pré-luta — provocação + inicia fase
          { events: [
            { type: "textMessage", text: "Mestre: 100% dos que entraram neste jardim... 100% foram aniquilados." },
            { type: "textMessage", text: "Mestre: A estatística é minha amiga. A história, minha aliada." },
            { type: "textMessage", text: "Mestre: Você é a sexta. As cinco anteriores eu transformei em adubo." },
            { type: "textMessage", text: "Mestre: Mas... talvez você seja diferente. 16,67% de chance, eu calculei." },
            { type: "textMessage", text: "Mestre: Prove-me. Domine a parte e dominará o todo." },
            { type: "startFase", codigo: "jardim_porcentagem" },
          ]},
        ]
      }),
      figurante1: new window.Person({
        x: window.utils.withGrid(6),
        y: window.utils.withGrid(4),
        src: "imagens/personagens/figurante6.png",
        behaviorLoop: [
          { type: "stand",  direction: "down", time: 3200 },
        ],
      }),
      figurante2: new window.Person({
        x: window.utils.withGrid(7),
        y: window.utils.withGrid(4),
        src: "imagens/personagens/figurante7.png",
        behaviorLoop: [
          { type: "stand",  direction: "down", time: 3200 },
        ],
      }),
      // ROTEIRO posiciona figurante8.png no Jardim com a linha sobre as plantas.
      figurante3: new window.Person({
        x: window.utils.withGrid(3),
        y: window.utils.withGrid(8),
        src: "imagens/personagens/figurante8.png",
        behaviorLoop: [
          { type: "stand", direction: "right", time: 3200 },
          { type: "stand", direction: "down", time: 1200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluno: Eu não sei como cheguei aqui. As plantas pararam." }] },
        ],
      }),
    },

    walls: {
      //limite de mapa superior
      [window.utils.asGridCoord(1,-1)]: true, [window.utils.asGridCoord(2,-1)]: true,
      [window.utils.asGridCoord(3,-1)]: true, [window.utils.asGridCoord(4,-1)]: true,
      [window.utils.asGridCoord(5,-1)]: true, [window.utils.asGridCoord(6,-1)]: true,
      [window.utils.asGridCoord(7,-1)]: true, [window.utils.asGridCoord(8,-1)]: true,
      [window.utils.asGridCoord(9,-1)]: true, [window.utils.asGridCoord(10,-1)]: true,
      [window.utils.asGridCoord(11,-1)]: true, [window.utils.asGridCoord(12,-1)]: true,
      [window.utils.asGridCoord(13,-1)]: true, [window.utils.asGridCoord(14,-1)]: true,
      [window.utils.asGridCoord(0,-1)]: true, [window.utils.asGridCoord(15,-1)]: true,

      //limite de mapa inferior
      [window.utils.asGridCoord(1,16)]: true, [window.utils.asGridCoord(2,16)]: true,
      [window.utils.asGridCoord(3,16)]: true, [window.utils.asGridCoord(4,16)]: true,
      [window.utils.asGridCoord(5,16)]: true, [window.utils.asGridCoord(6,16)]: true,
      [window.utils.asGridCoord(7,16)]: true, [window.utils.asGridCoord(8,16)]: true,
      [window.utils.asGridCoord(9,16)]: true, [window.utils.asGridCoord(10,16)]: true,
      [window.utils.asGridCoord(11,16)]: true, [window.utils.asGridCoord(12,16)]: true,
      [window.utils.asGridCoord(13,16)]: true, [window.utils.asGridCoord(14,16)]: true,
      [window.utils.asGridCoord(0,16)]: true, [window.utils.asGridCoord(15,16)]: true,

      //limite de mapa esquerda
      [window.utils.asGridCoord(-1,0)]: true, [window.utils.asGridCoord(-1,1)]: true,
      [window.utils.asGridCoord(-1,2)]: true, [window.utils.asGridCoord(-1,3)]: true,
      [window.utils.asGridCoord(-1,4)]: true, [window.utils.asGridCoord(-1,5)]: true,
      [window.utils.asGridCoord(-1,6)]: true, [window.utils.asGridCoord(-1,7)]: true,
      [window.utils.asGridCoord(-1,8)]: true, [window.utils.asGridCoord(-1,9)]: true,
      [window.utils.asGridCoord(-1,10)]: true, [window.utils.asGridCoord(-1,11)]: true,
      [window.utils.asGridCoord(-1,12)]: true, [window.utils.asGridCoord(-1,13)]: true,
      [window.utils.asGridCoord(-1,14)]: true, [window.utils.asGridCoord(-1,15)]: true,

      //limite de mapa direita
      [window.utils.asGridCoord(16,0)]: true, [window.utils.asGridCoord(16,1)]: true,
      [window.utils.asGridCoord(16,2)]: true, [window.utils.asGridCoord(16,3)]: true,
      [window.utils.asGridCoord(16,4)]: true, [window.utils.asGridCoord(16,5)]: true,
      [window.utils.asGridCoord(16,6)]: true, [window.utils.asGridCoord(16,7)]: true,
      [window.utils.asGridCoord(16,8)]: true, [window.utils.asGridCoord(16,9)]: true,
      [window.utils.asGridCoord(16,10)]: true, [window.utils.asGridCoord(16,11)]: true,
      [window.utils.asGridCoord(16,12)]: true, [window.utils.asGridCoord(16,13)]: true,
      [window.utils.asGridCoord(16,14)]: true, [window.utils.asGridCoord(16,15)]: true,

      //árvore (canto superior direito — copa ocupa 3x3, tronco no centro)
      [window.utils.asGridCoord(10,3)]: true, [window.utils.asGridCoord(11,3)]: true, [window.utils.asGridCoord(12,3)]: true,
      [window.utils.asGridCoord(10,4)]: true, [window.utils.asGridCoord(11,4)]: true, [window.utils.asGridCoord(12,4)]: true,
      [window.utils.asGridCoord(11,5)]: true,

      //poste com placa "GINÁSIO" (canto superior esquerdo)
      [window.utils.asGridCoord(1,1)]: true,
      [window.utils.asGridCoord(1,3)]: true, [window.utils.asGridCoord(1,4)]: true,

      //banco abaixo da placa
      [window.utils.asGridCoord(2,3)]: true, [window.utils.asGridCoord(3,3)]: true,
    },
    cutsceneSpaces: {
      [window.utils.asGridCoord(15,7)]: [
        {
          events: [
            { type: "changeMap", map: "Patio" }
          ]
        }
      ],
      [window.utils.asGridCoord(15,8)]: [
        {
          events: [
            { type: "changeMap", map: "Patio" }
          ]
        }
      ],
    },
    // Aviso 6.A — primeira entrada no Jardim, antes do Mestre das Porcentagens.
    entryCutscene: [
      {
        required: ["!mago6_aviso", "!MAGO_PORCENTAGEM_DERROTADO"],
        events: [
          { type: "stand", who: "hero", direction: "left", time: 400 },
          { type: "textMessage", text: "[O Jardim está enevoado. As plantas estão imóveis, como se congeladas no tempo.]" },
          { type: "textMessage", text: "Alice: ...as plantas. Elas não se mexem." },
          { type: "textMessage", text: "Alice: É como se 100% delas tivessem parado de existir ao mesmo tempo." },
          { type: "addStoryFlag", flag: "mago6_aviso" },
        ]
      }
    ]
  },
  Sala2: {
    id: "Sala2",
    lowerSrc: "imagens/mapas/sala1.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(15),
        y: window.utils.withGrid(18),
        src: "imagens/personagens/alice.png",
      }),
      // Mestre da Aproximação — NPC visível na Sala 2.
      mago: new window.Person({
        x: window.utils.withGrid(15),
        y: window.utils.withGrid(6),
        direction: "down",
        src: "imagens/personagens/vilao3.png",
        talking: [
          // Pós-luta — Mestre lúcido
          { required: ["MAGO_APROXIMACAO_DERROTADO"], events: [
            { type: "textMessage", text: "Mestre: Eu via tudo borrado. Tudo 'mais ou menos'. E achava bom assim." },
            { type: "textMessage", text: "Mestre: Mas precisão importa, não importa? Saber onde está o número exato... é saber onde você está." },
            { type: "textMessage", text: "Mestre: O Sombrio me ofereceu o conforto da imprecisão. Eu aceitei." },
            { type: "textMessage", text: "Alice: Conforto?" },
            { type: "textMessage", text: "Mestre: Quem nunca tenta acertar... nunca erra. Mas também nunca chega a lugar nenhum." },
          ]},
          // Pré-luta — provocação + inicia fase
          { events: [
            { type: "textMessage", text: "Mestre: Aproximadamente... uma intrusa. Mais ou menos uma ameaça." },
            { type: "textMessage", text: "Mestre: Por que se importar com a casa do meio? Com a casa exata?" },
            { type: "textMessage", text: "Mestre: O suficiente sempre foi suficiente. Por que insistir em ser preciso?" },
            { type: "textMessage", text: "Mestre: Mostre-me que sabe arredondar... antes que eu te arredonde pra fora daqui." },
            { type: "startFase", codigo: "sala2_aproximacao" },
          ]},
        ]
      }),
      // Figurante 4 — aluna trancada na Sala 2 (linha do ROTEIRO).
      figurante4: new window.Person({
        x: window.utils.withGrid(5),
        y: window.utils.withGrid(15),
        src: "imagens/personagens/figurante4.png",
        behaviorLoop: [
          { type: "stand", direction: "right", time: 3200 },
          { type: "stand", direction: "up", time: 1200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluna: Tudo aqui é 'mais ou menos'. Sinto falta do exato." }] },
        ],
      }),
    },
    walls: {
      //parede de cima
      [window.utils.asGridCoord(1,4)]: true, [window.utils.asGridCoord(2,4)]: true,
      [window.utils.asGridCoord(3,4)]: true, [window.utils.asGridCoord(4,4)]: true,
      [window.utils.asGridCoord(5,4)]: true, [window.utils.asGridCoord(6,4)]: true,
      [window.utils.asGridCoord(7,4)]: true, [window.utils.asGridCoord(8,4)]: true,
      [window.utils.asGridCoord(9,4)]: true, [window.utils.asGridCoord(10,4)]: true,
      [window.utils.asGridCoord(11,4)]: true, [window.utils.asGridCoord(12,4)]: true,
      [window.utils.asGridCoord(13,4)]: true, [window.utils.asGridCoord(14,4)]: true,
      [window.utils.asGridCoord(15,4)]: true, [window.utils.asGridCoord(16,4)]: true,
      [window.utils.asGridCoord(17,4)]: true, [window.utils.asGridCoord(18,4)]: true,
      [window.utils.asGridCoord(19,4)]: true, [window.utils.asGridCoord(20,4)]: true,
      [window.utils.asGridCoord(21,4)]: true, [window.utils.asGridCoord(22,4)]: true,
      [window.utils.asGridCoord(23,4)]: true, [window.utils.asGridCoord(24,4)]: true,
      [window.utils.asGridCoord(25,4)]: true, [window.utils.asGridCoord(26,4)]: true,
      [window.utils.asGridCoord(27,4)]: true, [window.utils.asGridCoord(28,4)]: true,

      //parede esquerda
      [window.utils.asGridCoord(0,5)]: true, [window.utils.asGridCoord(0,6)]: true,
      [window.utils.asGridCoord(1,7)]: true, [window.utils.asGridCoord(1,8)]: true,
      [window.utils.asGridCoord(1,9)]: true, [window.utils.asGridCoord(0,10)]: true,
      [window.utils.asGridCoord(0,11)]: true, [window.utils.asGridCoord(1,12)]: true,
      [window.utils.asGridCoord(1,13)]: true, [window.utils.asGridCoord(1,14)]: true,
      [window.utils.asGridCoord(0,15)]: true, [window.utils.asGridCoord(1 ,16)]: true,
      [window.utils.asGridCoord(1,17)]: true, [window.utils.asGridCoord(1,18)]: true,

      //parede direita
      [window.utils.asGridCoord(29,5)]: true, [window.utils.asGridCoord(29,6)]: true,
      [window.utils.asGridCoord(29,7)]: true, [window.utils.asGridCoord(29,8)]: true,
      [window.utils.asGridCoord(29,9)]: true, [window.utils.asGridCoord(29,10)]: true,
      [window.utils.asGridCoord(29,11)]: true, [window.utils.asGridCoord(29,12)]: true,
      [window.utils.asGridCoord(29,13)]: true, [window.utils.asGridCoord(29,14)]: true,
      [window.utils.asGridCoord(29,15)]: true, [window.utils.asGridCoord(29,16)]: true,
      [window.utils.asGridCoord(29,17)]: true, [window.utils.asGridCoord(29,18)]: true,

      //parede inferior
      [window.utils.asGridCoord(1,19)]: true, [window.utils.asGridCoord(2,19)]: true,
      [window.utils.asGridCoord(3,19)]: true, [window.utils.asGridCoord(4,19)]: true,
      [window.utils.asGridCoord(5,19)]: true, [window.utils.asGridCoord(6,19)]: true,
      [window.utils.asGridCoord(7,19)]: true, [window.utils.asGridCoord(8,19)]: true,
      [window.utils.asGridCoord(9,19)]: true, [window.utils.asGridCoord(10,19)]: true,
      [window.utils.asGridCoord(11,19)]: true, [window.utils.asGridCoord(12,19)]: true,
      [window.utils.asGridCoord(17,19)]: true, [window.utils.asGridCoord(18,19)]: true,
      [window.utils.asGridCoord(19,19)]: true, [window.utils.asGridCoord(20,19)]: true,
      [window.utils.asGridCoord(21,19)]: true, [window.utils.asGridCoord(22,19)]: true,
      [window.utils.asGridCoord(23,19)]: true, [window.utils.asGridCoord(24,19)]: true,
      [window.utils.asGridCoord(25,19)]: true, [window.utils.asGridCoord(26,19)]: true,
      [window.utils.asGridCoord(27,19)]: true, [window.utils.asGridCoord(28,19)]: true,

      // carteiras (mesas em pares) — 3 fileiras. x=15 livre pra Alice chegar
      // ao mago em (15,6). Mesas em x=13,14 e 19,20 deixam o vão central.
      [window.utils.asGridCoord(3,6)]:  true, [window.utils.asGridCoord(4,6)]:  true,
      [window.utils.asGridCoord(8,6)]:  true, [window.utils.asGridCoord(9,6)]:  true,
      [window.utils.asGridCoord(13,6)]: true, [window.utils.asGridCoord(14,6)]: true,
      [window.utils.asGridCoord(19,6)]: true, [window.utils.asGridCoord(20,6)]: true,
      [window.utils.asGridCoord(25,6)]: true, [window.utils.asGridCoord(26,6)]: true,

      [window.utils.asGridCoord(3,10)]:  true, [window.utils.asGridCoord(4,10)]:  true,
      [window.utils.asGridCoord(8,10)]:  true, [window.utils.asGridCoord(9,10)]:  true,
      [window.utils.asGridCoord(13,10)]: true, [window.utils.asGridCoord(14,10)]: true,
      [window.utils.asGridCoord(19,10)]: true, [window.utils.asGridCoord(20,10)]: true,
      [window.utils.asGridCoord(25,10)]: true, [window.utils.asGridCoord(26,10)]: true,

      [window.utils.asGridCoord(3,13)]:  true, [window.utils.asGridCoord(4,13)]:  true,
      [window.utils.asGridCoord(8,13)]:  true, [window.utils.asGridCoord(9,13)]:  true,
      [window.utils.asGridCoord(13,13)]: true, [window.utils.asGridCoord(14,13)]: true,
      [window.utils.asGridCoord(19,13)]: true, [window.utils.asGridCoord(20,13)]: true,
      [window.utils.asGridCoord(25,13)]: true, [window.utils.asGridCoord(26,13)]: true,
    },
    cutsceneSpaces: {
      //acesso sala2
      [window.utils.asGridCoord(13,19)]: [
        {
          events: [
             { type: "changeMap",  
              map: "Corredor",
              x: window.utils.withGrid(1),
              y: window.utils.withGrid(13),
              direction: "right"
            }
          ]
        }
      ],
      [window.utils.asGridCoord(14,19)]: [
        {
          events: [
             { type: "changeMap",  
              map: "Corredor",
              x: window.utils.withGrid(1),
              y: window.utils.withGrid(13),
              direction: "right"
            }
          ]
        }
      ],
      [window.utils.asGridCoord(15,19)]: [
        {
          events: [
             { type: "changeMap",  
              map: "Corredor",
              x: window.utils.withGrid(1),
              y: window.utils.withGrid(13),
              direction: "right"
            }
          ]
        }
      ],
      [window.utils.asGridCoord(16,19)]: [
        {
          events: [
            { type: "changeMap",  
              map: "Corredor",
              x: window.utils.withGrid(1),
              y: window.utils.withGrid(13),
              direction: "right"
            }
          ]
        }
      ],
    }
  },
  Sala1: {
    id: "Sala1",
    lowerSrc: "imagens/mapas/sala2.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(15),
        y: window.utils.withGrid(18),
        src: "imagens/personagens/alice.png",
      }),
      p4: new window.Person({
        x: window.utils.withGrid(11),
        y: window.utils.withGrid(5),
        src: "imagens/personagens/p4.png",
        talking: [
          { required: ["MAGO_DECIMAIS_DERROTADO"], events: [
            { type: "textMessage", text: "Aluno: Você apagou as vírgulas dele do meu nome. Eu consigo respirar de novo. Obrigado." },
          ]},
          { events: [
            { type: "textMessage", text: "Aluno: Eu... eu tava na chamada quando o Conde veio." },
            { type: "textMessage", text: "Aluno: Ele anotou meu nome com a vírgula no lugar errado. Salva a gente, Alice." },
          ]},
        ]
      }),
      // Figurante 3 — aluno trancado na Sala 1 (linha do ROTEIRO 1.A/figurantes).
      figurante3: new window.Person({
        x: window.utils.withGrid(5),
        y: window.utils.withGrid(7),
        src: "imagens/personagens/figurante3.png",
        behaviorLoop: [
          { type: "stand", direction: "right", time: 3200 },
          { type: "stand", direction: "down", time: 1200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluno: Já tentei contar as vírgulas no quadro. Não consegui chegar ao fim." }] },
        ],
      }),
      // Conde dos Decimais — NPC visível na Sala 1.
      // Sprite trocado pra _derrotado.png via Overworld._applyVilaoSprites quando flag setada.
      mago: new window.Person({
        x: window.utils.withGrid(15),
        y: window.utils.withGrid(14),
        direction: "down",
        src: "imagens/personagens/vilao2.png",
        talking: [
          // Pós-luta — Conde lúcido
          { required: ["MAGO_DECIMAIS_DERROTADO"], events: [
            { type: "textMessage", text: "Conde: ...obrigado. Eu já não me lembrava do meu próprio nome." },
            { type: "textMessage", text: "Conde: Quando o Mago Sombrio me tocou, tudo virou número. Eu só via vírgulas." },
            { type: "textMessage", text: "Conde: Cada aluno que entrava nesta sala... eu queria apagar." },
            { type: "textMessage", text: "Alice: Quem é o Mago Sombrio?" },
            { type: "textMessage", text: "Conde: Alguém que esta escola esqueceu. E que não esquece. Cuide-se." },
          ]},
          // Pré-luta — provocação + inicia fase
          { events: [
            { type: "textMessage", text: "Conde: ...zero vírgula zero zero zero... um... cinco..." },
            { type: "textMessage", text: "Conde: Ah. Uma intrusa." },
            { type: "textMessage", text: "Conde: Você acha que sabe contar? Que conhece o valor de cada algarismo?" },
            { type: "textMessage", text: "Conde: Mostre-me. Erre uma única vírgula, e eu te apago do quadro." },
            { type: "startFase", codigo: "sala1_decimais" },
          ]},
        ]
      }),
    },
    walls: {
      //parede de cima
      [window.utils.asGridCoord(1,3)]: true, [window.utils.asGridCoord(2,3)]: true,
      [window.utils.asGridCoord(3,3)]: true, [window.utils.asGridCoord(4,3)]: true,
      [window.utils.asGridCoord(5,3)]: true, [window.utils.asGridCoord(6,3)]: true,
      [window.utils.asGridCoord(7,3)]: true, [window.utils.asGridCoord(8,3)]: true,
      [window.utils.asGridCoord(9,3)]: true, [window.utils.asGridCoord(10,3)]: true,
      [window.utils.asGridCoord(11,3)]: true, [window.utils.asGridCoord(12,3)]: true,
      [window.utils.asGridCoord(13,3)]: true, [window.utils.asGridCoord(14,3)]: true,
      [window.utils.asGridCoord(15,3)]: true, [window.utils.asGridCoord(16,3)]: true,
      [window.utils.asGridCoord(17,3)]: true, [window.utils.asGridCoord(18,3)]: true,
      [window.utils.asGridCoord(19,3)]: true, [window.utils.asGridCoord(20,3)]: true,
      [window.utils.asGridCoord(21,3)]: true, [window.utils.asGridCoord(22,3)]: true,
      [window.utils.asGridCoord(23,3)]: true, [window.utils.asGridCoord(24,3)]: true,
      [window.utils.asGridCoord(25,3)]: true, [window.utils.asGridCoord(26,3)]: true,
      [window.utils.asGridCoord(27,3)]: true, [window.utils.asGridCoord(28,3)]: true,

      //parede esquerda
      [window.utils.asGridCoord(0,4)]: true,
      [window.utils.asGridCoord(0,5)]: true, [window.utils.asGridCoord(0,6)]: true,
      [window.utils.asGridCoord(0,7)]: true, [window.utils.asGridCoord(0,8)]: true,
      [window.utils.asGridCoord(0,9)]: true, [window.utils.asGridCoord(0,10)]: true,
      [window.utils.asGridCoord(0,11)]: true, [window.utils.asGridCoord(0,12)]: true,
      [window.utils.asGridCoord(0,13)]: true, [window.utils.asGridCoord(0,14)]: true,
      [window.utils.asGridCoord(0,15)]: true, [window.utils.asGridCoord(0,16)]: true,
      [window.utils.asGridCoord(0,17)]: true, [window.utils.asGridCoord(0,18)]: true,

      //parede direita
      [window.utils.asGridCoord(29,4)]: true,
      [window.utils.asGridCoord(29,5)]: true, [window.utils.asGridCoord(29,6)]: true,
      [window.utils.asGridCoord(29,7)]: true, [window.utils.asGridCoord(29,8)]: true,
      [window.utils.asGridCoord(29,9)]: true, [window.utils.asGridCoord(29,10)]: true,
      [window.utils.asGridCoord(29,11)]: true, [window.utils.asGridCoord(29,12)]: true,
      [window.utils.asGridCoord(29,13)]: true, [window.utils.asGridCoord(29,14)]: true,
      [window.utils.asGridCoord(29,15)]: true, [window.utils.asGridCoord(29,16)]: true,
      [window.utils.asGridCoord(29,17)]: true, [window.utils.asGridCoord(29,18)]: true,

      //parede inferior
      [window.utils.asGridCoord(1,19)]: true, [window.utils.asGridCoord(2,19)]: true,
      [window.utils.asGridCoord(3,19)]: true, [window.utils.asGridCoord(4,19)]: true,
      [window.utils.asGridCoord(5,19)]: true, [window.utils.asGridCoord(6,19)]: true,
      [window.utils.asGridCoord(7,19)]: true, [window.utils.asGridCoord(8,19)]: true,
      [window.utils.asGridCoord(9,19)]: true, [window.utils.asGridCoord(10,19)]: true,
      [window.utils.asGridCoord(11,19)]: true, [window.utils.asGridCoord(12,19)]: true,
      [window.utils.asGridCoord(17,19)]: true, [window.utils.asGridCoord(18,19)]: true,
      [window.utils.asGridCoord(19,19)]: true, [window.utils.asGridCoord(20,19)]: true,
      [window.utils.asGridCoord(21,19)]: true, [window.utils.asGridCoord(22,19)]: true,
      [window.utils.asGridCoord(23,19)]: true, [window.utils.asGridCoord(24,19)]: true,
      [window.utils.asGridCoord(25,19)]: true, [window.utils.asGridCoord(26,19)]: true,
      [window.utils.asGridCoord(27,19)]: true, [window.utils.asGridCoord(28,19)]: true,

      // carteiras (mesas em pares) — 3 fileiras. Caminho central x=15 fica
      // livre pra Alice chegar até o mago em (15,14).
      [window.utils.asGridCoord(3,6)]:  true, [window.utils.asGridCoord(4,6)]:  true,
      [window.utils.asGridCoord(8,6)]:  true, [window.utils.asGridCoord(9,6)]:  true,
      [window.utils.asGridCoord(13,6)]: true, [window.utils.asGridCoord(14,6)]: true,
      [window.utils.asGridCoord(19,6)]: true, [window.utils.asGridCoord(20,6)]: true,
      [window.utils.asGridCoord(25,6)]: true, [window.utils.asGridCoord(26,6)]: true,

      [window.utils.asGridCoord(3,10)]:  true, [window.utils.asGridCoord(4,10)]:  true,
      [window.utils.asGridCoord(8,10)]:  true, [window.utils.asGridCoord(9,10)]:  true,
      [window.utils.asGridCoord(13,10)]: true, [window.utils.asGridCoord(14,10)]: true,
      [window.utils.asGridCoord(19,10)]: true, [window.utils.asGridCoord(20,10)]: true,
      [window.utils.asGridCoord(25,10)]: true, [window.utils.asGridCoord(26,10)]: true,

      [window.utils.asGridCoord(3,13)]:  true, [window.utils.asGridCoord(4,13)]:  true,
      [window.utils.asGridCoord(8,13)]:  true, [window.utils.asGridCoord(9,13)]:  true,
      [window.utils.asGridCoord(13,13)]: true, [window.utils.asGridCoord(14,13)]: true,
      [window.utils.asGridCoord(19,13)]: true, [window.utils.asGridCoord(20,13)]: true,
      [window.utils.asGridCoord(25,13)]: true, [window.utils.asGridCoord(26,13)]: true,
    },
    cutsceneSpaces: {
      //acesso sala1
      [window.utils.asGridCoord(13,19)]: [
        {
          events: [
            { type: "changeMap",
              map: "Corredor",
              x: window.utils.withGrid(8),
              y: window.utils.withGrid(13),
              direction: "left"
            }
          ]
        }
      ],
      [window.utils.asGridCoord(14,19)]: [
        {
          events: [
            { type: "changeMap",  
              map: "Corredor",
              x: window.utils.withGrid(8),
              y: window.utils.withGrid(13),
              direction: "left"
            }
          ]
        }
      ],
      [window.utils.asGridCoord(15,19)]: [
        {
          events: [
            { type: "changeMap",  
              map: "Corredor",
              x: window.utils.withGrid(8),
              y: window.utils.withGrid(13),
              direction: "left"
            }
          ]
        }
      ],
      [window.utils.asGridCoord(16,19)]: [
        {
          events: [
            { type: "changeMap",  
              map: "Corredor",
              x: window.utils.withGrid(8),
              y: window.utils.withGrid(13),
              direction: "left"
            }
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
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(2),
        y: window.utils.withGrid(4),
        src: "imagens/personagens/alice.png",
      }),
      professora: new window.Person({
        x: window.utils.withGrid(4),
        y: window.utils.withGrid(5),
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 800 },
          { type: "stand",  direction: "down", time: 3200 },
        ],
        talking: [
          {
            required: ["FALOU_COM_PEDRO"],
            events:[
            {type: "textMessage", text: "Alice: Professora, o que aconteceu com o Pedro?"},
            {type: "textMessage", text: "Professora: Ele foi abalado pelos desafios da prova e agora está amedrontado. Estou fazendo tudo que posso para acalmá-lo."},
            ]
          },
          {
            events: [
              { type: "textMessage", text: "Alice: Professora! O que está acontecendo?", faceHero: "professora" },
              { type: "textMessage", text: "Professora: Não sei ao certo, Alice... "},
              { type: "textMessage", text: "Professora: Mas quais forem esses desafios... você precisa enfrentá-los."},
              { type: "textMessage", text: "Professora: Enfrente e vença seus desafios, para que este pesadelo acabe."},
              { type: "textMessage", text: "Alice: Como, professora? Como venço esses desafios?"},
              { type: "textMessage", text: "Professora: Jogue pelas regras deles e responda cada pergunta da forma correta."},
              {type: "addStoryFlag", flag: "FALOU_COM_PROFESSORA"},
            ]
          }
        ]
      }),
      npcA: new window.Person({
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(3),
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
      vazio: new window.Person({
        x: window.utils.withGrid(5),
        y: window.utils.withGrid(2),
        src: "imagens/personagens/vazio.png",
        talking: [
          {
            events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(8),
              y: window.utils.withGrid(20),
              direction: "left"
             }
          ]
          }
        ]
      }),
    },
    walls: {
      //parede superior
      [window.utils.asGridCoord(1,2)]: true, [window.utils.asGridCoord(2,2)]: true,
      [window.utils.asGridCoord(3,2)]: true, [window.utils.asGridCoord(4,2)]: true,
      [window.utils.asGridCoord(5,2)]: true, [window.utils.asGridCoord(6,2)]: true,
      [window.utils.asGridCoord(7,2)]: true, [window.utils.asGridCoord(8,2)]: true,

      //parede direita
      [window.utils.asGridCoord(9,3)]: true, [window.utils.asGridCoord(9,4)]: true,
      [window.utils.asGridCoord(9,5)]: true, [window.utils.asGridCoord(9,6)]: true,
      [window.utils.asGridCoord(9,7)]: true, [window.utils.asGridCoord(9,8)]: true,

      //parede inferior
      [window.utils.asGridCoord(8,9)]: true, [window.utils.asGridCoord(7,9)]: true,
      [window.utils.asGridCoord(6,9)]: true, [window.utils.asGridCoord(5,9)]: true, 
      [window.utils.asGridCoord(4,9)]: true, [window.utils.asGridCoord(3,9)]: true, 
      [window.utils.asGridCoord(2,9)]: true, [window.utils.asGridCoord(1,9)]: true,

      //parede esquerda
      [window.utils.asGridCoord(0,3)]: true, [window.utils.asGridCoord(0,4)]: true,
      [window.utils.asGridCoord(0,5)]: true, [window.utils.asGridCoord(0,6)]: true,
      [window.utils.asGridCoord(0,7)]: true, [window.utils.asGridCoord(0,8)]: true,

      //mesas
      [window.utils.asGridCoord(5,4)]: true, [window.utils.asGridCoord(5,5)]: true,
      [window.utils.asGridCoord(6,4)]: true, [window.utils.asGridCoord(6,5)]: true,

      [window.utils.asGridCoord(2,6)]: true, [window.utils.asGridCoord(3,6)]: true,
      [window.utils.asGridCoord(2,7)]: true, [window.utils.asGridCoord(3,7)]: true,
    }
  },
  Gremio: {
    id: "Gremio",
    lowerSrc: "imagens/mapas/gremio.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(4),
        y: window.utils.withGrid(8),
        src: "imagens/personagens/alice.png",
      }),
      // Sentinela dos Primos — NPC visível no Grêmio.
      mago: new window.Person({
        x: window.utils.withGrid(1),
        y: window.utils.withGrid(3),
        direction: "down",
        src: "imagens/personagens/vilao4.png",
        talking: [
          // Pós-luta — Sentinela lúcida
          { required: ["MAGO_PRIMOS_DERROTADO"], events: [
            { type: "textMessage", text: "Sentinela: Eu fui presidente do grêmio. Eu organizava festas, debates, eleições." },
            { type: "textMessage", text: "Sentinela: O Sombrio me disse que só os 'melhores' mereciam representação." },
            { type: "textMessage", text: "Sentinela: E eu acreditei. Eu acreditei que dividir era fraqueza." },
            { type: "textMessage", text: "Alice: Mas todo número composto é feito de primos." },
            { type: "textMessage", text: "Sentinela: ...sim. Eu esqueci disso. Obrigada." },
          ]},
          // Pré-luta — provocação + inicia fase
          { events: [
            { type: "textMessage", text: "Sentinela: Dois. Três. Cinco. Sete." },
            { type: "textMessage", text: "Sentinela: Você não está na lista. Você é... composta." },
            { type: "textMessage", text: "Alice: Composta de quê?" },
            { type: "textMessage", text: "Sentinela: De partes. De divisões. De fraquezas." },
            { type: "textMessage", text: "Sentinela: O primo é puro. Indivisível. Como deveria ser todo aluno deste colégio." },
            { type: "textMessage", text: "Sentinela: Prove que sabe a diferença entre o puro e o sujo. Ou seja descartada." },
            { type: "startFase", codigo: "gremio_primos" },
          ]},
        ]
      }),
      // Figurante 5 — aluno do Grêmio "descartado" da lista da Sentinela.
      figurante5: new window.Person({
        x: window.utils.withGrid(5),
        y: window.utils.withGrid(5),
        src: "imagens/personagens/figurante5.png",
        behaviorLoop: [
          { type: "stand", direction: "left", time: 3200 },
          { type: "stand", direction: "down", time: 1200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluno: Eu estava na lista da Sentinela. Acho que eu sumi por um tempo." }] },
        ],
      }),
    },
    walls: {
      //parede superior
      [window.utils.asGridCoord(1,2)]: true, [window.utils.asGridCoord(2,2)]: true,
      [window.utils.asGridCoord(3,2)]: true, [window.utils.asGridCoord(4,2)]: true,
      [window.utils.asGridCoord(5,2)]: true, [window.utils.asGridCoord(6,2)]: true,
      [window.utils.asGridCoord(7,2)]: true, [window.utils.asGridCoord(8,2)]: true,

      //escrivaninha e sofá
      [window.utils.asGridCoord(8,3)]: true,
      [window.utils.asGridCoord(7,4)]: true, [window.utils.asGridCoord(7,5)]: true,
      [window.utils.asGridCoord(7,6)]: true, [window.utils.asGridCoord(8,6)]: true,

      //parede direita
      [window.utils.asGridCoord(9,7)]: true, [window.utils.asGridCoord(9,8)]: true,

      //parede inferior
      [window.utils.asGridCoord(8,9)]: true, [window.utils.asGridCoord(7,9)]: true,
      [window.utils.asGridCoord(6,9)]: true, [window.utils.asGridCoord(3,9)]: true,
      [window.utils.asGridCoord(2,9)]: true, [window.utils.asGridCoord(1,9)]: true,

      //parede esquerda
      [window.utils.asGridCoord(0,3)]: true, [window.utils.asGridCoord(0,4)]: true,
      [window.utils.asGridCoord(0,5)]: true, [window.utils.asGridCoord(0,6)]: true,
      [window.utils.asGridCoord(0,7)]: true, [window.utils.asGridCoord(0,8)]: true,
    },
    cutsceneSpaces: {
      //acesso sala1
      [window.utils.asGridCoord(4,9)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(1),
              y: window.utils.withGrid(20), 
              direction: "up"
            }
          ]
        }
      ],
      [window.utils.asGridCoord(5,9)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(1),
              y: window.utils.withGrid(20), 
              direction: "up"
            }
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
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(14),
        y: window.utils.withGrid(18),
        src: "imagens/personagens/alice.png",
      }),
      // Bibliófilo das Frações — NPC visível na Biblioteca.
      mago: new window.Person({
        x: window.utils.withGrid(15),
        y: window.utils.withGrid(6),
        direction: "down",
        src: "imagens/personagens/vilao5.png",
        talking: [
          // Pós-luta — Bibliófilo lúcido
          { required: ["MAGO_FRACOES_DERROTADO"], events: [
            { type: "textMessage", text: "Bibliófilo: Você somou minhas partes. Conseguiu juntar o que eu separava." },
            { type: "textMessage", text: "Bibliófilo: Eu era professor de literatura. Eu ensinava poesia." },
            { type: "textMessage", text: "Bibliófilo: Mas ninguém ouvia. As salas estavam sempre vazias." },
            { type: "textMessage", text: "Bibliófilo: O Sombrio me sussurrou que se eu virasse fragmentos... talvez alguém recolhesse." },
            { type: "textMessage", text: "Alice: Eu vou ler seus livros. Os inteiros e os que sobraram." },
            { type: "textMessage", text: "Bibliófilo: ...isso é mais do que eu mereço." },
          ]},
          // Pré-luta — provocação + inicia fase
          { events: [
            { type: "textMessage", text: "Bibliófilo: Você chegou em pedaços, Alice. Como todos nós." },
            { type: "textMessage", text: "Bibliófilo: Meu corpo é três quartos memória, um quarto presente." },
            { type: "textMessage", text: "Bibliófilo: Minha alma é dois terços tristeza, um terço esperança que rasguei." },
            { type: "textMessage", text: "Bibliófilo: Você acha que existe inteiro? Diga-me, antes que eu te divida também." },
            { type: "textMessage", text: "Bibliófilo: Some, subtraia, compare. Mostre-me que entende as partes." },
            { type: "startFase", codigo: "biblioteca_fracoes" },
          ]},
        ]
      }),
      // Figurante 6 — aluno da Biblioteca segurando metade de um livro.
      figurante6: new window.Person({
        x: window.utils.withGrid(3),
        y: window.utils.withGrid(13),
        src: "imagens/personagens/figurante6.png",
        behaviorLoop: [
          { type: "stand", direction: "right", time: 3200 },
          { type: "stand", direction: "up", time: 1200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluno: Esse livro... metade tá faltando. Achei o resto rasgado no chão." }] },
        ],
      }),
    },
    //paredes biblioteca
    walls : {
      //parede superior
      [window.utils.asGridCoord(1,3)]: true, [window.utils.asGridCoord(4,3)]: true,
      [window.utils.asGridCoord(5,3)]: true, [window.utils.asGridCoord(6,3)]: true,
      [window.utils.asGridCoord(7,3)]: true, [window.utils.asGridCoord(8,3)]: true,
      [window.utils.asGridCoord(9,3)]: true, [window.utils.asGridCoord(10,3)]: true,
      [window.utils.asGridCoord(11,3)]: true, [window.utils.asGridCoord(12,3)]: true,
      [window.utils.asGridCoord(13,3)]: true, [window.utils.asGridCoord(14,3)]: true,
      [window.utils.asGridCoord(15,3)]: true, [window.utils.asGridCoord(16,3)]: true,
      [window.utils.asGridCoord(17,3)]: true,

      //prateleiras 1
      [window.utils.asGridCoord(18,4)]: true, [window.utils.asGridCoord(19,5)]: true,
      [window.utils.asGridCoord(19,6)]: true, [window.utils.asGridCoord(20,6)]: true,
      [window.utils.asGridCoord(21,6)]: true, [window.utils.asGridCoord(22,6)]: true,
      [window.utils.asGridCoord(23,6)]: true, [window.utils.asGridCoord(24,6)]: true,
      [window.utils.asGridCoord(25,6)]: true, [window.utils.asGridCoord(26,6)]: true,
      [window.utils.asGridCoord(27,6)]: true, [window.utils.asGridCoord(27,5)]: true,
      [window.utils.asGridCoord(28,4)]: true,

      //prateleiras 2
      [window.utils.asGridCoord(18,8)]: true, [window.utils.asGridCoord(18,9)]: true,
      [window.utils.asGridCoord(19,8)]: true, [window.utils.asGridCoord(19,9)]: true,
      [window.utils.asGridCoord(20,8)]: true, [window.utils.asGridCoord(20,9)]: true,
      [window.utils.asGridCoord(21,8)]: true, [window.utils.asGridCoord(21,9)]: true,
      [window.utils.asGridCoord(22,8)]: true, [window.utils.asGridCoord(22,9)]: true,
      [window.utils.asGridCoord(23,8)]: true, [window.utils.asGridCoord(23,9)]: true,
      [window.utils.asGridCoord(24,8)]: true, [window.utils.asGridCoord(24,9)]: true,
      [window.utils.asGridCoord(25,8)]: true, [window.utils.asGridCoord(25,9)]: true,
      [window.utils.asGridCoord(26,8)]: true, [window.utils.asGridCoord(26,9)]: true,
      [window.utils.asGridCoord(27,8)]: true, [window.utils.asGridCoord(27,9)]: true,
      [window.utils.asGridCoord(28,8)]: true, [window.utils.asGridCoord(28,9)]: true,

      //prateleiras 3
      [window.utils.asGridCoord(19,11)]: true, [window.utils.asGridCoord(19,12)]: true,
      [window.utils.asGridCoord(20,11)]: true, [window.utils.asGridCoord(20,12)]: true,
      [window.utils.asGridCoord(21,11)]: true, [window.utils.asGridCoord(21,12)]: true,
      [window.utils.asGridCoord(22,11)]: true, [window.utils.asGridCoord(22,12)]: true,
      [window.utils.asGridCoord(23,11)]: true, [window.utils.asGridCoord(23,12)]: true,
      [window.utils.asGridCoord(24,11)]: true, [window.utils.asGridCoord(24,12)]: true,
      [window.utils.asGridCoord(25,11)]: true, [window.utils.asGridCoord(25,12)]: true, 

      //prateleiras 4
      [window.utils.asGridCoord(21,15)]: true, [window.utils.asGridCoord(21,16)]: true,
      [window.utils.asGridCoord(22,15)]: true, [window.utils.asGridCoord(22,16)]: true,
      [window.utils.asGridCoord(23,15)]: true, [window.utils.asGridCoord(23,16)]: true,
      [window.utils.asGridCoord(24,15)]: true, [window.utils.asGridCoord(24,16)]: true,
      [window.utils.asGridCoord(25,15)]: true, [window.utils.asGridCoord(25,16)]: true,
      [window.utils.asGridCoord(26,15)]: true, [window.utils.asGridCoord(26,16)]: true,
      [window.utils.asGridCoord(27,15)]: true, [window.utils.asGridCoord(27,16)]: true,
      [window.utils.asGridCoord(28,15)]: true, [window.utils.asGridCoord(28,16)]: true,

      [window.utils.asGridCoord(21,14)]: true, [window.utils.asGridCoord(22,14)]: true,
      [window.utils.asGridCoord(23,14)]: true, [window.utils.asGridCoord(24,14)]: true,
      [window.utils.asGridCoord(25,14)]: true, [window.utils.asGridCoord(26,14)]: true,
      [window.utils.asGridCoord(27,14)]: true, [window.utils.asGridCoord(28,14)]: true,

      //armário canto superior-esquerdo
      [window.utils.asGridCoord(2,4)]: true, [window.utils.asGridCoord(3,4)]: true,

      //sofá comprido à esquerda
      [window.utils.asGridCoord(1,8)]: true, [window.utils.asGridCoord(1,9)]: true,

      //mesas de leitura espalhadas — caminho central x=14,15 livre
      [window.utils.asGridCoord(7,8)]:  true,
      [window.utils.asGridCoord(11,8)]: true,
      [window.utils.asGridCoord(8,11)]: true,
      [window.utils.asGridCoord(12,12)]: true,
      [window.utils.asGridCoord(6,14)]: true,
      [window.utils.asGridCoord(10,15)]: true,

      //parede esquerda
      [window.utils.asGridCoord(0,4)]: true, [window.utils.asGridCoord(0,5)]: true,
      [window.utils.asGridCoord(0,6)]: true, [window.utils.asGridCoord(0,7)]: true,
      [window.utils.asGridCoord(0,8)]: true, [window.utils.asGridCoord(0,9)]: true,
      [window.utils.asGridCoord(0,10)]: true, [window.utils.asGridCoord(0,11)]: true,
      [window.utils.asGridCoord(0,12)]: true, [window.utils.asGridCoord(0,13)]: true,
      [window.utils.asGridCoord(0,14)]: true, [window.utils.asGridCoord(0,15)]: true,
      [window.utils.asGridCoord(0,16)]: true, [window.utils.asGridCoord(0,17)]: true,
      [window.utils.asGridCoord(0,18)]: true,

      //parede baixo
      [window.utils.asGridCoord(1,19)]: true, [window.utils.asGridCoord(2,19)]: true,
      [window.utils.asGridCoord(3,19)]: true, [window.utils.asGridCoord(4,19)]: true,
      [window.utils.asGridCoord(5,19)]: true, [window.utils.asGridCoord(6,19)]: true,
      [window.utils.asGridCoord(7,19)]: true, [window.utils.asGridCoord(8,19)]: true,
      [window.utils.asGridCoord(9,19)]: true, [window.utils.asGridCoord(10,19)]: true,
      [window.utils.asGridCoord(11,19)]: true, [window.utils.asGridCoord(12,19)]: true,
      [window.utils.asGridCoord(13,19)]: true, [window.utils.asGridCoord(16,19)]: true, 
      [window.utils.asGridCoord(17,19)]: true, [window.utils.asGridCoord(18,19)]: true,
      [window.utils.asGridCoord(19,19)]: true, [window.utils.asGridCoord(20,19)]: true,
      [window.utils.asGridCoord(21,19)]: true, [window.utils.asGridCoord(22,19)]: true,
      [window.utils.asGridCoord(23,19)]: true, [window.utils.asGridCoord(24,19)]: true,
      [window.utils.asGridCoord(25,19)]: true, [window.utils.asGridCoord(26,19)]: true,
      [window.utils.asGridCoord(27,19)]: true, [window.utils.asGridCoord(28,19)]: true,

      //parede direita
      [window.utils.asGridCoord(29,1)]: true, [window.utils.asGridCoord(29,2)]: true,
      [window.utils.asGridCoord(29,3)]: true, [window.utils.asGridCoord(29,4)]: true,
      [window.utils.asGridCoord(29,5)]: true, [window.utils.asGridCoord(29,6)]: true,
      [window.utils.asGridCoord(29,7)]: true, [window.utils.asGridCoord(29,8)]: true,
      [window.utils.asGridCoord(29,9)]: true, [window.utils.asGridCoord(29,10)]: true,
      [window.utils.asGridCoord(29,11)]: true, [window.utils.asGridCoord(29,12)]: true,
      [window.utils.asGridCoord(29,13)]: true, [window.utils.asGridCoord(29,14)]: true,
      [window.utils.asGridCoord(29,15)]: true, [window.utils.asGridCoord(29,16)]: true,
      [window.utils.asGridCoord(29,17)]: true, [window.utils.asGridCoord(29,18)]: true,
    },
    cutsceneSpaces: {
      //acesso sala1
      [window.utils.asGridCoord(14,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(8),
              y: window.utils.withGrid(28), 
              direction: "up"
            }
          ]
        }
      ],
      [window.utils.asGridCoord(15,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(8),
              y: window.utils.withGrid(28), 
              direction: "up"
            }
          ]
        }
      ],
    }
  },
  Patio: { 
    id: "Patio",
    lowerSrc: "imagens/mapas/patio2.png",
    upperSrc: "imagens/mapas/patio2Upper.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(9),
        y: window.utils.withGrid(17),
        src: "imagens/personagens/alice.png",
      }),
      p5: new window.Person({
        x: window.utils.withGrid(11),
        y: window.utils.withGrid(5),
        src: "imagens/personagens/p5.png",
        talking: [
          { required: ["MAGO_RACIONAIS_DERROTADO"], events: [
            { type: "textMessage", text: "Aluna: Você levou ele a sério. Foi a única coisa que ele não esperava. Obrigada." },
          ]},
          { events: [
            { type: "textMessage", text: "Aluna: O Trapaceiro tirou tudo a sério de mim. Hoje eu rio até quando tô triste." },
            { type: "textMessage", text: "Aluna: Cuidado com o sorriso dele, Alice. Ele esconde mais do que mostra." },
          ]},
        ]
      }),
      figurante1: new window.Person({
        x: window.utils.withGrid(11),
        y: window.utils.withGrid(16),
        src: "imagens/personagens/figurante6.png",
        behaviorLoop: [
          { type: "stand",  direction: "right", time: 3200 },
        ],
      }),
      // ROTEIRO posiciona figurante7.png no Pátio com a linha sobre o Trapaceiro.
      figurante2: new window.Person({
        x: window.utils.withGrid(12),
        y: window.utils.withGrid(16),
        src: "imagens/personagens/figurante7.png",
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 3200 },
        ],
        talking: [
          { events: [{ type: "textMessage", text: "Aluna: Ele me convenceu de uma piada que ainda dói. Não caia nas dele." }] },
        ],
      }),
      figurante3: new window.Person({
        x: window.utils.withGrid(10),
        y: window.utils.withGrid(10),
        src: "imagens/personagens/figurante8.png",
        behaviorLoop: [
          { type: "stand",  direction: "up", time: 3200 },
        ],
      }),
      figurante4: new window.Person({
        x: window.utils.withGrid(6),
        y: window.utils.withGrid(7),
        src: "imagens/personagens/figurante1.png",
        behaviorLoop: [
          { type: "stand",  direction: "left", time: 3200 },
        ],
      }),
      // Trapaceiro Racional — NPC visível no Pátio.
      mago: new window.Person({
        x: window.utils.withGrid(15),
        y: window.utils.withGrid(6),
        direction: "down",
        src: "imagens/personagens/vilao6.png",
        talking: [
          // Pós-luta — Trapaceiro lúcido
          { required: ["MAGO_RACIONAIS_DERROTADO"], events: [
            { type: "textMessage", text: "Trapaceiro: ...você levou a sério. Ninguém leva a sério." },
            { type: "textMessage", text: "Trapaceiro: Eu era o mais popular daqui. Todo mundo ria das minhas piadas." },
            { type: "textMessage", text: "Trapaceiro: Mas ninguém me ouvia quando eu falava sério. Então parei de falar sério." },
            { type: "textMessage", text: "Trapaceiro: O Sombrio me ofereceu uma piada eterna. Uma onde ninguém me cobrava resposta." },
            { type: "textMessage", text: "Alice: Você ainda pode falar sério. Comigo, pelo menos." },
            { type: "textMessage", text: "Trapaceiro: ...obrigado. Mesmo." },
          ]},
          // Pré-luta — provocação + inicia fase
          { events: [
            { type: "textMessage", text: "Trapaceiro: Olha só quem chegou! A herói da escola!" },
            { type: "textMessage", text: "Trapaceiro: Quer apostar? Eu te dou dois terços, você me dá metade. Ninguém perde, ninguém ganha. Topa?" },
            { type: "textMessage", text: "Alice: Isso não faz sentido." },
            { type: "textMessage", text: "Trapaceiro: EXATAMENTE! Hahaha! Sentido é só um acordo entre tolos." },
            { type: "textMessage", text: "Trapaceiro: Vamos brincar do seu jeito. Operações com racionais. Tenta acompanhar." },
            { type: "startFase", codigo: "patio_racionais" },
          ]},
        ]
      }),
    },
    walls:{
      //parede superior
      [window.utils.asGridCoord(1,0)]: true, [window.utils.asGridCoord(2,0)]: true,
      [window.utils.asGridCoord(3,0)]: true, [window.utils.asGridCoord(4,0)]: true,
      [window.utils.asGridCoord(5,0)]: true, [window.utils.asGridCoord(6,0)]: true,
      [window.utils.asGridCoord(7,0)]: true, [window.utils.asGridCoord(8,0)]: true,
      [window.utils.asGridCoord(9,0)]: true, [window.utils.asGridCoord(10,0)]: true,
      [window.utils.asGridCoord(11,0)]: true, [window.utils.asGridCoord(12,0)]: true,
      [window.utils.asGridCoord(13,0)]: true, [window.utils.asGridCoord(14,0)]: true,
      [window.utils.asGridCoord(15,0)]: true, [window.utils.asGridCoord(16,0)]: true,
      [window.utils.asGridCoord(17,0)]: true, [window.utils.asGridCoord(18,0)]: true,

      //parede direita
      [window.utils.asGridCoord(20,1)]: true, [window.utils.asGridCoord(20,2)]: true,
      [window.utils.asGridCoord(20,3)]: true, [window.utils.asGridCoord(20,4)]: true,
      [window.utils.asGridCoord(20,5)]: true, [window.utils.asGridCoord(20,6)]: true,
      [window.utils.asGridCoord(20,7)]: true, [window.utils.asGridCoord(20,8)]: true,
      [window.utils.asGridCoord(20,9)]: true, [window.utils.asGridCoord(20,10)]: true,
      [window.utils.asGridCoord(20,11)]: true, [window.utils.asGridCoord(20,12)]: true,
      [window.utils.asGridCoord(20,13)]: true, [window.utils.asGridCoord(20,14)]: true,
      [window.utils.asGridCoord(20,15)]: true, [window.utils.asGridCoord(20,16)]: true,
      [window.utils.asGridCoord(20,17)]: true, [window.utils.asGridCoord(20,18)]: true,
      [window.utils.asGridCoord(20,19)]: true,

      //parede esquerda
      [window.utils.asGridCoord(-1,1)]: true, [window.utils.asGridCoord(-1,2)]: true,
      [window.utils.asGridCoord(-1,3)]: true, [window.utils.asGridCoord(-1,4)]: true,
      [window.utils.asGridCoord(-1,5)]: true, [window.utils.asGridCoord(-1,6)]: true,
      [window.utils.asGridCoord(-1,7)]: true, [window.utils.asGridCoord(-1,8)]: true,
      [window.utils.asGridCoord(-1,9)]: true, [window.utils.asGridCoord(-1,10)]: true,
      [window.utils.asGridCoord(-1,11)]: true, [window.utils.asGridCoord(-1,12)]: true,
      [window.utils.asGridCoord(-1,13)]: true, [window.utils.asGridCoord(-1,14)]: true,
      [window.utils.asGridCoord(-1,15)]: true, [window.utils.asGridCoord(-1,16)]: true,
      [window.utils.asGridCoord(-1,17)]: true, [window.utils.asGridCoord(-1,18)]: true,
      [window.utils.asGridCoord(-1,19)]: true,

      //parede inferior
      [window.utils.asGridCoord(1,20)]: true, [window.utils.asGridCoord(2,20)]: true,
      [window.utils.asGridCoord(3,20)]: true, [window.utils.asGridCoord(4,20)]: true,
      [window.utils.asGridCoord(5,20)]: true, [window.utils.asGridCoord(6,20)]: true,
      [window.utils.asGridCoord(7,20)]: true, [window.utils.asGridCoord(8,20)]: true,
      [window.utils.asGridCoord(9,20)]: true, [window.utils.asGridCoord(10,20)]: true,
      [window.utils.asGridCoord(11,20)]: true, [window.utils.asGridCoord(12,20)]: true,
      [window.utils.asGridCoord(13,20)]: true, [window.utils.asGridCoord(14,20)]: true,
      [window.utils.asGridCoord(15,20)]: true, [window.utils.asGridCoord(16,20)]: true,
      [window.utils.asGridCoord(17,20)]: true, [window.utils.asGridCoord(18,20)]: true,

      // Estátua central + pedestal (busto cinza no centro do pátio)
      [window.utils.asGridCoord(9,8)]:  true, [window.utils.asGridCoord(10,8)]: true,
      [window.utils.asGridCoord(9,9)]:  true, [window.utils.asGridCoord(10,9)]: true,

      // Lampiões/vasos com plantas nos cantos superiores
      [window.utils.asGridCoord(2,2)]:  true,
      [window.utils.asGridCoord(14,2)]: true,

      // Bancos da parte superior
      [window.utils.asGridCoord(4,2)]:  true, [window.utils.asGridCoord(5,2)]:  true,
      [window.utils.asGridCoord(11,2)]: true, [window.utils.asGridCoord(12,2)]: true,
    },
    cutsceneSpaces: {
      // Portão do Jardim — bloqueia após Mestre das Porcentagens derrotado.
      [window.utils.asGridCoord(0,6)]: [
        { required: ["MAGO_PORCENTAGEM_DERROTADO"], events: [
          { type: "textMessage", text: "[O Jardim está em paz. O portão se fechou. Não há mais o que enfrentar lá dentro.]" }
        ]},
        { required: ["!MAGO_RACIONAIS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Não ainda. Eu devia falar com o Trapaceiro primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Jardim", x: window.utils.withGrid(14), y: window.utils.withGrid(7), direction: "down" }
        ]}
      ],
      [window.utils.asGridCoord(0,7)]: [
        { required: ["MAGO_PORCENTAGEM_DERROTADO"], events: [
          { type: "textMessage", text: "[O Jardim está em paz. O portão se fechou. Não há mais o que enfrentar lá dentro.]" }
        ]},
        { required: ["!MAGO_RACIONAIS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Não ainda. Eu devia falar com o Trapaceiro primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Jardim", x: window.utils.withGrid(14), y: window.utils.withGrid(7), direction: "down" }
        ]}
      ],
      [window.utils.asGridCoord(0,8)]: [
        { required: ["MAGO_PORCENTAGEM_DERROTADO"], events: [
          { type: "textMessage", text: "[O Jardim está em paz. O portão se fechou. Não há mais o que enfrentar lá dentro.]" }
        ]},
        { required: ["!MAGO_RACIONAIS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Não ainda. Eu devia falar com o Trapaceiro primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Jardim", x: window.utils.withGrid(14), y: window.utils.withGrid(7), direction: "down" }
        ]}
      ],
      [window.utils.asGridCoord(0,9)]: [
        { required: ["MAGO_PORCENTAGEM_DERROTADO"], events: [
          { type: "textMessage", text: "[O Jardim está em paz. O portão se fechou. Não há mais o que enfrentar lá dentro.]" }
        ]},
        // Transição 2 — primeira vez próximo do portão, após V6 derrotado
        { required: ["MAGO_RACIONAIS_DERROTADO", "!antes_jardim_done"], events: [
          { type: "textMessage", text: "[Alice se aproxima do portão. O ar fica mais frio. Os sons da escola desaparecem.]" },
          { type: "textMessage", text: "Alice: ...por que o Jardim está tão silencioso?" },
          { type: "textMessage", text: "[A voz do Mentor ecoa, vinda de longe.]" },
          { type: "textMessage", text: "Mentor (eco): Alice. Está me ouvindo?" },
          { type: "textMessage", text: "Mentor (eco): O último mago não é como os outros. Ele já estava perdido antes do feitiço." },
          { type: "textMessage", text: "Mentor (eco): O Sombrio o escolheu primeiro. Se você cair lá dentro... ninguém vem te buscar." },
          { type: "textMessage", text: "Alice: Eu não vou cair." },
          { type: "textMessage", text: "Mentor (eco): Eu sei. Por isso eu te chamei." },
          { type: "addStoryFlag", flag: "antes_jardim_done" },
        ]},
        { events: [
          { type: "changeMap", map: "Jardim", x: window.utils.withGrid(14), y: window.utils.withGrid(7), direction: "down" }
        ]}
      ],
      [window.utils.asGridCoord(0,10)]: [
        { required: ["MAGO_PORCENTAGEM_DERROTADO"], events: [
          { type: "textMessage", text: "[O Jardim está em paz. O portão se fechou. Não há mais o que enfrentar lá dentro.]" }
        ]},
        { required: ["!MAGO_RACIONAIS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Não ainda. Eu devia falar com o Trapaceiro primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Jardim", x: window.utils.withGrid(14), y: window.utils.withGrid(7), direction: "down" }
        ]}
      ],
      [window.utils.asGridCoord(0,11)]: [
        { required: ["MAGO_PORCENTAGEM_DERROTADO"], events: [
          { type: "textMessage", text: "[O Jardim está em paz. O portão se fechou. Não há mais o que enfrentar lá dentro.]" }
        ]},
        { required: ["!MAGO_RACIONAIS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Não ainda. Eu devia falar com o Trapaceiro primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Jardim", x: window.utils.withGrid(14), y: window.utils.withGrid(7), direction: "down" }
        ]}
      ],
      [window.utils.asGridCoord(0,12)]: [
        { required: ["MAGO_PORCENTAGEM_DERROTADO"], events: [
          { type: "textMessage", text: "[O Jardim está em paz. O portão se fechou. Não há mais o que enfrentar lá dentro.]" }
        ]},
        { required: ["!MAGO_RACIONAIS_DERROTADO"], events: [
          { type: "textMessage", text: "Alice: Não ainda. Eu devia falar com o Trapaceiro primeiro." }
        ]},
        { events: [
          { type: "changeMap", map: "Jardim", x: window.utils.withGrid(14), y: window.utils.withGrid(7), direction: "down" }
        ]}
      ],
      [window.utils.asGridCoord(5,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(4),
              y: window.utils.withGrid(3),
              direction: "down"
             }
          ]
        }
      ],
      [window.utils.asGridCoord(6,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(4),
              y: window.utils.withGrid(3),
              direction: "down"
             }
          ]
        }
      ],
      [window.utils.asGridCoord(7,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(4),
              y: window.utils.withGrid(3),
              direction: "down"
             }
          ]
        }
      ],
      [window.utils.asGridCoord(8,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(4),
              y: window.utils.withGrid(3),
              direction: "down"
             }
          ]
        }
      ],
      [window.utils.asGridCoord(9,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(4),
              y: window.utils.withGrid(3),
              direction: "down"
             }
          ]
        }
      ]
      ,[window.utils.asGridCoord(10,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(4),
              y: window.utils.withGrid(3),
              direction: "down"
             }
          ]
        }
      ],
      [window.utils.asGridCoord(11,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(4),
              y: window.utils.withGrid(3),
              direction: "down"
             }
          ]
        }
      ],
      [window.utils.asGridCoord(12,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(4),
              y: window.utils.withGrid(3),
              direction: "down"
             }
          ]
        }
      ],
      [window.utils.asGridCoord(13, 19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(4),
              y: window.utils.withGrid(3),
              direction: "down"
             }
          ]
        }
      ],
      [window.utils.asGridCoord(14,19)]: [
        {
          events: [
            { type: "changeMap", 
              map: "Corredor",
              x: window.utils.withGrid(4),
              y: window.utils.withGrid(3),
              direction: "down"
             }
          ]
        }
      ],
    }
  },

// MAPAS DE DESAFIOS!!!

  // =============================================
  // ARENAS DOS MAGOS — uma por fase do modo Fundamental.
  // =============================================
  // Padrão: hero em (8,8), vilão visível em (8,5). entryCutscene dispara
  // automaticamente o duelo com N quizGame events (= meta_questoes da fase).
  //
  // Fluxo em fase ativa: FaseRunner.finalize() recarrega a página após o
  // N-ésimo quiz, então os eventos finais (textMessage de derrota do mago +
  // changeMap pro Corredor) só rodam se o jogador entrar fora de fase
  // (caminho legado via sala). Isso é intencional — preserva "modo treino".

  Desafio1d1: {
    id: "Desafio1d1",
    lowerSrc: "imagens/personagens/vazio.png",
    upperSrc: "imagens/mapas/desafios/desafio1.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(8),
        direction: "up",
        src: "imagens/personagens/alice.png",
      }),
      vilao: new window.Person({
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(5),
        direction: "down",
        src: "imagens/personagens/vilao2.png",
      }),
    },
    walls: {
      [window.utils.asGridCoord(7,8)]: true,
      [window.utils.asGridCoord(9,8)]: true,
      [window.utils.asGridCoord(8,7)]: true,
      [window.utils.asGridCoord(8,9)]: true,
    },
    entryCutscene: {
      events: [
        { type: "textMessage", text: "[O Conde se vira lentamente. O quadro às suas costas está coberto de vírgulas.]" },
        { type: "textMessage", text: "Conde: Mostre-me que sabe a diferença entre o que pesa e o que é descartado." },
        { type: "quizGame", idAssunto: 1 },
        { type: "quizGame", idAssunto: 1 },
        { type: "quizGame", idAssunto: 1 },
        { type: "quizGame", idAssunto: 1 },
        { type: "quizGame", idAssunto: 1 },
        { type: "seAprovou", events: [
          { type: "textMessage", text: "[O Conde cai de joelhos. O quadro às suas costas se apaga sozinho.]" },
          { type: "textMessage", text: "Conde: ...obrigado." },
          { type: "textMessage", text: "Conde: Eu já não me lembrava do meu próprio nome." },
          { type: "textMessage", text: "Conde: Quando o Sombrio me tocou, tudo virou número. Eu só via vírgulas." },
          { type: "textMessage", text: "Alice: Quem é o Sombrio?" },
          { type: "textMessage", text: "Conde: Alguém que esta escola esqueceu. E que não esquece." },
          { type: "textMessage", text: "Conde: Cuide-se, Alice. Eu vou descansar agora." },
        ]},
        { type: "finalizarFase" },
        { type: "changeMap", map: "Corredor", x: window.utils.withGrid(4), y: window.utils.withGrid(3), direction: "down" },
      ]
    }
  },

  Desafio2d1: {
    id: "Desafio2d1",
    lowerSrc: "imagens/personagens/vazio.png",
    upperSrc: "imagens/mapas/desafios/desafio2.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(8),
        direction: "up",
        src: "imagens/personagens/alice.png",
      }),
      vilao: new window.Person({
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(5),
        direction: "down",
        src: "imagens/personagens/vilao3.png",
      }),
    },
    walls: {
      [window.utils.asGridCoord(7,8)]: true,
      [window.utils.asGridCoord(9,8)]: true,
      [window.utils.asGridCoord(8,7)]: true,
      [window.utils.asGridCoord(8,9)]: true,
    },
    entryCutscene: {
      events: [
        { type: "textMessage", text: "[O Mestre oscila como se não tivesse certeza de onde está pisando.]" },
        { type: "textMessage", text: "Mestre: Vamos lá. Mais ou menos. Aproximadamente uma luta." },
        { type: "quizGame", idAssunto: 6 },
        { type: "quizGame", idAssunto: 6 },
        { type: "quizGame", idAssunto: 6 },
        { type: "quizGame", idAssunto: 6 },
        { type: "quizGame", idAssunto: 6 },
        { type: "seAprovou", events: [
          { type: "textMessage", text: "[O Mestre fica imóvel pela primeira vez. Olha as próprias mãos.]" },
          { type: "textMessage", text: "Mestre: ...eu via tudo borrado. Tudo 'mais ou menos'." },
          { type: "textMessage", text: "Mestre: E achava bom assim." },
          { type: "textMessage", text: "Alice: Por quê?" },
          { type: "textMessage", text: "Mestre: Quem nunca tenta acertar... nunca erra." },
          { type: "textMessage", text: "Mestre: Mas também nunca chega a lugar nenhum. Obrigado por me apontar onde eu estava." },
        ]},
        { type: "finalizarFase" },
        { type: "changeMap", map: "Corredor", x: window.utils.withGrid(4), y: window.utils.withGrid(3), direction: "down" },
      ]
    }
  },

  Desafio3d1: {
    id: "Desafio3d1",
    lowerSrc: "imagens/personagens/vazio.png",
    upperSrc: "imagens/mapas/desafios/desafio3.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(8),
        direction: "up",
        src: "imagens/personagens/alice.png",
      }),
      vilao: new window.Person({
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(5),
        direction: "down",
        src: "imagens/personagens/vilao4.png",
      }),
    },
    walls: {
      [window.utils.asGridCoord(7,8)]: true,
      [window.utils.asGridCoord(9,8)]: true,
      [window.utils.asGridCoord(8,7)]: true,
      [window.utils.asGridCoord(8,9)]: true,
    },
    entryCutscene: {
      events: [
        { type: "textMessage", text: "[Folhas rasgadas cobrem o chão da arena. A Sentinela está imóvel.]" },
        { type: "textMessage", text: "Sentinela: Dois. Três. Cinco. Sete. Sua vez de provar que não é descartável." },
        { type: "quizGame", idAssunto: 3 },
        { type: "quizGame", idAssunto: 3 },
        { type: "quizGame", idAssunto: 3 },
        { type: "quizGame", idAssunto: 3 },
        { type: "quizGame", idAssunto: 3 },
        { type: "seAprovou", events: [
          { type: "textMessage", text: "[A Sentinela larga os papéis. Eles caem sem som.]" },
          { type: "textMessage", text: "Sentinela: Pare. Pelo menos uma vez na vida, eu posso parar de contar." },
          { type: "textMessage", text: "Sentinela: Eu fui presidente do grêmio. Eu organizava festas, eleições, listas." },
          { type: "textMessage", text: "Sentinela: O Sombrio me disse que só os 'melhores' mereciam representação." },
          { type: "textMessage", text: "Alice: Mas todo número composto é feito de primos." },
          { type: "textMessage", text: "Sentinela: ...sim. Eu esqueci disso. Obrigada por lembrar." },
        ]},
        { type: "finalizarFase" },
        { type: "changeMap", map: "Corredor", x: window.utils.withGrid(4), y: window.utils.withGrid(3), direction: "down" },
      ]
    }
  },

  Desafio5d1: {
    id: "Desafio5d1",
    lowerSrc: "imagens/personagens/vazio.png",
    upperSrc: "imagens/mapas/desafios/desafio5.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(8),
        direction: "up",
        src: "imagens/personagens/alice.png",
      }),
      vilao: new window.Person({
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(5),
        direction: "down",
        src: "imagens/personagens/vilao5.png",
      }),
    },
    walls: {
      [window.utils.asGridCoord(7,8)]: true,
      [window.utils.asGridCoord(9,8)]: true,
      [window.utils.asGridCoord(8,7)]: true,
      [window.utils.asGridCoord(8,9)]: true,
    },
    entryCutscene: {
      events: [
        { type: "textMessage", text: "[Páginas voam pelo ar. O Bibliófilo segura metade de um livro contra o peito.]" },
        { type: "textMessage", text: "Bibliófilo: Você chegou em pedaços, Alice. Como todos nós." },
        { type: "textMessage", text: "Bibliófilo: Some, subtraia, compare. Cada pedaço pesa." },
        { type: "quizGame", idAssunto: 4 },
        { type: "quizGame", idAssunto: 4 },
        { type: "quizGame", idAssunto: 4 },
        { type: "quizGame", idAssunto: 4 },
        { type: "quizGame", idAssunto: 4 },
        { type: "quizGame", idAssunto: 4 },
        { type: "seAprovou", events: [
          { type: "textMessage", text: "[As páginas pousam. O Bibliófilo abraça o livro — agora inteiro.]" },
          { type: "textMessage", text: "Bibliófilo: Inteiro. Pela primeira vez em meses, eu me sinto inteiro." },
          { type: "textMessage", text: "Bibliófilo: Eu era professor de literatura. Eu ensinava poesia em voz alta." },
          { type: "textMessage", text: "Bibliófilo: Mas as salas estavam sempre vazias." },
          { type: "textMessage", text: "Bibliófilo: O Sombrio me sussurrou que se eu virasse fragmentos... talvez alguém recolhesse os pedaços." },
          { type: "textMessage", text: "Alice: Eu vou ler seus livros. Os inteiros e os que sobraram." },
          { type: "textMessage", text: "Bibliófilo: ...isso é mais do que eu mereço." },
        ]},
        { type: "finalizarFase" },
        { type: "changeMap", map: "Corredor", x: window.utils.withGrid(4), y: window.utils.withGrid(3), direction: "down" },
      ]
    }
  },

  Desafio6d1: {
    id: "Desafio6d1",
    lowerSrc: "imagens/personagens/vazio.png",
    upperSrc: "imagens/mapas/desafios/desafio6.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(8),
        direction: "up",
        src: "imagens/personagens/alice.png",
      }),
      vilao: new window.Person({
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(5),
        direction: "down",
        src: "imagens/personagens/vilao6.png",
      }),
    },
    walls: {
      [window.utils.asGridCoord(7,8)]: true,
      [window.utils.asGridCoord(9,8)]: true,
      [window.utils.asGridCoord(8,7)]: true,
      [window.utils.asGridCoord(8,9)]: true,
    },
    entryCutscene: {
      events: [
        { type: "textMessage", text: "[O Trapaceiro lança a moeda no ar uma, duas, três vezes. Nunca olha.]" },
        { type: "textMessage", text: "Trapaceiro: Vai lá, heroína. Acompanhe meu ritmo. Se conseguir." },
        { type: "quizGame", idAssunto: 5 },
        { type: "quizGame", idAssunto: 5 },
        { type: "quizGame", idAssunto: 5 },
        { type: "quizGame", idAssunto: 5 },
        { type: "quizGame", idAssunto: 5 },
        { type: "quizGame", idAssunto: 5 },
        { type: "seAprovou", events: [
          { type: "textMessage", text: "[A moeda cai. O Trapaceiro nem se dá ao trabalho de pegar.]" },
          { type: "textMessage", text: "Trapaceiro: Hahaha... haha... ha." },
          { type: "textMessage", text: "Trapaceiro: Não tem graça, né?" },
          { type: "textMessage", text: "Trapaceiro: Eu era o mais popular daqui. Todo mundo ria das minhas piadas." },
          { type: "textMessage", text: "Trapaceiro: Mas ninguém me ouvia quando eu falava sério." },
          { type: "textMessage", text: "Trapaceiro: O Sombrio me ofereceu uma piada eterna. Sem cobrança de resposta." },
          { type: "textMessage", text: "Alice: Conta uma piada de verdade pra mim algum dia." },
          { type: "textMessage", text: "Trapaceiro: ...obrigado. Conto, sim. Quando eu lembrar de alguma." },
        ]},
        { type: "finalizarFase" },
        { type: "changeMap", map: "Corredor", x: window.utils.withGrid(4), y: window.utils.withGrid(3), direction: "down" },
      ]
    }
  },

  Desafio7d1: {
    id: "Desafio7d1",
    lowerSrc: "imagens/personagens/vazio.png",
    upperSrc: "imagens/mapas/desafios/desafio7.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(8),
        direction: "up",
        src: "imagens/personagens/alice.png",
      }),
      vilao: new window.Person({
        x: window.utils.withGrid(8),
        y: window.utils.withGrid(5),
        direction: "down",
        src: "imagens/personagens/vilao7.png",
      }),
    },
    walls: {
      [window.utils.asGridCoord(7,8)]: true,
      [window.utils.asGridCoord(9,8)]: true,
      [window.utils.asGridCoord(8,7)]: true,
      [window.utils.asGridCoord(8,9)]: true,
    },
    entryCutscene: {
      events: [
        { type: "textMessage", text: "[O Jardim está enevoado. As plantas estão congeladas no tempo, paradas em flor.]" },
        { type: "textMessage", text: "Mestre: 100% dos que entraram aqui... 100% foram aniquilados." },
        { type: "textMessage", text: "Mestre: Você é a sexta. Calculei 16,67% de chance de você ser diferente." },
        { type: "quizGame", idAssunto: 7 },
        { type: "quizGame", idAssunto: 7 },
        { type: "quizGame", idAssunto: 7 },
        { type: "quizGame", idAssunto: 7 },
        { type: "quizGame", idAssunto: 7 },
        { type: "quizGame", idAssunto: 7 },
        { type: "quizGame", idAssunto: 7 },
        { type: "quizGame", idAssunto: 7 },
        { type: "seAprovou", events: [
          { type: "textMessage", text: "[O Mestre cai. Atrás dele, uma flor isolada começa a se mover de novo.]" },
          { type: "textMessage", text: "Mestre: 100% derrotado. 100% lúcido. Pela primeira vez em vinte anos." },
          { type: "textMessage", text: "Mestre: Eu fui coordenador. Eu organizava as filas, os horários, os boletins." },
          { type: "textMessage", text: "Mestre: O Sombrio me ofereceu hierarquia eterna. Eu aceitei sem pensar." },
          { type: "textMessage", text: "Alice: E o Sombrio?" },
          { type: "textMessage", text: "Mestre: Cuidado. Ele te observou desde a primeira sala." },
          { type: "textMessage", text: "Mestre: Ele vai te procurar. Não no Jardim. No lugar que você menos espera." },
        ]},
        { type: "finalizarFase" },
        { type: "changeMap", map: "Corredor", x: window.utils.withGrid(4), y: window.utils.withGrid(3), direction: "down" },
      ]
    }
  },

// =============================================
// MAPA ARCADE — ENSINO MÉDIO
// =============================================

  Auditorio_M: {
    id: "Auditorio_M",
    lowerSrc: "imagens/mapas/auditorio.png",
    upperSrc: "imagens/personagens/vazio.png",
    gameObjects: {
      hero: new window.Person({
        isPlayerControlled: true,
        x: window.utils.withGrid(12),
        y: window.utils.withGrid(14),
        src: "imagens/personagens/alice.png",
      }),

      // === PROF.-CHEFE NO PALCO DO AUDITÓRIO ===

      mago1: new window.Person({
        x: window.utils.withGrid(12),
        y: window.utils.withGrid(7),
        src: "imagens/personagens/vilao.png",
        behaviorLoop: [
          { type: "stand", direction: "down", time: 3000 },
        ],
        talking: [
          {
            required: ["ARCADE_DUELO_COMPLETO"],
            events: [
              { type: "textMessage", text: "Prof.-chefe: Você já provou seu valor..." },
            ]
          },
          {
            events: [
              { type: "textMessage", text: "Prof.-chefe: Encare meu desafio se for capaz!" },
              { type: "arcadeBattle" },
              { type: "textMessage", text: "Prof.-chefe: Impressionante... você foi aprovada com louvor!" },
              { type: "changeSprite", who: "mago1", src: "imagens/personagens/vilao_derrotado.png" },
              { type: "addStoryFlag", flag: "ARCADE_DUELO_COMPLETO" },
              { type: "arcadeCheckEnd" },
            ]
          }
        ]
      }),

    },

    // Mapa 24×16 tiles.
    // Herói entra em (12, 15), sobe pelo aisle central e encontra o Prof.-chefe em (12, 7)
    // — que fica EM FRENTE da mesa (mesa fica atrás dele, decorativa). Assim nem Prof nem
    // herói sobem visualmente em cima da mesa.
    walls: generateWallRegion([
      // Bordas externas do mapa
      [-1, 0, -1, 15],
      [24, 0, 24, 15],
      [0, -1, 23, -1],
      [0, 16, 23, 16],

      // Rows 0-2 — parede de fundo do palco (portas, plantas, chalkboard). Tudo bloqueado.
      [0, 0, 23, 2],

      // Rows 3-7 — palco. Aisle estreito: só col 12 livre (por onde passa o Prof).
      [0, 3, 11, 7],   // lado esquerdo do palco
      [13, 3, 23, 7],  // lado direito do palco

      // Rows 8-15 — audiência. Aisle mais largo (cols 10-13) pra dar espaço pro jogador caminhar.
      [0, 8, 9, 15],   // audiência esquerda (cadeiras + degraus)
      [14, 8, 23, 15], // audiência direita
    ]),

    entryCutscene: {
      required: [],
      events: [
        { type: "popup",
          title: "📚 Gincana Acadêmica",
          text:
            "<b>Como funciona a gincana</b><br>" +
            "Responda todas as questões para ser aprovada. Cada <b>acerto</b> soma pontos (multiplicados pelo seu streak). Cada <b>erro</b> consome uma <b>tentativa ◆</b>. Você começa com <b>3 ◆</b>, teto de <b>5 ◆</b>.<br><br>" +

            "<b>🔥 Recompensas automáticas de streak</b><br>" +
            "A cada <b>5 acertos seguidos</b>, o jogo te dá um bônus — sem você escolher. A prioridade é:<br>" +
            "&nbsp;• <b>+1 ◆ tentativa</b> — se você já perdeu alguma, ela é reposta.<br>" +
            "&nbsp;• <b>+1 ◆ tentativa máxima</b> — se o teto ainda não chegou a 5, sobe o teto.<br>" +
            "&nbsp;• <b>+1 📘 revisão grátis</b> — se tudo já está cheio, você ganha uma revisão (seu próximo erro não consome tentativa).<br><br>" +

            "<b>🎓 Altares de Apoio (checkpoints da gincana)</b><br>" +
            "Ao longo da run surgem <b>altares</b> em checkpoints equilibrados. Em cada altar você escolhe <b>1 de 3 buffs</b> sorteados. Em média aparece <b>1 altar a cada 10 questões</b> — então uma gincana de 5-10 tem 1 altar, de 15-20 tem 2, e uma de 60 tem 6 altares ao longo do caminho.<br><br>" +

            "Buffs possíveis no altar:<br>" +
            "&nbsp;• <b>📘 Revisão</b> — seu próximo erro não consome tentativa.<br>" +
            "&nbsp;• <b>✂ Dica 50/50</b> — a próxima questão já vem com 2 alternativas erradas eliminadas.<br>" +
            "&nbsp;• <b>⏸ Concentração</b> — nas próximas 3 questões, o bônus de tempo vale em <b>dobro</b>.<br>" +
            "&nbsp;• <b>✦ Nota Dupla</b> — seu próximo acerto vale o <b>dobro</b> de pontos.<br><br>" +

            "Os buffs ativos aparecem no canto superior esquerdo do HUD. Boa sorte! ✏️"
        },
        { type: "arcadeStart" },
      ]
    },

    cutsceneSpaces: {}
  },
}

// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.OverworldMap = OverworldMap;
