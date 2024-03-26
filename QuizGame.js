class QuizGame {
    constructor({ text, options, correctAnswer, onComplete }) {
      this.text = text;
      this.options = options;
      this.correctAnswer = correctAnswer;
      this.onComplete = onComplete;
      this.element = null;
      this.canProceed = false; 
    }
  
    createElement() {
      // Criar o elemento
      this.element = document.createElement("div");
      this.element.classList.add("QuizTutorial");
  
      this.element.innerHTML = `
        <p class="QuizTutorial_p"></p>
        ${this.options ? this.renderOptions() : ''}
      `;
  
      // Iniciar o "efeito de escrita"
      this.revealingText = new RevealingText({
        element: this.element.querySelector(".QuizTutorial_p"),
        text: this.text
      });
  
      this.actionListener = new KeyPressListener("Enter", () => {
        if (this.canProceed) {
          this.done();
        }
      });
    }
  
    renderOptions() {
      return this.options.map((option, index) => `<button class="QuizTutorial_button2" data-index="${index}">${option}</button>`).join('');
    }
  
    handleAnswer(selectedIndex) {
      if (parseInt(selectedIndex) === this.correctAnswer) {
        this.canProceed = true; // Permitir que o jogador prossiga
        this.done();
      } else {
        const errorMessage = new TextMessage({
          text: "Você errou! Tente novamente.",
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
      this.element.querySelectorAll(".QuizTutorial_button2").forEach(button => {
        button.addEventListener("click", () => {
          this.handleAnswer(button.getAttribute("data-index"));
        });
      });
    }
  }
  