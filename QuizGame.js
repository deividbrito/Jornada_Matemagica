class QuizGame {
  constructor({ onComplete, idAssunto = null, dificuldade = null, campanha = null }) {
    this.text = "Carregando pergunta...";
    this.options = [];
    this.feedback = "";
    this.idAssunto = idAssunto;
    this.dificuldade = dificuldade;
    this.questionDifficulty = dificuldade || null;
    this.campanha = campanha || "fundamental";
    this.onComplete = onComplete;
    this.element = null;

    this.quizId = null;
    this.timeTaken = 0;
    this.files = []; // NOVO: imagens do enunciado

    this.canProceed = false;
    this.lastResult = null;
    this.actionListener = null;
    this.startTime = 0;
  }

  async fetchQuestion() {
    try {
      const params = new URLSearchParams();
      if (this.idAssunto !== null && this.idAssunto !== undefined) {
        params.append("id_assunto", this.idAssunto);
      }
      if (this.dificuldade) params.append("dificuldade", this.dificuldade);
      params.append("campanha", this.campanha);

      const url = `http://localhost:3000/api/quizzes/random?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      this.quizId = data.id;
      this.text = data.pergunta ?? "Pergunta indisponível.";
      this.options = Array.isArray(data.options) ? data.options : [];
      this.questionDifficulty = data.dificuldade ?? this.dificuldade ?? "1";
      this.files = Array.isArray(data.files) ? data.files : []; // NOVO

    } catch (err) {
      console.error("Erro ao buscar quiz aleatório:", err);
      this.text = "Não foi possível carregar a pergunta. Tente novamente mais tarde.";
      this.options = [{ id: "fallback", texto: "OK" }];
      this.questionDifficulty = this.dificuldade || "1";
      this.files = [];
    }
  }

  async init(container) {
    this.startTime = Date.now();
    await this.fetchQuestion();
    this.createElement();
    container.appendChild(this.element);
    this.bindOptionButtons();
    if (this.revealingText) this.revealingText.init();
    this.actionListener = new KeyPressListener("Enter", () => {
      if (this.canProceed) this.done();
    });
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.classList.add("QuizTutorial");

    // --- Texto da pergunta ---
    const p = document.createElement("p");
    p.classList.add("QuizTutorial_p");
    p.innerHTML = this.text;
    this.element.appendChild(p);

    // --- NOVO: imagens do enunciado (acima das alternativas) ---
    if (this.files.length > 0) {
      const imgContainer = document.createElement("div");
      imgContainer.classList.add("QuizTutorial_images");
      this.files.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.classList.add("QuizTutorial_image");
        img.alt = "Imagem da questão";
        imgContainer.appendChild(img);
      });
      this.element.appendChild(imgContainer);
    }

    // --- Grid de alternativas ---
    const optionsContainer = document.createElement("div");
    optionsContainer.classList.add("QuizTutorial_options");

    this.options.forEach((option) => {
      const btn = document.createElement("button");
      btn.classList.add("QuizTutorial_button2");
      btn.dataset.id = option.id;
      btn.type = "button";

      if (option.file) {
        // NOVO: alternativa com imagem — mostra a imagem dentro do botão
        const img = document.createElement("img");
        img.src = option.file;
        img.classList.add("QuizTutorial_button_image");
        img.alt = option.texto || "Alternativa";
        btn.appendChild(img);
        // Se tiver texto além da imagem, mostra embaixo
        if (option.texto && option.texto.trim()) {
          const span = document.createElement("span");
          span.textContent = option.texto;
          btn.appendChild(span);
        }
      } else {
        btn.textContent = option.texto;
      }

      optionsContainer.appendChild(btn);
    });

    this.element.appendChild(optionsContainer);

    // RevealingText só no parágrafo de texto
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
      button.addEventListener("click", () => {
        this.element.querySelectorAll(".QuizTutorial_button2").forEach(b => b.disabled = true);
        this.handleAnswer(button.getAttribute("data-id"));
      });
    });
  }

  async handleAnswer(selectedAlternativaId) {
    this.timeTaken = Date.now() - this.startTime;

    if (window.audioManager) window.audioManager.playSfx("click");

    const id_sessao = window.progress?.sessaoData?.sessao?.id || null;

    let isCorrect = false;
    let feedback = "Ocorreu um erro ao verificar sua resposta.";

    if (selectedAlternativaId === "fallback") {
      isCorrect = true;
      feedback = "";
    } else {
      try {
        const payload = {
          id_sessao,
          id_quiz: this.quizId,
          id_alternativa_escolhida: parseInt(selectedAlternativaId),
          tempo_resposta_ms: this.timeTaken
        };

        const res = await fetch("http://localhost:3000/api/historico/responder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const result = await res.json();
        isCorrect = result.foi_correta;
        feedback = result.feedback;

      } catch (err) {
        console.error("Erro ao submeter resposta:", err);
      }
    }

    if (window.audioManager) {
      window.audioManager.playSfx(isCorrect ? "correct" : "wrong");
    }

    this.lastResult = isCorrect;
    this.feedback = feedback;
    this.canProceed = true;

    // Remove alternativas e imagens do enunciado após responder
    this.element.querySelectorAll(".QuizTutorial_button2").forEach(btn => btn.remove());
    const imgContainer = this.element.querySelector(".QuizTutorial_images");
    if (imgContainer) imgContainer.remove();

    this.element.querySelector(".QuizTutorial_p").innerHTML = "";

    const successMessages = ["Muito bem! Você acertou! ", "Mandou super bem! ", "Ótimo trabalho!", "Que incrível! Você conseguiu! "];
    const errorMessages = ["Quase lá! Vamos entender juntos: ", "Não foi dessa vez! Veja só: ", "Boa tentativa! Agora veja: ", "Errar faz parte! Vamos aprender: "];

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
        dificuldade: this.questionDifficulty || this.dificuldade || "1",
        timeTaken: this.timeTaken
      });
    }
  }
}