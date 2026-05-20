class LoginForm {
  constructor({ onComplete }) {
    this.onComplete = onComplete;
    this.element = null;
  }

  createFormHtml() {
    // Branding + 3 zonas: campos, ações primárias, modo convidado.
    // Classes legacy (.login-button, .register-button, .guest-button, .buttons, .guest)
    // preservadas pra compatibilidade; classes BEM novas para styling fino.
    return `
      <div class="LoginForm">
        <header class="LoginForm_brand">
          <h1 class="LoginForm_title">Jornada Matemágica</h1>
          <p class="LoginForm_subtitle">Entrar ou cadastrar</p>
        </header>

        <div class="LoginForm_fields">
          <label class="LoginForm_field">
            <span class="LoginForm_fieldLabel">Nome</span>
            <input type="text" name="nome" placeholder="(apenas no cadastro)" autocomplete="name" />
          </label>
          <label class="LoginForm_field">
            <span class="LoginForm_fieldLabel">Email</span>
            <input type="email" name="email" placeholder="seu@email" autocomplete="email" required />
          </label>
          <label class="LoginForm_field">
            <span class="LoginForm_fieldLabel">Senha</span>
            <input type="password" name="senha" placeholder="mínimo 6 caracteres" autocomplete="current-password" required />
          </label>
        </div>

        <div class="LoginForm_actions buttons">
          <button type="button" class="LoginForm_primary login-button">Entrar</button>
          <button type="button" class="LoginForm_secondary register-button">Cadastrar</button>
        </div>

        <div class="LoginForm_guest guest">
          <button type="button" class="LoginForm_link guest-button">Jogar sem conta</button>
          <p class="LoginForm_guestHint">O progresso não será salvo no servidor.</p>
        </div>
      </div>
    `;
  }

  init() {
    this.element = document.createElement("div");
    this.element.classList.add("LoginOverlay");
    this.element.innerHTML = this.createFormHtml();
    document.body.appendChild(this.element);

    this.element.querySelector(".login-button").addEventListener("click", () => this.handleLogin());
    this.element.querySelector(".register-button").addEventListener("click", () => this.handleRegister());
    this.element.querySelector(".guest-button").addEventListener("click", () => {
      // Modo convidado: sem token, sem sessaoData. Backend ainda libera quizzes
      // e validação de resposta, mas nada persiste.
      window.api.clearToken();
      this.close();
      this.onComplete(null);
    });

    // Enter no campo senha → Entrar
    const senhaInput = this.element.querySelector("input[name='senha']");
    if (senhaInput) {
      senhaInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.handleLogin();
      });
    }

    // Foco automático no email — login é o fluxo mais comum
    setTimeout(() => {
      const emailInput = this.element.querySelector("input[name='email']");
      if (emailInput) emailInput.focus();
    }, 50);
  }

  // Recebe o payload { token, jogador, sessao } do backend, persiste o token
  // e devolve ao TitleScreen o formato esperado (sem o token, já guardado).
  _onAuthSuccess(data) {
    if (data && data.token) {
      window.api.setToken(data.token);
    }
    this.close();
    this.onComplete({ jogador: data.jogador, sessao: data.sessao });
  }

  async handleLogin() {
    const email = this.element.querySelector("input[name='email']").value;
    const senha = this.element.querySelector("input[name='senha']").value;
    try {
      const data = await window.api.fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });
      this._onAuthSuccess(data);
    } catch (err) {
      alert(err.message || "Erro no login.");
    }
  }

  async handleRegister() {
    const nome = this.element.querySelector("input[name='nome']").value;
    const email = this.element.querySelector("input[name='email']").value;
    const senha = this.element.querySelector("input[name='senha']").value;
    try {
      const data = await window.api.fetch("/api/jogadores", {
        method: "POST",
        body: JSON.stringify({ nome, email, senha }),
      });
      this._onAuthSuccess(data);
    } catch (err) {
      alert(err.message || "Erro no cadastro.");
    }
  }

  close() {
    this.element.remove();
  }
}

// Expor para o escopo global (compat com modo legacy de scripts soltos)
window.LoginForm = LoginForm;
