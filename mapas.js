class Mapas {
    constructor(config){
        this.objetoJogo = config.objetoJogo;
        this.walls = config.walls || {};          //para definir paredes no cenário

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

    //função para identificar espaços ocupados por paredes ou outros objetos
    espacoTomado(atualX, atualY, direcao){
        const{x,y} = utils.proxPosicao(atualX, atualY, direcao);
        return this.walls[`${x},${y}`] || false;
    }

    montarObjetos(){
        Object.values(this.objetoJogo).forEach(o => {


            o.Montar(this);
        })
    }

    //funções relacionadas a adição, remoção e mudança de colisão em objetos/paredes
    adicionarParede(x,y) {
        this.walls[`${x},${y}`] = true;
    }

    removerParede(x,y){
        delete this.walls[`${x},${y}`];
    }

    moverParede(antigoX, antigoY, direcao){
        this.removerParede(antigoX, antigoY);
        const {x,y} = utils.proxPosicao(antigoX, antigoY, direcao);
        this.adicionarParede(x, y);
    }
}

//criando mapas e desenhando seus objetos
window.Mapas = {
    //esse mapa é apenas para testes e verificação do funcionamento pleno do código
    Mapa1: {
        lowerSrc: "imagens/mapas/teste.png",
        objetoJogo:  {
            p1: new Entidade({
                ehOPlayer: true,
                x: utils.withGrid(5),
                y: utils.withGrid(6),
            }),
            p2: new ObjetoJogo({
                x: utils.withGrid(7),
                x: utils.withGrid(9),
            })
        },
        walls: {}
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