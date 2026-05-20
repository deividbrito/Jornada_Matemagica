class PopupWindow {
  constructor({ title, text, buttons, onComplete, size, badge }) {
    this.title = title || "";
    this.text = text || "";
    this.buttons = buttons || null; // [{ label: "Ok", value: "ok" }]
    this.onComplete = onComplete;   // recebe o value do botão clicado
    this.size = size || "default";  // 'default' | 'large' (onboarding etc)
    this.badge = badge || null;     // pequena etiqueta acima do título (ex.: "Passo 1 de 4")
    this.element = null;
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.classList.add("PopupWindow");

    const buttonsHtml = this.buttons
      ? this.buttons.map(b =>
          `<button class="PopupWindow_button" data-value="${b.value}">${b.label}</button>`
        ).join("")
      : `<button class="PopupWindow_button" data-value="ok">Entendi</button>`;

    const boxClass = `PopupWindow_box PopupWindow_box--${this.size}`;
    const badgeHtml = this.badge
      ? `<div class="PopupWindow_badge">${this.badge}</div>`
      : "";

    this.element.innerHTML = `
      <div class="PopupWindow_overlay"></div>
      <div class="${boxClass}">
        ${badgeHtml}
        ${this.title ? `<h2 class="PopupWindow_title">${this.title}</h2>` : ""}
        <div class="PopupWindow_text">${this.text}</div>
        <div class="PopupWindow_buttons">${buttonsHtml}</div>
      </div>
    `;

    this.element.querySelectorAll(".PopupWindow_button").forEach(btn => {
      btn.addEventListener("click", () => {
        this.close(btn.dataset.value);
      });
    });

    // Se só tem um botão (ou nenhum = "Entendi" default), Enter e Esc fecham com o valor dele.
    if (!this.buttons || this.buttons.length === 1) {
      const defaultValue = this.buttons ? this.buttons[0].value : "ok";
      this.enterListener = new window.KeyPressListener("Enter", () => this.close(defaultValue));
      this.escapeListener = new window.KeyPressListener("Escape", () => this.close(defaultValue));
    }

    // Foca o primeiro botão pra capturar Enter e evitar que algo atrás capture.
    setTimeout(() => {
      const firstBtn = this.element.querySelector(".PopupWindow_button");
      if (firstBtn) firstBtn.focus();
    }, 10);
  }

  close(value) {
    if (this.element) {
      this.element.remove();
      if (this.enterListener) this.enterListener.unbind();
      if (this.escapeListener) this.escapeListener.unbind();
      this.onComplete(value);
    }
  }

  init(container) {
    this.createElement();
    container.appendChild(this.element);
  }
}

// Pergunta dificuldade ao jogador. Retorna Promise<"1"|"2"|"3"|null>.
// `null` significa "automática" (preserva o comportamento adaptativo via
// PlayerState.getDifficultyForAssunto). O popup vai pro game-container por
// padrão pra ficar sobre o canvas; FaseSelector roda fora dele, então passe
// container=document.body nesse caso.
PopupWindow.askDifficulty = function ({
  title = "Escolha a dificuldade",
  text = "Como você quer enfrentar este desafio?<br><span style='opacity:0.75;font-size:0.85em;'>(Automática se ajusta ao seu desempenho.)</span>",
  container = null,
  size,
} = {}) {
  const target = container || document.querySelector(".game-container") || document.body;
  // Dentro do .game-container o canvas tem scale 3.5x, então o tamanho 'default'
  // (300px) já fica visualmente grande. Fora dele (ex.: replay via TitleScreen
  // que monta no document.body), o tamanho nativo é minúsculo — usa 'large'.
  const finalSize = size || (target === document.body ? "large" : "default");
  return new Promise((resolve) => {
    const popup = new PopupWindow({
      title,
      text,
      size: finalSize,
      buttons: [
        { label: "Automática (recomendada)", value: "auto" },
        { label: "Fácil",   value: "1" },
        { label: "Médio",   value: "2" },
        { label: "Difícil", value: "3" },
      ],
      onComplete: (value) => {
        resolve(value === "auto" ? null : value);
      },
    });
    popup.init(target);
  });
};

// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.PopupWindow = PopupWindow;
