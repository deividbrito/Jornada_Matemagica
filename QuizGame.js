class QuizGame {
  constructor({ onComplete, idAssunto = null, dificuldade = null }) {
    this.text = "Carregando pergunta...";
    this.options = []; // Agora será um array de objetos: [{ id, texto }, ...]
    this.feedback = "";
    this.idAssunto = idAssunto;
    this.dificuldade = dificuldade;
    this.questionDifficulty = dificuldade || null;
    this.onComplete = onComplete;
    this.element = null;

    this.quizId = null; // --- NOVO: Armazena o ID do quiz atual
    this.timeTaken = 0; // --- NOVO: Armazena o tempo de resposta

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

      if (this.dificuldade) {
        params.append("dificuldade", this.dificuldade);
      }

      const url = `http://localhost:3000/api/quizzes/random?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // --- ATUALIZADO: para o novo formato da API ---
      this.quizId = data.id;
      this.text = data.pergunta ?? "Pergunta indisponível.";
      this.options = Array.isArray(data.options) ? data.options : [];
      this.questionDifficulty = data.dificuldade ?? this.dificuldade ?? "1";
      // --- REMOVIDO: A API não envia mais isso ---
      // this.correctAnswer = ...
      // this.feedback = ...
      
    } catch (err) {
      console.error("Erro ao buscar quiz aleatório:", err);
      this.text = "Não foi possível carregar a pergunta. Tente novamente mais tarde.";
      this.options = [{ id: "fallback", texto: "OK" }]; // Ajusta para o novo formato
      this.questionDifficulty = this.dificuldade || "1";
    }
  }

  async init(container) {
    this.startTime = Date.now();
    
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

    // --- ATUALIZADO: para usar o array de objetos ---
    this.options.forEach((option) => {
      const btn = document.createElement("button");
      btn.classList.add("QuizTutorial_button2");
      btn.dataset.id = option.id; // Usa o ID da alternativa
      btn.type = "button";
      btn.textContent = option.texto; // Usa o texto da alternativa
      optionsContainer.appendChild(btn);
    });
    // --- FIM DA ATUALIZAÇÃO ---

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
        // --- ATUALIZADO: Passa o ID da alternativa, não o índice ---
        this.handleAnswer(button.getAttribute("data-id"));
      };
      button.addEventListener("click", handler);
    });
  }

  // --- FUNÇÃO TOTALMENTE REESCRITA ---
  async handleAnswer(selectedAlternativaId) {
    this.timeTaken = Date.now() - this.startTime; // Calcula o tempo
    
    // Pega o ID da sessão (necessário para o histórico)
    // Se for convidado (sem sessão), usamos um ID nulo ou de "convidado"
    const id_sessao = window.progress?.sessaoData?.sessao?.id || null;
    
    let isCorrect = false;
    let feedback = "Ocorreu um erro ao verificar sua resposta.";

    if (selectedAlternativaId === "fallback") {
        isCorrect = true; // Se for a pergunta de fallback, apenas continua
        feedback = "";
    } else {
      // 1. Envia a resposta para a API verificar
      try {
        const payload = {
          id_sessao: id_sessao,
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
        // Deixa o feedback de erro padrão
      }
    }

    // 2. Atualiza o estado e a UI com o resultado da API
    this.lastResult = isCorrect;
    this.feedback = feedback; // Armazena o feedback recebido
    this.canProceed = true;

    this.element.querySelectorAll(".QuizTutorial_button2").forEach(btn => btn.remove());
    this.element.querySelector(".QuizTutorial_p").innerHTML = "";

    const successMessages = [ "Muito bem! Você acertou! ", "Mandou super bem! ", "Ótimo trabalho!", "Que incrível! Você conseguiu! "];
    const errorMessages = [ "Quase lá! Vamos entender juntos: ", "Não foi dessa vez! Veja só: ", "Boa tentativa! Agora veja: ", "Errar faz parte! Vamos aprender: "];

    const messageArray = isCorrect ? successMessages : errorMessages;
    const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
    const symbol = isCorrect ? "✅" : "❌";

    this.revealingText = new RevealingText({
      element: this.element.querySelector(".QuizTutorial_p"),
      text: `${symbol} ${randomMessage}${this.feedback}` // Usa o feedback da API
    });
    this.revealingText.init();
  }
  // --- FIM DA REESCRITA ---

  done() {
    if (this.revealingText && !this.revealingText.isDone) {
      this.revealingText.warpToDone();
      return;
    }

    if (this.element) this.element.remove();
    if (this.actionListener) this.actionListener.unbind();

    // --- ATUALIZADO: usa o 'this.timeTaken' salvo ---
    if (this.onComplete) {
      this.onComplete({
        isCorrect: !!this.lastResult,
        idAssunto: this.idAssunto,
        dificuldade: this.questionDifficulty || this.dificuldade || "1",
        timeTaken: this.timeTaken // Usa o valor calculado em handleAnswer
      });
    }
  }
}