class DecisionMessage {
  constructor({ text, onComplete }) {
    this.text = text;
    this.onComplete = onComplete;
    this.element = null;
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.classList.add("DecisionMessage");

    this.element.innerHTML = `
      <p class="DecisionMessage_text">${this.text}</p>
      <div class="DecisionMessage_buttons">
        <button class="DecisionMessage_button" data-choice="yes">Sim</button>
        <button class="DecisionMessage_button" data-choice="no">Não</button>
      </div>
    `;

    this.element.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => {
        const value = button.dataset.choice;
        this.done(value);
      });
    });
  }

  done(selection) {
    this.element.remove();
    this.onComplete(selection);
  }

  init(container) {
    this.createElement();
    container.appendChild(this.element);
  }
}
