//arquivo para guardar códigos e comandos "aleatórios" para ajudar no funcionamento do jogo

const utils = {
    //define o numero n de x ou y para 16 vezes seu tamanho
    //isso é feito pois estamos contando que cada "quadrado" do mapa tem um tamanho de 16 pixels
    withGrid(n){
        return n * 16;
    }
}