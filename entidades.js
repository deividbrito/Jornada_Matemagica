class Entidade extends ObjetoJogo{
    constructor(config){
        super(config);
        this.progressoMovimentoFaltante = 0;   //define que a movimentação deve sempre andar de 16px em 16px, e não parar no meio

        this.ehOPlayer = config.ehOPlayer || false;

        this.direcaoUpdate = {
            "baixo": ["y", 1],
            "cima": ["y", -1],
            "esquerda": ["x", -1],
            "direita": ["x", 1],
        }
    }

    update(state){
        if(this.progressoMovimentoFaltante > 0){
            this.atualizarPosicao();
        } else {
            //mais casos para movimentação virão abaixo
            //
            //

            //caso o player possa enviar comandos, e uma tecla esteja pressionada
            if(this.ehOPlayer && state.arrow){
                this.iniciaComportamento(state, {
                    tipo: "andar",
                    direcao: state.arrow,
                })
            }
            this.atualizarSprite(state);
        }
    }

    iniciaComportamento(state, comportamento){
        //definindo a direção do personagem para seja lá qual o comportamento que possua
        this.direcao = comportamento.direcao;
        if(comportamento.tipo === "andar"){
            //parar caso o espaço esteja ocupado
            if(state.map.espacoTomado(this.x, this.y, this.direcao)){
                return;
            }

        //pronto para andar
        state.map.moverParede(this.x, this.y, this.direcao);
        this.progressoMovimentoFaltante = 16;
        this.atualizarSprite(state);
        }

        if(comportamento.tipo === "parar") {
            setTimeout(() => {
                utils.emitirEvento("paradaTerminada", {
                    quemId: this.id
                })
            }, comportamento.time)
        }
    }

    atualizarPosicao(){
            const[property, change] = this.direcaoUpdate[this.direcao];
            this[property] += change;
            this.progressoMovimentoFaltante -= 1;

            if(this.progressoMovimentoFaltante === 0){
                utils.emitirEvento("caminhadaTerminada", {
                    quemId: this.id
                })
            }
    }

    atualizarSprite(state){
        if(this.progressoMovimentoFaltante > 0){
            this.sprite.setAnimacao("andar-"+this.direcao);
            return;
        }
        this.sprite.setAnimacao("parar-"+this.direcao);
    }
}