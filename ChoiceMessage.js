class ChoiceMessage {
  constructor({ text, choices, onComplete }) {
    this.text = text;
    this.choices = choices; 
    this.onComplete = onComplete;
    this.element = null;
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.classList.add("ChoiceMessage");

    const buttons = this.choices.map(choice => {
      return `<button class="ChoiceMessage_button" data-value="${choice.value}">${choice.label}</button>`;
    }).join("");

    this.element.innerHTML = `
      <p class="ChoiceMessage_p">${this.text}</p>
      <div class="ChoiceMessage_buttons">
        ${buttons}
      </div>
    `;

    this.element.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => {
        this.done(button.dataset.value);
      });
    });
  }

  done(selectedValue) {
    const selected = this.choices.find(c => c.value === selectedValue);
    this.element.remove();
    this.onComplete(selected?.events || []);
  }

  init(container) {
    this.createElement();
    container.appendChild(this.element);
  }
}
