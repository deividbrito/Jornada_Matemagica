class Sprite {
    constructor(config){
        //montar a imagem
        this.image = new Image();
        this.image.src = config.src;
        this.image.onload = () => {
            this.isLoaded = true;
        }

        //configurando animaçoes do objeto e seu estado inicial
        this.animacao = config.animacao  || {
            "pra-baixo"     : [ [0,0] ],
            "pra-direita"   : [ [0,1] ],
            "pra-cima"      : [ [0,2] ],
            "pra-esquerda"  : [ [0,3] ],
            "andar-baixo"   : [ [1,0],[0,0],[3,0],[0,0] ],
            "andar-direita" : [ [1,1],[0,1],[3,1],[0,1] ],
            "andar-cima"    : [ [1,2],[0,2],[3,2],[0,2] ],
            "andar-esquerda": [ [1,3],[0,3],[3,3],[0,3] ]
        }
        this.animacaoAtual = "pra-baixo"; 
        this.animacaoFrameAtual = 0;

        //quantidade de frames que cada sprite ocupará na animação --> permite uma animação ser mais rápida ou mais lenta
        this.animacaoLimiteFrame = config.animacaoLimiteFrame || 8;
        this.animacaoProgressoFrame = this.animacaoLimiteFrame;

        //referenciando o objeto do jogo
        this.objetoJogo = config.objetoJogo;
    }

    //getter dos frames da animação
    get frame(){
        return this.animacao[this.animacaoAtual][this.animacaoFrameAtual];
    }

    //método que determina as animações para diferentes ações de movimentação
    setAnimacao(key){
        if(this.animacaoAtual !== key){
            this.animacaoAtual = key;
            this.animacaoFrameAtual = 0;
            this.animacaoProgressoFrame = this.animacaoLimiteFrame;
        }
    }

    //esse método é responsável por atualizar o progresso da animação do objeto
    updateProgressoAnimacao(){
        //diminuir o progresso
        if(this.animacaoProgressoFrame > 0){
            this.animacaoProgressoFrame -= 1;
            return;
        }

        //resetar o contador da animação
        this.animacaoProgressoFrame = this.animacaoLimiteFrame;
        this.animacaoFrameAtual += 1;

        //sempre retornar ao estado inicial da animação caso o objeto ultrapasse o limite ou tenha valor indefinido de animação
        if(this.frame == undefined){
            this.animacaoFrameAtual = 0;
        }
    }

    //como os objetos serão desenhados
    draw(ctx, cameraEntidade) {
        //posiciona o personagem em uma câmera centralizada, de forma que ele fique centralizado na tela do jogo. esse valores podem ser alterados posteriormente.
        const x = this.objetoJogo.x - 8 + utils.withGrid(10.5) - cameraEntidade.x;
        const y = this.objetoJogo.y - 18 + utils.withGrid(6) - cameraEntidade.y;

        const [frameX, frameY] = this.frame;
    
        this.isLoaded && ctx.drawImage(this.image, 
            frameX * 32, frameY * 32,   //32 é o tamanho do sprite placeholder utilizado, PODE SER ALTERADO DEPOIS
            32,32,
            x,y,
            32,32
        )

        this.updateProgressoAnimacao();
    }
}