class Mundo{
    constructor(config){
        this.element = config.element;
        this.canvas = this.element.querySelector(".canvas-jogo");
        this.ctx = this.canvas.getContext("2d");
        this.map = null;
    }

    iniciarLoopJogo(){
        const step = () => {
            //para que o jogo limpe o canvas a cada frame que se passa (assim, um objeto que se move não vai ter dois frames coexistindo)
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            //desenhar camada baixa
            this.map.drawLowerImage(this.ctx);

            //desenhar objetos de jogo
            Object.values(this.map.objetoJogo).forEach(object => {
                object.x += 1;
                object.update({
                    arrow: this.inputDirecao.direcao
                })
                object.sprite.draw(this.ctx);
            })

            //desenhar camada de cima
            this.map.drawUpperImage(this.ctx);

            requestAnimationFrame(() => {
                step();
            })
        }
        step();
    }


    iniciar(){
        this.map = new Mapas (window.Mapas.Mapa1);

        this.inputDirecao = new inputDirecao();
        this.inputDirecao.iniciar();
        this.inputDirecao.direcao;

        this.iniciarLoopJogo();
        console.log("o mundo está girando", this);

        //CÓDIGOS OBSOLETOS: objetos e mapas inseridos diretamente como teste, agora serão inseridos de forma dinâmica

        // //inserindo cenário no jogo
        // const imagem = new Image();
        // imagem.onload = () => {
        //     this.ctx.drawImage(imagem, 0, 0);
        // };
        // imagem.src = "imagens/mapas/teste.png";

        // // //x e y definem onde o personagem começará
        // // let x = 1;
        // // let y = 5;
        // // const player = new Image();
        // // player.onload = () => {
        // //     this.ctx.drawImage(
        // //         player, 
        // //         0,      //parte esquerda 
        // //         0,      //parte do topo
        // //         32,     //largura do corte
        // //         32,     //tamanho do corte
        // //         x * 16,      //posição
        // //         y * 16,
        // //         32,
        // //         32
        // //         );
        // // };
        // // player.src = "C:/Users/deivi/Desktop/ADS/Protótipo/imagens/personagens/p1.png";


        // // colocando alguns objetos no jogo
        // const p1 = new ObjetoJogo({     //inserindo um personagem
        //     x: 3,
        //     y: 5,
        // })

        // setTimeout(() => {
        //     p1.sprite.draw(this.ctx);
        // }, 300);


    }
}