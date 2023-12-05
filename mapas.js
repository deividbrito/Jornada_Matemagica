class Mapas {
    constructor(config){
        this.objetoJogo = config.objetoJogo;

        this.lowerImage = new Image();
        this.lowerImage.src = config.lowerSrc;    //camadas baixas, coisas que devem estar aos pés dos personagens/objetos

        this.upperImage = new Image();
        this.upperImage.src = config.upperSrc;    //camadas altas, coisas que devem estar acima da cabeça de personagens/objetos
    }

    //construtor que desenha a camada baixa
    drawLowerImage(ctx){
        ctx.drawImage(this.lowerImage, 0, 0);
    }

    //construtor que desenha a camada alta
    drawUpperImage(ctx){
        ctx.drawImage(this.upperImage, 0, 0);
    }
}

//criando mapas e desenhando seus objetos
window.Mapas = {
    Mapa1: {
        lowerSrc: "imagens/mapas/teste.png",
        objetoJogo:  {
            p1: new ObjetoJogo({
                x: 5,
                y: 6,
            }),
            p2: new ObjetoJogo({
                x: 7,
                x: 9,
            })
        }
    },
    Mapa2: {
        lowerSrc: "imagens/mapas/teste2.jpeg",
        objetoJogo:  {
            p1: new ObjetoJogo({
                x: 2,
                y: 3,
            }),
            p2: new ObjetoJogo({
                x: 7,
                x: 7,
            })
        }
    }
}