//arquivo para guardar códigos e comandos "aleatórios" para ajudar no funcionamento do jogo

const utils = {
    //define o numero n de x ou y para 16 vezes seu tamanho
    //isso é feito pois estamos contando que cada "quadrado" do mapa tem um tamanho de 16 pixels
    withGrid(n){
        return n * 16;
    },

    //definição e escalonamento dos parâmetros de parede para um padrão 16x16
    asGridCoords(x,y){
        return `${x*16},${x*16}`;
    },

    //uma função assistente para ajudar na contabilização dos pixels 16x16 na colisão entre objetos do jogo
    proxPosicao(inicioX, inicioY, direcao){
        let x = inicioX;
        let y = inicioY;
        const tamanho = 16;

        if (direcao === "esquerda"){
            x -= tamanho;
        } else if (direcao === "direita"){
            x += tamanho;
        } else if(direcao === "cima"){
            y -= tamanho;
        } else if(direcao === "baixo"){
            y += tamanho;
        }
        return {x,y};
    }
}