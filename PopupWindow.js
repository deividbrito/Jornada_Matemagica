class PopupWindow {
  constructor({ title, text, buttons, onComplete }) {
    this.title = title || "";
    this.text = text || "";
    this.buttons = buttons || null; // [{ label: "Ok", value: "ok" }]
    this.onComplete = onComplete;   // recebe o value do botão clicado
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

    this.element.innerHTML = `
      <div class="PopupWindow_overlay"></div>
      <div class="PopupWindow_box">
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

    // Se só tem um botão, Enter fecha com o valor dele
    if (!this.buttons || this.buttons.length === 1) {
      const defaultValue = this.buttons ? this.buttons[0].value : "ok";
      this.actionListener = new KeyPressListener("Enter", () => {
        this.close(defaultValue);
      });
    }
  }

  close(value) {
    if (this.element) {
      this.element.remove();
      if (this.actionListener) this.actionListener.unbind();
      this.onComplete(value);
    }
  }

  init(container) {
    this.createElement();
    container.appendChild(this.element);
  }
}
