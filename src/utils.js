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

  //auxiliar de espera
  wait(ms) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, ms)
    })
  },

  //para auxiliar na criação de eventos para o jogo
  emitEvent(name, detail) {
    const event = new CustomEvent(name, {
      detail
    });
    document.dispatchEvent(event);
  },

  // Resolve o ID do mapa baseado na campanha atual.
  // Se a campanha for "medio", tenta usar a variante _M do mapa.
  // Se não existir variante, usa o mapa original (compartilhado).
  resolveMapId(mapId) {
    const campanha = window.progress?.campanha || "fundamental";
    if (campanha === "medio") {
      // Override explícito: a base "Corredor" na campanha médio vira o auditório.
      const mediaOverride = { "Corredor": "Auditorio_M" };
      if (mediaOverride[mapId] && window.OverworldMaps?.[mediaOverride[mapId]]) {
        return mediaOverride[mapId];
      }
      const medioId = mapId + "_M";
      if (window.OverworldMaps && window.OverworldMaps[medioId]) {
        return medioId;
      }
    }
    // Alias de compatibilidade: saves antigos guardaram "Corredor_M" antes da renomeação.
    if (mapId === "Corredor_M" && window.OverworldMaps?.["Auditorio_M"]) {
      return "Auditorio_M";
    }
    return mapId;
  }

}
window.utils = utils;
