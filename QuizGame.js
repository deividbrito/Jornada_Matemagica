class QuizGame {
  constructor({ onComplete, idAssunto = null, dificuldade = null }) {
    this.text = "Carregando pergunta...";
    this.options = [];
    this.correctAnswer = null;
    this.feedback = null;
    this.idAssunto = idAssunto;
    this.dificuldade = dificuldade; 
    this.onComplete = onComplete;
    this.element = null;
    this.canProceed = false;
  }
  
  async fetchQuestion() {
    try {
      const params = new URLSearchParams();
  
      if (this.idAssunto) {
        params.append("id_assunto", this.idAssunto);
      }
  
      if (this.dificuldade) {
        params.append("dificuldade", this.dificuldade);
      }
  
      const url = `http://localhost:3000/api/quizzes/random?${params.toString()}`;
  
      const response = await fetch(url);
      const data = await response.json();
  
      this.text = data.text;
      this.options = data.options;
      this.correctAnswer = data.correctAnswer;
      this.feedback = data.feedback;
    } catch (err) {
      console.error("Erro ao buscar quiz aleatório:", err);
      this.text = "Erro ao carregar pergunta.";
      this.options = ["Tentar novamente"];
      this.correctAnswer = 0;
      this.feedback = "";
    }
  }
  

  async init(container) {
    await this.fetchQuestion();
    this.createElement();
    container.appendChild(this.element);
    this.options && this.bindOptionButtons();
    this.revealingText.init();
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.classList.add("QuizTutorial");

    this.element.innerHTML = `
      <p class="QuizTutorial_p"></p>
      ${this.options ? this.renderOptions() : ''}
    `;

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
    return this.options.map((option, index) => `
      <button class="QuizTutorial_button2" data-index="${index}">${option}</button>
    `).join('');
  }

  handleAnswer(selectedIndex) {
    const isCorrect = parseInt(selectedIndex) === this.correctAnswer;
    this.canProceed = true;
  
    this.element.querySelectorAll(".QuizTutorial_button2").forEach(btn => btn.remove());
    this.element.querySelector(".QuizTutorial_p").innerHTML = "";
  
    const successMessages = [
      "Muito bem! Você acertou! ",
      "Mandou super bem! ",
      "Ótimo trabalho! ",
      "Que incrível! Você conseguiu! "
    ];
  
    const errorMessages = [
      "Quase lá! Vamos entender juntos: ",
      "Não foi dessa vez! Veja só: ",
      "Boa tentativa! Agora veja: ",
      "Errar faz parte! Vamos aprender: "
    ];
  
    const messageArray = isCorrect ? successMessages : errorMessages;
    const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
    
    const symbol = isCorrect ? "✅" : "❌";
  
    this.revealingText = new RevealingText({
      element: this.element.querySelector(".QuizTutorial_p"),
      text: `${symbol} ${randomMessage}${this.feedback}`
    });
    this.revealingText.init();
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

  bindOptionButtons() {
    this.element.querySelectorAll(".QuizTutorial_button2").forEach(button => {
      button.addEventListener("click", () => {
        this.handleAnswer(button.getAttribute("data-index"));
      });
    });
  }
}
