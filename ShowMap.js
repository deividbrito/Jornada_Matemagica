class ShowMap {
    constructor({ onComplete }) {
        this.onComplete = onComplete;
        this.isOpen = false;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
    }

    createElement() {
        this.element = document.createElement("div");
        this.element.classList.add("PauseMenu");
        this.element.innerHTML = `
            <h2>Mapa</h2>
            <div class="map-container">
                <div class="map-wrapper">
                    <img src="imagens/map/mapa.png" alt="Mapa do jogo" class="map-image">
                </div>
            </div>
        `;

        const style = document.createElement("style");
        style.innerHTML = `
            .map-container {
                width: 128px;
                height: 128px;
                overflow: hidden;
                position: relative;
                border: 1px solid var(--menu-border-color);
                background: var(--menu-background);
                cursor: grab;
            }

            .map-wrapper {
                position: absolute;
                top: 0;
                left: 0;
                transform-origin: center;
            }

            .map-image {
                width: 256px;
                height: 256px;
                user-drag: none;
                user-select: none;
                pointer-events: none;
            }
        `;
        this.element.appendChild(style);

        this.addDragFunctionality();
        this.addZoomFunctionality();
    }

    addDragFunctionality() {
        const mapWrapper = this.element.querySelector(".map-wrapper");
        const mapContainer = this.element.querySelector(".map-container");

        mapContainer.addEventListener("mousedown", (event) => {
            this.isDragging = true;
            this.startX = event.clientX - this.offsetX;
            this.startY = event.clientY - this.offsetY;
            mapContainer.style.cursor = "grabbing";
        });

        document.addEventListener("mousemove", (event) => {
            if (!this.isDragging) return;
            this.offsetX = event.clientX - this.startX;
            this.offsetY = event.clientY - this.startY;
            mapWrapper.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        });

        document.addEventListener("mouseup", () => {
            this.isDragging = false;
            mapContainer.style.cursor = "grab";
        });
    }

    addZoomFunctionality() {
        const mapWrapper = this.element.querySelector(".map-wrapper");
        this.element.querySelector(".map-container").addEventListener("wheel", (event) => {
            event.preventDefault();
            const scaleAmount = event.deltaY > 0 ? 0.9 : 1.1;
            this.scale = Math.min(Math.max(this.scale * scaleAmount, 0.5), 2);
            mapWrapper.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        });
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
