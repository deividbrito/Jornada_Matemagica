class LoginForm {
  constructor({ onComplete }) {
    this.onComplete = onComplete;
    this.element = null;
  }

  createFormHtml() {
    return `
      <div class="LoginForm">
        <h2>Entrar ou Cadastrar</h2>
        <input type="text" name="nome" placeholder="Nome (para cadastro)" />
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="senha" placeholder="Senha" required />
        <div class="buttons">
          <button type="button" class="login-button">Entrar</button>
          <button type="button" class="register-button">Cadastrar</button>
        </div>
        <div class="guest">
          <button type="button" class="guest-button">Jogar como convidado</button>
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
      // Modo convidado: sem token, sem sessaoData. Backend ainda libera o jogo
      // (quizzes/random e histórico/responder aceitam guest), mas nada persiste.
      window.api.clearToken();
      this.close();
      this.onComplete(null);
    });
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
      // O backend já retorna token + sessão prontos — entra direto no jogo.
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
