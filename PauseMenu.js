class PauseMenu{
    constructor({progress, onComplete}){
        this.progress = progress;
        this.onComplete = onComplete;
    }

    getOptions(pageKey) {
        if (pageKey === "root") {
            return [
                {
                    label: "Salvar", 
                    description: "Salvar o progresso do jogo", 
                    handler: () => { 
                        this.progress.save();
                        console.log("Progresso salvo!");
                        this.close(); 
                    }
                },
                {
                    label: "Abrir Mapa", 
                    description: "Abrir o mapa do jogo",
                    handler: () => { 
                        this.openMap(); 
                        console.log("Abrindo mapa..");
                        this.close(); 
                    }
                },
                {
                    label: "Fechar",
                    description: "Fechar o menu de pausa",
                    handler: () => { 
                        this.close(); 
                    }
                }
            ];
        }
        return [];
    }

    createElement(){
        this.element = document.createElement("div");
        this.element.classList.add("PauseMenu");
        this.element.innerHTML = (`
        <h2> Menu de Pausa </h2>
        `)
    }

    openMap() {
        const container = document.querySelector(".game-container");
        const map = new ShowMap({
            onComplete: () => {
                console.log("Mapa fechado!");
            }
        });
        map.init(container);
    }


    close(){
        this.esc.unbind();
        this.keyboardMenu.end();
        this.element.remove();
        this.onComplete();
    }

    async init(container){
        this.createElement();
        this.keyboardMenu = new KeyboardMenu({
            descriptionContainer: container
        })
        this.keyboardMenu.init(this.element);
        this.keyboardMenu.setOptions(this.getOptions("root"));

        container.appendChild(this.element);

        utils.wait(200);
        this.esc = new KeyPressListener("Escape", () => {
            this.close()
        })
    }
}