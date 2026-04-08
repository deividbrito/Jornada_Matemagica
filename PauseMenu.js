class PauseMenu{
    constructor({progress, onComplete}){
        this.progress = progress;
        this.onComplete = onComplete;
    }

    isArcade() {
        return window.progress?.campanha === "medio";
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
                !this.isArcade() && {
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
            ].filter(Boolean);
        }
        return [];
    }

    createElement(){
        const am = window.audioManager;
        this.element = document.createElement("div");
        this.element.classList.add("PauseMenu");
        this.element.innerHTML = `
        <h2> Menu de Pausa </h2>
        <div class="PauseMenu_sliders">
            <label>
                <span>Música</span>
                <input type="range" min="0" max="100" value="${Math.round(am.bgmVolume * 100)}" class="PauseMenu_slider" data-target="bgm">
            </label>
            <label>
                <span>Efeitos</span>
                <input type="range" min="0" max="100" value="${Math.round(am.sfxVolume * 100)}" class="PauseMenu_slider" data-target="sfx">
            </label>
        </div>
        `;

        this.element.querySelectorAll(".PauseMenu_slider").forEach(slider => {
            slider.addEventListener("input", () => {
                const val = Number(slider.value) / 100;
                if (slider.dataset.target === "bgm") {
                    am.bgmVolume = val;
                    if (am.currentBgm) am.currentBgm.volume = val;
                } else {
                    am.sfxVolume = val;
                }
            });
        });
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