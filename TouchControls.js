class TouchControls {
  constructor({ directionInput }) {
    this.directionInput = directionInput;
    this.element = null;
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.classList.add("TouchControls");
    this.element.innerHTML = `
      <div class="d-pad">
        <button class="d-pad-btn up" data-dir="up">▲</button>
        <button class="d-pad-btn left" data-dir="left">◀</button>
        <button class="d-pad-btn right" data-dir="right">▶</button>
        <button class="d-pad-btn down" data-dir="down">▼</button>
      </div>
      
      <button class="action-btn menu-btn" data-key="Escape">&#9881;</button>
      <button class="action-btn a-btn" data-key="Enter">A</button>
    `;
  }

  bindEvents() {
    // eventos do D-Pad (movimentacao)
    this.element.querySelectorAll(".d-pad-btn").forEach(btn => {
      const dir = btn.dataset.dir;
      
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault(); // Evita dar zoom ou rolar a tela sem querer
        this.directionInput.addDirection(dir);
        btn.classList.add("active");
      });

      const endEvent = (e) => {
        e.preventDefault();
        this.directionInput.removeDirection(dir);
        btn.classList.remove("active");
      };

      btn.addEventListener("touchend", endEvent);
      btn.addEventListener("touchcancel", endEvent);
    });

    // eventos dos botoes de acao (Interagir / Voltar)
    this.element.querySelectorAll(".action-btn").forEach(btn => {
      const key = btn.dataset.key; // "Enter" ou "Escape"
      
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        // Dispara um evento de teclado falso para enganar o KeyPressListener
        document.dispatchEvent(new KeyboardEvent("keydown", { code: key }));
        btn.classList.add("active");
      });

      const endEvent = (e) => {
        e.preventDefault();
        document.dispatchEvent(new KeyboardEvent("keyup", { code: key }));
        btn.classList.remove("active");
      };

      btn.addEventListener("touchend", endEvent);
      btn.addEventListener("touchcancel", endEvent);
    });
  }

  init(container) {
    // so renderiza os botoes se o dispositivo tiver tela sensível ao toque
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.createElement();
      container.appendChild(this.element);
      this.bindEvents();
    }
  }
}