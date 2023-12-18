class inputDirecao {
    constructor(){
        this.direcaoPressionada = [];
        this.map = {
            "ArrowUp": "cima",
            "KeyW": "cima",
            "ArrowDown": "baixo",
            "KeyS": "baixo",
            "ArrowLeft": "esquerda",
            "KeyA": "esquerda",
            "ArrowRight": "direita",
            "KeyD": "direita",
        }
    }

    get direcao(){  //tornar o código saudável e permitir a identificação sadia da direção
        return this.direcaoPressionada[0];
    }

    iniciar(){
        document.addEventListener("keydown", e => {
            console.groupCollapsed(e.code);
            const dir = this.map[e.code]; //valida se as keys pressionadas são as que procuramos, definidas acima
            if(dir && this.direcaoPressionada.indexOf(dir) === -1){
                this.direcaoPressionada.unshift(dir);
                console.log(this.direcaoPressionada);
            }
        });

        document.addEventListener("keyup", e => {
            const dir = this.map[e.code];
            const index = this.direcaoPressionada.indexOf(dir);
            if(index > -1) {
                this.direcaoPressionada.splice(index, 1);
            }
        })
    }
}