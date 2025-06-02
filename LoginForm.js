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
      </div>
    `;
  }

  init(container) {
    this.element = document.createElement("div");
    this.element.classList.add("LoginOverlay");
    this.element.innerHTML = this.createFormHtml();
    container.appendChild(this.element);

    this.element.querySelector(".login-button").addEventListener("click", () => {
      this.handleLogin();
    });

    this.element.querySelector(".register-button").addEventListener("click", () => {
      this.handleRegister();
    });
  }

  async handleLogin() {
    const email = this.element.querySelector("input[name='email']").value;
    const senha = this.element.querySelector("input[name='senha']").value;

    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
      });

      const data = await res.json();

      if (res.ok) {
        this.close();
        this.onComplete(data); // passa dados da sessão ao jogo
      } else {
        alert(data.error || "Erro no login");
      }
    } catch (e) {
      console.error("Erro ao logar:", e);
    }
  }

  async handleRegister() {
    const nome = this.element.querySelector("input[name='nome']").value;
    const email = this.element.querySelector("input[name='email']").value;
    const senha = this.element.querySelector("input[name='senha']").value;

    try {
      const res = await fetch("http://localhost:3000/api/jogadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha })
      });

      const data = await res.json();

      if (res.ok) {
        alert("Cadastro feito! Agora você pode entrar.");
      } else {
        alert(data.error || "Erro no cadastro");
      }
    } catch (e) {
      console.error("Erro ao cadastrar:", e);
    }
  }

  close() {
    this.element.remove();
  }
}
