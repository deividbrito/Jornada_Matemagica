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

            //estabelecendo o objeto que a câmera deve seguir (p1 sendo o personagem controlado)
            const cameraEntidade = this.map.objetoJogo.p1;

            //atualiza todos os objetos do mapa antes de serem desenhados
            Object.values(this.map.objetoJogo).forEach(object => {
                object.update({
                    arrow: this.inputDirecao.direcao
                })
            })

            //desenhar camada baixa
            this.map.drawLowerImage(this.ctx, cameraEntidade);

            //desenhar objetos de jogo
            Object.values(this.map.objetoJogo).forEach(object => {
                object.sprite.draw(this.ctx, cameraEntidade);
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