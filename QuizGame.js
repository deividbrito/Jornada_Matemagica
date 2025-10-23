class QuizGame {
  constructor({ onComplete, idAssunto = null, dificuldade = null }) {
    this.text = "Carregando pergunta...";
    this.options = [];
    this.correctAnswer = null;
    this.feedback = "";
    this.idAssunto = idAssunto;
    this.dificuldade = dificuldade;      // dificuldade solicitada (string) — usada na query
    this.questionDifficulty = dificuldade || null; // dificuldade real da questão (pode vir da API)
    this.onComplete = onComplete;
    this.element = null;

    this.canProceed = false;
    this.lastResult = null; // boolean: resultado da última tentativa
    this.actionListener = null;
  }

  async fetchQuestion() {
    try {
      const params = new URLSearchParams();

      if (this.idAssunto !== null && this.idAssunto !== undefined) {
        params.append("id_assunto", this.idAssunto);
      }

      if (this.dificuldade) {
        params.append("dificuldade", this.dificuldade);
      }

      const url = `http://localhost:3000/api/quizzes/random?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this.text = data.text ?? "Pergunta indisponível.";
      this.options = Array.isArray(data.options) ? data.options : [];
      this.correctAnswer = typeof data.correctAnswer === "number" ? data.correctAnswer : 0;
      this.feedback = data.feedback ?? "";
      this.questionDifficulty = data.dificuldade ?? this.dificuldade ?? "1";
    } catch (err) {
      console.error("Erro ao buscar quiz aleatório:", err);
      this.text = "Não foi possível carregar a pergunta. Tente novamente mais tarde.";
      this.options = ["OK"];
      this.correctAnswer = 0;
      this.feedback = "";
      this.questionDifficulty = this.dificuldade || "1";
    }
  }

  async init(container) {
    await this.fetchQuestion();
    this.createElement();
    container.appendChild(this.element);

    this.bindOptionButtons();

    if (this.revealingText) {
      this.revealingText.init();
    }

    this.actionListener = new KeyPressListener("Enter", () => {
      if (this.canProceed) this.done();
    });
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.classList.add("QuizTutorial");

    const p = document.createElement("p");
    p.classList.add("QuizTutorial_p");
    p.innerHTML = this.text;

    const optionsContainer = document.createElement("div");
    optionsContainer.classList.add("QuizTutorial_options");

    this.options.forEach((optionText, index) => {
      const btn = document.createElement("button");
      btn.classList.add("QuizTutorial_button2");
      btn.dataset.index = String(index);
      btn.type = "button";
      btn.textContent = optionText;
      optionsContainer.appendChild(btn);
    });

    this.element.appendChild(p);
    this.element.appendChild(optionsContainer);

    this.revealingText = new RevealingText({
      element: p,
      text: this.text
    });
    p.innerHTML = "";

    setTimeout(() => {
      const firstBtn = this.element.querySelector(".QuizTutorial_button2");
      if (firstBtn) firstBtn.focus();
    }, 0);
  }

  bindOptionButtons() {
    this.element.querySelectorAll(".QuizTutorial_button2").forEach(button => {
      const handler = () => {
        this.element.querySelectorAll(".QuizTutorial_button2").forEach(b => b.disabled = true);
        this.handleAnswer(button.getAttribute("data-index"));
      };
      button.addEventListener("click", handler);
    });
  }

  handleAnswer(selectedIndex) {
    const idx = parseInt(selectedIndex);
    const isCorrect = idx === this.correctAnswer;
    this.lastResult = !!isCorrect;
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

    // mostra feedback concatenando com a explicação da pergunta
    this.revealingText = new RevealingText({
      element: this.element.querySelector(".QuizTutorial_p"),
      text: `${symbol} ${randomMessage}${this.feedback}`
    });
    this.revealingText.init();
  }

  done() {
    if (this.revealingText && !this.revealingText.isDone) {
      this.revealingText.warpToDone();
      return;
    }

    if (this.element) this.element.remove();
    if (this.actionListener) this.actionListener.unbind();

    if (this.onComplete) {
      this.onComplete({
        isCorrect: !!this.lastResult,
        idAssunto: this.idAssunto,
        // preferir dificuldade real da pergunta (se o backend retornou), senão a solicitada
        dificuldade: this.questionDifficulty || this.dificuldade || "1"
      });
    }
  }
}
