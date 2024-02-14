class eventoMundo{
    constructor({map, event}){
        this.map = map;
        this.event = event;
    }

    parar(resolve){
        const quem = this.map.objetoJogo[this.event.quem];
        quem.iniciaComportamento({
            map: this.map
        }, {
            type: "parar",
            direction: this.event.direction
        })

        const auxiliarResolucao = e => {
            if(e.detail.quemId === this.event.quem){
                document.removeEventListener("paradaTerminada", auxiliarResolucao);
                resolve();
            }
        }

        document.addEventListener("paradaTerminada", auxiliarResolucao)
    }

    andar(resolve){
        const quem = this.map.objetoJogo[this.event.quem];
        quem.iniciaComportamento({
            map: this.map
        }, {
            type: "andar",
            direction: this.event.direction
        })

        //um auxiliar para completar corretamente o evento quando um npc terminar de andar
        const auxiliarResolucao = e => {
            if(e.detail.quemId === this.event.quem){
                document.removeEventListener("caminhadaTerminada", auxiliarResolucao);
                resolve();
            }
        }

        document.addEventListener("caminhadaTerminada", auxiliarResolucao);
    }

    init(){
        return new Promise(resolve => {
            this[this.event.type](resolve);
        })
    }
}