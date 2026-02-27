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
        this.element.classList.add("ShowMap");
        this.element.innerHTML = `
            <h2>Mapa</h2>
            <div class="map-container">
                <div class="map-wrapper">
                    <img src="imagens/map/mapa.png" alt="Mapa do jogo" class="map-image">
                </div>
            </div>
            <div class="map-footer">Aperte B ou ESC para fechar</div>
        `;

        this.addDragFunctionality();
        this.addZoomFunctionality();
    }

    addDragFunctionality() {
        const mapWrapper = this.element.querySelector(".map-wrapper");
        const mapContainer = this.element.querySelector(".map-container");

        const startDrag = (e) => {
            this.isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            this.startX = clientX - this.offsetX;
            this.startY = clientY - this.offsetY;
            mapContainer.style.cursor = "grabbing";
        };

        const doDrag = (e) => {
            if (!this.isDragging) return;
            
            // ESSA LINHA É CRUCIAL NO MOBILE: impede a tela de rolar enquanto você olha o mapa
            if (e.touches) e.preventDefault(); 
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            this.offsetX = clientX - this.startX;
            this.offsetY = clientY - this.startY;
            mapWrapper.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        };

        const stopDrag = () => {
            this.isDragging = false;
            mapContainer.style.cursor = "grab";
        };

        mapContainer.addEventListener("mousedown", startDrag);
        document.addEventListener("mousemove", doDrag);
        document.addEventListener("mouseup", stopDrag);

        // ATENÇÃO AQUI: passive precisa ser false para o preventDefault funcionar
        mapContainer.addEventListener("touchstart", startDrag, {passive: false});
        document.addEventListener("touchmove", doDrag, {passive: false});
        document.addEventListener("touchend", stopDrag);
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
