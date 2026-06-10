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
    // true quando a questão não pôde ser carregada e caímos no botão "OK".
    // Sinaliza pra done()/onComplete NÃO pontuar essa "resposta".
    this.loadFailed = false;
  }

  // Quantas vezes tentamos buscar uma questão antes de desistir e mostrar o
  // fallback amigável. Cada tentativa pede uma NOVA questão aleatória ao
  // backend — então se uma questão específica veio quebrada (sem alternativas)
  // ou a requisição falhou de forma transitória, re-rolar costuma resolver.
  static get MAX_FETCH_ATTEMPTS() { return 3; }
  static get FETCH_RETRY_DELAY_MS() { return 400; }

  // Uma questão só é "carregável" se tiver enunciado e pelo menos 2 alternativas.
  // O backend pode devolver 200 com payload incompleto (ex.: quiz sem
  // alternativas cadastradas); isso conta como falha pra acionar o re-roll.
  _isValidQuestion(data) {
    return !!(
      data &&
      data.id != null &&
      typeof data.pergunta === "string" &&
      data.pergunta.trim().length > 0 &&
      Array.isArray(data.options) &&
      data.options.length >= 2
    );
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchQuestion() {
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

    const query = params.toString();
    const maxAttempts = QuizGame.MAX_FETCH_ATTEMPTS;

    // Overlay de carregamento com revelação adiada: o caso comum (resposta
    // rápida) NÃO pisca o spinner; mas se a 1ª busca demora, ou caímos em
    // retry, o jogador vê feedback em vez de uma tela parada por segundos.
    let overlayShown = false;
    const revealOverlay = (label) => {
      if (!window.loadingOverlay) return;
      if (overlayShown) { window.loadingOverlay.setLabel(label); return; }
      window.loadingOverlay.show(label);
      overlayShown = true;
    };
    const overlayTimer = setTimeout(() => revealOverlay("Carregando pergunta…"), 400);

    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // `silent: true` evita que o apiClient empilhe um toast (+ som de erro)
          // a cada tentativa — só avisamos o usuário se TODAS as tentativas falham.
          const data = await window.api.fetch(`/api/quizzes/random?${query}`, { silent: true });

          if (!this._isValidQuestion(data)) {
            // Questão malformada (sem enunciado ou sem alternativas). Trata como
            // falha pra cair no re-roll por uma nova questão.
            throw Object.assign(new Error("Questão recebida está incompleta."), { malformed: true });
          }

          if (this.useFiftyFifty) {
            const hiddenCount = data.options.filter(o => o.hidden).length;
            console.log("[50/50] Hidden count from server:", hiddenCount);
          }

          this.quizId = data.id;
          this.text = data.pergunta;
          this.options = data.options;
          this.questionDifficulty = data.dificuldade ?? this.dificuldade ?? "1";
          this.files = Array.isArray(data.files) ? data.files : [];
          this.loadFailed = false;
          return; // sucesso
        } catch (err) {
          console.error(`Erro ao buscar quiz aleatório (tentativa ${attempt}/${maxAttempts}):`, err);

          // 404 = não existe NENHUMA pergunta pra esses filtros, mesmo após o
          // relaxamento do backend. Re-rolar com os mesmos parâmetros devolveria
          // o mesmo 404 — então vai direto pro fallback.
          const isNotFound = err && err.status === 404;
          const hasMoreAttempts = attempt < maxAttempts;

          if (!isNotFound && hasMoreAttempts) {
            revealOverlay("Tentando outra pergunta…");
            await this._sleep(QuizGame.FETCH_RETRY_DELAY_MS);
            continue; // tenta uma NOVA questão como fallback
          }

          // Esgotou as tentativas (ou 404 definitivo) → fallback amigável,
          // com mensagem condizente com a causa real.
          this._applyLoadFailure(err);
          return;
        }
      }
    } finally {
      clearTimeout(overlayTimer);
      if (overlayShown && window.loadingOverlay) window.loadingOverlay.hide();
    }
  }

  // Estado de "não deu pra carregar a pergunta": mostra um aviso adequado à
  // causa (conexão x sem perguntas x dado quebrado) e deixa só o botão "OK".
  // Marca loadFailed pra que essa "resposta" NÃO seja pontuada — ver done() e
  // os onComplete em OverworldEvent (fase e arcade).
  _applyLoadFailure(err) {
    const isNotFound = err && err.status === 404;
    const isMalformed = err && err.malformed === true;

    let toastMsg;
    let boxMsg;
    if (isNotFound) {
      toastMsg = "Não há perguntas disponíveis para este desafio agora.";
      boxMsg = "Não encontramos uma pergunta para este desafio. Tente novamente mais tarde.";
    } else if (isMalformed) {
      toastMsg = "A pergunta veio com um problema. Tente novamente.";
      boxMsg = "Não foi possível carregar a pergunta. Tente novamente mais tarde.";
    } else {
      toastMsg = "Não foi possível carregar a pergunta. Verifique sua conexão.";
      boxMsg = "Não foi possível carregar a pergunta. Tente novamente mais tarde.";
    }

    if (window.toast) window.toast.error(toastMsg);
    this.text = boxMsg;
    this.options = [{ id: "fallback", texto: "OK" }];
    this.questionDifficulty = this.dificuldade || "1";
    this.files = [];
    this.loadFailed = true;
  }

  async init(container) {
    await this.fetchQuestion();
    // Cronômetro só começa DEPOIS que a questão carregou (e renderizou), pra
    // que latência de rede / retries não entrem no tempo de resposta do jogador
    // (que vira bônus de pontos no arcade e tempo_resposta_ms no backend).
    this.startTime = Date.now();
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
    // Modifier pro Arcade ENEM: textos longos precisam de mais espaço vertical
    // (sem sobrepor o HUD) e fonte ligeiramente menor pra reduzir scroll.
    if (this.campanha === "medio") {
      this.element.classList.add("QuizTutorial--medio");
    }

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
        timeTaken: this.timeTaken,
        // Questão não carregou (jogador só clicou "OK"): não deve pontuar,
        // ajustar dificuldade, mexer no streak/vidas nem contar acerto.
        unscored: this.loadFailed,
      });
    }
  }
}
// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.QuizGame = QuizGame;
