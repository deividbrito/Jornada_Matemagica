class Mundo{
    constructor(config){
        this.element = config.element;
        this.canvas = this.element.querySelector(".canvas-jogo");
        this.ctx = this.canvas.getContext("2d");
    }

    iniciar(){
        console.log("o mundo está girando", this);

        //inserindo cenário no jogo
        const imagem = new Image();
        imagem.onload = () => {
            this.ctx.drawImage(imagem, 0, 0);
        };
        imagem.src = "C:/Users/deivi/Desktop/ADS/Protótipo/imagens/mapas/teste.png";

        //OBSOLETO: inserção de elementode maneira estática, código ficaria muito poluído --> substituição por uso de objetos
        // //x e y definem onde o personagem começará
        // let x = 1;
        // let y = 5;
        // const player = new Image();
        // player.onload = () => {
        //     this.ctx.drawImage(
        //         player, 
        //         0,      //parte esquerda 
        //         0,      //parte do topo
        //         32,     //largura do corte
        //         32,     //tamanho do corte
        //         x * 16,      //posição
        //         y * 16,
        //         32,
        //         32
        //         );
        // };
        // player.src = "C:/Users/deivi/Desktop/ADS/Protótipo/imagens/personagens/p1.png";


        // colocando alguns objetos no jogo
        const p1 = new ObjetoJogo({     //inserindo um personagem
            x: 3,
            y: 5,
        })

        setTimeout(() => {
            p1.sprite.draw(this.ctx);
        }, 300);
    }
}