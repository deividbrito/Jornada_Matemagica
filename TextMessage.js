class TextMessage {
  constructor({ text, options, correctAnswer, onComplete }) {
    this.text = text;
    this.options = options;
    this.correctAnswer = correctAnswer;
    this.onComplete = onComplete;
    this.element = null;
  }

  createElement() {
    // Criar o elemento
    this.element = document.createElement("div");
    this.element.classList.add("TextMessage");

    this.element.innerHTML = `
      <p class="TextMessage_p"></p>
      ${this.options ? this.renderOptions() : ''}
    `;

    // Iniciar o "efeito de escrita"
    this.revealingText = new RevealingText({
      element: this.element.querySelector(".TextMessage_p"),
      text: this.text
    });

    this.actionListener = new KeyPressListener("Enter", () => {
      this.done();
    });
  }

  renderOptions() {
    return this.options.map((option, index) => `<button class="TextMessage_button2" data-index="${index}">${option}</button>`).join('');
  }

  handleAnswer(selectedIndex) {
    if (parseInt(selectedIndex) === this.correctAnswer) {
      this.done();
    } else {
      const errorMessage = new TextMessage({
        text: "Resposta incorreta! Tente novamente.",
        onComplete: () => {
          errorMessage.element.remove();
          this.bindOptionButtons();
        }
      });
      document.body.appendChild(errorMessage.element);
    }
  }

  done() {
    if (this.revealingText.isDone) {
      this.element.remove();
      this.actionListener.unbind();
      this.onComplete();
    } else {
      this.revealingText.warpToDone();
    }
  }

  init(container) {
    this.createElement();
    container.appendChild(this.element);
    this.options && this.bindOptionButtons();
    this.revealingText.init();
  }

  bindOptionButtons() {
    this.element.querySelectorAll(".TextMessage_button2").forEach(button => {
      button.addEventListener("click", () => {
        this.handleAnswer(button.getAttribute("data-index"));
      });
    });
  }
}
