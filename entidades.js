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
        this.atualizarPosicao();

        if(this.ehOPlayer && this.progressoMovimentoFaltante === 0 && state.arrow){
            this.direcao = state.arrow;
            this.progressoMovimentoFaltante = 16;
        }
    }

    atualizarPosicao(){
        if(this.progressoMovimentoFaltante > 0){
            const [property, change] = this.direcaoUpdate[this.direcao];
            this[property] += change;
            this.progressoMovimentoFaltante -= 1;
        }
    }
}