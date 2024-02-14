//objetos de jogo é um conceito aplicável para todos os objetos presentes em um jogo

class ObjetoJogo{
    constructor(config){
        this.id = null;
        this.estaMontado = false;
        this.x = config.x || 0; //uma posição precisa ser inserida, caso não seja, o objeto aparecerá na posição zero
        this.y = config.y || 0;
        this.direcao = config.direcao || "baixo";    //define a direção do objeto, setando ela como padrão "baixo"
        this.sprite = new Sprite({ //o "sprite" dá a chamada de como um objeto deve parecer dentro da interface
            objetoJogo: this,
            src: config.src ||  "imagens/personagens/p1.png", //caso uma fonte não seja informada, a imagem do personagem é chamada
        }); 

        //define a existência de um loop de comportamento para qualquer um dos objetos do jogo
        this.loopComportamento = config.loopComportamento || [];
        this.loopComportamentoIndex = 0;
    }

    Montar(map){
        this.estaMontado = true;
        map.adicionarParede(this.x, this.y);
    
        //se um comportamento de objeto existir, só deve acontecer após um curto delay
        setTimeout(() => {
            this.fazerComportamento(map);
        }, 10)
    }

    update(){

    }

    async fazerComportamento(map){
        //NÃO FAZER NADA caso tenha uma cutscene acontecendo ou se não existe configuração de comportamento
        if(map.cutsceneAcontecendo || this.loopComportamento.length === 0){
            return;
        }

        //preparando o evento com informações relevantes
        let eventoConfig = this.loopComportamento[this.loopComportamentoIndex];
        eventoConfig.quem = this.id;

        //criar uma instância de evento a partir da config do evento
        const eventoAjuste = new eventoMundo({map, event: eventoConfig});
        await eventoAjuste.init();

        //fazendo com que novo evento aconteça
        this.loopComportamentoIndex += 1;
        if (this.loopComportamentoIndex === this.loopComportamento.length){
            this.loopComportamentoIndex = 0;
        }

        //fazer novamente
        this.fazerComportamento(map);
    }

}
