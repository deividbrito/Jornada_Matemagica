class PauseMenu{
    constructor({onComplete}){
        this.onComplete = onComplete;
    }

    getOptions(pageKey){
    if(pageKey === "root"){
        return[
            {
                label: "Salvar",
                description: "Salvar o progresso do jogo",
                handler: () => {

                }
            },
            {
                label: "Fechar",
                description: "Fechar o menu de pausa",
                handler: () => {
                    this.close();
                }
            }
        ]
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