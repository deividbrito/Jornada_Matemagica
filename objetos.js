//objetos de jogo é um conceito aplicável para todos os objetos presentes em um jogo

class ObjetoJogo{
    constructor(config){
        this.x = config.x || 0; //uma posição precisa ser inserida, caso não seja, o objeto aparecerá na posição zero
        this.y = config.y || 0;
        this.sprite = new Sprite({ //o "sprite" dá a chamada de como um objeto deve parecer dentro da interface
            objetoJogo: this,
            src: config.src ||  "imagens/personagens/p1.png", //caso uma fonte não seja informada, a imagem do personagem é chamada
        }); 
    }
}
