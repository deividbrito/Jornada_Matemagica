class PauseMenu{
    constructor({progress, onComplete}){
        this.progress = progress;
        this.onComplete = onComplete;
    }

    isArcade() {
        return window.progress?.campanha === "medio";
    }

    isFaseAtiva() {
        return !!(window.progress && window.progress.faseRun);
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
                this.isFaseAtiva() && {
                    label: "Sair da Fase",
                    description: "Abandona a fase atual (progresso da fase não conta)",
                    handler: async () => {
                        const viaSelector = !!(window.progress.faseRun && window.progress.faseRun.viaSelector);
                        window.progress.clearFase();
                        if (window.toast) window.toast.warn("Fase abandonada.", 1800);
                        if (!viaSelector) {
                            // Run longa: volta pro Corredor 3 tiles acima do Mentor (mesma posição
                            // que FaseRunner usa — dá espaço pras cutscenes andarem com o Mentor).
                            window.progress.mapId = "Corredor";
                            window.progress.startingHeroX = 4;
                            window.progress.startingHeroY = 5;
                            window.progress.startingHeroDirection = "down";
                            try { await window.progress.save(); } catch (_) {}
                            try { window.sessionStorage.setItem("jm_skip_title", "1"); } catch (_) {}
                        }
                        window.location.reload();
                    }
                },
                {
                    label: "Voltar ao Menu",
                    description: "Encerra a sessão atual e volta à tela inicial (lembre de salvar antes)",
                    handler: () => {
                        // Limpa estado em memória de fase ativa pra não vazar pro próximo boot.
                        if (window.progress && window.progress.faseRun) {
                            window.progress.clearFase();
                        }
                        // Garante que NÃO pula a TitleScreen no reload.
                        try { window.sessionStorage.removeItem("jm_skip_title"); } catch (_) {}
                        window.location.reload();
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
        const map = new window.ShowMap({
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
        this.keyboardMenu = new window.KeyboardMenu({
            descriptionContainer: container
        })
        this.keyboardMenu.init(this.element);
        this.keyboardMenu.setOptions(this.getOptions("root"));

        container.appendChild(this.element);

        window.utils.wait(200);
        this.esc = new window.KeyPressListener("Escape", () => {
            this.close()
        })
    }
}
// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.PauseMenu = PauseMenu;
