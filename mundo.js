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
                object.update({
                    arrow: this.inputDirecao.direcao
                })
                object.sprite.draw(this.ctx);
            })

            //desenhar camada de cima
            // this.map.drawUpperImage(this.ctx);

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


    }
}