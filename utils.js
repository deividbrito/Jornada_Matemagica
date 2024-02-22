//códigos e comandos "aleatórios" para ajudar no funcionamento do jogo
const utils = {

  //define o numero n de x ou y para 16 vezes seu tamanho
  //isso é feito pois estamos contando que cada "quadrado" do mapa tem um tamanho de 16 pixels
  withGrid(n) {
    return n * 16;
  },

  //definição e escalonamento dos parâmetros de parede para um padrão 16x16
  asGridCoord(x,y) {
    return `${x*16},${y*16}`
  },

  //uma função assistente para ajudar na contabilização dos pixels 16x16 na colisão entre objetos do jogo
  nextPosition(initialX, initialY, direction) {
    let x = initialX;
    let y = initialY;
    const size = 16;
    if (direction === "left") { 
      x -= size;
    } else if (direction === "right") {
      x += size;
    } else if (direction === "up") {
      y -= size;
    } else if (direction === "down") {
      y += size;
    }
    return {x,y};
  },
  
  oppositeDirection(direction) {
    if (direction === "left") { return "right" }
    if (direction === "right") { return "left" }
    if (direction === "up") { return "down" }
    return "up"
  },

  //para auxiliar na criação de eventos para o jogo
  emitEvent(name, detail) {
    const event = new CustomEvent(name, {
      detail
    });
    document.dispatchEvent(event);
  }
  
}