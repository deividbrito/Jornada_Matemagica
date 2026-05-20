class QuizGame {
  constructor({ onComplete, idAssunto = null, dificuldade = null, campanha = null, useFiftyFifty = false }) {
    this.useFiftyFifty = useFiftyFifty;
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
      // Envia a dificuldade sempre que o cliente tiver uma (manual ou adaptativa).
      // O backend tem fallback: se o pool da campanha não tem aquele nível,
      // ele relaxa o filtro automaticamente (quizService._fetchPool).
      if (this.dificuldade) {
        params.append("dificuldade", this.dificuldade);
      }
      params.append("campanha", this.campanha);
      if (this.useFiftyFifty) params.append("fiftyFifty", "true");

      const data = await window.api.fetch(`/api/quizzes/random?${params.toString()}`);
      if (this.useFiftyFifty) {
        const hiddenCount = (data.options || []).filter(o => o.hidden).length;
        console.log("[50/50] Hidden count from server:", hiddenCount);
      }

      this.quizId = data.id;
      this.text = data.pergunta ?? "Pergunta indisponível.";
      this.options = Array.isArray(data.options) ? data.options : [];
      this.questionDifficulty = data.dificuldade ?? this.dificuldade ?? "1";
      this.files = Array.isArray(data.files) ? data.files : [];

    } catch (err) {
      console.error("Erro ao buscar quiz aleatório:", err);
      if (window.toast) {
        window.toast.error("Não foi possível carregar a pergunta. Verifique sua conexão.");
      }
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
    this.actionListener = new window.KeyPressListener("Enter", () => {
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

    // Buff 50/50 — o servidor marca 2 alternativas erradas como `hidden`.
    // Cliente só aplica o visual nas que vieram marcadas.
    if (this.useFiftyFifty) {
      const btns = optionsContainer.querySelectorAll(".QuizTutorial_button2");
      this.options.forEach((opt, i) => {
        if (opt.hidden && btns[i]) {
          btns[i].disabled = true;
          btns[i].style.opacity = "0.25";
          btns[i].style.textDecoration = "line-through";
        }
      });
    }

    // ENEM (médio): texto aparece completo de uma vez, sem animação.
    // Fundamental: mantém o efeito de "escrita" letra-por-letra.
    if (this.campanha === "medio") {
      this.revealingText = null;
      // p.innerHTML já tem this.text (seteado acima), nada a fazer.
    } else {
      this.revealingText = new window.RevealingText({
        element: p,
        text: this.text
      });
      p.innerHTML = "";
    }

    // Não auto-focar a 1ª alternativa: o destaque visual fazia parecer
    // pré-marcada/sugerida. Tab continua entrando nas alternativas
    // normalmente quando o jogador quiser navegar via teclado.
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

    let isCorrect = false;
    let feedback = "Ocorreu um erro ao verificar sua resposta.";
    let xpInfo = null; // backend retorna { xpGained, rankBefore, rankAfter, rankedUp } se acertou autenticado

    if (selectedAlternativaId === "fallback") {
      isCorrect = true;
      feedback = "";
    } else {
      try {
        const payload = {
          id_quiz: this.quizId,
          id_alternativa_escolhida: parseInt(selectedAlternativaId),
          tempo_resposta_ms: this.timeTaken,
        };
        const result = await window.api.fetch("/api/historico/responder", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        isCorrect = result.foi_correta;
        feedback = result.feedback;
        xpInfo = result.xp || null;
        // Backend devolve `id_alternativa_correta` apenas em erro (em acerto a
        // própria escolha é a certa). Usado pra destacar visualmente.
        if (!isCorrect && result.id_alternativa_correta) {
          this.correctAlternativeId = String(result.id_alternativa_correta);
        }
      } catch (err) {
        console.error("Erro ao submeter resposta:", err);
      }
    }

    if (window.audioManager) {
      window.audioManager.playSfx(isCorrect ? "correct" : "wrong");
    }

    // Feedback visual: pulse verde quando acerta, shake vermelho quando erra.
    // A animação CSS roda em paralelo ao texto pedagógico.
    this.element.classList.remove("QuizTutorial--correct", "QuizTutorial--wrong");
    void this.element.offsetWidth; // força reflow pra reiniciar a animação
    this.element.classList.add(isCorrect ? "QuizTutorial--correct" : "QuizTutorial--wrong");

    // Floating "+X XP" sobre a caixa + evento pra XpBar + Toast de rank-up.
    if (xpInfo) {
      this._showFloatingXp(xpInfo.xpGained);
      document.dispatchEvent(new CustomEvent("jm:xp-updated", { detail: xpInfo.rankAfter }));
      if (xpInfo.rankedUp) {
        this._showRankUpToast(xpInfo.rankAfter);
      }
    }

    this.lastResult = isCorrect;
    this.feedback = feedback;

    // Delay de leitura: em acerto libera "Continuar" em 1s; em erro 4s (mais
    // tempo pra ler a explicação E olhar a alternativa correta destacada).
    this.canProceed = false;
    const readDelayMs = isCorrect ? 1000 : 4000;
    this._renderContinueIndicator(readDelayMs);

    // Marca visualmente as alternativas em vez de removê-las.
    //   - acerto: a escolhida vira verde (Tutorial_button2--correct)
    //   - erro:   a escolhida vira vermelha + correta destacada em verde
    //   - todas as outras ficam esmaecidas pra não distrair
    const optionButtons = this.element.querySelectorAll(".QuizTutorial_button2");
    optionButtons.forEach(btn => {
      btn.disabled = true;
      btn.classList.remove("QuizTutorial_button2--correct", "QuizTutorial_button2--wrong");
      const btnId = btn.dataset.id;
      const isChosen = btnId === String(selectedAlternativaId);
      const isCorrectAlt = isCorrect
        ? isChosen
        : (this.correctAlternativeId && btnId === this.correctAlternativeId);

      if (isCorrectAlt) {
        btn.classList.add("QuizTutorial_button2--correct");
      } else if (isChosen) {
        btn.classList.add("QuizTutorial_button2--wrong");
      } else {
        btn.classList.add("QuizTutorial_button2--dimmed");
      }
    });

    // Remove só as imagens do enunciado (que ocupam muito espaço pra a leitura
    // do feedback). Os botões ficam pra revelar a alternativa correta.
    const imgContainer = this.element.querySelector(".QuizTutorial_images");
    if (imgContainer) imgContainer.remove();

    const pEl = this.element.querySelector(".QuizTutorial_p");
    pEl.innerHTML = "";

    const successMessages = ["Muito bem! Você acertou! ", "Mandou super bem! ", "Ótimo trabalho!", "Que incrível! Você conseguiu! "];
    const errorMessages = ["Quase lá! Vamos entender juntos: ", "Não foi dessa vez! Veja só: ", "Boa tentativa! Agora veja: ", "Errar faz parte! Vamos aprender: "];

    const messageArray = isCorrect ? successMessages : errorMessages;
    const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
    const symbol = isCorrect ? "✅" : "❌";
    const feedbackText = `${symbol} ${randomMessage}${this.feedback}`;

    if (this.campanha === "medio") {
      pEl.textContent = feedbackText;
      this.revealingText = null;
    } else {
      this.revealingText = new window.RevealingText({
        element: pEl,
        text: feedbackText
      });
      this.revealingText.init();
    }
  }

  // --- Indicador de "continuar" -------------------------------------------
  // Cria um pequeno bloco no rodapé do quiz com:
  //   - barra de progresso (preenche em `delayMs`)
  //   - texto "Aguarde…" → "Pressione Enter ▶" quando libera
  _renderContinueIndicator(delayMs) {
    if (!this.element) return;

    // Limpa indicador anterior se existir (defensivo)
    const old = this.element.querySelector(".QuizTutorial_continue");
    if (old) old.remove();

    const wrap = document.createElement("div");
    wrap.className = "QuizTutorial_continue";
    wrap.innerHTML = `
      <span class="QuizTutorial_continueLabel">Aguarde…</span>
      <div class="QuizTutorial_continueBar" aria-hidden="true">
        <div class="QuizTutorial_continueBarFill"></div>
      </div>
    `;
    this.element.appendChild(wrap);

    const fill = wrap.querySelector(".QuizTutorial_continueBarFill");
    // Anima a largura por CSS transition. Setamos transition + width num
    // próximo frame pra garantir que o browser registra a mudança.
    fill.style.transitionDuration = `${delayMs}ms`;
    requestAnimationFrame(() => { fill.style.width = "100%"; });

    setTimeout(() => {
      this.canProceed = true;
      wrap.classList.add("QuizTutorial_continueReady");
      wrap.querySelector(".QuizTutorial_continueLabel").textContent = "Pressione Enter ▶";
    }, delayMs);
  }

  // --- HUD de XP -----------------------------------------------------------
  _showFloatingXp(amount) {
    if (!amount || amount <= 0 || !this.element) return;
    const float = document.createElement("div");
    float.className = "FloatingXp";
    float.textContent = `+${amount} XP`;
    // Posiciona acima da caixa do quiz.
    const rect = this.element.getBoundingClientRect();
    float.style.left = `${rect.left + rect.width / 2 - 30}px`;
    float.style.top = `${rect.top - 8}px`;
    document.body.appendChild(float);
    setTimeout(() => float.remove(), 1500);
  }

  _showRankUpToast(rank) {
    if (!rank || !rank.name) return;
    // Som de conquista: rank-up é o momento mais celebratório da progressão.
    if (window.audioManager) window.audioManager.playSfx("correct");
    const toast = document.createElement("div");
    toast.className = "RankUpToast";
    toast.innerHTML = `
      <div class="RankUpToast_label">NOVO RANK</div>
      <div class="RankUpToast_rank">${rank.name}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2300);
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
// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.QuizGame = QuizGame;
