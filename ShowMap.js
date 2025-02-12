class ShowMap {
    constructor({ onComplete }) {
        this.onComplete = onComplete;
        this.isOpen = false;
    }

    createElement() {
        this.element = document.createElement("div");
        this.element.classList.add("PauseMenu");
        this.element.innerHTML = `
            <h2>Mapa</h2>
            <div class="map-container">
                <img src="imagens/map/mapa.png" alt="Mapa do jogo" class="map-image">
            </div>
        `;

        const style = document.createElement("style");
        style.innerHTML = `
            .map-container {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 10px;
            }

            .map-image {
                width: 128px;
                height: 128px;
                border: 1px solid var(--menu-border-color);
                background: var(--menu-background);
            }
        `;
        this.element.appendChild(style);
    }

    open(container) {
        if (this.isOpen) return;
        this.isOpen = true;

        this.createElement();
        container.appendChild(this.element);

        this.esc = new KeyPressListener("Escape", () => {
            this.close();
        });
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        this.element.remove();
        this.esc.unbind();

        if (this.onComplete) {
            this.onComplete();
        }
    }

    init(container) {
        this.open(container);
    }
}
