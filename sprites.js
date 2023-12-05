class Sprite {
    constructor(config){
        //montar a imagem
        this.image = new Image();
        this.image.src = config.src;
        this.image.onload = () => {
            this.isLoaded = true;
        }

        //configurando animaçao do objeto e seu estado inicial
        this.animacao = config.animacao  || {
            praBaixo: [
                [0,0]
            ]
        }
        this.animacaoAtual = config.animacaoAtual || "praBaixo";
        this.frameAnimacaoAtual = 0;

        //referenciando o objeto do jogo
        this.objetoJogo = config.objetoJogo;
    }

    //como os objetos serão desenhados
    draw(ctx) {
        const x = this.objetoJogo.x * 16;
        const y = this.objetoJogo.y * 16;
    
        this.isLoaded && ctx.drawImage(this.image, 
            0,0,
            32,32,
            x,y,
            32,32
        )
    }
}