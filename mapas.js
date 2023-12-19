class Mapas {
    constructor(config){
        this.objetoJogo = config.objetoJogo;

        this.lowerImage = new Image();
        this.lowerImage.src = config.lowerSrc;    //camadas baixas, coisas que devem estar aos pés dos personagens/objetos

        this.upperImage = new Image();
        this.upperImage.src = config.upperSrc;    //camadas altas, coisas que devem estar acima da cabeça de personagens/objetos
    }

    //construtor que desenha a camada baixa
    drawLowerImage(ctx, cameraEntidade){
        ctx.drawImage(
            this.lowerImage, 
            utils.withGrid(10.5) - cameraEntidade.x,
            utils.withGrid(6) - cameraEntidade.y
            );
    }

    //construtor que desenha a camada alta
    // drawUpperImage(ctx, cameraEntidade){
    //     ctx.drawImage(
            // this.upperImage, 
            // utils.withGrid(10.5) - cameraEntidade.x,
            // utils.withGrid(6) - cameraEntidade.y
            // );
    // }
}

//criando mapas e desenhando seus objetos
window.Mapas = {
    Mapa1: {
        lowerSrc: "imagens/mapas/teste.png",
        objetoJogo:  {
            p1: new Entidade({
                ehOPlayer: true,
                x: utils.withGrid(5),
                y: utils.withGrid(6),
            }),
            // p2: new ObjetoJogo({
            //     x: utils.withGrid(7),
            //     x: utils.withGrid(9),
            // })
        }
    },
    Mapa2: {
        lowerSrc: "imagens/mapas/teste2.jpeg",
        objetoJogo:  {
            p1: new Entidade({
                ehOPlayer: true,
                x: utils.withGrid(2),
                y: utils.withGrid(3),
            })
        }
    }
}